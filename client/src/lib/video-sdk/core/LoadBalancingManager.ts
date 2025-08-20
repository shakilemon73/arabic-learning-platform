/**
 * LoadBalancingManager - Professional Load Balancing & Edge Distribution
 * CDN-like edge server management like Zoom, Teams, Google Meet, Webex
 * Geographic distribution, server selection, failover handling
 */

import { EventEmitter } from './EventEmitter';

interface LoadBalancingConfig {
  enabled: boolean;
  edgeServers: EdgeServer[];
  healthCheckInterval: number;
  failoverThreshold: number;
  geographicRouting: boolean;
  latencyBasedRouting: boolean;
  serverSelectionAlgorithm: 'round_robin' | 'least_connections' | 'latency_based' | 'capacity_based';
}

interface EdgeServer {
  id: string;
  region: string;
  endpoint: string;
  capacity: number;
  currentLoad: number;
  latency: number;
  isHealthy: boolean;
  lastHealthCheck: Date;
  connectionCount: number;
  bandwidth: number;
  geolocation: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
}

interface ServerSelection {
  primaryServer: EdgeServer;
  fallbackServers: EdgeServer[];
  selectionReason: string;
  expectedLatency: number;
  loadFactor: number;
}

interface ConnectionMetrics {
  serverId: string;
  participantId: string;
  connectionTime: Date;
  latency: number;
  bandwidth: number;
  packetLoss: number;
  isActive: boolean;
}

export class LoadBalancingManager extends EventEmitter {
  private config: LoadBalancingConfig = {
    enabled: true,
    edgeServers: [],
    healthCheckInterval: 30000, // 30 seconds
    failoverThreshold: 0.05,    // 5% packet loss threshold
    geographicRouting: true,
    latencyBasedRouting: true,
    serverSelectionAlgorithm: 'latency_based'
  };

  private edgeServers = new Map<string, EdgeServer>();
  private connectionMetrics = new Map<string, ConnectionMetrics[]>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private serverSelectionCache = new Map<string, ServerSelection>();

  // Professional edge server network (like major platforms)
  private defaultEdgeServers: EdgeServer[] = [
    {
      id: 'us-east-1',
      region: 'us-east',
      endpoint: 'edge-us-east-1.platform.com',
      capacity: 10000,
      currentLoad: 0,
      latency: 0,
      isHealthy: true,
      lastHealthCheck: new Date(),
      connectionCount: 0,
      bandwidth: 10000000000, // 10 Gbps
      geolocation: { latitude: 40.7128, longitude: -74.0060, city: 'New York', country: 'US' }
    },
    {
      id: 'us-west-1',
      region: 'us-west',
      endpoint: 'edge-us-west-1.platform.com',
      capacity: 8000,
      currentLoad: 0,
      latency: 0,
      isHealthy: true,
      lastHealthCheck: new Date(),
      connectionCount: 0,
      bandwidth: 8000000000, // 8 Gbps
      geolocation: { latitude: 37.7749, longitude: -122.4194, city: 'San Francisco', country: 'US' }
    },
    {
      id: 'eu-west-1',
      region: 'europe',
      endpoint: 'edge-eu-west-1.platform.com',
      capacity: 12000,
      currentLoad: 0,
      latency: 0,
      isHealthy: true,
      lastHealthCheck: new Date(),
      connectionCount: 0,
      bandwidth: 12000000000, // 12 Gbps
      geolocation: { latitude: 53.3498, longitude: -6.2603, city: 'Dublin', country: 'IE' }
    },
    {
      id: 'ap-southeast-1',
      region: 'asia-pacific',
      endpoint: 'edge-ap-southeast-1.platform.com',
      capacity: 6000,
      currentLoad: 0,
      latency: 0,
      isHealthy: true,
      lastHealthCheck: new Date(),
      connectionCount: 0,
      bandwidth: 6000000000, // 6 Gbps
      geolocation: { latitude: 1.3521, longitude: 103.8198, city: 'Singapore', country: 'SG' }
    }
  ];

  constructor() {
    super();
  }

  /**
   * Initialize load balancing system
   * Professional load balancing like major platforms
   */
  async initialize(config?: Partial<LoadBalancingConfig>): Promise<void> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Initialize with default edge servers if none provided
      if (this.config.edgeServers.length === 0) {
        this.config.edgeServers = this.defaultEdgeServers;
      }

      // Initialize edge servers map
      this.config.edgeServers.forEach(server => {
        this.edgeServers.set(server.id, server);
      });

      // Start health checking
      if (this.config.enabled) {
        this.startHealthChecking();
      }

      // Run initial server assessment
      await this.assessAllServers();

      console.log('⚖️ Professional load balancing system initialized');
      this.emit('initialized', { 
        config: this.config,
        serverCount: this.edgeServers.size 
      });

    } catch (error) {
      console.error('❌ Load balancing initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start health checking for all edge servers
   * Professional health monitoring like platforms use
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);

    console.log(`💓 Health checking started (${this.config.healthCheckInterval}ms intervals)`);
  }

  /**
   * Perform health checks on all edge servers
   * Professional server monitoring like platforms use
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.edgeServers.values()).map(server =>
      this.performSingleHealthCheck(server)
    );

    await Promise.allSettled(healthPromises);

    // Check for failovers needed
    this.checkFailoverRequirements();

    this.emit('health-check-completed', {
      totalServers: this.edgeServers.size,
      healthyServers: this.getHealthyServers().length
    });
  }

  /**
   * Perform health check on single server
   * Professional server health assessment
   */
  private async performSingleHealthCheck(server: EdgeServer): Promise<void> {
    try {
      const startTime = Date.now();
      
      // In production, this would be a real network request
      // Simulating professional health check
      await this.simulateHealthCheck(server);
      
      const latency = Date.now() - startTime;
      
      // Update server metrics
      server.latency = latency;
      server.lastHealthCheck = new Date();
      server.isHealthy = latency < 500 && server.currentLoad < server.capacity * 0.9;

      if (!server.isHealthy) {
        console.warn(`⚠️ Server ${server.id} unhealthy: latency=${latency}ms, load=${server.currentLoad}/${server.capacity}`);
      }

    } catch (error) {
      server.isHealthy = false;
      server.lastHealthCheck = new Date();
      console.error(`❌ Health check failed for server ${server.id}:`, error);
    }
  }

  /**
   * Simulate health check (in production, would be real network test)
   */
  private async simulateHealthCheck(server: EdgeServer): Promise<void> {
    // Simulate network delay and random failures
    const delay = 50 + Math.random() * 200; // 50-250ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Network timeout');
    }
  }

  /**
   * Check if failover is required for any connections
   * Professional failover management like platforms use
   */
  private checkFailoverRequirements(): void {
    for (const [participantId, metrics] of Array.from(this.connectionMetrics)) {
      const latestMetric = metrics[metrics.length - 1];
      if (!latestMetric) continue;

      const server = this.edgeServers.get(latestMetric.serverId);
      if (!server) continue;

      // Check failover conditions
      if (!server.isHealthy || 
          latestMetric.packetLoss > this.config.failoverThreshold ||
          latestMetric.latency > server.latency * 3) {
        
        this.initiateFailover(participantId, latestMetric);
      }
    }
  }

  /**
   * Initiate failover for participant
   * Professional failover handling like platforms use
   */
  private async initiateFailover(participantId: string, currentMetric: ConnectionMetrics): Promise<void> {
    try {
      console.log(`🔄 Initiating failover for ${participantId} from server ${currentMetric.serverId}`);

      // Get user's approximate location for geographic routing
      const userLocation = await this.estimateUserLocation(participantId);

      // Select new optimal server
      const newSelection = await this.selectOptimalServer(userLocation, [currentMetric.serverId]);

      if (!newSelection.primaryServer) {
        console.error(`❌ No alternative server available for ${participantId}`);
        return;
      }

      // Perform seamless failover
      await this.performSeamlessFailover(participantId, currentMetric.serverId, newSelection.primaryServer.id);

      console.log(`✅ Failover completed: ${participantId} -> ${newSelection.primaryServer.id}`);
      this.emit('failover-completed', {
        participantId,
        oldServer: currentMetric.serverId,
        newServer: newSelection.primaryServer.id,
        reason: 'health_degradation'
      });

    } catch (error) {
      console.error(`❌ Failover failed for ${participantId}:`, error);
    }
  }

  /**
   * Select optimal edge server for participant
   * Professional server selection like major platforms
   */
  async selectOptimalServer(
    userLocation?: { latitude: number; longitude: number },
    excludeServers: string[] = []
  ): Promise<ServerSelection> {
    const availableServers = this.getHealthyServers()
      .filter(server => !excludeServers.includes(server.id));

    if (availableServers.length === 0) {
      throw new Error('No healthy servers available');
    }

    let primaryServer: EdgeServer;
    let selectionReason: string;

    switch (this.config.serverSelectionAlgorithm) {
      case 'latency_based':
        primaryServer = this.selectByLatency(availableServers);
        selectionReason = 'Lowest latency';
        break;

      case 'capacity_based':
        primaryServer = this.selectByCapacity(availableServers);
        selectionReason = 'Best capacity';
        break;

      case 'least_connections':
        primaryServer = this.selectByConnections(availableServers);
        selectionReason = 'Least connections';
        break;

      case 'round_robin':
      default:
        primaryServer = this.selectRoundRobin(availableServers);
        selectionReason = 'Round robin';
        break;
    }

    // Apply geographic optimization if enabled and location available
    if (this.config.geographicRouting && userLocation) {
      const geoOptimal = this.selectByGeographic(availableServers, userLocation);
      if (geoOptimal.id !== primaryServer.id) {
        primaryServer = geoOptimal;
        selectionReason = 'Geographic proximity';
      }
    }

    // Select fallback servers
    const fallbackServers = availableServers
      .filter(s => s.id !== primaryServer.id)
      .sort((a, b) => a.latency - b.latency)
      .slice(0, 2); // Top 2 fallbacks

    const selection: ServerSelection = {
      primaryServer,
      fallbackServers,
      selectionReason,
      expectedLatency: primaryServer.latency,
      loadFactor: primaryServer.currentLoad / primaryServer.capacity
    };

    // Cache selection for future use
    const cacheKey = this.generateSelectionCacheKey(userLocation, excludeServers);
    this.serverSelectionCache.set(cacheKey, selection);

    return selection;
  }

  /**
   * Select server by latency (professional algorithm)
   */
  private selectByLatency(servers: EdgeServer[]): EdgeServer {
    return servers.reduce((best, current) => 
      current.latency < best.latency ? current : best
    );
  }

  /**
   * Select server by capacity (professional algorithm)
   */
  private selectByCapacity(servers: EdgeServer[]): EdgeServer {
    return servers.reduce((best, current) => {
      const bestUtilization = best.currentLoad / best.capacity;
      const currentUtilization = current.currentLoad / current.capacity;
      return currentUtilization < bestUtilization ? current : best;
    });
  }

  /**
   * Select server by connection count (professional algorithm)
   */
  private selectByConnections(servers: EdgeServer[]): EdgeServer {
    return servers.reduce((best, current) => 
      current.connectionCount < best.connectionCount ? current : best
    );
  }

  /**
   * Round robin server selection (professional algorithm)
   */
  private selectRoundRobin(servers: EdgeServer[]): EdgeServer {
    // Simple implementation - in production would maintain state
    const index = Date.now() % servers.length;
    return servers[index];
  }

  /**
   * Select server by geographic proximity (professional algorithm)
   */
  private selectByGeographic(
    servers: EdgeServer[], 
    userLocation: { latitude: number; longitude: number }
  ): EdgeServer {
    return servers.reduce((best, current) => {
      const bestDistance = this.calculateDistance(userLocation, best.geolocation);
      const currentDistance = this.calculateDistance(userLocation, current.geolocation);
      return currentDistance < bestDistance ? current : best;
    });
  }

  /**
   * Calculate geographic distance between two points
   * Professional geolocation calculation
   */
  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.latitude)) * Math.cos(this.toRadians(point2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Estimate user location (simplified implementation)
   */
  private async estimateUserLocation(participantId: string): Promise<{ latitude: number; longitude: number } | undefined> {
    // In production, this would use GeoIP or browser geolocation
    // Returning undefined for now - system will use other selection criteria
    return undefined;
  }

  /**
   * Perform seamless failover
   * Professional connection migration like platforms use
   */
  private async performSeamlessFailover(
    participantId: string,
    oldServerId: string,
    newServerId: string
  ): Promise<void> {
    // In production, this would:
    // 1. Establish new connection to target server
    // 2. Migrate media streams
    // 3. Update routing tables
    // 4. Close old connection gracefully
    
    console.log(`🔄 Seamless failover: ${participantId} from ${oldServerId} to ${newServerId}`);
    
    // Update connection tracking
    const metrics = this.connectionMetrics.get(participantId) || [];
    const newMetric: ConnectionMetrics = {
      serverId: newServerId,
      participantId,
      connectionTime: new Date(),
      latency: this.edgeServers.get(newServerId)?.latency || 100,
      bandwidth: 1000000,
      packetLoss: 0,
      isActive: true
    };
    
    metrics.push(newMetric);
    this.connectionMetrics.set(participantId, metrics);

    // Update server load counters
    const oldServer = this.edgeServers.get(oldServerId);
    const newServer = this.edgeServers.get(newServerId);
    
    if (oldServer) {
      oldServer.connectionCount = Math.max(0, oldServer.connectionCount - 1);
      oldServer.currentLoad = Math.max(0, oldServer.currentLoad - 1);
    }
    
    if (newServer) {
      newServer.connectionCount++;
      newServer.currentLoad++;
    }
  }

  /**
   * Connect participant to optimal server
   * Professional connection establishment like platforms use
   */
  async connectParticipant(
    participantId: string,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<ServerSelection> {
    try {
      // Select optimal server
      const selection = await this.selectOptimalServer(userLocation);

      // Establish connection metrics tracking
      const connectionMetric: ConnectionMetrics = {
        serverId: selection.primaryServer.id,
        participantId,
        connectionTime: new Date(),
        latency: selection.expectedLatency,
        bandwidth: 1000000, // Initial estimate
        packetLoss: 0,
        isActive: true
      };

      if (!this.connectionMetrics.has(participantId)) {
        this.connectionMetrics.set(participantId, []);
      }
      this.connectionMetrics.get(participantId)!.push(connectionMetric);

      // Update server load
      selection.primaryServer.connectionCount++;
      selection.primaryServer.currentLoad++;

      console.log(`🔗 Connected ${participantId} to server ${selection.primaryServer.id} (${selection.selectionReason})`);
      this.emit('participant-connected', {
        participantId,
        serverId: selection.primaryServer.id,
        selection
      });

      return selection;

    } catch (error) {
      console.error(`❌ Failed to connect ${participantId}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect participant
   */
  disconnectParticipant(participantId: string): void {
    const metrics = this.connectionMetrics.get(participantId);
    if (!metrics || metrics.length === 0) return;

    const latestMetric = metrics[metrics.length - 1];
    const server = this.edgeServers.get(latestMetric.serverId);

    if (server) {
      server.connectionCount = Math.max(0, server.connectionCount - 1);
      server.currentLoad = Math.max(0, server.currentLoad - 1);
    }

    // Mark as inactive
    latestMetric.isActive = false;

    console.log(`🔌 Disconnected ${participantId} from server ${latestMetric.serverId}`);
    this.emit('participant-disconnected', {
      participantId,
      serverId: latestMetric.serverId
    });
  }

  /**
   * Update connection metrics for participant
   */
  updateConnectionMetrics(
    participantId: string,
    metrics: Partial<ConnectionMetrics>
  ): void {
    const participantMetrics = this.connectionMetrics.get(participantId);
    if (!participantMetrics || participantMetrics.length === 0) return;

    const latestMetric = participantMetrics[participantMetrics.length - 1];
    Object.assign(latestMetric, metrics);

    // Check if failover is needed based on updated metrics
    if (metrics.packetLoss && metrics.packetLoss > this.config.failoverThreshold) {
      this.checkFailoverRequirements();
    }
  }

  /**
   * Assess all servers performance
   */
  private async assessAllServers(): Promise<void> {
    for (const server of Array.from(this.edgeServers.values())) {
      await this.assessServerPerformance(server);
    }
  }

  /**
   * Assess single server performance
   */
  private async assessServerPerformance(server: EdgeServer): Promise<void> {
    // In production, would collect real performance metrics
    // Simulating professional server assessment
    
    server.currentLoad = Math.floor(Math.random() * server.capacity * 0.8);
    server.latency = 50 + Math.random() * 100; // 50-150ms
    server.isHealthy = server.currentLoad < server.capacity * 0.9 && server.latency < 300;
  }

  /**
   * Get healthy servers
   */
  private getHealthyServers(): EdgeServer[] {
    return Array.from(this.edgeServers.values()).filter(server => server.isHealthy);
  }

  /**
   * Generate cache key for server selection
   */
  private generateSelectionCacheKey(
    userLocation?: { latitude: number; longitude: number },
    excludeServers: string[] = []
  ): string {
    const locationKey = userLocation ? 
      `${userLocation.latitude.toFixed(1)},${userLocation.longitude.toFixed(1)}` : 
      'unknown';
    const excludeKey = excludeServers.sort().join(',');
    return `${locationKey}-${excludeKey}`;
  }

  /**
   * Get system statistics
   */
  getSystemStatistics(): any {
    const servers = Array.from(this.edgeServers.values());
    const healthyServers = servers.filter(s => s.isHealthy);
    const totalConnections = servers.reduce((sum, s) => sum + s.connectionCount, 0);
    const totalCapacity = servers.reduce((sum, s) => sum + s.capacity, 0);

    return {
      totalServers: servers.length,
      healthyServers: healthyServers.length,
      totalConnections,
      totalCapacity,
      averageLatency: servers.reduce((sum, s) => sum + s.latency, 0) / servers.length,
      systemLoad: totalConnections / totalCapacity,
      failoverRate: this.calculateFailoverRate()
    };
  }

  /**
   * Calculate failover rate (failovers per minute)
   */
  private calculateFailoverRate(): number {
    // Would track actual failover events in production
    return 0;
  }

  /**
   * Get server status
   */
  getServerStatus(serverId: string): EdgeServer | null {
    return this.edgeServers.get(serverId) || null;
  }

  /**
   * Get all servers status
   */
  getAllServersStatus(): EdgeServer[] {
    return Array.from(this.edgeServers.values());
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LoadBalancingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): LoadBalancingConfig {
    return { ...this.config };
  }

  /**
   * Cleanup load balancing manager
   */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.edgeServers.clear();
    this.connectionMetrics.clear();
    this.serverSelectionCache.clear();
    this.removeAllListeners();

    console.log('🧹 Load balancing manager cleaned up');
  }
}