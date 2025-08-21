/**
 * Production Analytics System - Enterprise-grade performance monitoring
 * Real-time analytics and monitoring like Zoom/Teams business intelligence
 */

import { EventEmitter } from '../core/EventEmitter';

export interface CallMetrics {
  callId: string;
  roomId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  participantCount: number;
  maxParticipants: number;
  qualityScore: number;
  networkStats: NetworkMetrics;
  mediaStats: MediaMetrics;
  userEngagement: EngagementMetrics;
  technicalIssues: TechnicalIssue[];
}

export interface NetworkMetrics {
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  packetLoss: number;
  jitter: number;
  bandwidth: {
    upstream: number;
    downstream: number;
  };
  connectionType: string;
  qualityChanges: QualityChange[];
}

export interface MediaMetrics {
  video: {
    resolution: string;
    frameRate: number;
    bitrate: number;
    codecsUsed: string[];
    qualityDrops: number;
  };
  audio: {
    sampleRate: number;
    bitrate: number;
    codecsUsed: string[];
    noiseSuppression: boolean;
    echoCancellation: boolean;
  };
  screenShare: {
    used: boolean;
    duration: number;
    quality: string;
  };
}

export interface EngagementMetrics {
  speakingTime: number;
  mutedTime: number;
  videoOnTime: number;
  screenShareTime: number;
  chatMessages: number;
  handRaises: number;
  reactions: number;
}

export interface QualityChange {
  timestamp: Date;
  from: string;
  to: string;
  reason: string;
  automatic: boolean;
}

export interface TechnicalIssue {
  timestamp: Date;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolved: boolean;
  resolutionTime?: number;
}

export interface AnalyticsConfig {
  enableRealTimeTracking: boolean;
  metricsInterval: number;
  batchSize: number;
  retentionPeriod: number; // days
  enableUserTracking: boolean;
  enablePerformanceTracking: boolean;
  apiEndpoint?: string;
}

export class ProductionAnalytics extends EventEmitter {
  private config: AnalyticsConfig;
  private currentCall: Partial<CallMetrics> | null = null;
  private metricsCollectionTimer: NodeJS.Timeout | null = null;
  private metricsBuffer: any[] = [];
  private performanceObserver: PerformanceObserver | null = null;

  constructor(config?: Partial<AnalyticsConfig>) {
    super();
    
    this.config = {
      enableRealTimeTracking: true,
      metricsInterval: 10000, // 10 seconds
      batchSize: 50,
      retentionPeriod: 30,
      enableUserTracking: true,
      enablePerformanceTracking: true,
      ...config
    };

    this.setupPerformanceObserver();
  }

  /**
   * Start tracking a new call session
   */
  startCallTracking(roomId: string, userId: string): void {
    this.currentCall = {
      callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      userId,
      startTime: new Date(),
      duration: 0,
      participantCount: 1,
      maxParticipants: 1,
      qualityScore: 10,
      networkStats: this.initializeNetworkMetrics(),
      mediaStats: this.initializeMediaMetrics(),
      userEngagement: this.initializeEngagementMetrics(),
      technicalIssues: []
    };

    if (this.config.enableRealTimeTracking) {
      this.startRealTimeCollection();
    }

    console.log('📊 Analytics tracking started for call:', this.currentCall.callId);
    this.emit('call-tracking-started', { callId: this.currentCall.callId });
  }

  /**
   * End call tracking and generate final report
   */
  endCallTracking(): CallMetrics | null {
    if (!this.currentCall) return null;

    this.currentCall.endTime = new Date();
    this.currentCall.duration = this.currentCall.endTime.getTime() - this.currentCall.startTime!.getTime();

    // Calculate final quality score
    this.currentCall.qualityScore = this.calculateOverallQualityScore();

    this.stopRealTimeCollection();

    const finalMetrics = this.currentCall as CallMetrics;
    
    // Send final report
    this.sendAnalyticsData(finalMetrics);
    
    console.log('📊 Call tracking ended. Final metrics:', {
      callId: finalMetrics.callId,
      duration: finalMetrics.duration,
      qualityScore: finalMetrics.qualityScore,
      issuesCount: finalMetrics.technicalIssues.length
    });

    this.emit('call-tracking-ended', finalMetrics);
    this.currentCall = null;

    return finalMetrics;
  }

  /**
   * Update participant count
   */
  updateParticipantCount(count: number): void {
    if (!this.currentCall) return;

    this.currentCall.participantCount = count;
    this.currentCall.maxParticipants = Math.max(this.currentCall.maxParticipants || 0, count);

    this.emit('participant-count-updated', { count, max: this.currentCall.maxParticipants });
  }

  /**
   * Record network quality change
   */
  recordQualityChange(from: string, to: string, reason: string, automatic: boolean = true): void {
    if (!this.currentCall) return;

    const qualityChange: QualityChange = {
      timestamp: new Date(),
      from,
      to,
      reason,
      automatic
    };

    this.currentCall.networkStats!.qualityChanges.push(qualityChange);
    this.emit('quality-change-recorded', qualityChange);
  }

  /**
   * Record technical issue
   */
  recordTechnicalIssue(type: string, severity: TechnicalIssue['severity'], description: string): string {
    if (!this.currentCall) return '';

    const issue: TechnicalIssue = {
      timestamp: new Date(),
      type,
      severity,
      description,
      resolved: false
    };

    this.currentCall.technicalIssues!.push(issue);
    
    const issueId = `issue_${Date.now()}`;
    console.log(`🚨 Technical issue recorded [${severity}]: ${description}`);
    
    this.emit('technical-issue-recorded', { issueId, issue });
    return issueId;
  }

  /**
   * Mark technical issue as resolved
   */
  resolveTechnicalIssue(issueType: string): void {
    if (!this.currentCall) return;

    const issue = this.currentCall.technicalIssues!.find(i => i.type === issueType && !i.resolved);
    if (issue) {
      issue.resolved = true;
      issue.resolutionTime = Date.now() - issue.timestamp.getTime();
      
      console.log(`✅ Technical issue resolved: ${issueType} (${issue.resolutionTime}ms)`);
      this.emit('technical-issue-resolved', { issue });
    }
  }

  /**
   * Update user engagement metrics
   */
  updateEngagement(metric: keyof EngagementMetrics, value: number): void {
    if (!this.currentCall || !this.currentCall.userEngagement) return;

    this.currentCall.userEngagement[metric] = value;
    this.emit('engagement-updated', { metric, value });
  }

  /**
   * Record user interaction
   */
  recordUserInteraction(action: string, metadata?: any): void {
    const interaction = {
      timestamp: Date.now(),
      action,
      metadata,
      userId: this.currentCall?.userId,
      roomId: this.currentCall?.roomId
    };

    this.metricsBuffer.push({
      type: 'user_interaction',
      data: interaction
    });

    // Update engagement counters
    switch (action) {
      case 'chat_message':
        this.incrementEngagement('chatMessages');
        break;
      case 'hand_raise':
        this.incrementEngagement('handRaises');
        break;
      case 'reaction':
        this.incrementEngagement('reactions');
        break;
    }

    this.emit('user-interaction-recorded', interaction);
  }

  /**
   * Start real-time metrics collection
   */
  private startRealTimeCollection(): void {
    this.metricsCollectionTimer = setInterval(() => {
      this.collectRealTimeMetrics();
    }, this.config.metricsInterval);
  }

  /**
   * Stop real-time metrics collection
   */
  private stopRealTimeCollection(): void {
    if (this.metricsCollectionTimer) {
      clearInterval(this.metricsCollectionTimer);
      this.metricsCollectionTimer = null;
    }
  }

  /**
   * Collect real-time metrics
   */
  private async collectRealTimeMetrics(): Promise<void> {
    if (!this.currentCall) return;

    try {
      // Collect network metrics
      const networkStats = await this.collectNetworkStats();
      this.updateNetworkMetrics(networkStats);

      // Collect media metrics
      const mediaStats = await this.collectMediaStats();
      this.updateMediaMetrics(mediaStats);

      // Collect performance metrics
      if (this.config.enablePerformanceTracking) {
        const performanceStats = this.collectPerformanceStats();
        this.recordPerformanceMetrics(performanceStats);
      }

      // Send to buffer for batch processing
      this.metricsBuffer.push({
        type: 'real_time_metrics',
        timestamp: Date.now(),
        data: {
          network: networkStats,
          media: mediaStats,
          callId: this.currentCall.callId
        }
      });

      // Process buffer if it's full
      if (this.metricsBuffer.length >= this.config.batchSize) {
        await this.processBatchedMetrics();
      }

    } catch (error) {
      console.error('Error collecting real-time metrics:', error);
      this.recordTechnicalIssue('metrics_collection', 'low', `Failed to collect metrics: ${(error as Error).message}`);
    }
  }

  /**
   * Collect network statistics from WebRTC
   */
  private async collectNetworkStats(): Promise<any> {
    // Simulate network stats collection
    // In production, this would use RTCPeerConnection.getStats()
    return {
      latency: Math.floor(Math.random() * 200) + 50,
      packetLoss: Math.random() * 0.05,
      jitter: Math.random() * 50,
      bandwidth: {
        upstream: Math.floor(Math.random() * 1000) + 500,
        downstream: Math.floor(Math.random() * 2000) + 1000
      }
    };
  }

  /**
   * Collect media statistics
   */
  private async collectMediaStats(): Promise<any> {
    // Simulate media stats collection
    return {
      video: {
        resolution: '1280x720',
        frameRate: 30,
        bitrate: 1200000
      },
      audio: {
        sampleRate: 48000,
        bitrate: 128000
      }
    };
  }

  /**
   * Collect performance statistics
   */
  private collectPerformanceStats(): any {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      memoryUsage: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null
    };
  }

  /**
   * Update network metrics
   */
  private updateNetworkMetrics(stats: any): void {
    if (!this.currentCall || !this.currentCall.networkStats) return;

    const networkStats = this.currentCall.networkStats;
    networkStats.averageLatency = (networkStats.averageLatency + stats.latency) / 2;
    networkStats.maxLatency = Math.max(networkStats.maxLatency, stats.latency);
    networkStats.minLatency = Math.min(networkStats.minLatency, stats.latency);
    networkStats.packetLoss = stats.packetLoss;
    networkStats.jitter = stats.jitter;
    networkStats.bandwidth = stats.bandwidth;
  }

  /**
   * Process batched metrics
   */
  private async processBatchedMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const batch = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      await this.sendAnalyticsData(batch);
      console.log(`📊 Processed ${batch.length} metrics in batch`);
    } catch (error) {
      console.error('Failed to process metrics batch:', error);
      // Return failed items to buffer for retry
      this.metricsBuffer.unshift(...batch);
    }
  }

  /**
   * Send analytics data to backend
   */
  private async sendAnalyticsData(data: any): Promise<void> {
    if (!this.config.apiEndpoint) {
      console.log('📊 Analytics data (no endpoint configured):', data);
      return;
    }

    try {
      await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Failed to send analytics data:', error);
      throw error;
    }
  }

  /**
   * Setup performance observer
   */
  private setupPerformanceObserver(): void {
    if (!this.config.enablePerformanceTracking || typeof PerformanceObserver === 'undefined') {
      return;
    }

    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
          this.recordPerformanceMetrics({
            name: entry.name,
            type: entry.entryType,
            duration: entry.duration,
            startTime: entry.startTime
          });
        }
      });
    });

    this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
  }

  /**
   * Record performance metrics
   */
  private recordPerformanceMetrics(metrics: any): void {
    this.metricsBuffer.push({
      type: 'performance_metrics',
      timestamp: Date.now(),
      data: metrics
    });
  }

  /**
   * Helper methods
   */
  private initializeNetworkMetrics(): NetworkMetrics {
    return {
      averageLatency: 0,
      maxLatency: 0,
      minLatency: 9999,
      packetLoss: 0,
      jitter: 0,
      bandwidth: { upstream: 0, downstream: 0 },
      connectionType: 'unknown',
      qualityChanges: []
    };
  }

  private initializeMediaMetrics(): MediaMetrics {
    return {
      video: {
        resolution: '1280x720',
        frameRate: 30,
        bitrate: 1200000,
        codecsUsed: [],
        qualityDrops: 0
      },
      audio: {
        sampleRate: 48000,
        bitrate: 128000,
        codecsUsed: [],
        noiseSuppression: true,
        echoCancellation: true
      },
      screenShare: {
        used: false,
        duration: 0,
        quality: 'HD'
      }
    };
  }

  private initializeEngagementMetrics(): EngagementMetrics {
    return {
      speakingTime: 0,
      mutedTime: 0,
      videoOnTime: 0,
      screenShareTime: 0,
      chatMessages: 0,
      handRaises: 0,
      reactions: 0
    };
  }

  private calculateOverallQualityScore(): number {
    if (!this.currentCall) return 0;

    const networkScore = this.calculateNetworkScore();
    const mediaScore = this.calculateMediaScore();
    const reliabilityScore = this.calculateReliabilityScore();

    return Math.round((networkScore + mediaScore + reliabilityScore) / 3);
  }

  private calculateNetworkScore(): number {
    if (!this.currentCall?.networkStats) return 10;

    const { averageLatency, packetLoss } = this.currentCall.networkStats;
    
    let score = 10;
    if (averageLatency > 300) score -= 3;
    else if (averageLatency > 200) score -= 2;
    else if (averageLatency > 100) score -= 1;

    if (packetLoss > 0.05) score -= 3;
    else if (packetLoss > 0.02) score -= 2;
    else if (packetLoss > 0.01) score -= 1;

    return Math.max(0, score);
  }

  private calculateMediaScore(): number {
    if (!this.currentCall?.mediaStats) return 10;

    const qualityDrops = this.currentCall.mediaStats.video.qualityDrops;
    return Math.max(0, 10 - qualityDrops);
  }

  private calculateReliabilityScore(): number {
    if (!this.currentCall?.technicalIssues) return 10;

    const criticalIssues = this.currentCall.technicalIssues.filter(i => i.severity === 'critical').length;
    const highIssues = this.currentCall.technicalIssues.filter(i => i.severity === 'high').length;

    return Math.max(0, 10 - (criticalIssues * 3) - (highIssues * 2));
  }

  private incrementEngagement(metric: keyof EngagementMetrics): void {
    if (!this.currentCall?.userEngagement) return;
    (this.currentCall.userEngagement[metric] as number)++;
  }

  private updateMediaMetrics(stats: any): void {
    if (!this.currentCall?.mediaStats) return;
    
    Object.assign(this.currentCall.mediaStats.video, stats.video);
    Object.assign(this.currentCall.mediaStats.audio, stats.audio);
  }

  /**
   * Get current analytics summary
   */
  getCurrentAnalytics(): any {
    return {
      currentCall: this.currentCall,
      bufferSize: this.metricsBuffer.length,
      isTracking: !!this.currentCall,
      config: this.config
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopRealTimeCollection();
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    // Process remaining buffered metrics
    if (this.metricsBuffer.length > 0) {
      this.processBatchedMetrics();
    }

    this.removeAllListeners();
    console.log('🧹 Analytics destroyed');
  }
}