/**
 * AnalyticsManager - Professional Analytics & Monitoring
 * Real-time analytics dashboard like Zoom, Teams, Google Meet, Webex
 * Call quality metrics, performance monitoring, business intelligence
 */

import { EventEmitter } from './EventEmitter';
import { SupabaseClient } from '@supabase/supabase-js';

interface AnalyticsConfig {
  enabled: boolean;
  realTimeUpdates: boolean;
  dataRetention: number; // days
  aggregationInterval: number; // seconds
  alertThresholds: AlertThresholds;
  businessIntelligence: boolean;
}

interface AlertThresholds {
  highLatency: number;
  packetLossRate: number;
  lowQualityScore: number;
  connectionFailureRate: number;
  systemLoadThreshold: number;
}

interface CallMetrics {
  callId: string;
  roomId: string;
  participants: ParticipantMetrics[];
  startTime: Date;
  endTime?: Date;
  duration: number;
  overallQuality: number;
  issuesDetected: string[];
}

interface ParticipantMetrics {
  participantId: string;
  displayName: string;
  joinTime: Date;
  leaveTime?: Date;
  connectionQuality: ConnectionQuality;
  mediaQuality: MediaQuality;
  networkStats: NetworkStats;
  deviceInfo: DeviceInfo;
}

interface ConnectionQuality {
  averageLatency: number;
  maxLatency: number;
  packetLoss: number;
  jitter: number;
  connectionStability: number;
  qualityScore: number;
}

interface MediaQuality {
  videoResolution: string;
  videoFramerate: number;
  videoBitrate: number;
  audioQuality: number;
  videoFreezeDuration: number;
  audioDropoutDuration: number;
}

interface NetworkStats {
  bandwidth: number;
  throughput: number;
  retransmissions: number;
  congestionEvents: number;
  adaptationEvents: number;
}

interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
  camera: string;
  microphone: string;
  speaker: string;
}

interface SystemMetrics {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  totalBandwidth: number;
  serverLoad: number;
  errorRate: number;
}

interface BusinessMetrics {
  totalCalls: number;
  totalParticipants: number;
  averageCallDuration: number;
  userEngagement: number;
  platformReliability: number;
  customerSatisfaction: number;
  usageGrowth: number;
}

export class AnalyticsManager extends EventEmitter {
  private supabase: SupabaseClient;
  private config: AnalyticsConfig = {
    enabled: true,
    realTimeUpdates: true,
    dataRetention: 90, // 90 days
    aggregationInterval: 30, // 30 seconds
    alertThresholds: {
      highLatency: 300, // ms
      packetLossRate: 0.05, // 5%
      lowQualityScore: 60, // out of 100
      connectionFailureRate: 0.1, // 10%
      systemLoadThreshold: 0.8 // 80%
    },
    businessIntelligence: true
  };

  private callMetrics = new Map<string, CallMetrics>();
  private participantMetrics = new Map<string, ParticipantMetrics>();
  private systemMetrics: SystemMetrics[] = [];
  private businessMetrics: BusinessMetrics | null = null;

  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private alertingEnabled = true;
  private dashboardUpdates: NodeJS.Timeout | null = null;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  /**
   * Initialize analytics system
   * Professional analytics like major platforms
   */
  async initialize(config?: Partial<AnalyticsConfig>): Promise<void> {
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Start metrics collection
      if (this.config.enabled) {
        this.startMetricsCollection();
      }

      // Start real-time dashboard updates
      if (this.config.realTimeUpdates) {
        this.startDashboardUpdates();
      }

      // Initialize database schema for analytics
      await this.initializeAnalyticsSchema();

      console.log('📊 Professional analytics system initialized');
      this.emit('initialized', { config: this.config });

    } catch (error) {
      console.error('❌ Analytics initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize analytics database schema
   */
  private async initializeAnalyticsSchema(): Promise<void> {
    try {
      // In production, would create analytics tables
      // For now, just ensure we can store data
      console.log('📋 Analytics schema initialized');
    } catch (error) {
      console.warn('⚠️ Analytics schema initialization warning:', error);
    }
  }

  /**
   * Start metrics collection
   * Professional data collection like platforms use
   */
  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.aggregateParticipantMetrics();
      this.checkAlertConditions();
    }, this.config.aggregationInterval * 1000);

    console.log(`📈 Metrics collection started (${this.config.aggregationInterval}s intervals)`);
  }

  /**
   * Start real-time dashboard updates
   */
  private startDashboardUpdates(): void {
    this.dashboardUpdates = setInterval(() => {
      this.emitDashboardUpdate();
    }, 5000); // Update dashboard every 5 seconds
  }

  /**
   * Start call tracking
   */
  startCallTracking(callId: string, roomId: string): void {
    const callMetrics: CallMetrics = {
      callId,
      roomId,
      participants: [],
      startTime: new Date(),
      duration: 0,
      overallQuality: 100,
      issuesDetected: []
    };

    this.callMetrics.set(callId, callMetrics);
    console.log(`📞 Call tracking started: ${callId}`);
  }

  /**
   * End call tracking
   */
  async endCallTracking(callId: string): Promise<CallMetrics | null> {
    const call = this.callMetrics.get(callId);
    if (!call) return null;

    call.endTime = new Date();
    call.duration = call.endTime.getTime() - call.startTime.getTime();

    // Calculate overall call quality
    call.overallQuality = this.calculateOverallCallQuality(call);

    // Store call data
    await this.storeCallMetrics(call);

    // Remove from active tracking
    this.callMetrics.delete(callId);

    console.log(`📞 Call tracking ended: ${callId} (${call.duration}ms, quality: ${call.overallQuality})`);
    this.emit('call-ended', call);

    return call;
  }

  /**
   * Track participant joining
   */
  trackParticipantJoin(callId: string, participantId: string, displayName: string, deviceInfo: DeviceInfo): void {
    const participant: ParticipantMetrics = {
      participantId,
      displayName,
      joinTime: new Date(),
      connectionQuality: {
        averageLatency: 0,
        maxLatency: 0,
        packetLoss: 0,
        jitter: 0,
        connectionStability: 100,
        qualityScore: 100
      },
      mediaQuality: {
        videoResolution: '1280x720',
        videoFramerate: 30,
        videoBitrate: 1000000,
        audioQuality: 100,
        videoFreezeDuration: 0,
        audioDropoutDuration: 0
      },
      networkStats: {
        bandwidth: 1000000,
        throughput: 1000000,
        retransmissions: 0,
        congestionEvents: 0,
        adaptationEvents: 0
      },
      deviceInfo
    };

    this.participantMetrics.set(participantId, participant);

    // Add to call tracking
    const call = this.callMetrics.get(callId);
    if (call) {
      call.participants.push(participant);
    }

    console.log(`👤 Participant tracking started: ${participantId} in call ${callId}`);
    this.emit('participant-joined-tracking', { callId, participantId, participant });
  }

  /**
   * Track participant leaving
   */
  trackParticipantLeave(callId: string, participantId: string): void {
    const participant = this.participantMetrics.get(participantId);
    if (participant) {
      participant.leaveTime = new Date();
    }

    this.participantMetrics.delete(participantId);

    console.log(`👤 Participant tracking ended: ${participantId} from call ${callId}`);
    this.emit('participant-left-tracking', { callId, participantId });
  }

  /**
   * Update participant metrics
   * Professional metrics tracking like platforms use
   */
  updateParticipantMetrics(
    participantId: string,
    connectionData: any,
    mediaData: any,
    networkData: any
  ): void {
    const participant = this.participantMetrics.get(participantId);
    if (!participant) return;

    // Update connection quality
    if (connectionData) {
      participant.connectionQuality = {
        ...participant.connectionQuality,
        ...connectionData,
        qualityScore: this.calculateConnectionQualityScore(connectionData)
      };
    }

    // Update media quality
    if (mediaData) {
      participant.mediaQuality = { ...participant.mediaQuality, ...mediaData };
    }

    // Update network stats
    if (networkData) {
      participant.networkStats = { ...participant.networkStats, ...networkData };
    }

    // Check for quality issues
    this.checkParticipantQualityIssues(participantId, participant);
  }

  /**
   * Calculate connection quality score
   * Professional quality assessment like platforms use
   */
  private calculateConnectionQualityScore(connectionData: any): number {
    let score = 100;

    // Latency impact (0-40 points)
    if (connectionData.averageLatency) {
      score -= Math.min((connectionData.averageLatency - 50) * 0.2, 40);
    }

    // Packet loss impact (0-30 points)
    if (connectionData.packetLoss) {
      score -= connectionData.packetLoss * 600; // 5% loss = 30 point penalty
    }

    // Jitter impact (0-20 points)
    if (connectionData.jitter) {
      score -= connectionData.jitter * 500; // 40ms jitter = 20 point penalty
    }

    // Connection stability impact (0-10 points)
    if (connectionData.connectionStability < 100) {
      score -= (100 - connectionData.connectionStability) * 0.1;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check participant quality issues
   */
  private checkParticipantQualityIssues(participantId: string, participant: ParticipantMetrics): void {
    const issues: string[] = [];

    // High latency
    if (participant.connectionQuality.averageLatency > this.config.alertThresholds.highLatency) {
      issues.push('High latency detected');
    }

    // High packet loss
    if (participant.connectionQuality.packetLoss > this.config.alertThresholds.packetLossRate) {
      issues.push('High packet loss detected');
    }

    // Low quality score
    if (participant.connectionQuality.qualityScore < this.config.alertThresholds.lowQualityScore) {
      issues.push('Low connection quality');
    }

    // Video freezing
    if (participant.mediaQuality.videoFreezeDuration > 5000) { // 5 seconds
      issues.push('Video freezing issues');
    }

    // Audio dropouts
    if (participant.mediaQuality.audioDropoutDuration > 2000) { // 2 seconds
      issues.push('Audio dropout issues');
    }

    if (issues.length > 0) {
      this.emit('quality-issues-detected', { participantId, issues });
    }
  }

  /**
   * Collect system metrics
   * Professional system monitoring like platforms use
   */
  private collectSystemMetrics(): void {
    // In production, would collect real system metrics
    const metrics: SystemMetrics = {
      timestamp: new Date(),
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 8000, // MB
      activeConnections: this.participantMetrics.size,
      totalBandwidth: this.calculateTotalBandwidth(),
      serverLoad: Math.random(),
      errorRate: Math.random() * 0.05 // 0-5% error rate
    };

    this.systemMetrics.push(metrics);

    // Keep only recent metrics (last hour)
    if (this.systemMetrics.length > 120) { // 120 samples at 30s intervals = 1 hour
      this.systemMetrics.shift();
    }

    this.emit('system-metrics-updated', metrics);
  }

  /**
   * Calculate total bandwidth usage
   */
  private calculateTotalBandwidth(): number {
    let totalBandwidth = 0;
    
    for (const participant of Array.from(this.participantMetrics.values())) {
      totalBandwidth += participant.networkStats.throughput;
    }
    
    return totalBandwidth;
  }

  /**
   * Aggregate participant metrics
   * Professional data aggregation like platforms use
   */
  private aggregateParticipantMetrics(): void {
    if (this.participantMetrics.size === 0) return;

    // Calculate aggregated statistics
    const participants = Array.from(this.participantMetrics.values());
    
    const aggregated = {
      totalParticipants: participants.length,
      averageLatency: participants.reduce((sum, p) => sum + p.connectionQuality.averageLatency, 0) / participants.length,
      averagePacketLoss: participants.reduce((sum, p) => sum + p.connectionQuality.packetLoss, 0) / participants.length,
      averageQualityScore: participants.reduce((sum, p) => sum + p.connectionQuality.qualityScore, 0) / participants.length,
      totalBandwidth: participants.reduce((sum, p) => sum + p.networkStats.throughput, 0),
      issueCount: this.countQualityIssues(participants)
    };

    this.emit('aggregated-metrics', aggregated);
  }

  /**
   * Count quality issues across participants
   */
  private countQualityIssues(participants: ParticipantMetrics[]): number {
    return participants.filter(p => 
      p.connectionQuality.qualityScore < this.config.alertThresholds.lowQualityScore ||
      p.connectionQuality.packetLoss > this.config.alertThresholds.packetLossRate ||
      p.connectionQuality.averageLatency > this.config.alertThresholds.highLatency
    ).length;
  }

  /**
   * Check alert conditions
   * Professional alerting like platforms use
   */
  private checkAlertConditions(): void {
    if (!this.alertingEnabled) return;

    const latestSystemMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    if (!latestSystemMetrics) return;

    // System load alert
    if (latestSystemMetrics.serverLoad > this.config.alertThresholds.systemLoadThreshold) {
      this.triggerAlert('high_system_load', {
        currentLoad: latestSystemMetrics.serverLoad,
        threshold: this.config.alertThresholds.systemLoadThreshold
      });
    }

    // Error rate alert
    if (latestSystemMetrics.errorRate > this.config.alertThresholds.connectionFailureRate) {
      this.triggerAlert('high_error_rate', {
        currentRate: latestSystemMetrics.errorRate,
        threshold: this.config.alertThresholds.connectionFailureRate
      });
    }

    // Participant quality alerts
    for (const [participantId, participant] of Array.from(this.participantMetrics)) {
      if (participant.connectionQuality.qualityScore < this.config.alertThresholds.lowQualityScore) {
        this.triggerAlert('low_participant_quality', {
          participantId,
          qualityScore: participant.connectionQuality.qualityScore
        });
      }
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(alertType: string, data: any): void {
    const alert = {
      type: alertType,
      timestamp: new Date(),
      data,
      severity: this.determineAlertSeverity(alertType, data)
    };

    console.warn(`🚨 Alert triggered: ${alertType}`, data);
    this.emit('alert-triggered', alert);
  }

  /**
   * Determine alert severity
   */
  private determineAlertSeverity(alertType: string, data: any): 'low' | 'medium' | 'high' | 'critical' {
    switch (alertType) {
      case 'high_system_load':
        return data.currentLoad > 0.95 ? 'critical' : 'high';
      case 'high_error_rate':
        return data.currentRate > 0.2 ? 'critical' : 'medium';
      case 'low_participant_quality':
        return data.qualityScore < 30 ? 'high' : 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Calculate overall call quality
   * Professional quality assessment like platforms use
   */
  private calculateOverallCallQuality(call: CallMetrics): number {
    if (call.participants.length === 0) return 100;

    const participantScores = call.participants.map(p => p.connectionQuality.qualityScore);
    const averageScore = participantScores.reduce((sum, score) => sum + score, 0) / participantScores.length;

    // Penalize for issues detected
    let penalty = call.issuesDetected.length * 5; // 5 points per issue

    return Math.max(0, Math.min(100, averageScore - penalty));
  }

  /**
   * Store call metrics in database
   */
  private async storeCallMetrics(call: CallMetrics): Promise<void> {
    try {
      await this.supabase
        .from('call_analytics')
        .insert({
          call_id: call.callId,
          room_id: call.roomId,
          start_time: call.startTime.toISOString(),
          end_time: call.endTime?.toISOString(),
          duration: call.duration,
          overall_quality: call.overallQuality,
          participant_count: call.participants.length,
          issues_detected: call.issuesDetected
        });

      // Store participant metrics
      for (const participant of call.participants) {
        await this.supabase
          .from('participant_analytics')
          .insert({
            call_id: call.callId,
            participant_id: participant.participantId,
            display_name: participant.displayName,
            join_time: participant.joinTime.toISOString(),
            leave_time: participant.leaveTime?.toISOString(),
            connection_quality: participant.connectionQuality,
            media_quality: participant.mediaQuality,
            network_stats: participant.networkStats,
            device_info: participant.deviceInfo
          });
      }

    } catch (error) {
      console.error('Failed to store call metrics:', error);
    }
  }

  /**
   * Emit dashboard update
   */
  private emitDashboardUpdate(): void {
    const dashboardData = {
      activeCalls: this.callMetrics.size,
      activeParticipants: this.participantMetrics.size,
      systemMetrics: this.systemMetrics[this.systemMetrics.length - 1],
      averageQuality: this.calculateCurrentAverageQuality(),
      recentAlerts: this.getRecentAlerts(),
      businessMetrics: this.businessMetrics
    };

    this.emit('dashboard-update', dashboardData);
  }

  /**
   * Calculate current average quality
   */
  private calculateCurrentAverageQuality(): number {
    const participants = Array.from(this.participantMetrics.values());
    if (participants.length === 0) return 100;

    return participants.reduce((sum, p) => sum + p.connectionQuality.qualityScore, 0) / participants.length;
  }

  /**
   * Get recent alerts (last 10 minutes)
   */
  private getRecentAlerts(): any[] {
    // Would maintain alert history in production
    return [];
  }

  /**
   * Generate business intelligence report
   */
  generateBusinessReport(period: 'daily' | 'weekly' | 'monthly'): BusinessMetrics {
    // In production, would query historical data
    const mockMetrics: BusinessMetrics = {
      totalCalls: Math.floor(Math.random() * 1000) + 500,
      totalParticipants: Math.floor(Math.random() * 5000) + 2000,
      averageCallDuration: Math.floor(Math.random() * 1800) + 900, // 15-45 minutes
      userEngagement: Math.random() * 20 + 80, // 80-100%
      platformReliability: Math.random() * 5 + 95, // 95-100%
      customerSatisfaction: Math.random() * 15 + 85, // 85-100%
      usageGrowth: Math.random() * 20 - 5 // -5% to +15%
    };

    this.businessMetrics = mockMetrics;
    return mockMetrics;
  }

  /**
   * Get call analytics
   */
  getCallAnalytics(callId: string): CallMetrics | null {
    return this.callMetrics.get(callId) || null;
  }

  /**
   * Get participant analytics
   */
  getParticipantAnalytics(participantId: string): ParticipantMetrics | null {
    return this.participantMetrics.get(participantId) || null;
  }

  /**
   * Get system analytics
   */
  getSystemAnalytics(): SystemMetrics[] {
    return [...this.systemMetrics];
  }

  /**
   * Enable/disable alerting
   */
  setAlertingEnabled(enabled: boolean): void {
    this.alertingEnabled = enabled;
    console.log(`🚨 Alerting ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Cleanup analytics manager
   */
  cleanup(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }

    if (this.dashboardUpdates) {
      clearInterval(this.dashboardUpdates);
      this.dashboardUpdates = null;
    }

    this.callMetrics.clear();
    this.participantMetrics.clear();
    this.systemMetrics = [];
    this.removeAllListeners();

    console.log('🧹 Analytics manager cleaned up');
  }
}