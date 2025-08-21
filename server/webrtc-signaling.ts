/**
 * WebRTC Signaling Server for Enterprise Video Conferencing
 * Handles real peer-to-peer connections, not just database tracking
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface Participant {
  id: string;
  name: string;
  role: 'host' | 'moderator' | 'participant';
  roomId: string;
  ws: WebSocket;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
}

interface SignalingMessage {
  type: 'join-room' | 'leave-room' | 'offer' | 'answer' | 'ice-candidate' | 'media-state-change' | 'participant-update';
  roomId: string;
  participantId: string;
  targetParticipantId?: string;
  data?: any;
}

export class WebRTCSignalingServer {
  private wss: WebSocketServer;
  private participants = new Map<string, Participant>();
  private rooms = new Map<string, Set<string>>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/webrtc-signaling',
      verifyClient: (info: any) => {
        // Add origin verification for security
        const origin = info.origin;
        const allowedOrigins = [
          'http://localhost:5000',
          'https://localhost:5000',
          /^https:\/\/.*\.replit\.dev$/,
          /^https:\/\/.*\.replit\.app$/,
          /^https:\/\/.*\.replit\.co$/
        ];
        
        return allowedOrigins.some(allowed => 
          typeof allowed === 'string' ? origin === allowed : allowed.test(origin)
        );
      }
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('🔗 New WebRTC signaling connection established');
      
      ws.on('message', (data) => {
        try {
          const message: SignalingMessage = JSON.parse(data.toString());
          this.handleSignalingMessage(ws, message);
        } catch (error) {
          console.error('❌ Error parsing signaling message:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });

      ws.on('close', () => {
        this.handleParticipantDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.handleParticipantDisconnect(ws);
      });
    });

    console.log('🚀 WebRTC Signaling Server initialized on /webrtc-signaling');
  }

  private handleSignalingMessage(ws: WebSocket, message: SignalingMessage) {
    switch (message.type) {
      case 'join-room':
        this.handleJoinRoom(ws, message);
        break;

      case 'leave-room':
        this.handleLeaveRoom(ws, message);
        break;

      case 'offer':
      case 'answer':
      case 'ice-candidate':
        this.handleWebRTCSignaling(ws, message);
        break;

      case 'media-state-change':
        this.handleMediaStateChange(ws, message);
        break;

      default:
        console.warn('⚠️ Unknown signaling message type:', message.type);
    }
  }

  private handleJoinRoom(ws: WebSocket, message: SignalingMessage) {
    const { roomId, participantId, data } = message;
    
    console.log(`👤 Participant ${participantId} joining room ${roomId}`);

    // Create participant
    const participant: Participant = {
      id: participantId,
      name: data.name || 'Unknown',
      role: data.role || 'participant',
      roomId,
      ws,
      videoEnabled: data.videoEnabled ?? true,
      audioEnabled: data.audioEnabled ?? true,
      screenSharing: false
    };

    // Add to participants map
    this.participants.set(participantId, participant);

    // Add to room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(participantId);

    // Notify participant of successful join
    ws.send(JSON.stringify({
      type: 'joined-room',
      roomId,
      participantId,
      participants: this.getRoomParticipants(roomId)
    }));

    // Notify existing participants about new participant
    this.broadcastToRoom(roomId, {
      type: 'participant-joined',
      roomId,
      data: {
        participant: {
          id: participant.id,
          name: participant.name,
          role: participant.role,
          videoEnabled: participant.videoEnabled,
          audioEnabled: participant.audioEnabled,
          screenSharing: participant.screenSharing
        }
      }
    }, participantId);

    console.log(`✅ Participant ${participantId} successfully joined room ${roomId}`);
  }

  private handleLeaveRoom(ws: WebSocket, message: SignalingMessage) {
    const { roomId, participantId } = message;
    this.removeParticipantFromRoom(participantId, roomId);
  }

  private handleParticipantDisconnect(ws: WebSocket) {
    // Find participant by websocket
    const participant = Array.from(this.participants.values())
      .find(p => p.ws === ws);

    if (participant) {
      console.log(`👋 Participant ${participant.id} disconnected from room ${participant.roomId}`);
      this.removeParticipantFromRoom(participant.id, participant.roomId);
    }
  }

  private removeParticipantFromRoom(participantId: string, roomId: string) {
    const participant = this.participants.get(participantId);
    if (!participant) return;

    // Remove from room
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(participantId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    // Remove from participants
    this.participants.delete(participantId);

    // Notify remaining participants
    this.broadcastToRoom(roomId, {
      type: 'participant-left',
      roomId,
      participantId
    });

    console.log(`✅ Participant ${participantId} removed from room ${roomId}`);
  }

  private handleWebRTCSignaling(ws: WebSocket, message: SignalingMessage) {
    const { targetParticipantId, type, data } = message;

    if (!targetParticipantId) {
      console.error('❌ WebRTC signaling requires targetParticipantId');
      return;
    }

    const targetParticipant = this.participants.get(targetParticipantId);
    if (!targetParticipant) {
      console.error(`❌ Target participant ${targetParticipantId} not found`);
      return;
    }

    // Forward the signaling message to target participant
    if (targetParticipant.ws.readyState === WebSocket.OPEN) {
      targetParticipant.ws.send(JSON.stringify({
        type,
        fromParticipantId: message.participantId,
        data
      }));
    }
  }

  private handleMediaStateChange(ws: WebSocket, message: SignalingMessage) {
    const { participantId, roomId, data } = message;
    const participant = this.participants.get(participantId);

    if (!participant) return;

    // Update participant media state
    if (data.videoEnabled !== undefined) {
      participant.videoEnabled = data.videoEnabled;
    }
    if (data.audioEnabled !== undefined) {
      participant.audioEnabled = data.audioEnabled;
    }
    if (data.screenSharing !== undefined) {
      participant.screenSharing = data.screenSharing;
    }

    // Broadcast media state change to room
    this.broadcastToRoom(roomId, {
      type: 'participant-media-changed',
      roomId,
      participantId,
      mediaState: {
        videoEnabled: participant.videoEnabled,
        audioEnabled: participant.audioEnabled,
        screenSharing: participant.screenSharing
      }
    }, participantId);
  }

  private broadcastToRoom(roomId: string, message: any, excludeParticipantId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.forEach(participantId => {
      if (participantId === excludeParticipantId) return;

      const participant = this.participants.get(participantId);
      if (participant && participant.ws.readyState === WebSocket.OPEN) {
        participant.ws.send(JSON.stringify(message));
      }
    });
  }

  private getRoomParticipants(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    return Array.from(room).map(participantId => {
      const participant = this.participants.get(participantId);
      return participant ? {
        id: participant.id,
        name: participant.name,
        role: participant.role,
        videoEnabled: participant.videoEnabled,
        audioEnabled: participant.audioEnabled,
        screenSharing: participant.screenSharing
      } : null;
    }).filter(Boolean);
  }

  public getStats() {
    return {
      totalParticipants: this.participants.size,
      totalRooms: this.rooms.size,
      roomDetails: Array.from(this.rooms.entries()).map(([roomId, participants]) => ({
        roomId,
        participantCount: participants.size
      }))
    };
  }
}