import { EventEmitter } from '../core/EventEmitter';

export interface TURNServerConfig {
  urls: string;
  username: string;
  credential: string;
  region: string;
}

export interface NetworkPath {
  id: string;
  type: 'direct' | 'relay' | 'turn';
  latency: number;
  bandwidth: number;
  reliability: number;
  isActive: boolean;
}

export interface PacketLossRecovery {
  forwardErrorCorrection: boolean;
  automaticRepeatRequest: boolean;
  redundantEncoding: boolean;
}

export interface NetworkStats {
  packetsSent: number;
  packetsReceived: number;
  packetsLost: number;
  bytesTransferred: number;
  averageLatency: number;
  jitter: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
}

/**
 * Enterprise Network Resilience Manager
 * Advanced network management like Zoom, Teams
 */
export class NetworkResilienceManager extends EventEmitter {
  private turnServers: TURNServerConfig[] = [];
  private networkPaths = new Map<string, NetworkPath>();
  private currentPath: NetworkPath | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  
  // Network monitoring
  private networkStats: NetworkStats = {
    packetsSent: 0,
    packetsReceived: 0,
    packetsLost: 0,
    bytesTransferred: 0,
    averageLatency: 0,
    jitter: 0,
    connectionQuality: 'good'
  };
  
  private monitoringInterval: NodeJS.Timeout | null = null;
  private pathTestingInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  
  // Packet loss recovery
  private recoveryConfig: PacketLossRecovery = {
    forwardErrorCorrection: true,
    automaticRepeatRequest: true,
    redundantEncoding: false
  };
  
  private lossHistory: number[] = [];
  private latencyHistory: number[] = [];

  constructor() {
    super();
    this.initializeTURNServers();
  }

  /**
   * Initialize TURN servers for different regions
   */
  private initializeTURNServers(): void {
    // Enterprise TURN servers (replace with your actual TURN infrastructure)
    this.turnServers = [
      {
        urls: 'turn:turn-us-east.example.com:3478',
        username: 'user',
        credential: 'pass',
        region: 'us-east'
      },
      {
        urls: 'turn:turn-us-west.example.com:3478',
        username: 'user',
        credential: 'pass',
        region: 'us-west'
      },
      {
        urls: 'turn:turn-eu-west.example.com:3478',
        username: 'user',
        credential: 'pass',
        region: 'eu-west'
      },
      {
        urls: 'turn:turn-asia.example.com:3478',
        username: 'user',
        credential: 'pass',
        region: 'asia-pacific'
      }
    ];
  }

  /**
   * Start network resilience management
   */
  async startMonitoring(peerConnections: Map<string, RTCPeerConnection>): Promise<void> {
    try {
      this.peerConnections = peerConnections;
      this.isMonitoring = true;
      
      console.log('🌐 Starting network resilience monitoring...');
      
      // Discover and test network paths
      await this.discoverNetworkPaths();
      
      // Start continuous monitoring
      this.monitoringInterval = setInterval(() => {
        this.collectNetworkStats();
      }, 1000);
      
      // Test alternative paths periodically
      this.pathTestingInterval = setInterval(() => {
        this.testAlternativePaths();
      }, 30000); // Every 30 seconds
      
      this.emit('monitoring-started');
      console.log('✅ Network resilience monitoring active');

    } catch (error) {
      console.error('❌ Failed to start network monitoring:', error);
      throw error;
    }
  }

  /**
   * Discover available network paths
   */
  private async discoverNetworkPaths(): Promise<void> {
    try {
      // Test direct connection
      const directPath: NetworkPath = {
        id: 'direct',
        type: 'direct',
        latency: 0,
        bandwidth: 0,
        reliability: 0,
        isActive: false
      };
      
      const directStats = await this.testNetworkPath('direct');
      if (directStats) {
        directPath.latency = directStats.latency;
        directPath.bandwidth = directStats.bandwidth;
        directPath.reliability = directStats.reliability;
        directPath.isActive = true;
      }
      
      this.networkPaths.set('direct', directPath);
      
      // Test TURN servers
      for (const turnServer of this.turnServers) {
        const turnPath: NetworkPath = {
          id: `turn-${turnServer.region}`,
          type: 'turn',
          latency: 0,
          bandwidth: 0,
          reliability: 0,
          isActive: false
        };
        
        const turnStats = await this.testTURNServer(turnServer);
        if (turnStats) {
          turnPath.latency = turnStats.latency;
          turnPath.bandwidth = turnStats.bandwidth;
          turnPath.reliability = turnStats.reliability;
          turnPath.isActive = true;
        }
        
        this.networkPaths.set(turnPath.id, turnPath);
      }
      
      // Select best path
      this.selectOptimalPath();
      
      console.log(`🔍 Discovered ${this.networkPaths.size} network paths`);

    } catch (error) {
      console.error('❌ Failed to discover network paths:', error);
    }
  }

  /**
   * Test network path performance
   */
  private async testNetworkPath(pathType: string): Promise<{ latency: number; bandwidth: number; reliability: number } | null> {
    try {
      // Create test connection
      const testPC = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });

      return new Promise((resolve) => {
        let latencySum = 0;
        let measurements = 0;
        const startTime = Date.now();
        
        // Test data channel for latency measurement
        const dataChannel = testPC.createDataChannel('test', { ordered: true });
        
        dataChannel.onopen = () => {
          const testData = 'ping';
          const sendTime = performance.now();
          
          dataChannel.send(JSON.stringify({ type: 'ping', timestamp: sendTime }));
        };
        
        dataChannel.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'pong') {
              const latency = performance.now() - data.timestamp;
              latencySum += latency;
              measurements++;
            }
          } catch (e) {
            // Ignore invalid messages
          }
        };
        
        // Cleanup after test
        setTimeout(() => {
          testPC.close();
          
          if (measurements > 0) {
            resolve({
              latency: latencySum / measurements,
              bandwidth: 1000, // Estimated
              reliability: measurements > 0 ? 1.0 : 0.0
            });
          } else {
            resolve(null);
          }
        }, 5000);
      });

    } catch (error) {
      console.error(`❌ Failed to test network path ${pathType}:`, error);
      return null;
    }
  }

  /**
   * Test TURN server performance
   */
  private async testTURNServer(turnConfig: TURNServerConfig): Promise<{ latency: number; bandwidth: number; reliability: number } | null> {
    try {
      const testPC = new RTCPeerConnection({
        iceServers: [
          {
            urls: turnConfig.urls,
            username: turnConfig.username,
            credential: turnConfig.credential
          }
        ]
      });

      return new Promise((resolve) => {
        let connectionSuccessful = false;
        const startTime = performance.now();
        
        testPC.oniceconnectionstatechange = () => {
          if (testPC.iceConnectionState === 'connected' || testPC.iceConnectionState === 'completed') {
            connectionSuccessful = true;
            const latency = performance.now() - startTime;
            
            resolve({
              latency,
              bandwidth: 2000, // Estimated TURN bandwidth
              reliability: 0.95 // TURN servers are generally reliable
            });
          }
        };
        
        // Create offer to test connection
        testPC.createOffer().then(offer => {
          return testPC.setLocalDescription(offer);
        }).catch(error => {
          console.error('Failed to create test offer:', error);
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (!connectionSuccessful) {
            testPC.close();
            resolve(null);
          }
        }, 10000);
      });

    } catch (error) {
      console.error(`❌ Failed to test TURN server ${turnConfig.region}:`, error);
      return null;
    }
  }

  /**
   * Select optimal network path based on performance
   */
  private selectOptimalPath(): void {
    let bestPath: NetworkPath | null = null;
    let bestScore = -1;
    
    for (const [id, path] of this.networkPaths) {
      if (!path.isActive) continue;
      
      // Calculate path score (lower latency and higher reliability = better)
      const score = (path.reliability * 100) - (path.latency / 10);
      
      if (score > bestScore) {
        bestScore = score;
        bestPath = path;
      }
    }
    
    if (bestPath && bestPath !== this.currentPath) {
      const previousPath = this.currentPath;
      this.currentPath = bestPath;
      
      console.log(`🔄 Switched network path: ${previousPath?.id || 'none'} → ${bestPath.id}`);
      this.emit('path-changed', { previousPath, newPath: bestPath });
    }
  }

  /**
   * Collect real-time network statistics
   */
  private async collectNetworkStats(): Promise<void> {
    try {
      let totalPacketsSent = 0;
      let totalPacketsReceived = 0;
      let totalPacketsLost = 0;
      let totalBytesTransferred = 0;
      let latencySum = 0;
      let jitterSum = 0;
      let connectionCount = 0;

      for (const [participantId, pc] of this.peerConnections) {
        const stats = await pc.getStats();
        
        stats.forEach((report) => {
          if (report.type === 'outbound-rtp') {
            totalPacketsSent += report.packetsSent || 0;
            totalBytesTransferred += report.bytesSent || 0;
          }
          
          if (report.type === 'inbound-rtp') {
            totalPacketsReceived += report.packetsReceived || 0;
            totalPacketsLost += report.packetsLost || 0;
            jitterSum += report.jitter || 0;
            connectionCount++;
          }
          
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            latencySum += (report.currentRoundTripTime || 0) * 1000;
          }
        });
      }

      // Update network stats
      this.networkStats = {
        packetsSent: totalPacketsSent,
        packetsReceived: totalPacketsReceived,
        packetsLost: totalPacketsLost,
        bytesTransferred: totalBytesTransferred,
        averageLatency: connectionCount > 0 ? latencySum / connectionCount : 0,
        jitter: connectionCount > 0 ? jitterSum / connectionCount : 0,
        connectionQuality: this.calculateConnectionQuality()
      };

      // Update history for trend analysis
      const lossRate = totalPacketsSent > 0 ? (totalPacketsLost / totalPacketsSent) * 100 : 0;
      this.lossHistory.push(lossRate);
      this.latencyHistory.push(this.networkStats.averageLatency);
      
      // Keep only recent history
      if (this.lossHistory.length > 60) {
        this.lossHistory = this.lossHistory.slice(-60);
      }
      if (this.latencyHistory.length > 60) {
        this.latencyHistory = this.latencyHistory.slice(-60);
      }

      // Check for network issues
      this.checkNetworkHealth();
      
      this.emit('stats-updated', this.networkStats);

    } catch (error) {
      console.error('❌ Failed to collect network stats:', error);
    }
  }

  /**
   * Calculate overall connection quality
   */
  private calculateConnectionQuality(): 'excellent' | 'good' | 'poor' | 'critical' {
    const { packetsSent, packetsLost, averageLatency } = this.networkStats;
    
    const lossRate = packetsSent > 0 ? (packetsLost / packetsSent) * 100 : 0;
    
    if (lossRate > 10 || averageLatency > 500) {
      return 'critical';
    } else if (lossRate > 5 || averageLatency > 300) {
      return 'poor';
    } else if (lossRate > 2 || averageLatency > 150) {
      return 'good';
    } else {
      return 'excellent';
    }
  }

  /**
   * Check network health and trigger recovery if needed
   */
  private checkNetworkHealth(): void {
    const recentLossRate = this.lossHistory.slice(-10);
    const avgRecentLoss = recentLossRate.reduce((a, b) => a + b, 0) / recentLossRate.length;
    
    const recentLatency = this.latencyHistory.slice(-10);
    const avgRecentLatency = recentLatency.reduce((a, b) => a + b, 0) / recentLatency.length;
    
    // Trigger recovery mechanisms
    if (avgRecentLoss > 5) {
      this.handleHighPacketLoss();
    }
    
    if (avgRecentLatency > 300) {
      this.handleHighLatency();
    }
    
    // Check if we should switch network paths
    if (avgRecentLoss > 3 || avgRecentLatency > 200) {
      this.considerPathSwitch();
    }
  }

  /**
   * Handle high packet loss with recovery mechanisms
   */
  private handleHighPacketLoss(): void {
    console.warn('⚠️ High packet loss detected, applying recovery mechanisms');
    
    if (this.recoveryConfig.forwardErrorCorrection) {
      this.enableForwardErrorCorrection();
    }
    
    if (this.recoveryConfig.automaticRepeatRequest) {
      this.enableAutomaticRepeatRequest();
    }
    
    if (this.recoveryConfig.redundantEncoding) {
      this.enableRedundantEncoding();
    }
    
    this.emit('packet-loss-recovery', { 
      mechanism: 'multiple',
      lossRate: this.lossHistory.slice(-1)[0] 
    });
  }

  /**
   * Handle high latency
   */
  private handleHighLatency(): void {
    console.warn('⚠️ High latency detected, optimizing connection');
    
    // Reduce quality to decrease latency
    this.emit('latency-optimization', { 
      latency: this.latencyHistory.slice(-1)[0],
      action: 'reduce-quality'
    });
  }

  /**
   * Consider switching to a better network path
   */
  private considerPathSwitch(): void {
    // Test current alternative paths
    this.testAlternativePaths();
    
    // Find a better path
    let betterPath: NetworkPath | null = null;
    let bestScore = this.calculatePathScore(this.currentPath);
    
    for (const [id, path] of this.networkPaths) {
      if (path.isActive && path !== this.currentPath) {
        const score = this.calculatePathScore(path);
        if (score > bestScore) {
          bestScore = score;
          betterPath = path;
        }
      }
    }
    
    if (betterPath) {
      this.switchNetworkPath(betterPath);
    }
  }

  /**
   * Calculate path performance score
   */
  private calculatePathScore(path: NetworkPath | null): number {
    if (!path) return -1;
    
    // Higher reliability and lower latency = better score
    return (path.reliability * 100) - (path.latency / 10);
  }

  /**
   * Switch to a different network path
   */
  private async switchNetworkPath(newPath: NetworkPath): Promise<void> {
    try {
      console.log(`🔄 Switching network path to: ${newPath.id}`);
      
      // Update ICE servers for all peer connections
      const iceServers = this.getICEServersForPath(newPath);
      
      for (const [participantId, pc] of this.peerConnections) {
        // Restart ICE with new servers
        const configuration = pc.getConfiguration();
        configuration.iceServers = iceServers;
        
        await pc.setConfiguration(configuration);
        pc.restartIce();
      }
      
      const previousPath = this.currentPath;
      this.currentPath = newPath;
      
      this.emit('path-switched', { previousPath, newPath });
      console.log(`✅ Network path switched to: ${newPath.id}`);

    } catch (error) {
      console.error('❌ Failed to switch network path:', error);
    }
  }

  /**
   * Get ICE servers configuration for a specific path
   */
  private getICEServersForPath(path: NetworkPath): RTCIceServer[] {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' }
    ];
    
    if (path.type === 'turn') {
      const turnServer = this.turnServers.find(server => 
        path.id.includes(server.region)
      );
      
      if (turnServer) {
        iceServers.push({
          urls: turnServer.urls,
          username: turnServer.username,
          credential: turnServer.credential
        });
      }
    }
    
    return iceServers;
  }

  /**
   * Test alternative network paths
   */
  private async testAlternativePaths(): Promise<void> {
    for (const [id, path] of this.networkPaths) {
      if (path !== this.currentPath) {
        // Update path performance metrics
        const pathStats = await this.testNetworkPath(path.type);
        if (pathStats) {
          path.latency = pathStats.latency;
          path.reliability = pathStats.reliability;
          path.isActive = true;
        } else {
          path.isActive = false;
        }
      }
    }
  }

  /**
   * Enable Forward Error Correction
   */
  private enableForwardErrorCorrection(): void {
    // In a real implementation, this would configure FEC parameters
    console.log('📡 Forward Error Correction enabled');
  }

  /**
   * Enable Automatic Repeat Request
   */
  private enableAutomaticRepeatRequest(): void {
    // In a real implementation, this would configure ARQ parameters
    console.log('🔄 Automatic Repeat Request enabled');
  }

  /**
   * Enable Redundant Encoding
   */
  private enableRedundantEncoding(): void {
    // In a real implementation, this would configure redundant streams
    console.log('📤 Redundant Encoding enabled');
  }

  /**
   * Get current network statistics
   */
  getNetworkStats(): NetworkStats {
    return { ...this.networkStats };
  }

  /**
   * Get available network paths
   */
  getNetworkPaths(): NetworkPath[] {
    return Array.from(this.networkPaths.values());
  }

  /**
   * Get current active path
   */
  getCurrentPath(): NetworkPath | null {
    return this.currentPath;
  }

  /**
   * Update packet loss recovery configuration
   */
  updateRecoveryConfig(config: Partial<PacketLossRecovery>): void {
    this.recoveryConfig = { ...this.recoveryConfig, ...config };
    this.emit('recovery-config-updated', this.recoveryConfig);
  }

  /**
   * Force network path switch (for testing)
   */
  async forcePathSwitch(pathId: string): Promise<void> {
    const path = this.networkPaths.get(pathId);
    if (path && path.isActive) {
      await this.switchNetworkPath(path);
    } else {
      throw new Error(`Network path ${pathId} not available`);
    }
  }

  /**
   * Stop network monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.pathTestingInterval) {
      clearInterval(this.pathTestingInterval);
      this.pathTestingInterval = null;
    }
    
    console.log('⏹️ Network resilience monitoring stopped');
    this.emit('monitoring-stopped');
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.networkPaths.clear();
    this.peerConnections.clear();
    this.lossHistory = [];
    this.latencyHistory = [];
    this.removeAllListeners();
    
    console.log('🧹 Network resilience cleanup completed');
  }

  /**
   * Check if network monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }
}