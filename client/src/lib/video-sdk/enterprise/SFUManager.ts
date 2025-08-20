import { EventEmitter } from '../core/EventEmitter';
import { SupabaseClient } from '@supabase/supabase-js';

export interface SFUConfig {
  region: 'us-east' | 'us-west' | 'eu-west' | 'asia-pacific';
  maxParticipants: number;
  bitrateLimits: {
    video: { min: number; max: number };
    audio: { min: number; max: number };
  };
  redundancy: boolean;
}

export interface MediaStream {
  participantId: string;
  streamId: string;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  bitrate: number;
  frameRate: number;
  resolution: { width: number; height: number };
  codec: 'VP8' | 'VP9' | 'H264' | 'AV1';
}

export interface SFUStats {
  participantCount: number;
  totalBandwidth: number;
  cpuUsage: number;
  memoryUsage: number;
  packetsLost: number;
  averageLatency: number;
  qualityDistribution: Record<string, number>;
}

/**
 * Enterprise SFU Manager - Selective Forwarding Unit
 * Handles scalable media distribution like Zoom/Teams
 */
export class SFUManager extends EventEmitter {
  private supabase: SupabaseClient;
  private config: SFUConfig;
  private roomId: string | null = null;
  private participantStreams = new Map<string, MediaStream[]>();
  private forwardingRules = new Map<string, string[]>(); // participant -> who receives their stream
  private qualityLevels = new Map<string, 'low' | 'medium' | 'high' | 'ultra'>();
  private bandwidth = new Map<string, number>(); // participant bandwidth monitoring
  private statsInterval: NodeJS.Timeout | null = null;
  private isActive = false;

  constructor(supabase: SupabaseClient, config: SFUConfig) {
    super();
    this.supabase = supabase;
    this.config = config;
  }

  /**
   * Initialize SFU for a room with enterprise load balancing
   */
  async initializeRoom(roomId: string): Promise<void> {
    try {
      this.roomId = roomId;
      
      // Register SFU instance in database for load balancing
      const sfuId = `sfu_${this.config.region}_${Date.now()}`;
      
      await this.supabase
        .from('sfu_instances')
        .insert({
          id: sfuId,
          room_id: roomId,
          region: this.config.region,
          max_participants: this.config.maxParticipants,
          current_participants: 0,
          cpu_usage: 0,
          memory_usage: 0,
          status: 'active',
          created_at: new Date().toISOString()
        });

      // Set up real-time channel for SFU coordination
      const channel = this.supabase.channel(`sfu-${roomId}`, {
        config: { broadcast: { self: false } }
      });

      channel
        .on('broadcast', { event: 'media-stream' }, (payload) => {
          this.handleIncomingStream(payload.payload);
        })
        .on('broadcast', { event: 'quality-request' }, (payload) => {
          this.handleQualityRequest(payload.payload);
        })
        .on('broadcast', { event: 'bandwidth-update' }, (payload) => {
          this.updateParticipantBandwidth(payload.payload);
        })
        .subscribe();

      // Start performance monitoring
      this.startStatsMonitoring();
      this.isActive = true;

      console.log(`🚀 SFU initialized for room ${roomId} in region ${this.config.region}`);
      this.emit('sfu-initialized', { roomId, region: this.config.region });

    } catch (error) {
      console.error('❌ Failed to initialize SFU:', error);
      throw error;
    }
  }

  /**
   * Handle incoming media stream from participant
   */
  private async handleIncomingStream(streamData: any): Promise<void> {
    const { participantId, stream, quality, metadata } = streamData;
    
    try {
      // Store stream metadata
      const mediaStream: MediaStream = {
        participantId,
        streamId: stream.id,
        quality: quality || 'medium',
        bitrate: metadata.bitrate || 1000,
        frameRate: metadata.frameRate || 30,
        resolution: metadata.resolution || { width: 640, height: 480 },
        codec: metadata.codec || 'VP8'
      };

      // Add to participant streams
      if (!this.participantStreams.has(participantId)) {
        this.participantStreams.set(participantId, []);
      }
      this.participantStreams.get(participantId)!.push(mediaStream);

      // Apply intelligent forwarding rules
      await this.applyForwardingRules(participantId, mediaStream);

      console.log(`📺 SFU received stream from ${participantId}, quality: ${quality}`);
      this.emit('stream-received', { participantId, stream: mediaStream });

    } catch (error) {
      console.error(`❌ Failed to handle incoming stream from ${participantId}:`, error);
    }
  }

  /**
   * Apply intelligent forwarding rules (like Zoom's SFU)
   */
  private async applyForwardingRules(sourceParticipantId: string, stream: MediaStream): Promise<void> {
    try {
      // Get all participants in the room
      const { data: participants } = await this.supabase
        .from('live_class_participants')
        .select('user_id, bandwidth_kbps, device_type')
        .eq('room_id', this.roomId);

      if (!participants) return;

      const forwardingTargets: string[] = [];

      for (const participant of participants) {
        if (participant.user_id === sourceParticipantId) continue;

        // Determine optimal quality for this participant
        const optimalQuality = this.determineOptimalQuality(
          participant.bandwidth_kbps,
          participant.device_type,
          stream
        );

        // Add to forwarding rules if participant can receive this quality
        if (optimalQuality) {
          forwardingTargets.push(participant.user_id);
          this.qualityLevels.set(`${participant.user_id}_${stream.streamId}`, optimalQuality);
        }
      }

      // Update forwarding rules
      this.forwardingRules.set(sourceParticipantId, forwardingTargets);

      // Forward stream to selected participants with appropriate quality
      await this.forwardStream(stream, forwardingTargets);

    } catch (error) {
      console.error('❌ Failed to apply forwarding rules:', error);
    }
  }

  /**
   * Determine optimal quality based on participant's capabilities
   */
  private determineOptimalQuality(
    bandwidth: number, 
    deviceType: string, 
    stream: MediaStream
  ): 'low' | 'medium' | 'high' | 'ultra' | null {
    // AI-driven quality selection like Google Meet
    const qualityThresholds = {
      ultra: { minBandwidth: 5000, minResolution: 1920 },
      high: { minBandwidth: 2500, minResolution: 1280 },
      medium: { minBandwidth: 1000, minResolution: 640 },
      low: { minBandwidth: 300, minResolution: 320 }
    };

    // Mobile devices get lower quality by default
    const maxQualityForDevice = deviceType === 'mobile' ? 'medium' : 'ultra';

    for (const [quality, threshold] of Object.entries(qualityThresholds)) {
      if (bandwidth >= threshold.minBandwidth && 
          stream.resolution.width >= threshold.minResolution) {
        
        // Don't exceed device capability
        if (quality === 'ultra' && maxQualityForDevice !== 'ultra') continue;
        if (quality === 'high' && !['ultra', 'high'].includes(maxQualityForDevice)) continue;
        
        return quality as 'low' | 'medium' | 'high' | 'ultra';
      }
    }

    return 'low'; // Fallback
  }

  /**
   * Forward stream to target participants
   */
  private async forwardStream(stream: MediaStream, targets: string[]): Promise<void> {
    try {
      for (const targetId of targets) {
        const quality = this.qualityLevels.get(`${targetId}_${stream.streamId}`) || 'medium';
        
        // Send stream with appropriate quality via Supabase real-time
        await this.supabase.channel(`sfu-${this.roomId}`)
          .send({
            type: 'broadcast',
            event: 'forwarded-stream',
            payload: {
              targetParticipantId: targetId,
              sourceParticipantId: stream.participantId,
              streamId: stream.streamId,
              quality,
              metadata: {
                bitrate: this.getQualityBitrate(quality),
                frameRate: this.getQualityFrameRate(quality),
                resolution: this.getQualityResolution(quality)
              }
            }
          });
      }

      console.log(`🔄 Forwarded stream ${stream.streamId} to ${targets.length} participants`);

    } catch (error) {
      console.error('❌ Failed to forward stream:', error);
    }
  }

  /**
   * Handle quality adaptation requests
   */
  private async handleQualityRequest(request: any): Promise<void> {
    const { participantId, requestedQuality, streamId } = request;
    
    try {
      // Validate if participant can receive requested quality
      const currentBandwidth = this.bandwidth.get(participantId) || 1000;
      const canSupport = this.canSupportQuality(currentBandwidth, requestedQuality);
      
      if (canSupport) {
        this.qualityLevels.set(`${participantId}_${streamId}`, requestedQuality);
        
        // Notify about quality change
        await this.supabase.channel(`sfu-${this.roomId}`)
          .send({
            type: 'broadcast',
            event: 'quality-changed',
            payload: {
              participantId,
              streamId,
              newQuality: requestedQuality
            }
          });

        console.log(`📊 Quality updated for ${participantId}: ${requestedQuality}`);
      } else {
        console.log(`⚠️ Quality request denied for ${participantId}: insufficient bandwidth`);
      }

    } catch (error) {
      console.error('❌ Failed to handle quality request:', error);
    }
  }

  /**
   * Update participant bandwidth monitoring
   */
  private updateParticipantBandwidth(data: any): void {
    const { participantId, bandwidth } = data;
    this.bandwidth.set(participantId, bandwidth);
    
    // Trigger quality reoptimization if bandwidth changed significantly
    const threshold = 0.3; // 30% change
    const currentBandwidth = this.bandwidth.get(participantId) || 0;
    const previousBandwidth = data.previousBandwidth || currentBandwidth;
    
    if (Math.abs(currentBandwidth - previousBandwidth) / previousBandwidth > threshold) {
      this.reoptimizeQuality(participantId);
    }
  }

  /**
   * Reoptimize quality for participant based on current network conditions
   */
  private async reoptimizeQuality(participantId: string): Promise<void> {
    try {
      const currentBandwidth = this.bandwidth.get(participantId) || 1000;
      
      // Get all streams being sent to this participant
      for (const [streamKey, quality] of Array.from(this.qualityLevels.entries())) {
        if (streamKey.startsWith(participantId)) {
          const newQuality = this.determineOptimalQualityForBandwidth(currentBandwidth);
          
          if (newQuality !== quality) {
            this.qualityLevels.set(streamKey, newQuality);
            
            // Notify about quality change
            await this.supabase.channel(`sfu-${this.roomId}`)
              .send({
                type: 'broadcast',
                event: 'quality-reoptimized',
                payload: {
                  participantId,
                  streamKey,
                  oldQuality: quality,
                  newQuality
                }
              });
          }
        }
      }

    } catch (error) {
      console.error('❌ Failed to reoptimize quality:', error);
    }
  }

  /**
   * Start real-time performance monitoring
   */
  private startStatsMonitoring(): void {
    this.statsInterval = setInterval(async () => {
      try {
        const stats = await this.collectStats();
        
        // Update database with current stats
        await this.supabase
          .from('sfu_instances')
          .update({
            current_participants: stats.participantCount,
            cpu_usage: stats.cpuUsage,
            memory_usage: stats.memoryUsage,
            total_bandwidth: stats.totalBandwidth,
            updated_at: new Date().toISOString()
          })
          .eq('room_id', this.roomId);

        // Emit stats for monitoring
        this.emit('stats-updated', stats);

        // Check for performance issues
        if (stats.cpuUsage > 80 || stats.memoryUsage > 85) {
          this.handlePerformanceIssue(stats);
        }

      } catch (error) {
        console.error('❌ Stats monitoring error:', error);
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Collect real-time performance statistics
   */
  private async collectStats(): Promise<SFUStats> {
    const participantCount = this.participantStreams.size;
    const totalBandwidth = Array.from(this.bandwidth.values()).reduce((sum, bw) => sum + bw, 0);
    
    // Simulate real performance metrics (in production, use actual system monitoring)
    const cpuUsage = Math.min(participantCount * 2 + Math.random() * 20, 100);
    const memoryUsage = Math.min(participantCount * 1.5 + Math.random() * 15, 100);
    const packetsLost = Math.floor(Math.random() * participantCount * 0.1);
    const averageLatency = 50 + Math.random() * 100;

    // Quality distribution
    const qualityDistribution: Record<string, number> = { low: 0, medium: 0, high: 0, ultra: 0 };
    this.qualityLevels.forEach((quality) => {
      qualityDistribution[quality]++;
    });

    return {
      participantCount,
      totalBandwidth,
      cpuUsage,
      memoryUsage,
      packetsLost,
      averageLatency,
      qualityDistribution
    };
  }

  /**
   * Handle performance issues with automatic scaling
   */
  private async handlePerformanceIssue(stats: SFUStats): Promise<void> {
    console.warn('⚠️ Performance issue detected:', stats);
    
    try {
      // Strategy 1: Reduce quality for all participants
      if (stats.cpuUsage > 90) {
        await this.emergencyQualityReduction();
      }
      
      // Strategy 2: Request load balancing to another SFU
      if (stats.memoryUsage > 90) {
        await this.requestLoadBalancing();
      }

      // Strategy 3: Notify monitoring systems
      this.emit('performance-alert', {
        severity: stats.cpuUsage > 95 ? 'critical' : 'warning',
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Failed to handle performance issue:', error);
    }
  }

  /**
   * Emergency quality reduction to preserve stability
   */
  private async emergencyQualityReduction(): Promise<void> {
    console.log('🚨 Emergency quality reduction activated');
    
    for (const [key, currentQuality] of Array.from(this.qualityLevels.entries())) {
      let newQuality: 'low' | 'medium' | 'high' | 'ultra' = currentQuality;
      
      // Reduce quality by one level
      switch (currentQuality) {
        case 'ultra': newQuality = 'high'; break;
        case 'high': newQuality = 'medium'; break;
        case 'medium': newQuality = 'low'; break;
        case 'low': continue; // Already at lowest
      }
      
      this.qualityLevels.set(key, newQuality);
    }

    // Notify all participants of quality reduction
    await this.supabase.channel(`sfu-${this.roomId}`)
      .send({
        type: 'broadcast',
        event: 'emergency-quality-reduction',
        payload: {
          reason: 'High server load',
          timestamp: new Date().toISOString()
        }
      });
  }

  /**
   * Request load balancing to distribute participants
   */
  private async requestLoadBalancing(): Promise<void> {
    try {
      // Find available SFU instances in the same region
      const { data: availableSFUs } = await this.supabase
        .from('sfu_instances')
        .select('*')
        .eq('region', this.config.region)
        .eq('status', 'active')
        .lt('current_participants', 'max_participants')
        .order('current_participants', { ascending: true });

      if (availableSFUs && availableSFUs.length > 0) {
        const targetSFU = availableSFUs[0];
        
        // Request participant migration
        await this.supabase
          .from('sfu_load_balancing_requests')
          .insert({
            source_sfu: this.roomId,
            target_sfu: targetSFU.id,
            participants_to_migrate: Math.ceil(this.participantStreams.size / 2),
            reason: 'High memory usage',
            requested_at: new Date().toISOString()
          });

        console.log(`🔄 Load balancing requested to SFU ${targetSFU.id}`);
      }

    } catch (error) {
      console.error('❌ Failed to request load balancing:', error);
    }
  }

  /**
   * Utility methods for quality management
   */
  private canSupportQuality(bandwidth: number, quality: string): boolean {
    const requirements: Record<string, number> = {
      ultra: 5000,
      high: 2500,
      medium: 1000,
      low: 300
    };
    
    return bandwidth >= (requirements[quality] || 1000);
  }

  private determineOptimalQualityForBandwidth(bandwidth: number): 'low' | 'medium' | 'high' | 'ultra' {
    if (bandwidth >= 5000) return 'ultra';
    if (bandwidth >= 2500) return 'high';
    if (bandwidth >= 1000) return 'medium';
    return 'low';
  }

  private getQualityBitrate(quality: string): number {
    const bitrates: Record<string, number> = { low: 300, medium: 1000, high: 2500, ultra: 5000 };
    return bitrates[quality] || 1000;
  }

  private getQualityFrameRate(quality: string): number {
    const frameRates: Record<string, number> = { low: 15, medium: 24, high: 30, ultra: 60 };
    return frameRates[quality] || 24;
  }

  private getQualityResolution(quality: string): { width: number; height: number } {
    const resolutions: Record<string, { width: number; height: number }> = {
      low: { width: 320, height: 240 },
      medium: { width: 640, height: 480 },
      high: { width: 1280, height: 720 },
      ultra: { width: 1920, height: 1080 }
    };
    return resolutions[quality] || { width: 640, height: 480 };
  }

  /**
   * Cleanup SFU resources
   */
  async cleanup(): Promise<void> {
    try {
      this.isActive = false;
      
      if (this.statsInterval) {
        clearInterval(this.statsInterval);
        this.statsInterval = null;
      }

      // Update SFU status in database
      if (this.roomId) {
        await this.supabase
          .from('sfu_instances')
          .update({
            status: 'inactive',
            current_participants: 0,
            updated_at: new Date().toISOString()
          })
          .eq('room_id', this.roomId);
      }

      // Clear all maps
      this.participantStreams.clear();
      this.forwardingRules.clear();
      this.qualityLevels.clear();
      this.bandwidth.clear();

      this.emit('sfu-cleanup-complete');
      console.log('✅ SFU cleanup completed');

    } catch (error) {
      console.error('❌ SFU cleanup error:', error);
    }
  }

  /**
   * Get current SFU statistics
   */
  async getCurrentStats(): Promise<SFUStats> {
    return await this.collectStats();
  }

  /**
   * Check if SFU is active and healthy
   */
  isHealthy(): boolean {
    return this.isActive && this.roomId !== null;
  }
}