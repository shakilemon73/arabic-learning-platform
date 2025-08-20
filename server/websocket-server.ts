import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

export interface SignalingMessage {
  type: 'join-room' | 'leave-room' | 'offer' | 'answer' | 'ice-candidate' | 'media-state' | 'chat' | 'user-joined' | 'user-left' | 'room-joined' | 'error';
  roomId: string;
  userId: string;
  targetUserId?: string;
  data: any;
  timestamp: number;
}

export interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  roomId: string | null;
  isAlive: boolean;
  lastSeen: number;
}

/**
 * Standalone WebSocket server for video conferencing
 * Works directly with Supabase for persistence
 */
export class VideoWebSocketServer {
  private wss: WebSocketServer;
  private server: any;
  private clients = new Map<WebSocket, ConnectedClient>();
  private rooms = new Map<string, Set<string>>(); // roomId -> Set<userId>
  private userToSocket = new Map<string, WebSocket>();
  private heartbeatInterval: NodeJS.Timeout;
  private port: number;

  constructor(port = 8080) {
    this.port = port;
    this.server = createServer();
    
    // Create WebSocket server with professional setup
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws',
      clientTracking: true,
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 3,
          chunkSize: 1024
        }
      }
    });

    // Professional heartbeat system
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, 30000);

    this.setupWebSocketHandlers();
    console.log('🚀 Video WebSocket Server initialized');
  }

  /**
   * Start the WebSocket server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, '0.0.0.0', (error: any) => {
        if (error) {
          console.error('❌ Failed to start WebSocket server:', error);
          reject(error);
        } else {
          console.log(`🔗 WebSocket server running on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('🔌 WebSocket client connected');

      const clientInfo: ConnectedClient = {
        ws,
        userId: '',
        roomId: null,
        isAlive: true,
        lastSeen: Date.now()
      };

      this.clients.set(ws, clientInfo);

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message: SignalingMessage = JSON.parse(data.toString());
          this.handleSignalingMessage(ws, message);
        } catch (error) {
          console.error('❌ Invalid message format:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log('🔌 Client disconnected');
        this.handleDisconnection(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.handleDisconnection(ws);
      });

      // Handle pong for heartbeat
      ws.on('pong', () => {
        const client = this.clients.get(ws);
        if (client) {
          client.isAlive = true;
          client.lastSeen = Date.now();
        }
      });
    });
  }

  /**
   * Handle signaling messages
   */
  private async handleSignalingMessage(ws: WebSocket, message: SignalingMessage): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

    client.lastSeen = Date.now();
    client.isAlive = true;

    try {
      switch (message.type) {
        case 'join-room':
          await this.handleJoinRoom(ws, message);
          break;

        case 'leave-room':
          await this.handleLeaveRoom(ws, message);
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          await this.handleWebRTCSignaling(ws, message);
          break;

        case 'media-state':
          await this.handleMediaState(ws, message);
          break;

        case 'chat':
          await this.handleChat(ws, message);
          break;

        default:
          this.sendError(ws, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`❌ Error handling ${message.type}:`, error);
      this.sendError(ws, `Failed to process ${message.type}`);
    }
  }

  /**
   * Handle room joining
   */
  private async handleJoinRoom(ws: WebSocket, message: SignalingMessage): Promise<void> {
    const client = this.clients.get(ws);
    if (!client) return;

    const { roomId, userId, data } = message;

    // Validate input
    if (!roomId || !userId) {
      this.sendError(ws, 'Room ID and User ID required');
      return;
    }

    // Update client info
    client.userId = userId;
    client.roomId = roomId;
    this.userToSocket.set(userId, ws);

    // Add to room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(userId);

    // Get existing participants
    const roomParticipants = Array.from(this.rooms.get(roomId)!).filter(id => id !== userId);

    // Notify existing participants
    this.broadcastToRoom(roomId, {
      type: 'user-joined',
      roomId,
      userId,
      data: {
        displayName: data.displayName || userId,
        avatar: data.avatar,
        role: data.role || 'participant'
      },
      timestamp: Date.now()
    } as SignalingMessage, userId);

    // Send room state to new user
    this.send(ws, {
      type: 'room-joined',
      roomId,
      userId,
      data: {
        participants: roomParticipants,
        participantCount: roomParticipants.length + 1
      },
      timestamp: Date.now()
    } as SignalingMessage);

    console.log(`👤 User ${userId} joined room ${roomId} (${roomParticipants.length + 1} participants)`);
  }

  /**
   * Handle room leaving
   */
  private async handleLeaveRoom(ws: WebSocket, message: SignalingMessage): Promise<void> {
    const client = this.clients.get(ws);
    if (!client || !client.roomId) return;

    const { roomId, userId } = message;

    // Remove from room
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(userId);

      if (room.size === 0) {
        // Clean up empty room
        this.rooms.delete(roomId);
        console.log(`🗑️ Cleaned up empty room ${roomId}`);
      } else {
        // Notify remaining participants
        this.broadcastToRoom(roomId, {
          type: 'user-left',
          roomId,
          userId,
          data: { reason: 'left' },
          timestamp: Date.now()
        } as SignalingMessage);
      }
    }

    // Update client state
    client.roomId = null;
    this.userToSocket.delete(userId);

    console.log(`👤 User ${userId} left room ${roomId}`);
  }

  /**
   * Handle WebRTC signaling (offers, answers, ICE candidates)
   */
  private async handleWebRTCSignaling(ws: WebSocket, message: SignalingMessage): Promise<void> {
    const { targetUserId } = message;

    if (!targetUserId) {
      this.sendError(ws, 'Target user ID required for WebRTC signaling');
      return;
    }

    const targetSocket = this.userToSocket.get(targetUserId);
    if (!targetSocket) {
      this.sendError(ws, 'Target user not found or offline');
      return;
    }

    // Forward message to target user
    this.send(targetSocket, message);

    console.log(`🔄 WebRTC ${message.type} forwarded to ${targetUserId}`);
  }

  /**
   * Handle media state changes
   */
  private async handleMediaState(ws: WebSocket, message: SignalingMessage): Promise<void> {
    const client = this.clients.get(ws);
    if (!client || !client.roomId) return;

    // Broadcast to room participants
    this.broadcastToRoom(client.roomId, message, client.userId);

    console.log(`📺 Media state changed for ${client.userId}:`, message.data);
  }

  /**
   * Handle chat messages
   */
  private async handleChat(ws: WebSocket, message: SignalingMessage): Promise<void> {
    const client = this.clients.get(ws);
    if (!client || !client.roomId) return;

    // Add timestamp and sender
    const chatMessage = {
      ...message,
      data: {
        ...message.data,
        timestamp: Date.now(),
        sender: client.userId
      }
    };

    // Broadcast to room
    this.broadcastToRoom(client.roomId, chatMessage);

    console.log(`💬 Chat from ${client.userId}: ${message.data.text?.substring(0, 50)}...`);
  }

  /**
   * Broadcast message to room participants
   */
  private broadcastToRoom(roomId: string, message: SignalingMessage, excludeUserId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const userIds = Array.from(room);
    for (const userId of userIds) {
      if (userId === excludeUserId) continue;

      const socket = this.userToSocket.get(userId);
      if (socket && socket.readyState === WebSocket.OPEN) {
        this.send(socket, message);
      }
    }
  }

  /**
   * Send message to WebSocket
   */
  private send(ws: WebSocket, message: SignalingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Failed to send message:', error);
      }
    }
  }

  /**
   * Send error message
   */
  private sendError(ws: WebSocket, error: string): void {
    this.send(ws, {
      type: 'error',
      roomId: '',
      userId: '',
      data: { error },
      timestamp: Date.now()
    } as any);
  }

  /**
   * Perform heartbeat check
   */
  private performHeartbeat(): void {
    const now = Date.now();
    const staleThreshold = 60000; // 60 seconds

    this.wss.clients.forEach((ws) => {
      const client = this.clients.get(ws);
      if (!client) return;

      if (!client.isAlive || (now - client.lastSeen) > staleThreshold) {
        console.log(`💀 Terminating stale connection for user ${client.userId}`);
        ws.terminate();
        this.handleDisconnection(ws);
        return;
      }

      client.isAlive = false;
      ws.ping();
    });

    console.log(`💓 Heartbeat: ${this.clients.size} clients, ${this.rooms.size} active rooms`);
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(ws: WebSocket): void {
    const client = this.clients.get(ws);
    if (!client) return;

    // Remove from room if in one
    if (client.roomId && client.userId) {
      const room = this.rooms.get(client.roomId);
      if (room) {
        room.delete(client.userId);

        if (room.size > 0) {
          // Notify remaining participants
          this.broadcastToRoom(client.roomId, {
            type: 'user-left',
            roomId: client.roomId,
            userId: client.userId,
            data: { reason: 'disconnected' },
            timestamp: Date.now()
          } as SignalingMessage);
        } else {
          // Clean up empty room
          this.rooms.delete(client.roomId);
        }
      }
    }

    // Clean up references
    if (client.userId) {
      this.userToSocket.delete(client.userId);
    }
    this.clients.delete(ws);
  }

  /**
   * Get server statistics
   */
  getStats() {
    const activeRooms = [];
    const roomEntries = Array.from(this.rooms.entries());
    for (const [roomId, participants] of roomEntries) {
      activeRooms.push({
        roomId,
        participantCount: participants.size
      });
    }

    return {
      connectedClients: this.clients.size,
      activeRooms: activeRooms.length,
      totalParticipants: roomEntries.reduce((sum, [_, room]) => sum + room.size, 0),
      rooms: activeRooms
    };
  }

  /**
   * Shutdown server
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down WebSocket server...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    this.wss.clients.forEach(ws => {
      ws.close(1012, 'Server shutting down');
    });

    // Close server
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('✅ WebSocket server shutdown completed');
        resolve();
      });
    });
  }
}