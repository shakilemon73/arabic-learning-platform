/**
 * Production Room Model - Enterprise room data management
 * Type-safe room operations with comprehensive validation
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface Room {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  maxParticipants: number;
  currentParticipants: number;
  isPrivate: boolean;
  status: 'scheduled' | 'active' | 'ended' | 'paused' | 'archived';
  
  // Scheduling
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  
  // Configuration
  settings: {
    enableRecording?: boolean;
    enableTranscription?: boolean;
    enableBreakoutRooms?: boolean;
    requirePassword?: boolean;
    allowScreenShare?: boolean;
    enableChat?: boolean;
    enableReactions?: boolean;
    moderationLevel?: 'none' | 'basic' | 'strict';
    maxVideoQuality?: '4K' | '1080p' | '720p' | '480p';
    autoRecording?: boolean;
    lobbyEnabled?: boolean;
  };
  
  // Access control
  joinUrl: string;
  hostKey: string;
  moderatorKey: string;
  passwordHash?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoomData {
  name: string;
  description?: string;
  createdBy: string;
  maxParticipants?: number;
  isPrivate?: boolean;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  settings?: Partial<Room['settings']>;
  password?: string;
}

export interface UpdateRoomData {
  name?: string;
  description?: string;
  maxParticipants?: number;
  settings?: Partial<Room['settings']>;
  password?: string;
}

export interface RoomFilters {
  createdBy?: string;
  status?: Room['status'] | Room['status'][];
  isPrivate?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'name' | 'scheduled_start_time';
  orderDirection?: 'asc' | 'desc';
}

export interface RoomStats {
  totalRooms: number;
  activeRooms: number;
  scheduledRooms: number;
  totalParticipants: number;
  averageParticipants: number;
  popularityScore: number;
}

export class RoomModel {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Create a new room
   */
  async create(data: CreateRoomData): Promise<Room> {
    try {
      this.validateCreateData(data);

      const roomData = {
        name: data.name,
        description: data.description,
        created_by: data.createdBy,
        max_participants: data.maxParticipants || 100,
        current_participants: 0,
        is_private: data.isPrivate || false,
        status: data.scheduledStartTime ? 'scheduled' : 'active',
        scheduled_start_time: data.scheduledStartTime?.toISOString(),
        scheduled_end_time: data.scheduledEndTime?.toISOString(),
        settings: JSON.stringify(data.settings || {}),
        join_url: this.generateJoinUrl(),
        host_key: this.generateKey('host'),
        moderator_key: this.generateKey('moderator'),
        password_hash: data.password ? await this.hashPassword(data.password) : null
      };

      const { data: room, error } = await this.supabase
        .from('video_rooms')
        .insert(roomData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create room: ${error.message}`);
      }

      return this.mapDatabaseToRoom(room);

    } catch (error) {
      console.error('❌ Failed to create room:', error);
      throw error;
    }
  }

  /**
   * Get room by ID
   */
  async findById(id: string): Promise<Room | null> {
    try {
      const { data, error } = await this.supabase
        .from('video_rooms')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapDatabaseToRoom(data);

    } catch (error) {
      console.error('❌ Failed to get room:', error);
      return null;
    }
  }

  /**
   * Update room
   */
  async update(id: string, data: UpdateRoomData): Promise<Room> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (data.name) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.maxParticipants) updateData.max_participants = data.maxParticipants;
      if (data.settings) updateData.settings = JSON.stringify(data.settings);
      if (data.password) updateData.password_hash = await this.hashPassword(data.password);

      const { data: room, error } = await this.supabase
        .from('video_rooms')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update room: ${error.message}`);
      }

      return this.mapDatabaseToRoom(room);

    } catch (error) {
      console.error('❌ Failed to update room:', error);
      throw error;
    }
  }

  /**
   * Delete room
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('video_rooms')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete room: ${error.message}`);
      }

    } catch (error) {
      console.error('❌ Failed to delete room:', error);
      throw error;
    }
  }

  /**
   * Find rooms with filters
   */
  async findMany(filters: RoomFilters = {}): Promise<Room[]> {
    try {
      let query = this.supabase
        .from('video_rooms')
        .select('*');

      // Apply filters
      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy);
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.isPrivate !== undefined) {
        query = query.eq('is_private', filters.isPrivate);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      // Apply ordering
      const orderBy = filters.orderBy || 'created_at';
      const orderDirection = filters.orderDirection || 'desc';
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find rooms: ${error.message}`);
      }

      return (data || []).map(room => this.mapDatabaseToRoom(room));

    } catch (error) {
      console.error('❌ Failed to find rooms:', error);
      throw error;
    }
  }

  /**
   * Update participant count
   */
  async updateParticipantCount(roomId: string, delta: number): Promise<void> {
    try {
      const { error } = await this.supabase
        .rpc('update_room_participant_count', {
          room_uuid: roomId,
          delta_count: delta
        });

      if (error) {
        throw new Error(`Failed to update participant count: ${error.message}`);
      }

    } catch (error) {
      console.error('❌ Failed to update participant count:', error);
      throw error;
    }
  }

  /**
   * Start room (change status to active)
   */
  async start(roomId: string): Promise<Room> {
    try {
      const { data: room, error } = await this.supabase
        .from('video_rooms')
        .update({
          status: 'active',
          actual_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to start room: ${error.message}`);
      }

      return this.mapDatabaseToRoom(room);

    } catch (error) {
      console.error('❌ Failed to start room:', error);
      throw error;
    }
  }

  /**
   * End room
   */
  async end(roomId: string): Promise<Room> {
    try {
      const { data: room, error } = await this.supabase
        .from('video_rooms')
        .update({
          status: 'ended',
          actual_end_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', roomId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to end room: ${error.message}`);
      }

      return this.mapDatabaseToRoom(room);

    } catch (error) {
      console.error('❌ Failed to end room:', error);
      throw error;
    }
  }

  /**
   * Get room statistics
   */
  async getStats(roomId?: string): Promise<RoomStats> {
    try {
      if (roomId) {
        // Stats for specific room
        const room = await this.findById(roomId);
        if (!room) throw new Error('Room not found');

        return {
          totalRooms: 1,
          activeRooms: room.status === 'active' ? 1 : 0,
          scheduledRooms: room.status === 'scheduled' ? 1 : 0,
          totalParticipants: room.currentParticipants,
          averageParticipants: room.currentParticipants,
          popularityScore: this.calculatePopularityScore(room)
        };
      } else {
        // Global stats
        const { data, error } = await this.supabase
          .from('video_rooms')
          .select('status, current_participants');

        if (error) {
          throw new Error(`Failed to get room stats: ${error.message}`);
        }

        const rooms = data || [];
        const totalParticipants = rooms.reduce((sum, room) => sum + (room.current_participants || 0), 0);

        return {
          totalRooms: rooms.length,
          activeRooms: rooms.filter(r => r.status === 'active').length,
          scheduledRooms: rooms.filter(r => r.status === 'scheduled').length,
          totalParticipants,
          averageParticipants: rooms.length > 0 ? totalParticipants / rooms.length : 0,
          popularityScore: 0 // Would calculate based on usage patterns
        };
      }

    } catch (error) {
      console.error('❌ Failed to get room stats:', error);
      throw error;
    }
  }

  /**
   * Archive old rooms
   */
  async archiveOldRooms(olderThan: Date): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('video_rooms')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('status', 'ended')
        .lt('actual_end_time', olderThan.toISOString())
        .select('id');

      if (error) {
        throw new Error(`Failed to archive rooms: ${error.message}`);
      }

      return (data || []).length;

    } catch (error) {
      console.error('❌ Failed to archive rooms:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private validateCreateData(data: CreateRoomData): void {
    if (!data.name?.trim()) {
      throw new Error('Room name is required');
    }

    if (data.maxParticipants && (data.maxParticipants < 1 || data.maxParticipants > 10000)) {
      throw new Error('Max participants must be between 1 and 10,000');
    }

    if (!data.createdBy) {
      throw new Error('Created by user ID is required');
    }

    if (data.scheduledStartTime && data.scheduledEndTime) {
      if (data.scheduledStartTime >= data.scheduledEndTime) {
        throw new Error('End time must be after start time');
      }
    }
  }

  private generateJoinUrl(): string {
    const roomId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    return `/room/${roomId}`;
  }

  private generateKey(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 10)}`;
  }

  private async hashPassword(password: string): Promise<string> {
    // In production, use proper password hashing
    return btoa(password); // Simplified for demo
  }

  private calculatePopularityScore(room: Room): number {
    // Simplified popularity calculation
    let score = 0;
    
    // Current participants
    score += room.currentParticipants * 10;
    
    // Room age bonus (newer rooms get higher score)
    const ageHours = (Date.now() - room.createdAt.getTime()) / (1000 * 60 * 60);
    score += Math.max(0, 100 - ageHours);
    
    // Features bonus
    const features = Object.values(room.settings).filter(Boolean).length;
    score += features * 5;
    
    return Math.round(score);
  }

  private mapDatabaseToRoom(data: any): Room {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      createdBy: data.created_by,
      maxParticipants: data.max_participants,
      currentParticipants: data.current_participants || 0,
      isPrivate: data.is_private,
      status: data.status,
      scheduledStartTime: data.scheduled_start_time ? new Date(data.scheduled_start_time) : undefined,
      scheduledEndTime: data.scheduled_end_time ? new Date(data.scheduled_end_time) : undefined,
      actualStartTime: data.actual_start_time ? new Date(data.actual_start_time) : undefined,
      actualEndTime: data.actual_end_time ? new Date(data.actual_end_time) : undefined,
      settings: data.settings ? JSON.parse(data.settings) : {},
      joinUrl: data.join_url,
      hostKey: data.host_key,
      moderatorKey: data.moderator_key,
      passwordHash: data.password_hash,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}