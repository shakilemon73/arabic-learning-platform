/**
 * Production Video Rooms API - Enterprise room management
 * RESTful API for video conferencing room operations like Zoom/Teams
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateRoomRequest {
  name: string;
  description?: string;
  maxParticipants?: number;
  isPrivate?: boolean;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  settings?: {
    enableRecording?: boolean;
    enableTranscription?: boolean;
    enableBreakoutRooms?: boolean;
    requirePassword?: boolean;
    allowScreenShare?: boolean;
    enableChat?: boolean;
    enableReactions?: boolean;
    moderationLevel?: 'none' | 'basic' | 'strict';
  };
  createdBy: string;
}

export interface UpdateRoomRequest {
  name?: string;
  description?: string;
  maxParticipants?: number;
  settings?: any;
}

export interface RoomResponse {
  id: string;
  name: string;
  description?: string;
  maxParticipants: number;
  currentParticipants: number;
  isPrivate: boolean;
  status: 'scheduled' | 'active' | 'ended';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  settings: any;
  joinUrl: string;
  hostKey: string;
  moderatorKey: string;
}

export interface JoinRoomRequest {
  roomId: string;
  userId: string;
  displayName: string;
  password?: string;
  role?: 'host' | 'moderator' | 'participant';
}

export interface JoinRoomResponse {
  success: boolean;
  roomInfo: RoomResponse;
  participantInfo: {
    id: string;
    userId: string;
    displayName: string;
    role: string;
    permissions: {
      canSpeak: boolean;
      canShareScreen: boolean;
      canRecord: boolean;
      canModerate: boolean;
    };
  };
  connectionCredentials: {
    token: string;
    sfuEndpoint: string;
    iceServers: RTCIceServer[];
    constraints: any;
  };
}

export class VideoRoomsAPI {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Create a new video conference room
   */
  async createRoom(request: CreateRoomRequest): Promise<RoomResponse> {
    try {
      console.log('🏗️ Creating video room:', request.name);

      // Validate request
      this.validateCreateRoomRequest(request);

      // Generate room credentials
      const roomCredentials = this.generateRoomCredentials();

      // Prepare room data
      const roomData = {
        name: request.name,
        description: request.description,
        max_participants: request.maxParticipants || 100,
        is_private: request.isPrivate || false,
        scheduled_start_time: request.scheduledStartTime,
        scheduled_end_time: request.scheduledEndTime,
        settings: JSON.stringify(request.settings || {}),
        created_by: request.createdBy,
        status: request.scheduledStartTime ? 'scheduled' : 'active',
        join_url: roomCredentials.joinUrl,
        host_key: roomCredentials.hostKey,
        moderator_key: roomCredentials.moderatorKey,
        current_participants: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert room into database
      const { data, error } = await this.supabase
        .from('video_rooms')
        .insert(roomData)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create room:', error);
        throw new Error(`Failed to create room: ${error.message}`);
      }

      console.log('✅ Room created successfully:', data.id);

      return this.mapDatabaseToResponse(data);

    } catch (error) {
      console.error('❌ Room creation error:', error);
      throw error;
    }
  }

  /**
   * Get room information
   */
  async getRoomInfo(roomId: string): Promise<RoomResponse> {
    try {
      const { data, error } = await this.supabase
        .from('video_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error || !data) {
        throw new Error('Room not found');
      }

      return this.mapDatabaseToResponse(data);

    } catch (error) {
      console.error('❌ Failed to get room info:', error);
      throw error;
    }
  }

  /**
   * Join a video conference room
   */
  async joinRoom(request: JoinRoomRequest): Promise<JoinRoomResponse> {
    try {
      console.log(`🚪 User ${request.userId} joining room ${request.roomId}`);

      // Get room information
      const roomInfo = await this.getRoomInfo(request.roomId);

      // Validate join request
      await this.validateJoinRequest(request, roomInfo);

      // Check room capacity
      if (roomInfo.currentParticipants >= roomInfo.maxParticipants) {
        throw new Error('Room has reached maximum capacity');
      }

      // Create participant record
      const participantInfo = await this.createParticipant(request, roomInfo);

      // Generate connection credentials
      const connectionCredentials = await this.generateConnectionCredentials(
        request.userId, 
        request.roomId, 
        participantInfo.permissions
      );

      // Update room participant count
      await this.updateRoomParticipantCount(request.roomId, 1);

      // Start room if it's the first participant and room is scheduled
      if (roomInfo.status === 'scheduled' && roomInfo.currentParticipants === 0) {
        await this.activateRoom(request.roomId);
        roomInfo.status = 'active';
        roomInfo.actualStartTime = new Date();
      }

      console.log(`✅ User ${request.userId} joined room ${request.roomId} successfully`);

      return {
        success: true,
        roomInfo,
        participantInfo,
        connectionCredentials
      };

    } catch (error) {
      console.error('❌ Failed to join room:', error);
      throw error;
    }
  }

  /**
   * Leave a video conference room
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    try {
      console.log(`🚶 User ${userId} leaving room ${roomId}`);

      // Remove participant record
      const { error } = await this.supabase
        .from('video_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .is('left_at', null);

      if (error) {
        console.error('Failed to update participant leave time:', error);
      }

      // Update room participant count
      await this.updateRoomParticipantCount(roomId, -1);

      // Check if room should be ended (no more participants)
      const roomInfo = await this.getRoomInfo(roomId);
      if (roomInfo.currentParticipants <= 0) {
        await this.endRoom(roomId);
      }

      console.log(`✅ User ${userId} left room ${roomId}`);

    } catch (error) {
      console.error('❌ Failed to leave room:', error);
      throw error;
    }
  }

  /**
   * Update room settings
   */
  async updateRoom(roomId: string, request: UpdateRoomRequest): Promise<RoomResponse> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (request.name) updateData.name = request.name;
      if (request.description !== undefined) updateData.description = request.description;
      if (request.maxParticipants) updateData.max_participants = request.maxParticipants;
      if (request.settings) updateData.settings = JSON.stringify(request.settings);

      const { data, error } = await this.supabase
        .from('video_rooms')
        .update(updateData)
        .eq('id', roomId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update room: ${error.message}`);
      }

      return this.mapDatabaseToResponse(data);

    } catch (error) {
      console.error('❌ Failed to update room:', error);
      throw error;
    }
  }

  /**
   * End a video conference room
   */
  async endRoom(roomId: string): Promise<void> {
    try {
      console.log(`🔚 Ending room ${roomId}`);

      // Update room status
      const { error } = await this.supabase
        .from('video_rooms')
        .update({
          status: 'ended',
          actual_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId);

      if (error) {
        throw new Error(`Failed to end room: ${error.message}`);
      }

      // End all active participant sessions
      await this.supabase
        .from('video_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .is('left_at', null);

      console.log(`✅ Room ${roomId} ended successfully`);

    } catch (error) {
      console.error('❌ Failed to end room:', error);
      throw error;
    }
  }

  /**
   * List active rooms for a user
   */
  async listUserRooms(userId: string): Promise<RoomResponse[]> {
    try {
      const { data, error } = await this.supabase
        .from('video_rooms')
        .select('*')
        .or(`created_by.eq.${userId},id.in.(${await this.getUserParticipantRooms(userId)})`)
        .in('status', ['active', 'scheduled'])
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to list rooms: ${error.message}`);
      }

      return (data || []).map(room => this.mapDatabaseToResponse(room));

    } catch (error) {
      console.error('❌ Failed to list user rooms:', error);
      throw error;
    }
  }

  /**
   * Get room analytics
   */
  async getRoomAnalytics(roomId: string): Promise<any> {
    try {
      // Get room basic info
      const roomInfo = await this.getRoomInfo(roomId);

      // Get participant statistics
      const { data: participants, error } = await this.supabase
        .from('video_participants')
        .select('*')
        .eq('room_id', roomId);

      if (error) {
        throw new Error(`Failed to get room analytics: ${error.message}`);
      }

      const totalParticipants = participants?.length || 0;
      const activeParticipants = participants?.filter(p => !p.left_at).length || 0;

      // Calculate session duration
      const sessionDuration = roomInfo.actualStartTime && roomInfo.actualEndTime ?
        new Date(roomInfo.actualEndTime).getTime() - new Date(roomInfo.actualStartTime).getTime() :
        roomInfo.actualStartTime ?
        Date.now() - new Date(roomInfo.actualStartTime).getTime() :
        0;

      return {
        roomInfo,
        participants: {
          total: totalParticipants,
          active: activeParticipants,
          peak: roomInfo.maxParticipants // This would be tracked separately in production
        },
        duration: {
          total: sessionDuration,
          formatted: this.formatDuration(sessionDuration)
        },
        status: roomInfo.status
      };

    } catch (error) {
      console.error('❌ Failed to get room analytics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private validateCreateRoomRequest(request: CreateRoomRequest): void {
    if (!request.name?.trim()) {
      throw new Error('Room name is required');
    }
    if (request.maxParticipants && (request.maxParticipants < 1 || request.maxParticipants > 1000)) {
      throw new Error('Maximum participants must be between 1 and 1000');
    }
    if (!request.createdBy) {
      throw new Error('Created by user ID is required');
    }
  }

  private generateRoomCredentials(): { joinUrl: string; hostKey: string; moderatorKey: string } {
    const roomId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    return {
      joinUrl: `/room/${roomId}`,
      hostKey: this.generateSecureKey('host'),
      moderatorKey: this.generateSecureKey('mod')
    };
  }

  private generateSecureKey(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 10)}`;
  }

  private async validateJoinRequest(request: JoinRoomRequest, roomInfo: RoomResponse): Promise<void> {
    // Check if room is active
    if (roomInfo.status === 'ended') {
      throw new Error('This room has ended');
    }

    // Check if room requires password
    if (roomInfo.settings?.requirePassword && !request.password) {
      throw new Error('Room password is required');
    }

    // Check if user is already in room
    const { data: existingParticipant } = await this.supabase
      .from('video_participants')
      .select('id')
      .eq('room_id', request.roomId)
      .eq('user_id', request.userId)
      .is('left_at', null)
      .single();

    if (existingParticipant) {
      throw new Error('User is already in this room');
    }
  }

  private async createParticipant(request: JoinRoomRequest, roomInfo: RoomResponse): Promise<any> {
    const participantData = {
      room_id: request.roomId,
      user_id: request.userId,
      display_name: request.displayName,
      role: request.role || 'participant',
      joined_at: new Date().toISOString(),
      connection_quality: 'good',
      is_muted: false,
      is_video_enabled: true
    };

    const { data, error } = await this.supabase
      .from('video_participants')
      .insert(participantData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create participant: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      displayName: data.display_name,
      role: data.role,
      permissions: this.generateUserPermissions(data.role, roomInfo.settings)
    };
  }

  private generateUserPermissions(role: string, roomSettings: any): any {
    const basePermissions = {
      canSpeak: true,
      canShareScreen: roomSettings?.allowScreenShare !== false,
      canRecord: false,
      canModerate: false
    };

    switch (role) {
      case 'host':
        return {
          ...basePermissions,
          canRecord: true,
          canModerate: true
        };
      case 'moderator':
        return {
          ...basePermissions,
          canModerate: true
        };
      default:
        return basePermissions;
    }
  }

  private async generateConnectionCredentials(userId: string, roomId: string, permissions: any): Promise<any> {
    // This would integrate with your SecurityManager and LoadBalancer
    const token = this.generateSecureKey('conn');
    
    return {
      token,
      sfuEndpoint: 'wss://sfu-us-east.yourapp.com', // From LoadBalancer
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      constraints: {
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: { echoCancellation: true, noiseSuppression: true }
      }
    };
  }

  private async updateRoomParticipantCount(roomId: string, delta: number): Promise<void> {
    const { error } = await this.supabase
      .rpc('update_room_participant_count', {
        room_id: roomId,
        delta: delta
      });

    if (error) {
      console.error('Failed to update participant count:', error);
    }
  }

  private async activateRoom(roomId: string): Promise<void> {
    const { error } = await this.supabase
      .from('video_rooms')
      .update({
        status: 'active',
        actual_start_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId);

    if (error) {
      console.error('Failed to activate room:', error);
    }
  }

  private async getUserParticipantRooms(userId: string): Promise<string> {
    const { data } = await this.supabase
      .from('video_participants')
      .select('room_id')
      .eq('user_id', userId)
      .is('left_at', null);

    return (data || []).map(p => p.room_id).join(',') || '';
  }

  private mapDatabaseToResponse(data: any): RoomResponse {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      maxParticipants: data.max_participants,
      currentParticipants: data.current_participants || 0,
      isPrivate: data.is_private,
      status: data.status,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      scheduledStartTime: data.scheduled_start_time ? new Date(data.scheduled_start_time) : undefined,
      scheduledEndTime: data.scheduled_end_time ? new Date(data.scheduled_end_time) : undefined,
      actualStartTime: data.actual_start_time ? new Date(data.actual_start_time) : undefined,
      actualEndTime: data.actual_end_time ? new Date(data.actual_end_time) : undefined,
      settings: data.settings ? JSON.parse(data.settings) : {},
      joinUrl: data.join_url,
      hostKey: data.host_key,
      moderatorKey: data.moderator_key
    };
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}