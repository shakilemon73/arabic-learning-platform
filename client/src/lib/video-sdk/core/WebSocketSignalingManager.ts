import { EventEmitter } from './EventEmitter';

export interface WebSocketMessage {
  type: 'join-room' | 'leave-room' | 'offer' | 'answer' | 'ice-candidate' | 'media-state' | 'chat' | 'user-joined' | 'user-left' | 'room-joined' | 'error';
  roomId: string;
  userId: string;
  targetUserId?: string;
  data: any;
  timestamp: number;
}

/**
 * WebSocket-based Signaling Manager for real-time video communication
 * Works alongside Supabase for data persistence
 */
export class WebSocketSignalingManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private userId: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private wsUrl: string;

  constructor() {
    super();
    
    // Determine WebSocket URL based on environment
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.hostname === 'localhost' ? ':8080' : ':8080';
    this.wsUrl = `${protocol}//${host}${port}/ws`;

    console.log('🔗 WebSocket Signaling Manager initialized:', this.wsUrl);
  }

  /**
   * Connect to WebSocket signaling server
   */
  async connect(roomId: string, userId: string, userData?: any): Promise<void> {
    try {
      this.roomId = roomId;
      this.userId = userId;

      // Create WebSocket connection
      this.ws = new WebSocket(this.wsUrl);

      // Set up WebSocket event handlers
      this.setupWebSocketHandlers();

      // Wait for connection to open
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('⚠️ WebSocket connection timeout, continuing with Supabase-only mode');
          // Don't reject - allow the system to continue without WebSocket
          resolve();
        }, 5000); // 5 second timeout for faster fallback

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Start heartbeat
          this.startHeartbeat();
          
          console.log('🔗 WebSocket connected successfully');
          this.emit('connected', { roomId, userId });
          resolve();
        };

        this.ws!.onerror = (error) => {
          clearTimeout(timeout);
          console.warn('⚠️ WebSocket connection failed, system will continue with Supabase-only mode:', error);
          // Don't reject - allow the system to continue without WebSocket
          resolve();
        };
      });

      // Join the room after connection
      await this.joinRoom(userData);

    } catch (error) {
      console.error('❌ Failed to connect to signaling server:', error);
      this.emit('error', { error: error instanceof Error ? error.message : 'Connection failed' });
      throw error;
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      } catch (error) {
        console.error('❌ Invalid WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('🔌 WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.stopHeartbeat();
      
      // Attempt reconnection if not a normal closure
      if (event.code !== 1000 && event.code !== 1001) {
        this.attemptReconnect();
      }

      this.emit('disconnected', { code: event.code, reason: event.reason });
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      this.emit('error', { error: 'WebSocket error occurred' });
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(message: WebSocketMessage): void {
    console.log('📨 WebSocket message received:', message.type);

    switch (message.type) {
      case 'room-joined':
        this.emit('room-joined', message.data);
        break;

      case 'user-joined':
        this.emit('user-joined', {
          userId: message.userId,
          displayName: message.data.displayName,
          avatar: message.data.avatar,
          role: message.data.role
        });
        break;

      case 'user-left':
        this.emit('user-left', {
          userId: message.userId,
          reason: message.data.reason
        });
        break;

      case 'offer':
        this.emit('offer-received', {
          fromUserId: message.userId,
          offer: message.data
        });
        break;

      case 'answer':
        this.emit('answer-received', {
          fromUserId: message.userId,
          answer: message.data
        });
        break;

      case 'ice-candidate':
        this.emit('ice-candidate-received', {
          fromUserId: message.userId,
          candidate: message.data
        });
        break;

      case 'media-state':
        this.emit('media-state-changed', {
          userId: message.userId,
          ...message.data
        });
        break;

      case 'chat':
        this.emit('chat-message', {
          userId: message.data.sender,
          message: message.data.text,
          timestamp: message.data.timestamp
        });
        break;

      case 'error':
        this.emit('error', { error: message.data.error });
        break;

      default:
        console.warn('⚠️ Unknown message type:', message.type);
    }
  }

  /**
   * Join room
   */
  private async joinRoom(userData?: any): Promise<void> {
    if (!this.isConnected || !this.ws || !this.roomId || !this.userId) return;

    const message: WebSocketMessage = {
      type: 'join-room',
      roomId: this.roomId,
      userId: this.userId,
      data: {
        displayName: userData?.displayName || this.userId,
        avatar: userData?.avatar,
        role: userData?.role || 'participant',
        capabilities: userData?.capabilities || {
          canSpeak: true,
          canShare: true,
          canChat: true
        }
      },
      timestamp: Date.now()
    };

    this.sendMessage(message);
    console.log(`👤 Joining room ${this.roomId} as ${this.userId}`);
  }

  /**
   * Leave room
   */
  async leaveRoom(): Promise<void> {
    if (!this.isConnected || !this.ws || !this.roomId || !this.userId) return;

    const message: WebSocketMessage = {
      type: 'leave-room',
      roomId: this.roomId,
      userId: this.userId,
      data: {},
      timestamp: Date.now()
    };

    this.sendMessage(message);
    console.log(`👤 Leaving room ${this.roomId}`);
  }

  /**
   * Send WebRTC offer
   */
  async sendOffer(targetUserId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.isConnected) throw new Error('Not connected to signaling server');

    const message: WebSocketMessage = {
      type: 'offer',
      roomId: this.roomId!,
      userId: this.userId!,
      targetUserId,
      data: offer,
      timestamp: Date.now()
    };

    this.sendMessage(message);
    console.log(`📤 Sent offer to ${targetUserId}`);
  }

  /**
   * Send WebRTC answer
   */
  async sendAnswer(targetUserId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.isConnected) throw new Error('Not connected to signaling server');

    const message: WebSocketMessage = {
      type: 'answer',
      roomId: this.roomId!,
      userId: this.userId!,
      targetUserId,
      data: answer,
      timestamp: Date.now()
    };

    this.sendMessage(message);
    console.log(`📤 Sent answer to ${targetUserId}`);
  }

  /**
   * Send ICE candidate
   */
  async sendIceCandidate(targetUserId: string, candidate: RTCIceCandidate): Promise<void> {
    if (!this.isConnected) throw new Error('Not connected to signaling server');

    const message: WebSocketMessage = {
      type: 'ice-candidate',
      roomId: this.roomId!,
      userId: this.userId!,
      targetUserId,
      data: candidate.toJSON(),
      timestamp: Date.now()
    };

    this.sendMessage(message);
    console.log(`📤 Sent ICE candidate to ${targetUserId}`);
  }

  /**
   * Send media state change
   */
  async sendMediaState(mediaState: { isVideoEnabled: boolean; isAudioEnabled: boolean; isScreenSharing: boolean }): Promise<void> {
    if (!this.isConnected) return;

    const message: WebSocketMessage = {
      type: 'media-state',
      roomId: this.roomId!,
      userId: this.userId!,
      data: mediaState,
      timestamp: Date.now()
    };

    this.sendMessage(message);
    console.log('📺 Media state updated:', mediaState);
  }

  /**
   * Send chat message
   */
  async sendChatMessage(text: string): Promise<void> {
    if (!this.isConnected) return;

    const message: WebSocketMessage = {
      type: 'chat',
      roomId: this.roomId!,
      userId: this.userId!,
      data: { text },
      timestamp: Date.now()
    };

    this.sendMessage(message);
    console.log('💬 Chat message sent:', text.substring(0, 50));
  }

  /**
   * Send message through WebSocket
   */
  private sendMessage(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('❌ Cannot send message: WebSocket not connected');
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send a heartbeat message instead of ping (browser WebSocket doesn't have ping)
        this.sendMessage({
          type: 'chat', // Use chat type for heartbeat to avoid conflicts
          roomId: this.roomId || '',
          userId: this.userId || '',
          data: { heartbeat: true },
          timestamp: Date.now()
        });
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.emit('reconnection-failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s

    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectInterval = setTimeout(() => {
      if (this.roomId && this.userId) {
        this.connect(this.roomId, this.userId);
      }
    }, delay);
  }

  /**
   * Disconnect from signaling server
   */
  async disconnect(): Promise<void> {
    try {
      await this.leaveRoom();
      
      this.isConnected = false;
      this.stopHeartbeat();

      if (this.reconnectInterval) {
        clearTimeout(this.reconnectInterval);
        this.reconnectInterval = null;
      }

      if (this.ws) {
        this.ws.close(1000, 'Client disconnect');
        this.ws = null;
      }

      this.roomId = null;
      this.userId = null;

      this.emit('disconnected', { code: 1000, reason: 'Client disconnect' });
      console.log('✅ WebSocket signaling disconnected');

    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }

  /**
   * Check if connected to signaling server
   */
  isSignalingConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
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