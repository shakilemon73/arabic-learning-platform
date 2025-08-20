/**
 * Enterprise Video SDK API Integration
 * Direct Supabase API calls for enterprise video conferencing features
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sgyanvjlwlrzcrpjwlsd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneWFudmpsd2xyemNycGp3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTg1MjAsImV4cCI6MjA3MDEzNDUyMH0.5xjMdSUdeHGln68tfuw626q4xDZkuR8Xg_e_w6g9iJk';

// Create Supabase client optimized for enterprise video
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 50, // High frequency for video conferencing
    },
  },
});

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface SFUInstance {
  id: string;
  room_id: string;
  region: 'us-east' | 'us-west' | 'eu-west' | 'asia-pacific';
  max_participants: number;
  current_participants: number;
  cpu_usage: number;
  memory_usage: number;
  total_bandwidth: number;
  status: 'active' | 'inactive' | 'maintenance';
  created_at: string;
  updated_at: string;
}

export interface RecordingSession {
  id: string;
  room_id: string;
  start_time: string;
  end_time?: string;
  duration: number;
  size: number;
  participants: string[];
  config: Record<string, any>;
  status: 'starting' | 'recording' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  error?: string;
  encrypted: boolean;
  created_at: string;
  updated_at: string;
}

export interface NetworkQualityMetric {
  id: number;
  room_id: string;
  participant_id: string;
  timestamp: string;
  latency_ms: number;
  bandwidth_kbps: number;
  packet_loss_percentage: number;
  jitter_ms: number;
  connection_type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  quality_score: 'excellent' | 'good' | 'poor' | 'critical';
  network_path: string;
}

export interface AudioProcessingEvent {
  id: number;
  room_id: string;
  participant_id: string;
  timestamp: string;
  event_type: 'voice_activity' | 'noise_suppression' | 'echo_cancellation' | 'quality_change';
  confidence: number;
  input_level: number;
  output_level: number;
  noise_level: number;
  metadata: Record<string, any>;
}

export interface QualityAdaptation {
  id: number;
  room_id: string;
  participant_id: string;
  timestamp: string;
  previous_quality: Record<string, any>;
  new_quality: Record<string, any>;
  reason: string;
  network_conditions: Record<string, any>;
  adaptation_type: 'automatic' | 'manual' | 'emergency';
}

export interface PerformanceAlert {
  id: number;
  room_id: string;
  alert_type: 'high_cpu' | 'high_memory' | 'high_latency' | 'packet_loss' | 'connection_failure';
  severity: 'warning' | 'critical';
  message: string;
  metadata: Record<string, any>;
  resolved: boolean;
  created_at: string;
  resolved_at?: string;
}

export interface LiveClassParticipantEnterprise {
  id: number;
  room_id: string;
  user_id: string;
  display_name: string;
  role: 'host' | 'moderator' | 'participant';
  joined_at: string;
  left_at?: string;
  has_video: boolean;
  has_audio: boolean;
  is_screen_sharing: boolean;
  bandwidth_kbps: number;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser_name: string;
  browser_version: string;
  connection_quality: 'excellent' | 'good' | 'poor' | 'critical';
  avg_latency_ms: number;
  total_packets_lost: number;
  sfu_instance_id: string;
  adaptive_bitrate_enabled: boolean;
  audio_processing_enabled: boolean;
  network_resilience_enabled: boolean;
}

// =====================================================
// SFU MANAGEMENT API
// =====================================================

export class SFUManagementAPI {
  /**
   * Get all active SFU instances
   */
  static async getActiveSFUInstances(): Promise<SFUInstance[]> {
    const { data, error } = await supabase
      .from('sfu_instances')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get SFU instance for room
   */
  static async getSFUForRoom(roomId: string): Promise<SFUInstance | null> {
    const { data, error } = await supabase
      .from('sfu_instances')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data;
  }

  /**
   * Create SFU instance for room
   */
  static async createSFUInstance(instance: Partial<SFUInstance>): Promise<SFUInstance> {
    const { data, error } = await supabase
      .from('sfu_instances')
      .insert({
        id: instance.id || `sfu_${Date.now()}`,
        room_id: instance.room_id!,
        region: instance.region || 'us-east',
        max_participants: instance.max_participants || 100,
        current_participants: 0,
        cpu_usage: 0,
        memory_usage: 0,
        total_bandwidth: 0,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update SFU performance metrics
   */
  static async updateSFUMetrics(
    instanceId: string, 
    metrics: {
      current_participants?: number;
      cpu_usage?: number;
      memory_usage?: number;
      total_bandwidth?: number;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('sfu_instances')
      .update({
        ...metrics,
        updated_at: new Date().toISOString()
      })
      .eq('id', instanceId);

    if (error) throw error;
  }

  /**
   * Get SFU performance summary
   */
  static async getSFUPerformanceSummary() {
    const { data, error } = await supabase
      .from('sfu_performance_summary')
      .select('*');

    if (error) throw error;
    return data || [];
  }
}

// =====================================================
// RECORDING MANAGEMENT API
// =====================================================

export class RecordingManagementAPI {
  /**
   * Start recording session
   */
  static async startRecording(
    roomId: string,
    participants: string[],
    config: Record<string, any>
  ): Promise<RecordingSession> {
    const recordingId = `rec_${roomId}_${Date.now()}`;
    
    const { data, error } = await supabase
      .from('recording_sessions')
      .insert({
        id: recordingId,
        room_id: roomId,
        start_time: new Date().toISOString(),
        participants,
        config,
        status: 'starting',
        encrypted: config.encryptRecording || false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update recording status
   */
  static async updateRecordingStatus(
    recordingId: string,
    status: RecordingSession['status'],
    updates?: Partial<RecordingSession>
  ): Promise<void> {
    const { error } = await supabase
      .from('recording_sessions')
      .update({
        status,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordingId);

    if (error) throw error;
  }

  /**
   * Get recording sessions for room
   */
  static async getRecordingsForRoom(roomId: string): Promise<RecordingSession[]> {
    const { data, error } = await supabase
      .from('recording_sessions')
      .select('*')
      .eq('room_id', roomId)
      .order('start_time', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get recording statistics
   */
  static async getRecordingStatistics() {
    const { data, error } = await supabase
      .from('recording_statistics')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    if (error) throw error;
    return data || [];
  }
}

// =====================================================
// NETWORK QUALITY API
// =====================================================

export class NetworkQualityAPI {
  /**
   * Submit network quality metric
   */
  static async submitNetworkMetric(metric: Omit<NetworkQualityMetric, 'id' | 'timestamp'>): Promise<void> {
    const { error } = await supabase
      .from('network_quality_metrics')
      .insert({
        ...metric,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Get network quality summary for room
   */
  static async getNetworkQualitySummary(roomId: string) {
    const { data, error } = await supabase
      .from('network_quality_summary')
      .select('*')
      .eq('room_id', roomId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get real-time network metrics
   */
  static async getNetworkMetrics(roomId: string, limit: number = 100): Promise<NetworkQualityMetric[]> {
    const { data, error } = await supabase
      .from('network_quality_metrics')
      .select('*')
      .eq('room_id', roomId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }
}

// =====================================================
// AUDIO PROCESSING API
// =====================================================

export class AudioProcessingAPI {
  /**
   * Submit audio processing event
   */
  static async submitAudioEvent(event: Omit<AudioProcessingEvent, 'id' | 'timestamp'>): Promise<void> {
    const { error } = await supabase
      .from('audio_processing_events')
      .insert({
        ...event,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Get audio events for participant
   */
  static async getAudioEvents(roomId: string, participantId: string): Promise<AudioProcessingEvent[]> {
    const { data, error } = await supabase
      .from('audio_processing_events')
      .select('*')
      .eq('room_id', roomId)
      .eq('participant_id', participantId)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) throw error;
    return data || [];
  }
}

// =====================================================
// QUALITY ADAPTATION API
// =====================================================

export class QualityAdaptationAPI {
  /**
   * Submit quality adaptation
   */
  static async submitQualityAdaptation(adaptation: Omit<QualityAdaptation, 'id' | 'timestamp'>): Promise<void> {
    const { error } = await supabase
      .from('quality_adaptations')
      .insert({
        ...adaptation,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;
  }

  /**
   * Get adaptation history for participant
   */
  static async getAdaptationHistory(roomId: string, participantId: string): Promise<QualityAdaptation[]> {
    const { data, error } = await supabase
      .from('quality_adaptations')
      .select('*')
      .eq('room_id', roomId)
      .eq('participant_id', participantId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }
}

// =====================================================
// PERFORMANCE MONITORING API
// =====================================================

export class PerformanceMonitoringAPI {
  /**
   * Create performance alert
   */
  static async createAlert(alert: Omit<PerformanceAlert, 'id' | 'created_at' | 'resolved' | 'resolved_at'>): Promise<void> {
    const { error } = await supabase
      .from('performance_alerts')
      .insert({
        ...alert,
        resolved: false
      });

    if (error) throw error;
  }

  /**
   * Resolve performance alert
   */
  static async resolveAlert(alertId: number): Promise<void> {
    const { error } = await supabase
      .from('performance_alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString()
      })
      .eq('id', alertId);

    if (error) throw error;
  }

  /**
   * Get active alerts for room
   */
  static async getActiveAlerts(roomId: string): Promise<PerformanceAlert[]> {
    const { data, error } = await supabase
      .from('performance_alerts')
      .select('*')
      .eq('room_id', roomId)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

// =====================================================
// PARTICIPANT MANAGEMENT API
// =====================================================

export class ParticipantManagementAPI {
  /**
   * Join room as participant
   */
  static async joinRoom(participant: Omit<LiveClassParticipantEnterprise, 'id' | 'joined_at' | 'left_at'>): Promise<LiveClassParticipantEnterprise> {
    const { data, error } = await supabase
      .from('live_class_participants_enterprise')
      .upsert({
        ...participant,
        joined_at: new Date().toISOString(),
        left_at: null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Leave room
   */
  static async leaveRoom(roomId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('live_class_participants_enterprise')
      .update({
        left_at: new Date().toISOString()
      })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Update participant status
   */
  static async updateParticipantStatus(
    roomId: string,
    userId: string,
    updates: Partial<LiveClassParticipantEnterprise>
  ): Promise<void> {
    const { error } = await supabase
      .from('live_class_participants_enterprise')
      .update(updates)
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Get active participants in room
   */
  static async getActiveParticipants(roomId: string): Promise<LiveClassParticipantEnterprise[]> {
    const { data, error } = await supabase
      .from('live_class_participants_enterprise')
      .select('*')
      .eq('room_id', roomId)
      .is('left_at', null)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get room performance metrics
   */
  static async getRoomPerformance(roomId: string) {
    const { data, error } = await supabase
      .from('active_room_performance')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }
}

// =====================================================
// REAL-TIME SUBSCRIPTIONS
// =====================================================

export class RealTimeSubscriptions {
  /**
   * Subscribe to SFU instance changes
   */
  static subscribeSFUInstances(callback: (payload: any) => void) {
    return supabase
      .channel('sfu_instances')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sfu_instances' }, callback)
      .subscribe();
  }

  /**
   * Subscribe to recording session changes
   */
  static subscribeRecordingSessions(roomId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`recording_${roomId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'recording_sessions', filter: `room_id=eq.${roomId}` }, 
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to network quality metrics
   */
  static subscribeNetworkQuality(roomId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`network_${roomId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'network_quality_metrics', filter: `room_id=eq.${roomId}` }, 
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to participant changes
   */
  static subscribeParticipants(roomId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`participants_${roomId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'live_class_participants_enterprise', filter: `room_id=eq.${roomId}` }, 
        callback
      )
      .subscribe();
  }

  /**
   * Subscribe to performance alerts
   */
  static subscribePerformanceAlerts(roomId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`alerts_${roomId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'performance_alerts', filter: `room_id=eq.${roomId}` }, 
        callback
      )
      .subscribe();
  }
}

// Export the configured Supabase client
export { supabase };

// Export all APIs
export {
  SFUManagementAPI,
  RecordingManagementAPI,
  NetworkQualityAPI,
  AudioProcessingAPI,
  QualityAdaptationAPI,
  PerformanceMonitoringAPI,
  ParticipantManagementAPI,
  RealTimeSubscriptions
};