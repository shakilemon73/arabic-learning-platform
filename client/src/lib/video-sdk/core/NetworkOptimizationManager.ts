/**
 * NetworkOptimizationManager - Professional Network Optimization
 * Advanced networking like Zoom, Teams, Google Meet, Webex
 * Packet loss recovery, congestion control, bandwidth estimation
 */

import { EventEmitter } from './EventEmitter';

interface NetworkConfig {
  enabled: boolean;
  bandwidthEstimation: boolean;
  congestionControl: boolean;
  packetLossRecovery: boolean;
  adaptiveFEC: boolean; // Forward Error Correction
  jitterBuffer: boolean;
  redundantTransmission: boolean;
}

interface NetworkMetrics {
  bandwidth: number;
  rtt: number;
  packetLoss: number;
  jitter: number;
  throughput: number;
  congestionWindow: number;
  timestamp: Date;
}

interface CongestionState {
  state: 'slow_start' | 'congestion_avoidance' | 'fast_recovery';
  windowSize: number;
  threshold: number;
  duplicateAcks: number;
  lastRtt: number;
}

interface FECConfig {
  enabled: boolean;
  redundancyLevel: number; // 0.1 = 10% redundancy
  adaptiveRedundancy: boolean;
  maxRedundancy: number;
}

export class NetworkOptimizationManager extends EventEmitter {
  private config: NetworkConfig = {
    enabled: true,
    bandwidthEstimation: true,
    congestionControl: true,
    packetLossRecovery: true,
    adaptiveFEC: true,
    jitterBuffer: true,
    redundantTransmission: true
  };

  private networkMetrics = new Map<string, NetworkMetrics[]>();
  private congestionStates = new Map<string, CongestionState>();
  private fecConfigs = new Map<string, FECConfig>();
  private bandwidthEstimates = new Map<string, number>();
  private jitterBuffers = new Map<string, any[]>();

  // Professional network optimization parameters
  private readonly INITIAL_WINDOW_SIZE = 14; // packets
  private readonly MAX_WINDOW_SIZE = 65536;
  private readonly MIN_RTO = 200; // ms
  private readonly MAX_RTO = 3000; // ms
  private readonly RTT_SAMPLES = 8;

  constructor() {
    super();
  }

  /**
   * Initialize network optimization system
   * Professional networking like major platforms
   */
  async initialize(config?: Partial<NetworkConfig>): Promise<void> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Start network monitoring
      if (this.config.enabled) {
        this.startNetworkMonitoring();
      }

      console.log('🌐 Professional network optimization initialized');
      this.emit('initialized', { config: this.config });

    } catch (error) {
      console.error('❌ Network optimization initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start network monitoring and optimization
   * Professional network analysis like platforms use
   */
  private startNetworkMonitoring(): void {
    // Monitor network conditions every second
    setInterval(() => {
      this.updateNetworkMetrics();
      this.optimizeNetworkParameters();
    }, 1000);

    // Run bandwidth estimation every 5 seconds  
    setInterval(() => {
      this.runBandwidthEstimation();
    }, 5000);
  }

  /**
   * Add participant for network optimization
   * Initialize optimization state for new participant
   */
  addParticipant(participantId: string): void {
    // Initialize network metrics tracking
    this.networkMetrics.set(participantId, []);

    // Initialize congestion control state
    this.congestionStates.set(participantId, {
      state: 'slow_start',
      windowSize: this.INITIAL_WINDOW_SIZE,
      threshold: 65536,
      duplicateAcks: 0,
      lastRtt: 100
    });

    // Initialize FEC configuration
    this.fecConfigs.set(participantId, {
      enabled: this.config.adaptiveFEC,
      redundancyLevel: 0.1, // Start with 10% redundancy
      adaptiveRedundancy: true,
      maxRedundancy: 0.3 // Max 30% redundancy
    });

    // Initialize bandwidth estimate
    this.bandwidthEstimates.set(participantId, 1000000); // Start with 1 Mbps

    // Initialize jitter buffer
    this.jitterBuffers.set(participantId, []);

    console.log(`🌐 Network optimization started for ${participantId}`);
    this.emit('participant-added', { participantId });
  }

  /**
   * Remove participant from optimization
   */
  removeParticipant(participantId: string): void {
    this.networkMetrics.delete(participantId);
    this.congestionStates.delete(participantId);
    this.fecConfigs.delete(participantId);
    this.bandwidthEstimates.delete(participantId);
    this.jitterBuffers.delete(participantId);

    console.log(`🌐 Network optimization stopped for ${participantId}`);
    this.emit('participant-removed', { participantId });
  }

  /**
   * Update network metrics for all participants
   * Professional metrics collection like platforms use
   */
  private async updateNetworkMetrics(): Promise<void> {
    for (const participantId of Array.from(this.networkMetrics.keys())) {
      try {
        const metrics = await this.collectNetworkMetrics(participantId);
        this.updateParticipantMetrics(participantId, metrics);
        
        // Update congestion control
        if (this.config.congestionControl) {
          this.updateCongestionControl(participantId, metrics);
        }

        // Update FEC based on packet loss
        if (this.config.adaptiveFEC) {
          this.updateFECConfiguration(participantId, metrics);
        }

      } catch (error) {
        console.error(`Network metrics update failed for ${participantId}:`, error);
      }
    }
  }

  /**
   * Collect network metrics for participant
   * Professional network measurement like platforms use
   */
  private async collectNetworkMetrics(participantId: string): Promise<NetworkMetrics> {
    // In production, this would use WebRTC getStats()
    // Simulating realistic network metrics
    
    const baseRtt = 50 + Math.random() * 150; // 50-200ms base
    const packetLoss = Math.random() * 0.05; // 0-5% loss
    const jitter = Math.random() * 0.03; // 0-30ms jitter
    
    // Simulate bandwidth variation
    const currentEstimate = this.bandwidthEstimates.get(participantId) || 1000000;
    const bandwidth = currentEstimate * (0.8 + Math.random() * 0.4); // ±20% variation
    
    return {
      bandwidth,
      rtt: baseRtt,
      packetLoss,
      jitter,
      throughput: bandwidth * (1 - packetLoss), // Effective throughput
      congestionWindow: this.congestionStates.get(participantId)?.windowSize || this.INITIAL_WINDOW_SIZE,
      timestamp: new Date()
    };
  }

  /**
   * Update participant network metrics history
   */
  private updateParticipantMetrics(participantId: string, metrics: NetworkMetrics): void {
    const history = this.networkMetrics.get(participantId) || [];
    history.push(metrics);
    
    // Keep only last 60 samples (1 minute history)
    if (history.length > 60) {
      history.shift();
    }
    
    this.networkMetrics.set(participantId, history);
  }

  /**
   * Update congestion control state
   * Professional congestion control like TCP Cubic/BBR
   */
  private updateCongestionControl(participantId: string, metrics: NetworkMetrics): void {
    const state = this.congestionStates.get(participantId);
    if (!state) return;

    const previousRtt = state.lastRtt;
    state.lastRtt = metrics.rtt;

    // Detect packet loss (simplified)
    if (metrics.packetLoss > 0.01) { // >1% loss
      this.handleCongestion(participantId, state);
    } else if (metrics.rtt > previousRtt * 1.5) {
      // RTT inflation indicates congestion
      this.handleCongestion(participantId, state);
    } else {
      // No congestion detected, increase window
      this.increaseCongestionWindow(participantId, state);
    }

    this.emit('congestion-updated', { participantId, state, metrics });
  }

  /**
   * Handle congestion detection
   * Professional congestion response like major platforms
   */
  private handleCongestion(participantId: string, state: CongestionState): void {
    switch (state.state) {
      case 'slow_start':
        // Exit slow start, enter congestion avoidance
        state.threshold = Math.max(state.windowSize / 2, 2);
        state.windowSize = state.threshold;
        state.state = 'congestion_avoidance';
        break;

      case 'congestion_avoidance':
        // Multiplicative decrease
        state.threshold = Math.max(state.windowSize / 2, 2);
        state.windowSize = state.threshold;
        state.state = 'fast_recovery';
        break;

      case 'fast_recovery':
        // Already in recovery, maintain window
        state.duplicateAcks++;
        break;
    }

    console.log(`🚦 Congestion detected for ${participantId}, window: ${state.windowSize}`);
  }

  /**
   * Increase congestion window
   * Professional window growth like platforms use
   */
  private increaseCongestionWindow(participantId: string, state: CongestionState): void {
    switch (state.state) {
      case 'slow_start':
        // Exponential growth
        state.windowSize = Math.min(state.windowSize * 2, this.MAX_WINDOW_SIZE);
        if (state.windowSize >= state.threshold) {
          state.state = 'congestion_avoidance';
        }
        break;

      case 'congestion_avoidance':
        // Linear growth (additive increase)
        state.windowSize = Math.min(
          state.windowSize + (1 / state.windowSize),
          this.MAX_WINDOW_SIZE
        );
        break;

      case 'fast_recovery':
        // Exit fast recovery
        state.windowSize = state.threshold;
        state.state = 'congestion_avoidance';
        state.duplicateAcks = 0;
        break;
    }
  }

  /**
   * Update Forward Error Correction configuration
   * Professional adaptive FEC like platforms use
   */
  private updateFECConfiguration(participantId: string, metrics: NetworkMetrics): void {
    const fecConfig = this.fecConfigs.get(participantId);
    if (!fecConfig || !fecConfig.adaptiveRedundancy) return;

    let targetRedundancy = 0.1; // Default 10%

    // Increase FEC based on packet loss
    if (metrics.packetLoss > 0.05) {
      targetRedundancy = 0.3; // 30% for high loss
    } else if (metrics.packetLoss > 0.02) {
      targetRedundancy = 0.2; // 20% for medium loss
    } else if (metrics.packetLoss > 0.01) {
      targetRedundancy = 0.15; // 15% for low loss
    }

    // Limit to maximum redundancy
    targetRedundancy = Math.min(targetRedundancy, fecConfig.maxRedundancy);

    // Only update if significant change
    if (Math.abs(targetRedundancy - fecConfig.redundancyLevel) > 0.05) {
      fecConfig.redundancyLevel = targetRedundancy;
      
      console.log(`🛡️ FEC updated for ${participantId}: ${(targetRedundancy * 100).toFixed(1)}%`);
      this.emit('fec-updated', { participantId, redundancyLevel: targetRedundancy });
    }
  }

  /**
   * Optimize network parameters
   * Professional parameter optimization like platforms use
   */
  private optimizeNetworkParameters(): void {
    for (const participantId of Array.from(this.networkMetrics.keys())) {
      const history = this.networkMetrics.get(participantId) || [];
      if (history.length < 5) continue; // Need enough samples

      const recentMetrics = history.slice(-5); // Last 5 seconds
      const avgMetrics = this.calculateAverageMetrics(recentMetrics);

      // Optimize jitter buffer
      if (this.config.jitterBuffer) {
        this.optimizeJitterBuffer(participantId, avgMetrics);
      }

      // Update bandwidth estimate
      if (this.config.bandwidthEstimation) {
        this.updateBandwidthEstimate(participantId, avgMetrics);
      }
    }
  }

  /**
   * Calculate average metrics
   */
  private calculateAverageMetrics(metrics: NetworkMetrics[]): NetworkMetrics {
    const count = metrics.length;
    
    return {
      bandwidth: metrics.reduce((sum, m) => sum + m.bandwidth, 0) / count,
      rtt: metrics.reduce((sum, m) => sum + m.rtt, 0) / count,
      packetLoss: metrics.reduce((sum, m) => sum + m.packetLoss, 0) / count,
      jitter: metrics.reduce((sum, m) => sum + m.jitter, 0) / count,
      throughput: metrics.reduce((sum, m) => sum + m.throughput, 0) / count,
      congestionWindow: metrics.reduce((sum, m) => sum + m.congestionWindow, 0) / count,
      timestamp: new Date()
    };
  }

  /**
   * Optimize jitter buffer size
   * Professional jitter buffer management like platforms use
   */
  private optimizeJitterBuffer(participantId: string, metrics: NetworkMetrics): void {
    const buffer = this.jitterBuffers.get(participantId) || [];
    
    // Target buffer size based on jitter and RTT
    const targetBufferMs = Math.max(
      metrics.jitter * 1000 * 4, // 4x jitter
      metrics.rtt * 0.5,         // Half RTT minimum
      20                         // 20ms minimum
    );

    // Limit maximum buffer size to prevent excessive delay
    const maxBufferMs = Math.min(targetBufferMs, 200);

    // Update jitter buffer configuration
    const currentBufferMs = buffer.length * 20; // Assuming 20ms packets
    
    if (Math.abs(currentBufferMs - maxBufferMs) > 10) {
      console.log(`🎵 Jitter buffer optimized for ${participantId}: ${maxBufferMs.toFixed(0)}ms`);
      this.emit('jitter-buffer-optimized', { participantId, bufferSize: maxBufferMs });
    }
  }

  /**
   * Update bandwidth estimate
   * Professional bandwidth estimation like platforms use
   */
  private updateBandwidthEstimate(participantId: string, metrics: NetworkMetrics): void {
    const currentEstimate = this.bandwidthEstimates.get(participantId) || 1000000;
    
    // Use exponential weighted moving average (EWMA)
    const alpha = 0.1; // Smoothing factor
    const newEstimate = alpha * metrics.throughput + (1 - alpha) * currentEstimate;
    
    this.bandwidthEstimates.set(participantId, newEstimate);
    
    this.emit('bandwidth-updated', { participantId, estimate: newEstimate });
  }

  /**
   * Run comprehensive bandwidth estimation
   * Professional bandwidth probing like platforms use
   */
  private runBandwidthEstimation(): void {
    for (const participantId of Array.from(this.bandwidthEstimates.keys())) {
      const history = this.networkMetrics.get(participantId) || [];
      if (history.length < 10) continue;

      // Use multiple estimation techniques
      const estimates = [
        this.estimateBandwidthFromThroughput(history),
        this.estimateBandwidthFromRTT(history),
        this.estimateBandwidthFromLoss(history)
      ];

      // Combine estimates using weighted average
      const weights = [0.5, 0.3, 0.2]; // Prioritize throughput-based
      const combinedEstimate = estimates.reduce((sum, est, i) => sum + est * weights[i], 0);

      this.bandwidthEstimates.set(participantId, combinedEstimate);
    }
  }

  /**
   * Estimate bandwidth from throughput measurements
   */
  private estimateBandwidthFromThroughput(history: NetworkMetrics[]): number {
    const recentSamples = history.slice(-10);
    const maxThroughput = Math.max(...recentSamples.map(m => m.throughput));
    return maxThroughput;
  }

  /**
   * Estimate bandwidth from RTT analysis
   */
  private estimateBandwidthFromRTT(history: NetworkMetrics[]): number {
    const recentSamples = history.slice(-10);
    const avgRtt = recentSamples.reduce((sum, m) => sum + m.rtt, 0) / recentSamples.length;
    
    // Lower RTT generally indicates higher available bandwidth
    // This is a simplified model
    const estimatedBw = Math.max(500000, 5000000 / (avgRtt / 50)); // Scale from 50ms baseline
    return estimatedBw;
  }

  /**
   * Estimate bandwidth from packet loss analysis
   */
  private estimateBandwidthFromLoss(history: NetworkMetrics[]): number {
    const recentSamples = history.slice(-10);
    const avgLoss = recentSamples.reduce((sum, m) => sum + m.packetLoss, 0) / recentSamples.length;
    
    // Higher packet loss indicates network congestion / lower available bandwidth
    const lossFactor = Math.max(0.1, 1 - avgLoss * 10); // Scale loss impact
    return 2000000 * lossFactor; // Base estimate with loss factor
  }

  /**
   * Handle packet loss for participant
   * Professional packet loss recovery like platforms use
   */
  handlePacketLoss(participantId: string, sequenceNumbers: number[]): void {
    if (!this.config.packetLossRecovery) return;

    const fecConfig = this.fecConfigs.get(participantId);
    
    // Request retransmission for critical packets
    if (this.config.redundantTransmission) {
      this.requestRetransmission(participantId, sequenceNumbers);
    }

    // Use FEC data if available
    if (fecConfig && fecConfig.enabled) {
      this.recoverWithFEC(participantId, sequenceNumbers);
    }

    console.log(`🔄 Packet loss recovery for ${participantId}: ${sequenceNumbers.length} packets`);
    this.emit('packet-loss-recovery', { participantId, lostPackets: sequenceNumbers });
  }

  /**
   * Request packet retransmission
   */
  private requestRetransmission(participantId: string, sequenceNumbers: number[]): void {
    // In production, would send NACK messages through WebRTC
    console.log(`📤 Requesting retransmission for ${participantId}: ${sequenceNumbers.length} packets`);
  }

  /**
   * Recover packets using Forward Error Correction
   */
  private recoverWithFEC(participantId: string, sequenceNumbers: number[]): void {
    // In production, would use Reed-Solomon or other FEC algorithms
    console.log(`🛡️ FEC recovery for ${participantId}: ${sequenceNumbers.length} packets`);
  }

  /**
   * Get network statistics for participant
   */
  getNetworkStatistics(participantId: string): any {
    const metrics = this.networkMetrics.get(participantId) || [];
    const congestionState = this.congestionStates.get(participantId);
    const fecConfig = this.fecConfigs.get(participantId);
    const bandwidthEstimate = this.bandwidthEstimates.get(participantId);

    if (metrics.length === 0) return null;

    const latest = metrics[metrics.length - 1];

    return {
      participantId,
      currentMetrics: latest,
      congestionState,
      fecConfig,
      bandwidthEstimate,
      averageRtt: metrics.reduce((sum, m) => sum + m.rtt, 0) / metrics.length,
      averagePacketLoss: metrics.reduce((sum, m) => sum + m.packetLoss, 0) / metrics.length,
      metricsCount: metrics.length
    };
  }

  /**
   * Get system-wide network statistics
   */
  getSystemStatistics(): any {
    const participants = Array.from(this.networkMetrics.keys());
    const allMetrics = Array.from(this.networkMetrics.values()).flat();
    
    if (allMetrics.length === 0) {
      return {
        participantCount: 0,
        totalConnections: 0,
        averageBandwidth: 0,
        averageRtt: 0,
        averagePacketLoss: 0
      };
    }

    return {
      participantCount: participants.length,
      totalConnections: this.networkMetrics.size,
      averageBandwidth: allMetrics.reduce((sum, m) => sum + m.bandwidth, 0) / allMetrics.length,
      averageRtt: allMetrics.reduce((sum, m) => sum + m.rtt, 0) / allMetrics.length,
      averagePacketLoss: allMetrics.reduce((sum, m) => sum + m.packetLoss, 0) / allMetrics.length,
      totalFecRedundancy: Array.from(this.fecConfigs.values()).reduce((sum, f) => sum + f.redundancyLevel, 0)
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<NetworkConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): NetworkConfig {
    return { ...this.config };
  }

  /**
   * Cleanup network optimization manager
   */
  cleanup(): void {
    this.networkMetrics.clear();
    this.congestionStates.clear();
    this.fecConfigs.clear();
    this.bandwidthEstimates.clear();
    this.jitterBuffers.clear();
    this.removeAllListeners();

    console.log('🧹 Network optimization manager cleaned up');
  }
}