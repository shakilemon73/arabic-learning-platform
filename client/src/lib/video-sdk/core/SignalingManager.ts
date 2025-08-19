/**
 * SignalingManager - Handles WebRTC signaling via Supabase Realtime
 * Manages peer-to-peer connection establishment and room events
 */

import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { EventEmitter } from './EventEmitter';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left' | 'media-state-change';
  fromUserId: string;
  toUserId?: string;
  roomId: string;
  payload: any;
  timestamp: number;
}

export interface UserJoinedData {
  userId: string;
  displayName: string;
  role: string;
  avatar?: string;
}

export interface UserLeftData {
  userId: string;
}

export interface MediaStateData {
  userId: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
}

export class SignalingManager extends EventEmitter {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  private isConnected = false;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  /**
   * Connect to signaling channel for a room
   */
  async connect(roomId: string, userId: string): Promise<void> {
    try {
      this.roomId = roomId;
      this.userId = userId;

      // Create real-time channel for this room
      this.channel = this.supabase.channel(`video-room-${roomId}`, {
        config: {
          broadcast: { self: true }
        }
      });

      // Set up real-time event listeners
      this.channel
        .on('broadcast', { event: 'signaling' }, (payload) => {
          this.handleSignalingMessage(payload.payload as SignalingMessage);
        })
        .on('presence', { event: 'sync' }, () => {
          const users = this.channel!.presenceState();
          this.emit('users-changed', { users });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this.emit('user-joined', { userId: key, presence: newPresences[0] });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this.emit('user-left', { userId: key, presence: leftPresences[0] });
        });

      // Subscribe to the channel
      const response = await this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user presence
          await this.channel!.track({
            userId: this.userId,
            online_at: new Date().toISOString()
          });
          
          this.isConnected = true;
          this.emit('connected', { roomId, userId });
          console.log('SignalingManager: Successfully connected to real-time channel');
        }
      });

      if (response === 'CHANNEL_ERROR') {
        throw new Error('Failed to subscribe to signaling channel');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown signaling error';
      this.emit('error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Disconnect from signaling channel
   */
  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.unsubscribe();
        this.channel = null;
      }

      this.roomId = null;
      this.userId = null;
      this.isConnected = false;
      
      this.emit('disconnected');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown signaling error';
      this.emit('error', { error: errorMessage });
    }
  }

  /**
   * Send WebRTC offer to another peer
   */
  async sendOffer(toUserId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    await this.sendSignalingMessage({
      type: 'offer',
      fromUserId: this.userId!,
      toUserId,
      roomId: this.roomId!,
      payload: { offer },
      timestamp: Date.now()
    });
  }

  /**
   * Send WebRTC answer to another peer
   */
  async sendAnswer(toUserId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    await this.sendSignalingMessage({
      type: 'answer',
      fromUserId: this.userId!,
      toUserId,
      roomId: this.roomId!,
      payload: { answer },
      timestamp: Date.now()
    });
  }

  /**
   * Send ICE candidate to another peer
   */
  async sendIceCandidate(toUserId: string, candidate: RTCIceCandidate): Promise<void> {
    await this.sendSignalingMessage({
      type: 'ice-candidate',
      fromUserId: this.userId!,
      toUserId,
      roomId: this.roomId!,
      payload: { candidate: candidate.toJSON() },
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast user joined event
   */
  async broadcastUserJoined(data: UserJoinedData): Promise<void> {
    if (!this.channel) return;

    await this.channel.send({
      type: 'broadcast',
      event: 'user-joined',
      payload: {
        ...data,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Broadcast user left event
   */
  async broadcastUserLeft(data: UserLeftData): Promise<void> {
    if (!this.channel) return;

    await this.channel.send({
      type: 'broadcast',
      event: 'user-left',
      payload: {
        ...data,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Broadcast media state change
   */
  async broadcastMediaStateChange(data: MediaStateData): Promise<void> {
    if (!this.channel) return;

    await this.channel.send({
      type: 'broadcast',
      event: 'media-state-change',
      payload: {
        ...data,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Send signaling message through the channel
   */
  private async sendSignalingMessage(message: SignalingMessage): Promise<void> {
    if (!this.channel || !this.isConnected) {
      throw new Error('Not connected to signaling channel');
    }

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'signaling',
        payload: message
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send signaling message';
      this.emit('error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Handle incoming signaling messages
   */
  private handleSignalingMessage(message: SignalingMessage): void {
    // Don't process messages from ourselves
    if (message.fromUserId === this.userId) return;

    // Emit appropriate events based on message type
    switch (message.type) {
      case 'offer':
        this.emit('offer-received', {
          fromUserId: message.fromUserId,
          offer: message.payload.offer
        });
        break;
      
      case 'answer':
        this.emit('answer-received', {
          fromUserId: message.fromUserId,
          answer: message.payload.answer
        });
        break;
      
      case 'ice-candidate':
        this.emit('ice-candidate-received', {
          fromUserId: message.fromUserId,
          candidate: message.payload.candidate
        });
        break;
      
      case 'user-joined':
        this.emit('participant-joined', message.payload as UserJoinedData);
        break;
      
      case 'user-left':
        this.emit('participant-left', message.payload as UserLeftData);
        break;
      
      case 'media-state-change':
        this.emit('media-state-changed', message.payload as MediaStateData);
        break;
    }
  }

  /**
   * Handle presence sync events
   */
  private handlePresenceSync(presenceState: any): void {
    const participants = Object.keys(presenceState || {})
      .map(userId => {
        const presence = presenceState[userId][0];
        return {
          userId,
          ...presence
        };
      })
      .filter(participant => participant.userId !== this.userId);

    this.emit('participants-synced', { participants });
  }

  /**
   * Handle user joining via presence
   */
  private handlePresenceJoin(userId: string, presences: any[]): void {
    if (userId === this.userId) return;

    const presence = presences[0];
    this.emit('user-joined-presence', {
      userId,
      ...presence
    });
  }

  /**
   * Handle user leaving via presence
   */
  private handlePresenceLeave(userId: string, presences: any[]): void {
    if (userId === this.userId) return;

    this.emit('user-left-presence', { userId });
  }

  /**
   * Get current room participants from presence
   */
  async getParticipants(): Promise<any[]> {
    if (!this.channel) return [];

    const presenceState = this.channel.presenceState();
    return Object.keys(presenceState || {})
      .map(userId => {
        const presence = presenceState[userId][0];
        return {
          userId,
          ...presence
        };
      });
  }

  /**
   * Check if signaling is connected
   */
  isSignalingConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current room ID
   */
  getCurrentRoomId(): string | null {
    return this.roomId;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.userId;
  }
}