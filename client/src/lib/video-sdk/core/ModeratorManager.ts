/**
 * ModeratorManager - Handles moderator controls and permissions
 * Participant management, muting, removal, and broadcast controls
 */

import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { EventEmitter } from './EventEmitter';

export interface ModeratorAction {
  id: string;
  type: 'mute' | 'unmute' | 'remove' | 'promote' | 'demote' | 'spotlight' | 'block_chat';
  moderatorId: string;
  targetUserId: string;
  roomId: string;
  reason?: string;
  mediaType?: 'audio' | 'video' | 'both';
  timestamp: Date;
}

export interface ModerationRequest {
  roomId: string;
  moderatorId: string;
  participantId: string;
  mediaType: 'audio' | 'video' | 'both';
  action: 'mute' | 'unmute';
  reason?: string;
}

export interface ParticipantPermissions {
  canSpeak: boolean;
  canShareVideo: boolean;
  canShareScreen: boolean;
  canChat: boolean;
  canShareFiles: boolean;
  canUseWhiteboard: boolean;
}

export interface RoomSettings {
  waitingRoomEnabled: boolean;
  requireApproval: boolean;
  muteOnEntry: boolean;
  disableVideoOnEntry: boolean;
  allowParticipantScreenShare: boolean;
  allowParticipantChat: boolean;
  allowParticipantFileShare: boolean;
  maxParticipants: number;
  recordingEnabled: boolean;
}

export class ModeratorManager extends EventEmitter {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private roomId: string | null = null;
  private moderatorId: string | null = null;
  private participantPermissions: Map<string, ParticipantPermissions> = new Map();
  private roomSettings: RoomSettings | null = null;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  /**
   * Initialize moderator controls for a room
   */
  async initialize(roomId: string, moderatorId: string): Promise<void> {
    try {
      this.roomId = roomId;
      this.moderatorId = moderatorId;

      // Verify moderator permissions
      await this.verifyModeratorPermissions(moderatorId, roomId);

      // Setup real-time moderation channel
      await this.setupModerationChannel();

      // Load room settings
      await this.loadRoomSettings();

      // Load participant permissions
      await this.loadParticipantPermissions();

      this.emit('moderator-initialized', { roomId, moderatorId });

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Verify moderator permissions
   */
  private async verifyModeratorPermissions(userId: string, roomId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('participants')
      .select('user_role')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    if (!data || (data.user_role !== 'host' && data.user_role !== 'moderator')) {
      throw new Error('Insufficient permissions for moderation actions');
    }
  }

  /**
   * Setup moderation channel
   */
  private async setupModerationChannel(): Promise<void> {
    if (!this.roomId) return;

    this.channel = this.supabase.channel(`moderation:${this.roomId}`);

    this.channel
      .on('broadcast', { event: 'moderation-action' }, (payload) => {
        this.handleModerationAction(payload.payload);
      })
      .on('broadcast', { event: 'permission-change' }, (payload) => {
        this.handlePermissionChange(payload.payload);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'participant_permissions',
        filter: `room_id=eq.${this.roomId}`
      }, (payload) => {
        this.handlePermissionUpdate(payload.new as any);
      });

    await this.channel.subscribe();
  }

  /**
   * Mute participant
   */
  async muteParticipant(request: ModerationRequest): Promise<void> {
    try {
      await this.verifyModeratorPermissions(request.moderatorId, request.roomId);

      // Update participant permissions
      const permissions = this.participantPermissions.get(request.participantId) || this.getDefaultPermissions();
      
      if (request.mediaType === 'audio' || request.mediaType === 'both') {
        permissions.canSpeak = false;
      }
      if (request.mediaType === 'video' || request.mediaType === 'both') {
        permissions.canShareVideo = false;
      }

      await this.updateParticipantPermissions(request.participantId, permissions);

      // Create moderation action record
      await this.createModerationAction({
        type: 'mute',
        moderatorId: request.moderatorId,
        targetUserId: request.participantId,
        roomId: request.roomId,
        mediaType: request.mediaType,
        reason: request.reason,
        timestamp: new Date()
      });

      // Broadcast moderation action
      await this.broadcastModerationAction({
        type: 'mute',
        targetUserId: request.participantId,
        mediaType: request.mediaType,
        moderatorId: request.moderatorId
      });

      this.emit('participant-muted', {
        participantId: request.participantId,
        mediaType: request.mediaType,
        moderatorId: request.moderatorId
      });

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Unmute participant
   */
  async unmuteParticipant(request: ModerationRequest): Promise<void> {
    try {
      await this.verifyModeratorPermissions(request.moderatorId, request.roomId);

      // Update participant permissions
      const permissions = this.participantPermissions.get(request.participantId) || this.getDefaultPermissions();
      
      if (request.mediaType === 'audio' || request.mediaType === 'both') {
        permissions.canSpeak = true;
      }
      if (request.mediaType === 'video' || request.mediaType === 'both') {
        permissions.canShareVideo = true;
      }

      await this.updateParticipantPermissions(request.participantId, permissions);

      // Create moderation action record
      await this.createModerationAction({
        type: 'unmute',
        moderatorId: request.moderatorId,
        targetUserId: request.participantId,
        roomId: request.roomId,
        mediaType: request.mediaType,
        reason: request.reason,
        timestamp: new Date()
      });

      // Broadcast moderation action
      await this.broadcastModerationAction({
        type: 'unmute',
        targetUserId: request.participantId,
        mediaType: request.mediaType,
        moderatorId: request.moderatorId
      });

      this.emit('participant-unmuted', {
        participantId: request.participantId,
        mediaType: request.mediaType,
        moderatorId: request.moderatorId
      });

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(participantId: string, reason?: string): Promise<void> {
    try {
      if (!this.moderatorId || !this.roomId) {
        throw new Error('Moderator not initialized');
      }

      await this.verifyModeratorPermissions(this.moderatorId, this.roomId);

      // Update participant status
      await this.supabase
        .from('participants')
        .update({
          is_connected: false,
          left_at: new Date().toISOString(),
          removed_by: this.moderatorId,
          removal_reason: reason
        })
        .eq('room_id', this.roomId)
        .eq('user_id', participantId);

      // Create moderation action record
      await this.createModerationAction({
        type: 'remove',
        moderatorId: this.moderatorId,
        targetUserId: participantId,
        roomId: this.roomId,
        reason,
        timestamp: new Date()
      });

      // Broadcast removal action
      await this.broadcastModerationAction({
        type: 'remove',
        targetUserId: participantId,
        moderatorId: this.moderatorId,
        reason
      });

      this.emit('participant-removed', {
        participantId,
        moderatorId: this.moderatorId,
        reason
      });

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Promote participant to moderator
   */
  async promoteParticipant(participantId: string): Promise<void> {
    try {
      if (!this.moderatorId || !this.roomId) {
        throw new Error('Moderator not initialized');
      }

      await this.verifyModeratorPermissions(this.moderatorId, this.roomId);

      // Update participant role
      await this.supabase
        .from('participants')
        .update({ user_role: 'moderator' })
        .eq('room_id', this.roomId)
        .eq('user_id', participantId);

      // Create moderation action record
      await this.createModerationAction({
        type: 'promote',
        moderatorId: this.moderatorId,
        targetUserId: participantId,
        roomId: this.roomId,
        timestamp: new Date()
      });

      // Broadcast promotion
      await this.broadcastModerationAction({
        type: 'promote',
        targetUserId: participantId,
        moderatorId: this.moderatorId
      });

      this.emit('participant-promoted', {
        participantId,
        moderatorId: this.moderatorId
      });

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Demote moderator to participant
   */
  async demoteParticipant(participantId: string): Promise<void> {
    try {
      if (!this.moderatorId || !this.roomId) {
        throw new Error('Moderator not initialized');
      }

      await this.verifyModeratorPermissions(this.moderatorId, this.roomId);

      // Update participant role
      await this.supabase
        .from('participants')
        .update({ user_role: 'participant' })
        .eq('room_id', this.roomId)
        .eq('user_id', participantId);

      // Create moderation action record
      await this.createModerationAction({
        type: 'demote',
        moderatorId: this.moderatorId,
        targetUserId: participantId,
        roomId: this.roomId,
        timestamp: new Date()
      });

      // Broadcast demotion
      await this.broadcastModerationAction({
        type: 'demote',
        targetUserId: participantId,
        moderatorId: this.moderatorId
      });

      this.emit('participant-demoted', {
        participantId,
        moderatorId: this.moderatorId
      });

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Spotlight participant (make them the main speaker)
   */
  async spotlightParticipant(participantId: string): Promise<void> {
    try {
      if (!this.moderatorId || !this.roomId) {
        throw new Error('Moderator not initialized');
      }

      await this.verifyModeratorPermissions(this.moderatorId, this.roomId);

      // Remove spotlight from other participants
      await this.supabase
        .from('participant_permissions')
        .update({ is_spotlighted: false })
        .eq('room_id', this.roomId);

      // Spotlight target participant
      await this.supabase
        .from('participant_permissions')
        .upsert({
          room_id: this.roomId,
          user_id: participantId,
          is_spotlighted: true
        });

      // Create moderation action record
      await this.createModerationAction({
        type: 'spotlight',
        moderatorId: this.moderatorId,
        targetUserId: participantId,
        roomId: this.roomId,
        timestamp: new Date()
      });

      // Broadcast spotlight action
      await this.broadcastModerationAction({
        type: 'spotlight',
        targetUserId: participantId,
        moderatorId: this.moderatorId
      });

      this.emit('participant-spotlighted', {
        participantId,
        moderatorId: this.moderatorId
      });

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Block participant from chat
   */
  async blockParticipantChat(participantId: string, reason?: string): Promise<void> {
    try {
      const permissions = this.participantPermissions.get(participantId) || this.getDefaultPermissions();
      permissions.canChat = false;
      permissions.canShareFiles = false;

      await this.updateParticipantPermissions(participantId, permissions);

      // Create moderation action record
      await this.createModerationAction({
        type: 'block_chat',
        moderatorId: this.moderatorId!,
        targetUserId: participantId,
        roomId: this.roomId!,
        reason,
        timestamp: new Date()
      });

      this.emit('participant-chat-blocked', {
        participantId,
        moderatorId: this.moderatorId,
        reason
      });

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Update room settings
   */
  async updateRoomSettings(settings: Partial<RoomSettings>): Promise<void> {
    try {
      if (!this.moderatorId || !this.roomId) {
        throw new Error('Moderator not initialized');
      }

      await this.verifyModeratorPermissions(this.moderatorId, this.roomId);

      // Update room settings in database
      await this.supabase
        .from('room_settings')
        .upsert({
          room_id: this.roomId,
          ...settings,
          updated_by: this.moderatorId,
          updated_at: new Date().toISOString()
        });

      this.roomSettings = { ...this.roomSettings, ...settings } as RoomSettings;

      this.emit('room-settings-updated', {
        settings: this.roomSettings,
        moderatorId: this.moderatorId
      });

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get participant permissions
   */
  getParticipantPermissions(participantId: string): ParticipantPermissions {
    return this.participantPermissions.get(participantId) || this.getDefaultPermissions();
  }

  /**
   * Get room settings
   */
  getRoomSettings(): RoomSettings | null {
    return this.roomSettings;
  }

  /**
   * Get moderation history
   */
  async getModerationHistory(limit: number = 50): Promise<ModeratorAction[]> {
    try {
      const { data, error } = await this.supabase
        .from('moderation_actions')
        .select('*')
        .eq('room_id', this.roomId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(this.transformDatabaseAction);

    } catch (error) {
      this.emit('error', { error: error.message });
      return [];
    }
  }

  // Private helper methods
  private async loadRoomSettings(): Promise<void> {
    const { data } = await this.supabase
      .from('room_settings')
      .select('*')
      .eq('room_id', this.roomId)
      .single();

    this.roomSettings = data ? this.transformDatabaseSettings(data) : this.getDefaultRoomSettings();
  }

  private async loadParticipantPermissions(): Promise<void> {
    const { data } = await this.supabase
      .from('participant_permissions')
      .select('*')
      .eq('room_id', this.roomId);

    if (data) {
      data.forEach(perm => {
        this.participantPermissions.set(perm.user_id, this.transformDatabasePermissions(perm));
      });
    }
  }

  private async updateParticipantPermissions(participantId: string, permissions: ParticipantPermissions): Promise<void> {
    await this.supabase
      .from('participant_permissions')
      .upsert({
        room_id: this.roomId,
        user_id: participantId,
        can_speak: permissions.canSpeak,
        can_share_video: permissions.canShareVideo,
        can_share_screen: permissions.canShareScreen,
        can_chat: permissions.canChat,
        can_share_files: permissions.canShareFiles,
        can_use_whiteboard: permissions.canUseWhiteboard
      });

    this.participantPermissions.set(participantId, permissions);
  }

  private async createModerationAction(action: Partial<ModeratorAction>): Promise<void> {
    const { error } = await this.supabase
      .from('moderation_actions')
      .insert({
        action_type: action.type,
        moderator_id: action.moderatorId,
        target_user_id: action.targetUserId,
        room_id: action.roomId,
        reason: action.reason,
        media_type: action.mediaType,
        timestamp: action.timestamp?.toISOString()
      });

    if (error) throw error;
  }

  private async broadcastModerationAction(action: any): Promise<void> {
    if (!this.channel) return;

    await this.channel.send({
      type: 'broadcast',
      event: 'moderation-action',
      payload: action
    });
  }

  private handleModerationAction(action: any): void {
    this.emit('moderation-action-received', action);
  }

  private handlePermissionChange(data: any): void {
    this.participantPermissions.set(data.participantId, data.permissions);
    this.emit('permission-changed', data);
  }

  private handlePermissionUpdate(data: any): void {
    const permissions = this.transformDatabasePermissions(data);
    this.participantPermissions.set(data.user_id, permissions);
    this.emit('permission-updated', { participantId: data.user_id, permissions });
  }

  private getDefaultPermissions(): ParticipantPermissions {
    return {
      canSpeak: true,
      canShareVideo: true,
      canShareScreen: true,
      canChat: true,
      canShareFiles: true,
      canUseWhiteboard: true
    };
  }

  private getDefaultRoomSettings(): RoomSettings {
    return {
      waitingRoomEnabled: false,
      requireApproval: false,
      muteOnEntry: false,
      disableVideoOnEntry: false,
      allowParticipantScreenShare: true,
      allowParticipantChat: true,
      allowParticipantFileShare: true,
      maxParticipants: 100,
      recordingEnabled: true
    };
  }

  private transformDatabaseAction(dbAction: any): ModeratorAction {
    return {
      id: dbAction.id,
      type: dbAction.action_type,
      moderatorId: dbAction.moderator_id,
      targetUserId: dbAction.target_user_id,
      roomId: dbAction.room_id,
      reason: dbAction.reason,
      mediaType: dbAction.media_type,
      timestamp: new Date(dbAction.timestamp)
    };
  }

  private transformDatabasePermissions(dbPerm: any): ParticipantPermissions {
    return {
      canSpeak: dbPerm.can_speak,
      canShareVideo: dbPerm.can_share_video,
      canShareScreen: dbPerm.can_share_screen,
      canChat: dbPerm.can_chat,
      canShareFiles: dbPerm.can_share_files,
      canUseWhiteboard: dbPerm.can_use_whiteboard
    };
  }

  private transformDatabaseSettings(dbSettings: any): RoomSettings {
    return {
      waitingRoomEnabled: dbSettings.waiting_room_enabled,
      requireApproval: dbSettings.require_approval,
      muteOnEntry: dbSettings.mute_on_entry,
      disableVideoOnEntry: dbSettings.disable_video_on_entry,
      allowParticipantScreenShare: dbSettings.allow_participant_screen_share,
      allowParticipantChat: dbSettings.allow_participant_chat,
      allowParticipantFileShare: dbSettings.allow_participant_file_share,
      maxParticipants: dbSettings.max_participants,
      recordingEnabled: dbSettings.recording_enabled
    };
  }

  /**
   * Disconnect from moderation
   */
  async disconnect(): Promise<void> {
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.participantPermissions.clear();
    this.roomSettings = null;
    this.roomId = null;
    this.moderatorId = null;
  }

  /**
   * Destroy moderator manager
   */
  destroy(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}