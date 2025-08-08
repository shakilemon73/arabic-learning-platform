/**
 * Video SDK Database Configuration
 * Handles all database operations for video conferencing features
 */

import { supabase } from '../../supabase';

export interface VideoRoom {
  id: string;
  name: string;
  description?: string;
  room_code: string;
  created_by?: string;
  host_user_id?: string;
  max_participants: number;
  is_active: boolean;
  is_public: boolean;
  password_hash?: string;
  scheduled_start_time?: string;
  scheduled_end_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoParticipant {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  user_role: 'host' | 'moderator' | 'participant' | 'viewer';
  joined_at: string;
  left_at?: string;
  is_connected: boolean;
  is_video_enabled: boolean;
  is_audio_enabled: boolean;
  is_screen_sharing: boolean;
  connection_quality: 'excellent' | 'good' | 'poor' | 'disconnected';
  removed_by?: string;
  removal_reason?: string;
}

export interface VideoRoomSettings {
  id: string;
  room_id: string;
  waiting_room_enabled: boolean;
  require_approval: boolean;
  mute_on_entry: boolean;
  disable_video_on_entry: boolean;
  allow_participant_screen_share: boolean;
  allow_participant_chat: boolean;
  allow_participant_file_share: boolean;
  max_participants: number;
  recording_enabled: boolean;
  whiteboard_enabled: boolean;
  updated_by?: string;
  updated_at: string;
}

/**
 * Create a new video conference room
 */
export const createVideoRoom = async (roomData: {
  name: string;
  description?: string;
  host_user_id: string;
  max_participants?: number;
  is_public?: boolean;
  password?: string;
  scheduled_start_time?: Date;
  scheduled_end_time?: Date;
}) => {
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name: roomData.name,
      description: roomData.description,
      created_by: roomData.host_user_id,
      host_user_id: roomData.host_user_id,
      max_participants: roomData.max_participants || 100,
      is_public: roomData.is_public || false,
      password_hash: roomData.password, // In production, hash this password
      scheduled_start_time: roomData.scheduled_start_time?.toISOString(),
      scheduled_end_time: roomData.scheduled_end_time?.toISOString()
    })
    .select()
    .single();

  return { data, error };
};

/**
 * Get room by ID or room code
 */
export const getVideoRoom = async (roomId?: string, roomCode?: string) => {
  let query = supabase.from('rooms').select('*');
  
  if (roomId) {
    query = query.eq('id', roomId);
  } else if (roomCode) {
    query = query.eq('room_code', roomCode);
  } else {
    return { data: null, error: { message: 'Either roomId or roomCode is required' } };
  }

  const { data, error } = await query.single();
  return { data, error };
};

/**
 * Join a video room
 */
export const joinVideoRoom = async (participantData: {
  room_id: string;
  user_id: string;
  display_name: string;
  avatar_url?: string;
  user_role?: 'host' | 'moderator' | 'participant' | 'viewer';
}) => {
  const { data, error } = await supabase
    .from('participants')
    .insert({
      ...participantData,
      user_role: participantData.user_role || 'participant',
      is_connected: true,
      is_video_enabled: true,
      is_audio_enabled: true,
      is_screen_sharing: false,
      connection_quality: 'good'
    })
    .select()
    .single();

  return { data, error };
};

/**
 * Leave a video room
 */
export const leaveVideoRoom = async (roomId: string, userId: string) => {
  const { data, error } = await supabase
    .from('participants')
    .update({
      is_connected: false,
      left_at: new Date().toISOString()
    })
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .select()
    .single();

  return { data, error };
};

/**
 * Get all participants in a room
 */
export const getVideoRoomParticipants = async (roomId: string) => {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('room_id', roomId)
    .eq('is_connected', true)
    .order('joined_at', { ascending: true });

  return { data, error };
};

/**
 * Update participant state (video, audio, screen sharing, etc.)
 */
export const updateParticipantState = async (
  roomId: string,
  userId: string,
  updates: Partial<VideoParticipant>
) => {
  const { data, error } = await supabase
    .from('participants')
    .update(updates)
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .select()
    .single();

  return { data, error };
};

/**
 * Create room settings
 */
export const createVideoRoomSettings = async (
  roomId: string,
  settings: Partial<VideoRoomSettings>
) => {
  const { data, error } = await supabase
    .from('room_settings')
    .insert({
      room_id: roomId,
      ...settings
    })
    .select()
    .single();

  return { data, error };
};

/**
 * Get room settings
 */
export const getVideoRoomSettings = async (roomId: string) => {
  const { data, error } = await supabase
    .from('room_settings')
    .select('*')
    .eq('room_id', roomId)
    .single();

  return { data, error };
};

/**
 * Update room settings
 */
export const updateVideoRoomSettings = async (
  roomId: string,
  updates: Partial<VideoRoomSettings>
) => {
  const { data, error } = await supabase
    .from('room_settings')
    .update(updates)
    .eq('room_id', roomId)
    .select()
    .single();

  return { data, error };
};

/**
 * Get active video rooms
 */
export const getActiveVideoRooms = async (limit = 50) => {
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      participant_count:participants(count)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
};

/**
 * End a video room
 */
export const endVideoRoom = async (roomId: string) => {
  const { data, error } = await supabase
    .from('rooms')
    .update({
      is_active: false,
      actual_end_time: new Date().toISOString()
    })
    .eq('id', roomId)
    .select()
    .single();

  return { data, error };
};

/**
 * Get chat history for a room
 */
export const getVideoRoomChatHistory = async (roomId: string, limit = 50) => {
  const { data, error } = await supabase
    .from('video_chat_messages')
    .select(`
      *,
      reactions:chat_reactions(*)
    `)
    .eq('room_id', roomId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data, error };
};

/**
 * Get room recordings
 */
export const getVideoRoomRecordings = async (roomId: string) => {
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  return { data, error };
};

/**
 * Log stream quality data
 */
export const logStreamQuality = async (qualityData: {
  room_id: string;
  user_id: string;
  quality_profile: string;
  bandwidth_kbps?: number;
  latency_ms?: number;
  packet_loss_percent?: number;
  reason?: string;
}) => {
  const { data, error } = await supabase
    .from('stream_quality_logs')
    .insert(qualityData);

  return { data, error };
};

/**
 * Real-time subscriptions
 */

/**
 * Subscribe to room participants changes
 */
export const subscribeToParticipants = (roomId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`participants:${roomId}`)
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `room_id=eq.${roomId}`
      },
      callback
    )
    .subscribe();
};

/**
 * Subscribe to room settings changes
 */
export const subscribeToRoomSettings = (roomId: string, callback: (payload: any) => void) => {
  return supabase
    .channel(`room_settings:${roomId}`)
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_settings',
        filter: `room_id=eq.${roomId}`
      },
      callback
    )
    .subscribe();
};