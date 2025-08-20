/**
 * BreakoutRoomManager - Professional Breakout Rooms
 * Small group collaboration like Zoom, Teams, Webex
 */

import { EventEmitter } from './EventEmitter';
import { SupabaseClient } from '@supabase/supabase-js';

interface BreakoutRoom {
  id: string;
  name: string;
  mainRoomId: string;
  capacity: number;
  participantCount: number;
  participants: string[];
  isOpen: boolean;
  createdAt: Date;
  closedAt?: Date;
  hostId?: string;
}

interface BreakoutRoomConfig {
  maxRooms: number;
  defaultCapacity: number;
  autoAssign: boolean;
  allowParticipantChoice: boolean;
  timeLimit?: number; // minutes
  broadcastMessages: boolean;
}

interface BreakoutAssignment {
  participantId: string;
  roomId: string;
  assignedAt: Date;
  assignedBy: string;
  status: 'assigned' | 'joined' | 'left';
}

export class BreakoutRoomManager extends EventEmitter {
  private supabase: SupabaseClient;
  private mainRoomId: string | null = null;
  private hostId: string | null = null;
  private breakoutRooms = new Map<string, BreakoutRoom>();
  private assignments = new Map<string, BreakoutAssignment>();
  private config: BreakoutRoomConfig = {
    maxRooms: 20,
    defaultCapacity: 8,
    autoAssign: true,
    allowParticipantChoice: false,
    timeLimit: 30,
    broadcastMessages: true
  };
  private channel: any = null;
  private isActive = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  /**
   * Initialize breakout room system for main meeting
   */
  async initialize(mainRoomId: string, hostId: string, config?: Partial<BreakoutRoomConfig>): Promise<void> {
    try {
      this.mainRoomId = mainRoomId;
      this.hostId = hostId;
      
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Set up real-time channel for breakout room coordination
      this.channel = this.supabase.channel(`breakout-${mainRoomId}`, {
        config: { broadcast: { self: true } }
      });

      // Listen for breakout room events
      this.channel
        .on('broadcast', { event: 'room-created' }, (payload: any) => {
          this.handleRoomCreated(payload.payload);
        })
        .on('broadcast', { event: 'participant-assigned' }, (payload: any) => {
          this.handleParticipantAssigned(payload.payload);
        })
        .on('broadcast', { event: 'participant-moved' }, (payload: any) => {
          this.handleParticipantMoved(payload.payload);
        })
        .on('broadcast', { event: 'rooms-opened' }, (payload: any) => {
          this.handleRoomsOpened(payload.payload);
        })
        .on('broadcast', { event: 'rooms-closed' }, (payload: any) => {
          this.handleRoomsClosed(payload.payload);
        })
        .on('broadcast', { event: 'broadcast-message' }, (payload: any) => {
          this.handleBroadcastMessage(payload.payload);
        });

      await this.channel.subscribe();

      console.log('🏠 Professional breakout room system initialized');
      this.emit('initialized', { mainRoomId, config: this.config });

    } catch (error) {
      console.error('❌ Breakout room initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create breakout rooms with participants
   * Professional room creation like Zoom
   */
  async createBreakoutRooms(roomConfig: {
    count: number;
    names?: string[];
    assignments?: { [participantId: string]: string };
    participants: string[];
  }): Promise<BreakoutRoom[]> {
    if (!this.mainRoomId || !this.hostId) {
      throw new Error('Breakout room system not initialized');
    }

    try {
      const { count, names, assignments, participants } = roomConfig;
      const rooms: BreakoutRoom[] = [];

      // Create breakout rooms
      for (let i = 0; i < count; i++) {
        const room: BreakoutRoom = {
          id: crypto.randomUUID(),
          name: names?.[i] || `Breakout Room ${i + 1}`,
          mainRoomId: this.mainRoomId,
          capacity: this.config.defaultCapacity,
          participantCount: 0,
          participants: [],
          isOpen: false,
          createdAt: new Date(),
          hostId: this.hostId
        };

        rooms.push(room);
        this.breakoutRooms.set(room.id, room);

        // Store in database
        await this.supabase
          .from('breakout_rooms')
          .insert({
            id: room.id,
            name: room.name,
            main_room_id: this.mainRoomId,
            capacity: room.capacity,
            host_id: this.hostId,
            is_open: false
          });
      }

      // Assign participants
      await this.assignParticipants(participants, assignments);

      // Notify all participants about room creation
      await this.channel.send({
        type: 'broadcast',
        event: 'room-created',
        payload: { rooms, assignments: this.getAssignmentMap() }
      });

      console.log(`🏠 Created ${count} breakout rooms with ${participants.length} participants`);
      this.emit('rooms-created', { rooms, assignments: this.assignments });

      return rooms;

    } catch (error) {
      console.error('❌ Failed to create breakout rooms:', error);
      throw error;
    }
  }

  /**
   * Assign participants to breakout rooms
   */
  private async assignParticipants(
    participants: string[], 
    assignments?: { [participantId: string]: string }
  ): Promise<void> {
    const rooms = Array.from(this.breakoutRooms.values());
    
    if (assignments) {
      // Manual assignments
      for (const [participantId, roomId] of Object.entries(assignments)) {
        await this.assignParticipantToRoom(participantId, roomId);
      }
    } else if (this.config.autoAssign) {
      // Automatic assignment - distribute evenly
      let currentRoomIndex = 0;
      
      for (const participantId of participants) {
        const room = rooms[currentRoomIndex];
        if (room) {
          await this.assignParticipantToRoom(participantId, room.id);
          currentRoomIndex = (currentRoomIndex + 1) % rooms.length;
        }
      }
    }
  }

  /**
   * Assign individual participant to specific room
   */
  async assignParticipantToRoom(participantId: string, roomId: string): Promise<void> {
    const room = this.breakoutRooms.get(roomId);
    
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.participants.length >= room.capacity) {
      throw new Error('Room is at capacity');
    }

    const assignment: BreakoutAssignment = {
      participantId,
      roomId,
      assignedAt: new Date(),
      assignedBy: this.hostId!,
      status: 'assigned'
    };

    // Update room
    room.participants.push(participantId);
    room.participantCount = room.participants.length;

    // Store assignment
    this.assignments.set(participantId, assignment);

    // Update database
    await this.supabase
      .from('breakout_room_assignments')
      .upsert({
        participant_id: participantId,
        room_id: roomId,
        assigned_by: this.hostId,
        status: 'assigned'
      });

    // Notify participant
    await this.channel.send({
      type: 'broadcast',
      event: 'participant-assigned',
      payload: { participantId, roomId, roomName: room.name }
    });

    this.emit('participant-assigned', { participantId, room });
  }

  /**
   * Open all breakout rooms for participants to join
   */
  async openBreakoutRooms(): Promise<void> {
    if (!this.isActive && this.breakoutRooms.size > 0) {
      // Mark all rooms as open
      for (const room of this.breakoutRooms.values()) {
        room.isOpen = true;
      }

      // Update database
      await this.supabase
        .from('breakout_rooms')
        .update({ is_open: true })
        .eq('main_room_id', this.mainRoomId);

      this.isActive = true;

      // Set timer if configured
      if (this.config.timeLimit) {
        this.timer = setTimeout(() => {
          this.closeBreakoutRooms();
        }, this.config.timeLimit * 60 * 1000);
      }

      // Notify all participants
      await this.channel.send({
        type: 'broadcast',
        event: 'rooms-opened',
        payload: { 
          timeLimit: this.config.timeLimit,
          message: 'Breakout rooms are now open. You can join your assigned room.' 
        }
      });

      console.log('🏠 Breakout rooms opened');
      this.emit('rooms-opened', { timeLimit: this.config.timeLimit });
    }
  }

  /**
   * Close all breakout rooms and return participants to main room
   */
  async closeBreakoutRooms(countdown: number = 30): Promise<void> {
    if (this.isActive) {
      // Send countdown warning
      if (countdown > 0) {
        await this.broadcastMessage(
          `Breakout rooms will close in ${countdown} seconds. Please wrap up your discussions.`,
          'warning'
        );

        // Wait for countdown
        setTimeout(() => this.closeBreakoutRooms(0), countdown * 1000);
        return;
      }

      // Mark all rooms as closed
      for (const room of this.breakoutRooms.values()) {
        room.isOpen = false;
        room.closedAt = new Date();
      }

      // Update database
      await this.supabase
        .from('breakout_rooms')
        .update({ 
          is_open: false,
          closed_at: new Date().toISOString()
        })
        .eq('main_room_id', this.mainRoomId);

      this.isActive = false;

      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }

      // Notify all participants to return to main room
      await this.channel.send({
        type: 'broadcast',
        event: 'rooms-closed',
        payload: { message: 'Breakout rooms are now closed. Returning to main room.' }
      });

      console.log('🏠 Breakout rooms closed');
      this.emit('rooms-closed');
    }
  }

  /**
   * Move participant between breakout rooms
   */
  async moveParticipant(participantId: string, newRoomId: string): Promise<void> {
    const currentAssignment = this.assignments.get(participantId);
    
    if (currentAssignment) {
      // Remove from current room
      const currentRoom = this.breakoutRooms.get(currentAssignment.roomId);
      if (currentRoom) {
        currentRoom.participants = currentRoom.participants.filter(id => id !== participantId);
        currentRoom.participantCount = currentRoom.participants.length;
      }
    }

    // Assign to new room
    await this.assignParticipantToRoom(participantId, newRoomId);

    // Notify participant of move
    const newRoom = this.breakoutRooms.get(newRoomId);
    await this.channel.send({
      type: 'broadcast',
      event: 'participant-moved',
      payload: { 
        participantId, 
        newRoomId, 
        roomName: newRoom?.name,
        message: `You have been moved to ${newRoom?.name}` 
      }
    });

    this.emit('participant-moved', { participantId, newRoomId });
  }

  /**
   * Broadcast message to all breakout rooms
   */
  async broadcastMessage(message: string, type: 'info' | 'warning' | 'urgent' = 'info'): Promise<void> {
    if (!this.config.broadcastMessages) return;

    await this.channel.send({
      type: 'broadcast',
      event: 'broadcast-message',
      payload: { 
        message, 
        type,
        from: 'host',
        timestamp: new Date().toISOString()
      }
    });

    console.log(`📢 Broadcast message sent: ${message}`);
    this.emit('message-broadcasted', { message, type });
  }

  /**
   * Get participant's room assignment
   */
  getParticipantRoom(participantId: string): BreakoutRoom | null {
    const assignment = this.assignments.get(participantId);
    return assignment ? this.breakoutRooms.get(assignment.roomId) || null : null;
  }

  /**
   * Handle room created event
   */
  private handleRoomCreated(payload: any): void {
    this.emit('rooms-created-notification', payload);
  }

  /**
   * Handle participant assigned event
   */
  private handleParticipantAssigned(payload: any): void {
    this.emit('assignment-notification', payload);
  }

  /**
   * Handle participant moved event
   */
  private handleParticipantMoved(payload: any): void {
    this.emit('move-notification', payload);
  }

  /**
   * Handle rooms opened event
   */
  private handleRoomsOpened(payload: any): void {
    this.emit('rooms-opened-notification', payload);
  }

  /**
   * Handle rooms closed event
   */
  private handleRoomsClosed(payload: any): void {
    this.emit('rooms-closed-notification', payload);
  }

  /**
   * Handle broadcast message
   */
  private handleBroadcastMessage(payload: any): void {
    this.emit('broadcast-message', payload);
  }

  /**
   * Get assignment map for UI display
   */
  private getAssignmentMap(): { [roomId: string]: string[] } {
    const map: { [roomId: string]: string[] } = {};
    
    for (const assignment of this.assignments.values()) {
      if (!map[assignment.roomId]) {
        map[assignment.roomId] = [];
      }
      map[assignment.roomId].push(assignment.participantId);
    }
    
    return map;
  }

  /**
   * Get all breakout rooms
   */
  getBreakoutRooms(): BreakoutRoom[] {
    return Array.from(this.breakoutRooms.values());
  }

  /**
   * Get active assignments
   */
  getAssignments(): { [participantId: string]: BreakoutAssignment } {
    const assignments: { [key: string]: BreakoutAssignment } = {};
    this.assignments.forEach((assignment, participantId) => {
      assignments[participantId] = assignment;
    });
    return assignments;
  }

  /**
   * Update breakout room configuration
   */
  updateConfig(newConfig: Partial<BreakoutRoomConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): BreakoutRoomConfig {
    return { ...this.config };
  }

  /**
   * Check if breakout rooms are active
   */
  isBreakoutActive(): boolean {
    return this.isActive;
  }

  /**
   * Get breakout room statistics
   */
  getStatistics(): any {
    const rooms = Array.from(this.breakoutRooms.values());
    return {
      totalRooms: rooms.length,
      openRooms: rooms.filter(r => r.isOpen).length,
      totalParticipants: Array.from(this.assignments.keys()).length,
      averageParticipantsPerRoom: rooms.length > 0 
        ? rooms.reduce((sum, room) => sum + room.participantCount, 0) / rooms.length 
        : 0,
      roomUtilization: rooms.map(room => ({
        roomId: room.id,
        name: room.name,
        utilization: (room.participantCount / room.capacity) * 100
      }))
    };
  }

  /**
   * Cleanup breakout room system
   */
  async cleanup(): Promise<void> {
    if (this.isActive) {
      await this.closeBreakoutRooms(0);
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.breakoutRooms.clear();
    this.assignments.clear();
    this.removeAllListeners();

    console.log('🧹 Breakout room system cleaned up');
  }
}