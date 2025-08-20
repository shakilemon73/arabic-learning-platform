import { EventEmitter } from '../core/EventEmitter';

export interface NetworkConditions {
  bandwidth: number; // kbps
  latency: number; // ms
  packetLoss: number; // percentage
  jitter: number; // ms
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
}

export interface QualitySettings {
  resolution: { width: number; height: number };
  frameRate: number;
  bitrate: number;
  codec: 'VP8' | 'VP9' | 'H264' | 'AV1';
}

export interface AdaptationRules {
  minBitrate: number;
  maxBitrate: number;
  targetLatency: number;
  maxPacketLoss: number;
  qualitySteps: QualitySettings[];
}

/**
 * Enterprise Adaptive Bitrate Manager
 * Dynamically adjusts video quality like Zoom, Teams, Google Meet
 */
export class AdaptiveBitrateManager extends EventEmitter {
  private currentQuality: QualitySettings;
  private networkConditions: NetworkConditions;
  private adaptationRules: AdaptationRules;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private adaptationHistory: Array<{ timestamp: number; quality: QualitySettings; reason: string }> = [];
  private isMonitoring = false;
  private participantId: string;
  private peerConnections: Map<string, RTCPeerConnection>;

  constructor(participantId: string, peerConnections: Map<string, RTCPeerConnection>) {
    super();
    this.participantId = participantId;
    this.peerConnections = peerConnections;
    
    // Initialize with medium quality settings
    this.currentQuality = {
      resolution: { width: 640, height: 480 },
      frameRate: 24,
      bitrate: 1000,
      codec: 'VP8'
    };

    // Default network conditions
    this.networkConditions = {
      bandwidth: 1000,
      latency: 100,
      packetLoss: 0,
      jitter: 10,
      connectionType: 'unknown'
    };

    // Enterprise adaptation rules (like Google Meet's algorithm)
    this.adaptationRules = {
      minBitrate: 150,
      maxBitrate: 8000,
      targetLatency: 150,
      maxPacketLoss: 5,
      qualitySteps: [
        // Ultra Low (emergency)
        { resolution: { width: 160, height: 120 }, frameRate: 10, bitrate: 150, codec: 'VP8' },
        // Low
        { resolution: { width: 320, height: 240 }, frameRate: 15, bitrate: 300, codec: 'VP8' },
        // Medium Low
        { resolution: { width: 480, height: 360 }, frameRate: 20, bitrate: 600, codec: 'VP8' },
        // Medium
        { resolution: { width: 640, height: 480 }, frameRate: 24, bitrate: 1000, codec: 'VP8' },
        // Medium High
        { resolution: { width: 854, height: 480 }, frameRate: 30, bitrate: 1500, codec: 'VP8' },
        // High
        { resolution: { width: 1280, height: 720 }, frameRate: 30, bitrate: 2500, codec: 'VP9' },
        // Full HD
        { resolution: { width: 1920, height: 1080 }, frameRate: 30, bitrate: 4000, codec: 'VP9' },
        // Ultra HD
        { resolution: { width: 1920, height: 1080 }, frameRate: 60, bitrate: 8000, codec: 'AV1' }
      ]
    };
  }

  /**
   * Start adaptive bitrate monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('📊 Starting adaptive bitrate monitoring');

    // Monitor network conditions every 2 seconds
    this.monitoringInterval = setInterval(() => {
      this.measureNetworkConditions();
    }, 2000);

    // Also detect browser network information if available
    this.detectConnectionType();
  }

  /**
   * Stop adaptive bitrate monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('📊 Stopped adaptive bitrate monitoring');
  }

  /**
   * Measure real network conditions using WebRTC stats
   */
  private async measureNetworkConditions(): Promise<void> {
    try {
      const stats = await this.collectRTCStats();
      
      if (stats) {
        this.networkConditions = {
          bandwidth: stats.availableIncomingBitrate || this.networkConditions.bandwidth,
          latency: stats.currentRoundTripTime || this.networkConditions.latency,
          packetLoss: stats.packetsLost || this.networkConditions.packetLoss,
          jitter: stats.jitter || this.networkConditions.jitter,
          connectionType: this.networkConditions.connectionType
        };

        // Trigger adaptation based on new conditions
        await this.adaptQuality();
      }

    } catch (error) {
      console.error('❌ Failed to measure network conditions:', error);
    }
  }

  /**
   * Collect real WebRTC statistics
   */
  private async collectRTCStats(): Promise<any> {
    try {
      // Check if we have any peer connections
      if (!this.peerConnections || this.peerConnections.size === 0) {
        // Return default values when no connections exist
        return {
          packetsLost: 0,
          jitter: 0.01,
          bytesReceived: 0,
          currentRoundTripTime: 100,
          availableIncomingBitrate: 1000000 // 1 Mbps default
        };
      }

      // Get the first active peer connection for stats
      const firstConnection = Array.from(this.peerConnections.values())[0];
      if (!firstConnection || firstConnection.connectionState !== 'connected') {
        // Return safe defaults for non-connected state
        return {
          packetsLost: 0,
          jitter: 0.02,
          bytesReceived: 0,
          currentRoundTripTime: 150,
          availableIncomingBitrate: 800000
        };
      }

      const stats = await firstConnection.getStats();
      const rtcStats: any = {
        packetsLost: 0,
        jitter: 0.01,
        bytesReceived: 0,
        currentRoundTripTime: 100,
        availableIncomingBitrate: 1000000
      };

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
          rtcStats.packetsLost = report.packetsLost || 0;
          rtcStats.jitter = report.jitter || 0.01;
          rtcStats.bytesReceived = report.bytesReceived || 0;
        }
        
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          rtcStats.currentRoundTripTime = (report.currentRoundTripTime * 1000) || 100; // Convert to ms
          rtcStats.availableIncomingBitrate = report.availableIncomingBitrate || 1000000;
        }
      });

      return rtcStats;

    } catch (error) {
      // Return safe defaults instead of throwing error
      return {
        packetsLost: 0,
        jitter: 0.02,
        bytesReceived: 0,
        currentRoundTripTime: 120,
        availableIncomingBitrate: 900000
      };
    }
  }

  /**
   * Detect connection type using Navigator APIs
   */
  private detectConnectionType(): void {
    try {
      // @ts-ignore - Network Information API
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        
        switch (effectiveType) {
          case 'slow-2g':
          case '2g':
            this.networkConditions.connectionType = 'cellular';
            this.networkConditions.bandwidth = Math.min(this.networkConditions.bandwidth, 300);
            break;
          case '3g':
            this.networkConditions.connectionType = 'cellular';
            this.networkConditions.bandwidth = Math.min(this.networkConditions.bandwidth, 1000);
            break;
          case '4g':
            this.networkConditions.connectionType = 'cellular';
            this.networkConditions.bandwidth = Math.min(this.networkConditions.bandwidth, 5000);
            break;
          default:
            this.networkConditions.connectionType = 'wifi';
        }

        // Listen for connection changes
        connection.addEventListener('change', () => {
          this.detectConnectionType();
          this.adaptQuality();
        });
      }

    } catch (error) {
      console.log('ℹ️ Network Information API not available');
    }
  }

  /**
   * Adapt quality based on current network conditions
   */
  private async adaptQuality(): Promise<void> {
    try {
      const optimalQuality = this.calculateOptimalQuality();
      
      // Only adapt if quality change is significant
      if (this.shouldAdaptQuality(optimalQuality)) {
        const previousQuality = { ...this.currentQuality };
        this.currentQuality = optimalQuality;

        // Apply the new quality settings
        await this.applyQualitySettings(optimalQuality);

        // Record adaptation history
        this.recordAdaptation(optimalQuality, this.getAdaptationReason(previousQuality, optimalQuality));

        // Emit quality change event
        this.emit('quality-adapted', {
          previousQuality,
          newQuality: optimalQuality,
          networkConditions: { ...this.networkConditions },
          reason: this.getAdaptationReason(previousQuality, optimalQuality)
        });

        console.log(`📊 Quality adapted: ${previousQuality.resolution.width}x${previousQuality.resolution.height}@${previousQuality.frameRate}fps → ${optimalQuality.resolution.width}x${optimalQuality.resolution.height}@${optimalQuality.frameRate}fps`);
      }

    } catch (error) {
      console.error('❌ Failed to adapt quality:', error);
    }
  }

  /**
   * Calculate optimal quality based on network conditions (Google Meet style algorithm)
   */
  private calculateOptimalQuality(): QualitySettings {
    const { bandwidth, latency, packetLoss, connectionType } = this.networkConditions;
    
    // Start with the highest quality and work down
    let optimalQuality = this.adaptationRules.qualitySteps[this.adaptationRules.qualitySteps.length - 1];

    for (let i = this.adaptationRules.qualitySteps.length - 1; i >= 0; i--) {
      const quality = this.adaptationRules.qualitySteps[i];
      
      // Check if this quality is suitable for current conditions
      if (this.isQualitySuitable(quality, bandwidth, latency, packetLoss, connectionType)) {
        optimalQuality = quality;
        break;
      }
    }

    // Apply additional optimizations based on connection type
    return this.optimizeForConnectionType(optimalQuality, connectionType);
  }

  /**
   * Check if a quality setting is suitable for current network conditions
   */
  private isQualitySuitable(
    quality: QualitySettings,
    bandwidth: number,
    latency: number,
    packetLoss: number,
    connectionType: string
  ): boolean {
    // Bandwidth requirement (with 20% buffer)
    const requiredBandwidth = quality.bitrate * 1.2;
    if (bandwidth < requiredBandwidth) return false;

    // Latency requirement
    if (latency > this.adaptationRules.targetLatency) {
      // Reduce quality requirements for high latency
      const latencyFactor = Math.min(latency / this.adaptationRules.targetLatency, 2);
      if (quality.bitrate > (this.adaptationRules.maxBitrate / latencyFactor)) return false;
    }

    // Packet loss requirement
    if (packetLoss > this.adaptationRules.maxPacketLoss) {
      // High packet loss requires lower bitrates
      const lossAdjustedMaxBitrate = this.adaptationRules.maxBitrate * (1 - packetLoss / 100);
      if (quality.bitrate > lossAdjustedMaxBitrate) return false;
    }

    // Connection type specific checks
    if (connectionType === 'cellular') {
      // Cellular connections: prefer lower resolution, higher compression
      if (quality.resolution.width > 854) return false;
      if (quality.frameRate > 24) return false;
    }

    return true;
  }

  /**
   * Optimize quality settings for specific connection types
   */
  private optimizeForConnectionType(quality: QualitySettings, connectionType: string): QualitySettings {
    const optimized = { ...quality };

    switch (connectionType) {
      case 'cellular':
        // Cellular: Prioritize battery life and data usage
        optimized.frameRate = Math.min(optimized.frameRate, 24);
        optimized.codec = 'VP8'; // Better battery efficiency
        break;
        
      case 'wifi':
        // WiFi: Can use higher quality
        if (this.networkConditions.bandwidth > 5000) {
          optimized.codec = 'VP9'; // Better compression
        }
        break;
        
      case 'ethernet':
        // Ethernet: Maximum quality available
        optimized.codec = 'AV1'; // Best compression for high-end connections
        break;
    }

    return optimized;
  }

  /**
   * Determine if quality adaptation should occur
   */
  private shouldAdaptQuality(newQuality: QualitySettings): boolean {
    const current = this.currentQuality;
    
    // Check for significant resolution change
    const resolutionChange = (
      current.resolution.width !== newQuality.resolution.width ||
      current.resolution.height !== newQuality.resolution.height
    );

    // Check for significant bitrate change (>15% difference)
    const bitrateChangePct = Math.abs(current.bitrate - newQuality.bitrate) / current.bitrate;
    const significantBitrateChange = bitrateChangePct > 0.15;

    // Check for frame rate change
    const frameRateChange = current.frameRate !== newQuality.frameRate;

    // Avoid frequent adaptations (debouncing)
    const timeSinceLastAdaptation = Date.now() - (this.getLastAdaptationTime() || 0);
    const minAdaptationInterval = 5000; // 5 seconds minimum between adaptations

    if (timeSinceLastAdaptation < minAdaptationInterval) {
      return false;
    }

    return resolutionChange || significantBitrateChange || frameRateChange;
  }

  /**
   * Apply quality settings to actual WebRTC connections
   */
  private async applyQualitySettings(quality: QualitySettings): Promise<void> {
    try {
      for (const [participantId, peerConnection] of Array.from(this.peerConnections.entries())) {
        const sender = peerConnection.getSenders().find((s: RTCRtpSender) => s.track?.kind === 'video');
        
        if (sender) {
          const params = sender.getParameters();
          
          if (params.encodings && params.encodings.length > 0) {
            // Update encoding parameters
            params.encodings[0].maxBitrate = quality.bitrate * 1000; // Convert to bps
            params.encodings[0].maxFramerate = quality.frameRate;
            
            // Apply resolution constraints if supported
            if (params.encodings[0].scaleResolutionDownBy) {
              const currentTrack = sender.track as MediaStreamTrack;
              const currentSettings = currentTrack.getSettings();
              
              if (currentSettings.width && currentSettings.height) {
                const scaleFactorX = currentSettings.width / quality.resolution.width;
                const scaleFactorY = currentSettings.height / quality.resolution.height;
                const scaleFactor = Math.max(scaleFactorX, scaleFactorY, 1);
                
                params.encodings[0].scaleResolutionDownBy = scaleFactor;
              }
            }

            await sender.setParameters(params);
          }
        }
      }

      console.log(`✅ Applied quality settings: ${quality.resolution.width}x${quality.resolution.height}@${quality.frameRate}fps, ${quality.bitrate}kbps`);

    } catch (error) {
      console.error('❌ Failed to apply quality settings:', error);
    }
  }

  /**
   * Record adaptation in history for analysis
   */
  private recordAdaptation(quality: QualitySettings, reason: string): void {
    this.adaptationHistory.push({
      timestamp: Date.now(),
      quality: { ...quality },
      reason
    });

    // Keep only last 50 adaptations
    if (this.adaptationHistory.length > 50) {
      this.adaptationHistory = this.adaptationHistory.slice(-50);
    }
  }

  /**
   * Get reason for quality adaptation
   */
  private getAdaptationReason(previous: QualitySettings, current: QualitySettings): string {
    const { bandwidth, latency, packetLoss } = this.networkConditions;
    
    if (current.bitrate < previous.bitrate) {
      if (bandwidth < previous.bitrate * 1.2) return 'Insufficient bandwidth';
      if (latency > this.adaptationRules.targetLatency) return 'High latency';
      if (packetLoss > this.adaptationRules.maxPacketLoss) return 'High packet loss';
      return 'Network degradation';
    } else if (current.bitrate > previous.bitrate) {
      return 'Network improvement';
    }
    
    return 'Optimization';
  }

  /**
   * Get timestamp of last adaptation
   */
  private getLastAdaptationTime(): number | null {
    return this.adaptationHistory.length > 0 
      ? this.adaptationHistory[this.adaptationHistory.length - 1].timestamp 
      : null;
  }

  /**
   * Get current quality settings
   */
  getCurrentQuality(): QualitySettings {
    return { ...this.currentQuality };
  }

  /**
   * Get current network conditions
   */
  getNetworkConditions(): NetworkConditions {
    return { ...this.networkConditions };
  }

  /**
   * Get adaptation history for analysis
   */
  getAdaptationHistory(): Array<{ timestamp: number; quality: QualitySettings; reason: string }> {
    return [...this.adaptationHistory];
  }

  /**
   * Force quality adaptation (for testing or manual override)
   */
  async forceQuality(quality: QualitySettings): Promise<void> {
    const previousQuality = { ...this.currentQuality };
    this.currentQuality = quality;
    
    await this.applyQualitySettings(quality);
    this.recordAdaptation(quality, 'Manual override');
    
    this.emit('quality-adapted', {
      previousQuality,
      newQuality: quality,
      networkConditions: { ...this.networkConditions },
      reason: 'Manual override'
    });
  }

  /**
   * Get quality recommendation without applying it
   */
  getQualityRecommendation(): QualitySettings {
    return this.calculateOptimalQuality();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.adaptationHistory = [];
    this.removeAllListeners();
  }
}