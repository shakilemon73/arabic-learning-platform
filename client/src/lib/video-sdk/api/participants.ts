/**
 * Production Video Participants API - Enterprise participant management
 * Advanced participant control and management like Zoom/Teams
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface ParticipantInfo {
  id: string;
  userId: string;
  roomId: string;
  displayName: string;
  role: 'host' | 'moderator' | 'participant' | 'viewer';
  joinedAt: Date;
  leftAt?: Date;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  mediaState: {
    audioEnabled: boolean;
    videoEnabled: boolean;
    screenSharing: boolean;
  };
  permissions: {
    canSpeak: boolean;
    canShareScreen: boolean;
    canRecord: boolean;
    canModerate: boolean;
    canChat: boolean;
  };
  metadata?: {
    userAgent: string;
    ip: string;
    location?: string;
    device?: string;
  };
}

export interface UpdateParticipantRequest {
  displayName?: string;
  role?: string;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  connectionQuality?: string;
}

export interface ParticipantAction {
  type: 'mute' | 'unmute' | 'disable_video' | 'enable_video' | 'remove' | 'promote' | 'demote';
  targetUserId: string;
  reason?: string;
  duration?: number; // for temporary actions
}

export interface BulkParticipantAction {
  action: 'mute_all' | 'unmute_all' | 'disable_all_video' | 'enable_all_video';
  excludeUserIds?: string[];
  includeRoles?: string[];
  excludeRoles?: string[];
}

export interface ParticipantStatistics {
  totalParticipants: number;
  activeParticipants: number;
  participantsByRole: Record<string, number>;
  averageSessionDuration: number;
  connectionQualityDistribution: Record<string, number>;
  deviceTypeDistribution: Record<string, number>;
  geographicDistribution: Record<string, number>;
}

export class VideoParticipantsAPI {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Get all participants in a room
   */
  async getRoomParticipants(roomId: string): Promise<ParticipantInfo[]> {
    try {
      const { data, error } = await this.supabase
        .from('video_participants')
        .select('*')
        .eq('room_id', roomId)
        .is('left_at', null)
        .order('joined_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to get participants: ${error.message}`);
      }

      return (data || []).map(participant => this.mapDatabaseToParticipant(participant));

    } catch (error) {
      console.error('❌ Failed to get room participants:', error);
      throw error;
    }
  }

  /**
   * Get specific participant information
   */
  async getParticipant(roomId: string, userId: string): Promise<ParticipantInfo | null> {
    try {
      const { data, error } = await this.supabase
        .from('video_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .is('left_at', null)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapDatabaseToParticipant(data);

    } catch (error) {
      console.error('❌ Failed to get participant:', error);
      return null;
    }
  }

  /**
   * Update participant information
   */
  async updateParticipant(
    roomId: string, 
    userId: string, 
    updates: UpdateParticipantRequest
  ): Promise<ParticipantInfo> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.displayName) updateData.display_name = updates.displayName;
      if (updates.role) updateData.role = updates.role;
      if (updates.audioEnabled !== undefined) updateData.is_muted = !updates.audioEnabled;
      if (updates.videoEnabled !== undefined) updateData.is_video_enabled = updates.videoEnabled;
      if (updates.connectionQuality) updateData.connection_quality = updates.connectionQuality;

      const { data, error } = await this.supabase
        .from('video_participants')
        .update(updateData)
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .is('left_at', null)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update participant: ${error.message}`);
      }

      console.log(`✅ Participant ${userId} updated in room ${roomId}`);
      return this.mapDatabaseToParticipant(data);

    } catch (error) {
      console.error('❌ Failed to update participant:', error);
      throw error;
    }
  }

  /**
   * Perform action on a participant (moderator controls)
   */
  async performParticipantAction(
    roomId: string, 
    moderatorId: string, 
    action: ParticipantAction
  ): Promise<boolean> {
    try {
      console.log(`🎯 Performing action ${action.type} on user ${action.targetUserId}`);

      // Verify moderator permissions
      const moderator = await this.getParticipant(roomId, moderatorId);
      if (!moderator || !this.canModerate(moderator.role)) {
        throw new Error('Insufficient permissions to perform this action');
      }

      // Get target participant
      const target = await this.getParticipant(roomId, action.targetUserId);
      if (!target) {
        throw new Error('Target participant not found');
      }

      // Perform the action
      await this.executeParticipantAction(roomId, action, target);

      // Log the action
      await this.logModeratorAction(roomId, moderatorId, action);

      console.log(`✅ Action ${action.type} performed successfully`);
      return true;

    } catch (error) {
      console.error('❌ Failed to perform participant action:', error);
      throw error;
    }
  }

  /**
   * Perform bulk action on multiple participants
   */
  async performBulkParticipantAction(
    roomId: string, 
    moderatorId: string, 
    bulkAction: BulkParticipantAction
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      console.log(`🎯 Performing bulk action ${bulkAction.action} in room ${roomId}`);

      // Verify moderator permissions
      const moderator = await this.getParticipant(roomId, moderatorId);
      if (!moderator || !this.canModerate(moderator.role)) {
        throw new Error('Insufficient permissions to perform bulk actions');
      }

      // Get target participants
      const allParticipants = await this.getRoomParticipants(roomId);
      const targetParticipants = this.filterParticipantsForBulkAction(allParticipants, bulkAction);

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Execute action on each participant
      for (const participant of targetParticipants) {
        try {
          const action = this.convertBulkActionToParticipantAction(bulkAction, participant.userId);
          await this.executeParticipantAction(roomId, action, participant);
          successCount++;
        } catch (error) {
          failedCount++;
          errors.push(`${participant.displayName}: ${(error as Error).message}`);
        }
      }

      // Log bulk action
      await this.logBulkModeratorAction(roomId, moderatorId, bulkAction, { successCount, failedCount });

      console.log(`✅ Bulk action completed: ${successCount} success, ${failedCount} failed`);
      return { success: successCount, failed: failedCount, errors };

    } catch (error) {
      console.error('❌ Failed to perform bulk participant action:', error);
      throw error;
    }
  }

  /**
   * Remove participant from room
   */
  async removeParticipant(
    roomId: string, 
    userId: string, 
    reason: string = 'Removed by moderator'
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('video_participants')
        .update({
          left_at: new Date().toISOString(),
          leave_reason: reason
        })
        .eq('room_id', roomId)
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to remove participant: ${error.message}`);
      }

      console.log(`🚫 Participant ${userId} removed from room ${roomId}: ${reason}`);

    } catch (error) {
      console.error('❌ Failed to remove participant:', error);
      throw error;
    }
  }

  /**
   * Get participant statistics for a room
   */
  async getParticipantStatistics(roomId: string): Promise<ParticipantStatistics> {
    try {
      // Get all participants (current and past)
      const { data: allParticipants, error } = await this.supabase
        .from('video_participants')
        .select('*')
        .eq('room_id', roomId);

      if (error) {
        throw new Error(`Failed to get participant statistics: ${error.message}`);
      }

      const participants = allParticipants || [];
      const activeParticipants = participants.filter(p => !p.left_at);

      // Calculate statistics
      const participantsByRole = participants.reduce((acc, p) => {
        acc[p.role] = (acc[p.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const connectionQualityDistribution = activeParticipants.reduce((acc, p) => {
        acc[p.connection_quality || 'unknown'] = (acc[p.connection_quality || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate average session duration for completed sessions
      const completedSessions = participants.filter(p => p.left_at);
      const totalDuration = completedSessions.reduce((sum, p) => {
        const joinTime = new Date(p.joined_at).getTime();
        const leaveTime = new Date(p.left_at).getTime();
        return sum + (leaveTime - joinTime);
      }, 0);

      const averageSessionDuration = completedSessions.length > 0 ? 
        totalDuration / completedSessions.length : 0;

      return {
        totalParticipants: participants.length,
        activeParticipants: activeParticipants.length,
        participantsByRole,
        averageSessionDuration,
        connectionQualityDistribution,
        deviceTypeDistribution: {}, // Would be populated from metadata
        geographicDistribution: {} // Would be populated from metadata
      };

    } catch (error) {
      console.error('❌ Failed to get participant statistics:', error);
      throw error;
    }
  }

  /**
   * Get participant session history
   */
  async getParticipantHistory(userId: string, limit: number = 50): Promise<ParticipantInfo[]> {
    try {
      const { data, error } = await this.supabase
        .from('video_participants')
        .select('*')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to get participant history: ${error.message}`);
      }

      return (data || []).map(participant => this.mapDatabaseToParticipant(participant));

    } catch (error) {
      console.error('❌ Failed to get participant history:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private mapDatabaseToParticipant(data: any): ParticipantInfo {
    return {
      id: data.id,
      userId: data.user_id,
      roomId: data.room_id,
      displayName: data.display_name,
      role: data.role,
      joinedAt: new Date(data.joined_at),
      leftAt: data.left_at ? new Date(data.left_at) : undefined,
      connectionQuality: data.connection_quality || 'good',
      mediaState: {
        audioEnabled: !data.is_muted,
        videoEnabled: data.is_video_enabled,
        screenSharing: data.is_screen_sharing || false
      },
      permissions: this.generateParticipantPermissions(data.role),
      metadata: data.metadata ? JSON.parse(data.metadata) : undefined
    };
  }

  private generateParticipantPermissions(role: string): ParticipantInfo['permissions'] {
    const basePermissions = {
      canSpeak: true,
      canShareScreen: true,
      canRecord: false,
      canModerate: false,
      canChat: true
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
      case 'viewer':
        return {
          ...basePermissions,
          canSpeak: false,
          canShareScreen: false
        };
      default:
        return basePermissions;
    }
  }

  private canModerate(role: string): boolean {
    return role === 'host' || role === 'moderator';
  }

  private async executeParticipantAction(
    roomId: string, 
    action: ParticipantAction, 
    target: ParticipantInfo
  ): Promise<void> {
    const updateData: any = { updated_at: new Date().toISOString() };

    switch (action.type) {
      case 'mute':
        updateData.is_muted = true;
        break;
      case 'unmute':
        updateData.is_muted = false;
        break;
      case 'disable_video':
        updateData.is_video_enabled = false;
        break;
      case 'enable_video':
        updateData.is_video_enabled = true;
        break;
      case 'remove':
        await this.removeParticipant(roomId, action.targetUserId, action.reason);
        return;
      case 'promote':
        updateData.role = 'moderator';
        break;
      case 'demote':
        updateData.role = 'participant';
        break;
    }

    const { error } = await this.supabase
      .from('video_participants')
      .update(updateData)
      .eq('room_id', roomId)
      .eq('user_id', action.targetUserId);

    if (error) {
      throw new Error(`Failed to execute action ${action.type}: ${error.message}`);
    }
  }

  private filterParticipantsForBulkAction(
    participants: ParticipantInfo[], 
    bulkAction: BulkParticipantAction
  ): ParticipantInfo[] {
    return participants.filter(participant => {
      // Exclude specific users
      if (bulkAction.excludeUserIds?.includes(participant.userId)) {
        return false;
      }

      // Include only specific roles
      if (bulkAction.includeRoles && !bulkAction.includeRoles.includes(participant.role)) {
        return false;
      }

      // Exclude specific roles
      if (bulkAction.excludeRoles && bulkAction.excludeRoles.includes(participant.role)) {
        return false;
      }

      return true;
    });
  }

  private convertBulkActionToParticipantAction(
    bulkAction: BulkParticipantAction, 
    userId: string
  ): ParticipantAction {
    const actionMap: Record<string, ParticipantAction['type']> = {
      'mute_all': 'mute',
      'unmute_all': 'unmute',
      'disable_all_video': 'disable_video',
      'enable_all_video': 'enable_video'
    };

    return {
      type: actionMap[bulkAction.action],
      targetUserId: userId
    };
  }

  private async logModeratorAction(
    roomId: string, 
    moderatorId: string, 
    action: ParticipantAction
  ): Promise<void> {
    try {
      await this.supabase
        .from('moderator_actions')
        .insert({
          room_id: roomId,
          moderator_id: moderatorId,
          action_type: action.type,
          target_user_id: action.targetUserId,
          reason: action.reason,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log moderator action:', error);
    }
  }

  private async logBulkModeratorAction(
    roomId: string, 
    moderatorId: string, 
    bulkAction: BulkParticipantAction, 
    results: { successCount: number; failedCount: number }
  ): Promise<void> {
    try {
      await this.supabase
        .from('moderator_actions')
        .insert({
          room_id: roomId,
          moderator_id: moderatorId,
          action_type: `bulk_${bulkAction.action}`,
          metadata: JSON.stringify({ ...bulkAction, results }),
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log bulk moderator action:', error);
    }
  }
}