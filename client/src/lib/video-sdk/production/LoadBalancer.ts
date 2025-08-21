/**
 * Production Load Balancer - Enterprise SFU load balancing and scaling
 * Intelligent server selection and capacity management like Zoom/Teams
 */

import { EventEmitter } from '../core/EventEmitter';

export interface SFUServer {
  id: string;
  endpoint: string;
  region: 'us-east' | 'us-west' | 'eu-west' | 'asia-pacific';
  capacity: {
    max: number;
    current: number;
    percentage: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'critical' | 'offline';
    latency: number;
    uptime: number;
    lastHealthCheck: Date;
  };
  features: {
    recording: boolean;
    transcription: boolean;
    aiFeatures: boolean;
    maxResolution: '4K' | '1080p' | '720p';
  };
  priority: number; // 1-10, higher is better
}

export interface LoadBalancingStrategy {
  name: 'round_robin' | 'least_connections' | 'geographic' | 'weighted' | 'intelligent';
  weights?: Record<string, number>;
}

export interface ServerSelection {
  server: SFUServer;
  reason: string;
  alternatives: SFUServer[];
  selectionTime: number;
}

export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  healthCheckInterval: number;
  maxRetries: number;
  timeoutMs: number;
  enableFailover: boolean;
  enableGeolocation: boolean;
  capacityThreshold: number; // 0-1, when to stop routing to server
}

export class SFULoadBalancer extends EventEmitter {
  private config: LoadBalancerConfig;
  private servers = new Map<string, SFUServer>();
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private userLocation: { region: string; country: string } | null = null;
  private selectionHistory: ServerSelection[] = [];
  
  constructor(config?: Partial<LoadBalancerConfig>) {
    super();
    
    this.config = {
      strategy: { name: 'intelligent' },
      healthCheckInterval: 30000, // 30 seconds
      maxRetries: 3,
      timeoutMs: 5000,
      enableFailover: true,
      enableGeolocation: true,
      capacityThreshold: 0.85,
      ...config
    };

    this.initializeDefaultServers();
    this.startHealthMonitoring();
    
    if (this.config.enableGeolocation) {
      this.detectUserLocation();
    }
  }

  /**
   * Select optimal SFU server for new connection
   */
  async selectOptimalSFU(roomId: string, requiresFeatures?: string[]): Promise<ServerSelection> {
    const startTime = Date.now();
    
    console.log('🔍 Selecting optimal SFU server...', {
      roomId,
      strategy: this.config.strategy.name,
      requiresFeatures
    });

    // Filter servers by availability and features
    const availableServers = this.getAvailableServers(requiresFeatures);
    
    if (availableServers.length === 0) {
      throw new Error('No available SFU servers found');
    }

    // Apply load balancing strategy
    const selectedServer = await this.applyLoadBalancingStrategy(availableServers, roomId);
    
    // Get alternatives for failover
    const alternatives = availableServers
      .filter(s => s.id !== selectedServer.id)
      .sort((a, b) => this.calculateServerScore(b) - this.calculateServerScore(a))
      .slice(0, 3);

    const selection: ServerSelection = {
      server: selectedServer,
      reason: `Selected via ${this.config.strategy.name} strategy`,
      alternatives,
      selectionTime: Date.now() - startTime
    };

    // Record selection for analytics
    this.selectionHistory.push(selection);
    if (this.selectionHistory.length > 100) {
      this.selectionHistory.shift();
    }

    console.log('✅ SFU server selected:', {
      serverId: selectedServer.id,
      region: selectedServer.region,
      capacity: selectedServer.capacity.percentage,
      selectionTime: selection.selectionTime
    });

    this.emit('server-selected', selection);
    return selection;
  }

  /**
   * Report server performance and adjust routing
   */
  reportServerPerformance(serverId: string, metrics: {
    latency: number;
    packetLoss: number;
    connectionSuccess: boolean;
    quality: 'excellent' | 'good' | 'poor' | 'critical';
  }): void {
    const server = this.servers.get(serverId);
    if (!server) return;

    // Update server health based on performance
    server.health.latency = metrics.latency;
    
    if (metrics.connectionSuccess) {
      if (metrics.quality === 'critical' || metrics.packetLoss > 0.1) {
        server.health.status = 'critical';
        server.priority = Math.max(1, server.priority - 2);
      } else if (metrics.quality === 'poor' || metrics.packetLoss > 0.05) {
        server.health.status = 'degraded';
        server.priority = Math.max(1, server.priority - 1);
      } else {
        server.health.status = 'healthy';
        server.priority = Math.min(10, server.priority + 1);
      }
    } else {
      server.health.status = 'critical';
      server.priority = Math.max(1, server.priority - 3);
    }

    this.emit('server-performance-updated', { serverId, metrics, health: server.health });
  }

  /**
   * Handle server failover
   */
  async handleServerFailover(failedServerId: string, roomId: string): Promise<ServerSelection> {
    console.log('🚨 Handling server failover for:', failedServerId);
    
    // Mark server as offline
    const failedServer = this.servers.get(failedServerId);
    if (failedServer) {
      failedServer.health.status = 'offline';
      failedServer.priority = 1;
    }

    // Select alternative server
    const alternatives = Array.from(this.servers.values())
      .filter(s => s.id !== failedServerId && s.health.status !== 'offline')
      .sort((a, b) => this.calculateServerScore(b) - this.calculateServerScore(a));

    if (alternatives.length === 0) {
      throw new Error('No failover servers available');
    }

    const failoverServer = alternatives[0];
    const selection: ServerSelection = {
      server: failoverServer,
      reason: `Failover from ${failedServerId}`,
      alternatives: alternatives.slice(1, 3),
      selectionTime: Date.now()
    };

    this.emit('server-failover', { failedServerId, newServerId: failoverServer.id });
    return selection;
  }

  /**
   * Apply load balancing strategy
   */
  private async applyLoadBalancingStrategy(servers: SFUServer[], roomId: string): Promise<SFUServer> {
    switch (this.config.strategy.name) {
      case 'round_robin':
        return this.roundRobinSelection(servers);
      
      case 'least_connections':
        return this.leastConnectionsSelection(servers);
      
      case 'geographic':
        return this.geographicSelection(servers);
      
      case 'weighted':
        return this.weightedSelection(servers);
      
      case 'intelligent':
      default:
        return this.intelligentSelection(servers, roomId);
    }
  }

  /**
   * Round robin server selection
   */
  private roundRobinSelection(servers: SFUServer[]): SFUServer {
    const index = this.selectionHistory.length % servers.length;
    return servers[index];
  }

  /**
   * Least connections selection
   */
  private leastConnectionsSelection(servers: SFUServer[]): SFUServer {
    return servers.reduce((best, current) => 
      current.capacity.current < best.capacity.current ? current : best
    );
  }

  /**
   * Geographic proximity selection
   */
  private geographicSelection(servers: SFUServer[]): SFUServer {
    if (!this.userLocation) {
      return this.leastConnectionsSelection(servers);
    }

    // Find servers in same region
    const sameRegionServers = servers.filter(s => s.region === this.userLocation?.region);
    if (sameRegionServers.length > 0) {
      return this.leastConnectionsSelection(sameRegionServers);
    }

    // Fallback to closest region
    const regionPriority = this.getRegionPriority(this.userLocation.region);
    servers.sort((a, b) => (regionPriority[a.region] || 999) - (regionPriority[b.region] || 999));
    
    return servers[0];
  }

  /**
   * Weighted selection based on server priorities
   */
  private weightedSelection(servers: SFUServer[]): SFUServer {
    const weights = this.config.strategy.weights || {};
    const totalWeight = servers.reduce((sum, server) => {
      const weight = weights[server.id] || server.priority;
      return sum + Math.max(0, weight * (1 - server.capacity.percentage));
    }, 0);

    let random = Math.random() * totalWeight;
    
    for (const server of servers) {
      const weight = (weights[server.id] || server.priority) * (1 - server.capacity.percentage);
      random -= weight;
      
      if (random <= 0) {
        return server;
      }
    }

    return servers[0];
  }

  /**
   * Intelligent selection combining all factors
   */
  private intelligentSelection(servers: SFUServer[], roomId: string): SFUServer {
    const scoredServers = servers.map(server => ({
      server,
      score: this.calculateServerScore(server, roomId)
    }));

    scoredServers.sort((a, b) => b.score - a.score);
    
    console.log('🧠 Intelligent selection scores:', scoredServers.map(s => ({
      id: s.server.id,
      region: s.server.region,
      score: s.score.toFixed(2)
    })));

    return scoredServers[0].server;
  }

  /**
   * Calculate comprehensive server score
   */
  private calculateServerScore(server: SFUServer, roomId?: string): number {
    let score = 0;

    // Health score (40% weight)
    const healthMultiplier = {
      'healthy': 1.0,
      'degraded': 0.7,
      'critical': 0.3,
      'offline': 0.0
    };
    score += 40 * healthMultiplier[server.health.status];

    // Capacity score (30% weight) - prefer less loaded servers
    const capacityScore = Math.max(0, 1 - server.capacity.percentage);
    score += 30 * capacityScore;

    // Priority score (20% weight)
    score += 20 * (server.priority / 10);

    // Geographic proximity (10% weight)
    if (this.userLocation) {
      const proximityScore = server.region === this.userLocation.region ? 1.0 : 0.5;
      score += 10 * proximityScore;
    }

    // Penalty for high latency
    if (server.health.latency > 200) {
      score *= 0.8;
    } else if (server.health.latency > 100) {
      score *= 0.9;
    }

    return score;
  }

  /**
   * Get available servers based on filters
   */
  private getAvailableServers(requiresFeatures?: string[]): SFUServer[] {
    return Array.from(this.servers.values()).filter(server => {
      // Must be online and not over capacity
      if (server.health.status === 'offline' || 
          server.capacity.percentage >= this.config.capacityThreshold) {
        return false;
      }

      // Check required features
      if (requiresFeatures) {
        for (const feature of requiresFeatures) {
          if (!server.features[feature as keyof typeof server.features]) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Initialize default server pool
   */
  private initializeDefaultServers(): void {
    const defaultServers: SFUServer[] = [
      {
        id: 'sfu-us-east-1',
        endpoint: 'https://sfu-us-east-1.yourapp.com',
        region: 'us-east',
        capacity: { max: 1000, current: 0, percentage: 0 },
        health: { status: 'healthy', latency: 0, uptime: 99.9, lastHealthCheck: new Date() },
        features: { recording: true, transcription: true, aiFeatures: true, maxResolution: '4K' },
        priority: 8
      },
      {
        id: 'sfu-us-west-1',
        endpoint: 'https://sfu-us-west-1.yourapp.com',
        region: 'us-west',
        capacity: { max: 1000, current: 0, percentage: 0 },
        health: { status: 'healthy', latency: 0, uptime: 99.8, lastHealthCheck: new Date() },
        features: { recording: true, transcription: true, aiFeatures: true, maxResolution: '4K' },
        priority: 8
      },
      {
        id: 'sfu-eu-west-1',
        endpoint: 'https://sfu-eu-west-1.yourapp.com',
        region: 'eu-west',
        capacity: { max: 800, current: 0, percentage: 0 },
        health: { status: 'healthy', latency: 0, uptime: 99.7, lastHealthCheck: new Date() },
        features: { recording: true, transcription: false, aiFeatures: false, maxResolution: '1080p' },
        priority: 7
      },
      {
        id: 'sfu-asia-1',
        endpoint: 'https://sfu-asia-1.yourapp.com',
        region: 'asia-pacific',
        capacity: { max: 600, current: 0, percentage: 0 },
        health: { status: 'healthy', latency: 0, uptime: 99.5, lastHealthCheck: new Date() },
        features: { recording: true, transcription: false, aiFeatures: false, maxResolution: '1080p' },
        priority: 6
      }
    ];

    for (const server of defaultServers) {
      this.servers.set(server.id, server);
    }

    console.log(`🌐 Initialized ${defaultServers.length} SFU servers`);
  }

  /**
   * Start health monitoring for all servers
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);

    console.log('❤️ Started SFU health monitoring');
  }

  /**
   * Perform health checks on all servers
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.servers.values()).map(server => 
      this.checkServerHealth(server)
    );

    await Promise.allSettled(healthPromises);
  }

  /**
   * Check individual server health
   */
  private async checkServerHealth(server: SFUServer): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${server.endpoint}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.timeoutMs)
      });

      const latency = Date.now() - startTime;
      const healthData = await response.json();

      server.health = {
        status: response.ok ? 'healthy' : 'degraded',
        latency,
        uptime: healthData.uptime || server.health.uptime,
        lastHealthCheck: new Date()
      };

      server.capacity = {
        max: healthData.capacity?.max || server.capacity.max,
        current: healthData.capacity?.current || 0,
        percentage: healthData.capacity?.current ? 
          (healthData.capacity.current / server.capacity.max) : 0
      };

      this.emit('health-check-success', { serverId: server.id, health: server.health });

    } catch (error) {
      server.health.status = 'offline';
      server.health.lastHealthCheck = new Date();
      
      console.error(`❌ Health check failed for ${server.id}:`, error);
      this.emit('health-check-failed', { serverId: server.id, error: (error as Error).message });
    }
  }

  /**
   * Detect user location for geographic routing
   */
  private async detectUserLocation(): Promise<void> {
    try {
      // Try to get location from browser geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            // In production, you'd use a geolocation service
            this.userLocation = await this.getRegionFromCoordinates(
              position.coords.latitude, 
              position.coords.longitude
            );
          },
          () => {
            // Fallback to IP-based geolocation
            this.detectLocationFromIP();
          }
        );
      } else {
        await this.detectLocationFromIP();
      }
    } catch (error) {
      console.error('Failed to detect user location:', error);
    }
  }

  /**
   * Detect location from IP address
   */
  private async detectLocationFromIP(): Promise<void> {
    try {
      // Simulate IP geolocation - in production use a real service
      this.userLocation = {
        region: 'us-east', // Default
        country: 'US'
      };
    } catch (error) {
      console.error('IP geolocation failed:', error);
    }
  }

  /**
   * Get region from coordinates
   */
  private async getRegionFromCoordinates(lat: number, lon: number): Promise<{ region: string; country: string }> {
    // Simplified region detection based on coordinates
    if (lat >= 40 && lat <= 50 && lon >= -80 && lon <= -70) {
      return { region: 'us-east', country: 'US' };
    } else if (lat >= 30 && lat <= 40 && lon >= -125 && lon <= -115) {
      return { region: 'us-west', country: 'US' };
    } else if (lat >= 45 && lat <= 60 && lon >= -10 && lon <= 15) {
      return { region: 'eu-west', country: 'EU' };
    } else {
      return { region: 'asia-pacific', country: 'Unknown' };
    }
  }

  /**
   * Get region priority for geographic routing
   */
  private getRegionPriority(userRegion: string): Record<string, number> {
    const priorities: Record<string, Record<string, number>> = {
      'us-east': { 'us-east': 1, 'us-west': 2, 'eu-west': 3, 'asia-pacific': 4 },
      'us-west': { 'us-west': 1, 'us-east': 2, 'asia-pacific': 3, 'eu-west': 4 },
      'eu-west': { 'eu-west': 1, 'us-east': 2, 'us-west': 3, 'asia-pacific': 4 },
      'asia-pacific': { 'asia-pacific': 1, 'us-west': 2, 'eu-west': 3, 'us-east': 4 }
    };

    return priorities[userRegion] || {};
  }

  /**
   * Add new server to pool
   */
  addServer(server: SFUServer): void {
    this.servers.set(server.id, server);
    console.log(`➕ Added SFU server: ${server.id} (${server.region})`);
    this.emit('server-added', server);
  }

  /**
   * Remove server from pool
   */
  removeServer(serverId: string): void {
    if (this.servers.delete(serverId)) {
      console.log(`➖ Removed SFU server: ${serverId}`);
      this.emit('server-removed', { serverId });
    }
  }

  /**
   * Get server pool status
   */
  getServerPoolStatus(): any {
    const servers = Array.from(this.servers.values());
    
    return {
      totalServers: servers.length,
      healthyServers: servers.filter(s => s.health.status === 'healthy').length,
      totalCapacity: servers.reduce((sum, s) => sum + s.capacity.max, 0),
      usedCapacity: servers.reduce((sum, s) => sum + s.capacity.current, 0),
      averageLatency: servers.reduce((sum, s) => sum + s.health.latency, 0) / servers.length,
      serversByRegion: servers.reduce((acc, s) => {
        acc[s.region] = (acc[s.region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentSelections: this.selectionHistory.slice(-10)
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    this.removeAllListeners();
    console.log('🧹 LoadBalancer destroyed');
  }
}