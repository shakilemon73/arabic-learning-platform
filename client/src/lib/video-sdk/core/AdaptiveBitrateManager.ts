/**
 * AdaptiveBitrateManager - Professional Adaptive Streaming
 * Real-time quality adaptation like Zoom, Teams, Google Meet, Webex
 * Dynamic bitrate and resolution adjustment based on network conditions
 */

import { EventEmitter } from './EventEmitter';

interface BitrateConfig {
  enabled: boolean;
  minBitrate: number;
  maxBitrate: number;
  initialBitrate: number;
  adaptationThreshold: number;
  stabilityPeriod: number; // seconds
}

interface NetworkCondition {
  bandwidth: number;
  rtt: number;
  packetLoss: number;
  jitter: number;
  timestamp: Date;
}

interface QualityLevel {
  id: string;
  width: number;
  height: number;
  framerate: number;
  bitrate: number;
  codec: string;
}

interface AdaptationDecision {
  participantId: string;
  currentQuality: QualityLevel;
  targetQuality: QualityLevel;
  reason: string;
  confidence: number;
  timestamp: Date;
}

export class AdaptiveBitrateManager extends EventEmitter {
  private config: BitrateConfig = {
    enabled: true,
    minBitrate: 150000,    // 150 Kbps minimum
    maxBitrate: 3000000,   // 3 Mbps maximum
    initialBitrate: 1000000, // 1 Mbps starting point
    adaptationThreshold: 0.1, // 10% threshold for changes
    stabilityPeriod: 10     // 10 seconds stability period
  };

  private participantConditions = new Map<string, NetworkCondition[]>();
  private currentQualities = new Map<string, QualityLevel>();
  private adaptationHistory = new Map<string, AdaptationDecision[]>();
  private stabilityTimers = new Map<string, NodeJS.Timeout>();

  // Quality levels like professional platforms use
  private qualityLevels: QualityLevel[] = [
    {
      id: 'ultra',
      width: 1920,
      height: 1080,
      framerate: 30,
      bitrate: 2500000,
      codec: 'VP9'
    },
    {
      id: 'high',
      width: 1280,
      height: 720,
      framerate: 30,
      bitrate: 1200000,
      codec: 'VP9'
    },
    {
      id: 'medium',
      width: 854,
      height: 480,
      framerate: 30,
      bitrate: 600000,
      codec: 'VP8'
    },
    {
      id: 'low',
      width: 640,
      height: 360,
      framerate: 15,
      bitrate: 300000,
      codec: 'VP8'
    },
    {
      id: 'minimal',
      width: 320,
      height: 180,
      framerate: 10,
      bitrate: 150000,
      codec: 'H264'
    }
  ];

  constructor() {
    super();
  }

  /**
   * Initialize adaptive bitrate system
   * Professional quality adaptation like major platforms
   */
  async initialize(config?: Partial<BitrateConfig>): Promise<void> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Start monitoring network conditions
      this.startNetworkMonitoring();

      console.log('📊 Professional adaptive bitrate system initialized');
      this.emit('initialized', { config: this.config });

    } catch (error) {
      console.error('❌ Adaptive bitrate initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start monitoring network conditions
   * Professional network analysis like platforms use
   */
  private startNetworkMonitoring(): void {
    // Monitor every 2 seconds for responsive adaptation
    setInterval(() => {
      this.collectNetworkMetrics();
    }, 2000);
  }

  /**
   * Collect network metrics for all participants
   * Real-time network analysis like Zoom/Teams
   */
  private async collectNetworkMetrics(): Promise<void> {
    for (const participantId of Array.from(this.currentQualities.keys())) {
      try {
        const condition = await this.measureNetworkCondition(participantId);
        this.updateParticipantConditions(participantId, condition);
        
        // Check if adaptation is needed
        await this.evaluateAdaptationNeed(participantId);
        
      } catch (error) {
        console.error(`Network monitoring failed for ${participantId}:`, error);
      }
    }
  }

  /**
   * Measure current network condition for participant
   * Professional network assessment like major platforms
   */
  private async measureNetworkCondition(participantId: string): Promise<NetworkCondition> {
    // In production, this would use WebRTC stats API
    // Simulating professional network measurement
    
    // Get RTCPeerConnection stats (real implementation)
    const mockStats = this.getMockNetworkStats();
    
    return {
      bandwidth: mockStats.availableBandwidth,
      rtt: mockStats.roundTripTime,
      packetLoss: mockStats.packetLossRate,
      jitter: mockStats.jitter,
      timestamp: new Date()
    };
  }

  /**
   * Mock network stats for demonstration
   * In production, this uses real WebRTC stats
   */
  private getMockNetworkStats(): any {
    return {
      availableBandwidth: Math.random() * 3000000 + 500000, // 0.5-3.5 Mbps
      roundTripTime: Math.random() * 200 + 50,              // 50-250ms
      packetLossRate: Math.random() * 0.05,                 // 0-5% loss
      jitter: Math.random() * 0.03                          // 0-30ms jitter
    };
  }

  /**
   * Update participant network conditions history
   * Professional condition tracking like platforms use
   */
  private updateParticipantConditions(participantId: string, condition: NetworkCondition): void {
    if (!this.participantConditions.has(participantId)) {
      this.participantConditions.set(participantId, []);
    }

    const conditions = this.participantConditions.get(participantId)!;
    conditions.push(condition);

    // Keep only last 30 samples (1 minute history at 2-second intervals)
    if (conditions.length > 30) {
      conditions.shift();
    }
  }

  /**
   * Evaluate if adaptation is needed for participant
   * Professional adaptation algorithm like Zoom/Teams use
   */
  private async evaluateAdaptationNeed(participantId: string): Promise<void> {
    const conditions = this.participantConditions.get(participantId);
    const currentQuality = this.currentQualities.get(participantId);

    if (!conditions || conditions.length < 5 || !currentQuality) {
      return;
    }

    // Calculate average conditions over recent samples
    const recentConditions = conditions.slice(-5); // Last 10 seconds
    const avgCondition = this.calculateAverageCondition(recentConditions);

    // Determine optimal quality level
    const targetQuality = this.determineOptimalQuality(avgCondition);

    // Check if adaptation is needed
    if (this.shouldAdapt(currentQuality, targetQuality, avgCondition)) {
      await this.performAdaptation(participantId, currentQuality, targetQuality, avgCondition);
    }
  }

  /**
   * Calculate average network condition
   * Professional condition analysis like platforms use
   */
  private calculateAverageCondition(conditions: NetworkCondition[]): NetworkCondition {
    const count = conditions.length;
    
    return {
      bandwidth: conditions.reduce((sum, c) => sum + c.bandwidth, 0) / count,
      rtt: conditions.reduce((sum, c) => sum + c.rtt, 0) / count,
      packetLoss: conditions.reduce((sum, c) => sum + c.packetLoss, 0) / count,
      jitter: conditions.reduce((sum, c) => sum + c.jitter, 0) / count,
      timestamp: new Date()
    };
  }

  /**
   * Determine optimal quality level based on network conditions
   * Professional quality selection like major platforms use
   */
  private determineOptimalQuality(condition: NetworkCondition): QualityLevel {
    // Professional quality selection algorithm
    let score = 100;

    // Bandwidth factor (most important)
    const bandwidthScore = Math.min(100, (condition.bandwidth / 2500000) * 100);
    score = score * 0.5 + bandwidthScore * 0.5;

    // RTT factor (latency impact)
    const rttScore = Math.max(0, 100 - (condition.rtt - 50) * 0.5);
    score = score * 0.8 + rttScore * 0.2;

    // Packet loss factor (critical for quality)
    const lossScore = Math.max(0, 100 - condition.packetLoss * 2000);
    score = score * 0.7 + lossScore * 0.3;

    // Jitter factor (affects smoothness)
    const jitterScore = Math.max(0, 100 - condition.jitter * 3000);
    score = score * 0.9 + jitterScore * 0.1;

    // Select quality based on composite score
    if (score >= 85) return this.qualityLevels[0]; // Ultra
    if (score >= 70) return this.qualityLevels[1]; // High
    if (score >= 50) return this.qualityLevels[2]; // Medium
    if (score >= 30) return this.qualityLevels[3]; // Low
    return this.qualityLevels[4]; // Minimal
  }

  /**
   * Check if adaptation should be performed
   * Professional adaptation decision like platforms use
   */
  private shouldAdapt(current: QualityLevel, target: QualityLevel, condition: NetworkCondition): boolean {
    // Don't adapt if target is the same
    if (current.id === target.id) return false;

    // Check if we're in stability period
    if (this.stabilityTimers.has(current.id)) return false;

    // Calculate quality difference
    const bitrateChange = Math.abs(target.bitrate - current.bitrate) / current.bitrate;
    
    // Only adapt if change is significant enough
    if (bitrateChange < this.config.adaptationThreshold) return false;

    // Professional adaptation criteria
    if (target.bitrate > current.bitrate) {
      // Upgrading: be more conservative
      return condition.bandwidth > target.bitrate * 1.5 && // 50% headroom
             condition.packetLoss < 0.01 &&                // Less than 1% loss
             condition.rtt < 150;                           // Good latency
    } else {
      // Downgrading: be more aggressive for stability
      return condition.bandwidth < current.bitrate * 1.2 || // 20% headroom
             condition.packetLoss > 0.02 ||                  // More than 2% loss
             condition.rtt > 300;                            // High latency
    }
  }

  /**
   * Perform quality adaptation
   * Professional adaptation execution like major platforms
   */
  private async performAdaptation(
    participantId: string, 
    current: QualityLevel, 
    target: QualityLevel,
    condition: NetworkCondition
  ): Promise<void> {
    try {
      // Create adaptation decision record
      const decision: AdaptationDecision = {
        participantId,
        currentQuality: current,
        targetQuality: target,
        reason: this.generateAdaptationReason(current, target, condition),
        confidence: this.calculateAdaptationConfidence(condition),
        timestamp: new Date()
      };

      // Update current quality
      this.currentQualities.set(participantId, target);

      // Record adaptation history
      this.recordAdaptationDecision(participantId, decision);

      // Set stability period to prevent rapid changes
      this.setStabilityPeriod(participantId);

      // Emit adaptation event for UI/logging
      this.emit('quality-adapted', {
        participantId,
        decision,
        networkCondition: condition
      });

      console.log(`🎯 Quality adapted for ${participantId}: ${current.id} -> ${target.id} (${decision.reason})`);

      // In production, this would trigger actual encoder changes
      await this.applyQualityChanges(participantId, target);

    } catch (error) {
      console.error(`❌ Adaptation failed for ${participantId}:`, error);
    }
  }

  /**
   * Generate human-readable adaptation reason
   * Professional adaptation logging like platforms use
   */
  private generateAdaptationReason(current: QualityLevel, target: QualityLevel, condition: NetworkCondition): string {
    if (target.bitrate > current.bitrate) {
      if (condition.bandwidth > target.bitrate * 2) return 'Excellent bandwidth available';
      if (condition.packetLoss < 0.005) return 'Stable network conditions';
      return 'Network conditions improved';
    } else {
      if (condition.bandwidth < current.bitrate) return 'Insufficient bandwidth';
      if (condition.packetLoss > 0.03) return 'High packet loss detected';
      if (condition.rtt > 250) return 'High latency detected';
      return 'Network conditions degraded';
    }
  }

  /**
   * Calculate confidence in adaptation decision
   * Professional confidence scoring like platforms use
   */
  private calculateAdaptationConfidence(condition: NetworkCondition): number {
    let confidence = 100;

    // Reduce confidence for edge cases
    if (condition.bandwidth < 500000) confidence -= 20;  // Very low bandwidth
    if (condition.rtt > 400) confidence -= 15;           // Very high latency
    if (condition.packetLoss > 0.05) confidence -= 25;   // High packet loss
    if (condition.jitter > 0.05) confidence -= 10;      // High jitter

    return Math.max(0, confidence);
  }

  /**
   * Record adaptation decision in history
   * Professional decision tracking like platforms use
   */
  private recordAdaptationDecision(participantId: string, decision: AdaptationDecision): void {
    if (!this.adaptationHistory.has(participantId)) {
      this.adaptationHistory.set(participantId, []);
    }

    const history = this.adaptationHistory.get(participantId)!;
    history.push(decision);

    // Keep only last 50 decisions
    if (history.length > 50) {
      history.shift();
    }
  }

  /**
   * Set stability period to prevent rapid changes
   * Professional stability control like platforms use
   */
  private setStabilityPeriod(participantId: string): void {
    // Clear any existing timer
    const existingTimer = this.stabilityTimers.get(participantId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new stability period
    const timer = setTimeout(() => {
      this.stabilityTimers.delete(participantId);
    }, this.config.stabilityPeriod * 1000);

    this.stabilityTimers.set(participantId, timer);
  }

  /**
   * Apply quality changes to encoder/decoder
   * Professional encoder control like platforms use
   */
  private async applyQualityChanges(participantId: string, quality: QualityLevel): Promise<void> {
    // In production, this would:
    // 1. Update video encoder parameters
    // 2. Change stream resolution/framerate
    // 3. Adjust bitrate constraints
    // 4. Update codec selection
    
    console.log(`🎬 Applying quality changes for ${participantId}:`, {
      resolution: `${quality.width}x${quality.height}`,
      framerate: quality.framerate,
      bitrate: quality.bitrate,
      codec: quality.codec
    });
  }

  /**
   * Add participant for monitoring
   * Initialize participant with default quality
   */
  addParticipant(participantId: string, initialQuality?: QualityLevel): void {
    const quality = initialQuality || this.qualityLevels[2]; // Start with medium quality
    
    this.currentQualities.set(participantId, quality);
    this.participantConditions.set(participantId, []);
    
    console.log(`👤 Participant added for adaptive bitrate: ${participantId} (${quality.id})`);
    this.emit('participant-added', { participantId, quality });
  }

  /**
   * Remove participant from monitoring
   */
  removeParticipant(participantId: string): void {
    this.currentQualities.delete(participantId);
    this.participantConditions.delete(participantId);
    this.adaptationHistory.delete(participantId);
    
    const timer = this.stabilityTimers.get(participantId);
    if (timer) {
      clearTimeout(timer);
      this.stabilityTimers.delete(participantId);
    }
    
    console.log(`👤 Participant removed from adaptive bitrate: ${participantId}`);
    this.emit('participant-removed', { participantId });
  }

  /**
   * Get current quality for participant
   */
  getCurrentQuality(participantId: string): QualityLevel | null {
    return this.currentQualities.get(participantId) || null;
  }

  /**
   * Get network conditions for participant
   */
  getNetworkConditions(participantId: string): NetworkCondition[] {
    return this.participantConditions.get(participantId) || [];
  }

  /**
   * Get adaptation history for participant
   */
  getAdaptationHistory(participantId: string): AdaptationDecision[] {
    return this.adaptationHistory.get(participantId) || [];
  }

  /**
   * Get available quality levels
   */
  getAvailableQualities(): QualityLevel[] {
    return [...this.qualityLevels];
  }

  /**
   * Force quality change for participant
   * Manual override like professional platforms provide
   */
  async forceQualityChange(participantId: string, qualityId: string): Promise<void> {
    const quality = this.qualityLevels.find(q => q.id === qualityId);
    const currentQuality = this.currentQualities.get(participantId);
    
    if (!quality || !currentQuality) {
      throw new Error('Invalid quality or participant');
    }

    // Create manual adaptation decision
    const decision: AdaptationDecision = {
      participantId,
      currentQuality,
      targetQuality: quality,
      reason: 'Manual override',
      confidence: 100,
      timestamp: new Date()
    };

    // Update quality
    this.currentQualities.set(participantId, quality);
    this.recordAdaptationDecision(participantId, decision);
    this.setStabilityPeriod(participantId);

    await this.applyQualityChanges(participantId, quality);

    console.log(`🎯 Manual quality change for ${participantId}: ${currentQuality.id} -> ${quality.id}`);
    this.emit('quality-forced', { participantId, decision });
  }

  /**
   * Get system statistics
   */
  getStatistics(): any {
    const participants = Array.from(this.currentQualities.keys());
    const qualities = Array.from(this.currentQualities.values());
    
    return {
      participantCount: participants.length,
      averageBitrate: qualities.reduce((sum, q) => sum + q.bitrate, 0) / qualities.length || 0,
      qualityDistribution: this.calculateQualityDistribution(qualities),
      adaptationRate: this.calculateAdaptationRate(),
      systemLoad: this.calculateSystemLoad()
    };
  }

  /**
   * Calculate quality distribution
   */
  private calculateQualityDistribution(qualities: QualityLevel[]): { [qualityId: string]: number } {
    const distribution: { [key: string]: number } = {};
    
    this.qualityLevels.forEach(level => {
      distribution[level.id] = 0;
    });
    
    qualities.forEach(quality => {
      distribution[quality.id]++;
    });
    
    return distribution;
  }

  /**
   * Calculate adaptation rate (adaptations per minute)
   */
  private calculateAdaptationRate(): number {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    let recentAdaptations = 0;
    
    for (const history of Array.from(this.adaptationHistory.values())) {
      recentAdaptations += history.filter((d: AdaptationDecision) => 
        d.timestamp.getTime() > oneMinuteAgo
      ).length;
    }
    
    return recentAdaptations;
  }

  /**
   * Calculate system load based on processing requirements
   */
  private calculateSystemLoad(): number {
    const qualities = Array.from(this.currentQualities.values());
    const totalPixels = qualities.reduce((sum, q) => sum + (q.width * q.height * q.framerate), 0);
    
    // Normalize to 0-100 scale (100% = 10 participants at 1080p30)
    const maxLoad = 10 * 1920 * 1080 * 30;
    return Math.min(100, (totalPixels / maxLoad) * 100);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BitrateConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): BitrateConfig {
    return { ...this.config };
  }

  /**
   * Cleanup adaptive bitrate manager
   */
  cleanup(): void {
    // Clear all stability timers
    for (const timer of Array.from(this.stabilityTimers.values())) {
      clearTimeout(timer);
    }

    this.participantConditions.clear();
    this.currentQualities.clear();
    this.adaptationHistory.clear();
    this.stabilityTimers.clear();
    this.removeAllListeners();

    console.log('🧹 Adaptive bitrate manager cleaned up');
  }
}