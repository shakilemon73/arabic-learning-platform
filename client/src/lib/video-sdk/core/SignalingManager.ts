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

  // Production enhancements
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: any[] = [];
  private lastMessageTime = 0;
  private messageRateLimit = 100; // Max messages per second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionMetrics = {
    messagesReceived: 0,
    messagesSent: 0,
    lastHeartbeat: 0,
    connectionQuality: 'good' as 'excellent' | 'good' | 'poor'
  };

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  /**
   * Connect to signaling channel with production-grade reliability
   */
  async connect(roomId: string, userId: string): Promise<void> {
    try {
      console.log('🔗 Connecting to signaling channel...', { roomId, userId });
      
      // Validate inputs
      if (!roomId || !userId) {
        throw new Error('Room ID and User ID are required');
      }

      this.roomId = roomId;
      this.userId = userId;
      this.reconnectAttempts = 0;

      await this.establishConnection();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown signaling error';
      console.error('❌ SignalingManager connection failed:', errorMessage);
      this.emit('error', { error: errorMessage, context: 'connect' });
      throw error;
    }
  }

  /**
   * Establish real-time connection with retry logic
   */
  private async establishConnection(): Promise<void> {
    try {
      // Clean up any existing connection
      if (this.channel) {
        await this.channel.unsubscribe();
        this.channel = null;
      }

      // Create real-time channel for this room with enhanced config
      this.channel = this.supabase.channel(`video-room-${this.roomId}`, {
        config: {
          broadcast: { 
            self: true,
            ack: true // Request acknowledgment for reliability
          },
          presence: {
            key: this.userId || undefined
          }
        }
      });

      // Set up comprehensive event listeners
      this.setupChannelEventListeners();

      // Subscribe with connection monitoring
      await this.subscribeWithRetry();

    } catch (error) {
      console.error('❌ Failed to establish connection:', error);
      await this.handleReconnection(error as Error);
    }
  }

  /**
   * Setup channel event listeners with production monitoring
   */
  private setupChannelEventListeners(): void {
    if (!this.channel) return;

    this.channel
      // Signaling messages
      .on('broadcast', { event: 'signaling' }, (payload) => {
        this.connectionMetrics.messagesReceived++;
        
        // Validate message before processing
        if (this.validateSignalingMessage(payload.payload)) {
          this.handleSignalingMessage(payload.payload as SignalingMessage);
        } else {
          console.warn('⚠️ Invalid signaling message received:', payload);
        }
      })
      
      // Presence events for participant management
      .on('presence', { event: 'sync' }, () => {
        const users = this.channel!.presenceState();
        console.log('👥 Presence sync:', Object.keys(users).length, 'participants');
        this.emit('users-changed', { users });
        this.updateConnectionQuality('good');
      })
      
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👤 User joined presence:', key);
        this.emit('user-joined', { userId: key, presence: newPresences[0] });
      })
      
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 User left presence:', key);
        this.emit('user-left', { userId: key, presence: leftPresences[0] });
      })

      // System events for connection monitoring  
      .on('system', {}, (payload) => {
        console.log('📡 System event:', payload);
        if (payload.extension === 'postgres_changes') {
          // Handle database changes if needed
        }
      });
  }

  /**
   * Subscribe with retry logic and connection monitoring
   */
  private async subscribeWithRetry(): Promise<void> {
    if (!this.channel) throw new Error('Channel not initialized');

    const subscribePromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout after 10 seconds'));
      }, 10000);

      this.channel!.subscribe(async (status, err) => {
        clearTimeout(timeout);

        if (err) {
          console.error('❌ Channel subscription error:', err);
          reject(err);
          return;
        }

        switch (status) {
          case 'SUBSCRIBED':
            try {
              // Track user presence with detailed info
              await this.channel!.track({
                userId: this.userId,
                online_at: new Date().toISOString(),
                browser: navigator.userAgent.split(' ')[0],
                connection_quality: this.connectionMetrics.connectionQuality
              });
              
              this.isConnected = true;
              this.reconnectAttempts = 0;
              
              // Start connection monitoring
              this.startHeartbeat();
              
              // Process any queued messages
              await this.processMessageQueue();
              
              this.emit('connected', { roomId: this.roomId, userId: this.userId });
              console.log('✅ SignalingManager: Successfully connected to real-time channel');
              resolve();
              
            } catch (trackError) {
              console.error('❌ Failed to track presence:', trackError);
              reject(trackError);
            }
            break;
            
          case 'CHANNEL_ERROR':
            console.error('❌ Channel error during subscription');
            reject(new Error('Channel subscription failed'));
            break;
            
          case 'TIMED_OUT':
            console.error('⏰ Channel subscription timed out');
            reject(new Error('Channel subscription timed out'));
            break;
            
          case 'CLOSED':
            console.log('🔌 Channel subscription closed');
            this.handleConnectionLost();
            break;
        }
      });
    });

    await subscribePromise;
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnection(error: Error): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connection-failed', { error: 'Max reconnection attempts exceeded' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    setTimeout(async () => {
      try {
        await this.establishConnection();
      } catch (retryError) {
        await this.handleReconnection(retryError as Error);
      }
    }, delay);
  }

  /**
   * Handle connection lost scenario
   */
  private handleConnectionLost(): void {
    this.isConnected = false;
    this.stopHeartbeat();
    this.updateConnectionQuality('poor');
    this.emit('connection-lost');
    
    // Attempt automatic reconnection
    this.handleReconnection(new Error('Connection lost'));
  }

  /**
   * Start connection heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing interval
    
    this.heartbeatInterval = setInterval(() => {
      this.connectionMetrics.lastHeartbeat = Date.now();
      
      // Send ping to check connection
      this.sendHeartbeat().catch((error) => {
        console.warn('⚠️ Heartbeat failed:', error);
        this.updateConnectionQuality('poor');
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send heartbeat ping
   */
  private async sendHeartbeat(): Promise<void> {
    if (!this.channel || !this.isConnected) return;

    try {
      await this.channel.send({
        type: 'broadcast',
        event: 'heartbeat',
        payload: {
          userId: this.userId,
          timestamp: Date.now()
        }
      });
      this.updateConnectionQuality('good');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update connection quality metrics
   */
  private updateConnectionQuality(quality: 'excellent' | 'good' | 'poor'): void {
    if (this.connectionMetrics.connectionQuality !== quality) {
      this.connectionMetrics.connectionQuality = quality;
      this.emit('connection-quality-changed', { quality });
    }
  }

  /**
   * Validate signaling message structure
   */
  private validateSignalingMessage(message: any): boolean {
    if (!message || typeof message !== 'object') return false;
    
    const requiredFields = ['type', 'fromUserId', 'roomId', 'timestamp'];
    return requiredFields.every(field => field in message);
  }

  /**
   * Process queued messages after reconnection
   */
  private async processMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Processing ${this.messageQueue.length} queued messages`);
    
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    for (const message of queue) {
      try {
        await this.sendSignalingMessage(message);
        this.connectionMetrics.messagesSent++;
      } catch (error) {
        console.error('❌ Failed to send queued message:', error);
        // Re-queue failed message for retry
        this.messageQueue.push(message);
      }
    }
  }

  /**
   * Queue message when disconnected (with rate limiting)
   */
  private queueMessage(message: SignalingMessage): boolean {
    // Rate limiting check
    const now = Date.now();
    if (now - this.lastMessageTime < this.messageRateLimit) {
      console.warn('⚠️ Message rate limit exceeded, dropping message');
      return false;
    }
    
    this.lastMessageTime = now;
    
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length >= 50) {
      console.warn('⚠️ Message queue full, dropping oldest message');
      this.messageQueue.shift();
    }
    
    this.messageQueue.push(message);
    console.log(`📥 Queued message (${this.messageQueue.length} total)`);
    return true;
  }

  /**
   * Get connection metrics for monitoring
   */
  getConnectionMetrics(): any {
    return {
      ...this.connectionMetrics,
      queueSize: this.messageQueue.length,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
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