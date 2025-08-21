import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Compression and CORS
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.replit.app'] 
    : ['http://localhost:5000', 'http://127.0.0.1:5000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Room-based participant tracking for multi-user video
interface Participant {
  id: string;
  userId: string;
  roomId: string;
  displayName: string;
  role: 'admin' | 'student';
  ws: WebSocket;
  joinedAt: Date;
}

const rooms = new Map<string, Map<string, Participant>>();

// WebSocket server for real-time video signaling
const wss = new WebSocketServer({ 
  server,
  path: '/ws',
  perMessageDeflate: {
    threshold: 1024,
    serverMaxWindowBits: 15,
    clientMaxWindowBits: 15,
  }
});

// WebSocket connection handling for multi-user video
wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection established');
  let currentParticipant: Participant | null = null;
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 WebSocket message received:', message.type, 'from room:', message.roomId);
      
      switch (message.type) {
        case 'join-room':
          handleJoinRoom(ws, message);
          break;
          
        case 'leave-room':
          handleLeaveRoom(ws, message);
          break;
          
        case 'webrtc-signal':
          handleWebRTCSignaling(ws, message);
          break;
          
        case 'media-state-change':
          handleMediaStateChange(ws, message);
          break;
          
        default:
          console.log('🔄 Broadcasting message to room:', message.roomId);
          broadcastToRoom(message.roomId, message, ws);
      }
    } catch (error) {
      console.error('❌ WebSocket message parsing error:', error);
    }
  });
  
  // Handle participant joining a room
  function handleJoinRoom(ws: WebSocket, message: any) {
    const { roomId, userId, displayName, role } = message;
    
    console.log(`👤 User ${displayName} (${userId}) joining room ${roomId} as ${role}`);
    
    // Create participant
    const participant: Participant = {
      id: `${userId}-${Date.now()}`,
      userId,
      roomId,
      displayName,
      role: role || 'student',
      ws,
      joinedAt: new Date()
    };
    
    currentParticipant = participant;
    
    // Add to room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    
    const room = rooms.get(roomId)!;
    room.set(userId, participant);
    
    // Notify existing participants about new user
    const participantList = Array.from(room.values()).map(p => ({
      id: p.id,
      userId: p.userId,
      displayName: p.displayName,
      role: p.role,
      joinedAt: p.joinedAt
    }));
    
    // Send current participants to new user
    ws.send(JSON.stringify({
      type: 'room-joined',
      roomId,
      participants: participantList.filter(p => p.userId !== userId)
    }));
    
    // Notify others about new participant
    broadcastToRoom(roomId, {
      type: 'participant-joined',
      roomId,
      participant: {
        id: participant.id,
        userId: participant.userId,
        displayName: participant.displayName,
        role: participant.role,
        joinedAt: participant.joinedAt
      }
    }, ws);
    
    console.log(`✅ Room ${roomId} now has ${room.size} participants`);
  }
  
  // Handle participant leaving a room
  function handleLeaveRoom(ws: WebSocket, message: any) {
    if (!currentParticipant) return;
    
    const { roomId, userId } = message;
    console.log(`👋 User ${userId} leaving room ${roomId}`);
    
    const room = rooms.get(roomId);
    if (room) {
      room.delete(userId);
      
      // Notify others about participant leaving
      broadcastToRoom(roomId, {
        type: 'participant-left',
        roomId,
        userId
      }, ws);
      
      // Clean up empty rooms
      if (room.size === 0) {
        rooms.delete(roomId);
        console.log(`🗑️ Room ${roomId} deleted (empty)`);
      } else {
        console.log(`📊 Room ${roomId} now has ${room.size} participants`);
      }
    }
    
    currentParticipant = null;
  }
  
  // Handle WebRTC signaling between participants
  function handleWebRTCSignaling(ws: WebSocket, message: any) {
    const { roomId, fromUserId, toUserId, signal } = message;
    console.log(`📡 WebRTC signal from ${fromUserId} to ${toUserId} in room ${roomId}`);
    
    const room = rooms.get(roomId);
    if (room) {
      const targetParticipant = room.get(toUserId);
      if (targetParticipant && targetParticipant.ws.readyState === WebSocket.OPEN) {
        targetParticipant.ws.send(JSON.stringify({
          type: 'webrtc-signal',
          roomId,
          fromUserId,
          signal
        }));
      }
    }
  }
  
  // Handle media state changes (video/audio on/off)
  function handleMediaStateChange(ws: WebSocket, message: any) {
    const { roomId, userId, isVideoEnabled, isAudioEnabled } = message;
    console.log(`🎥 Media state change for ${userId}: video=${isVideoEnabled}, audio=${isAudioEnabled}`);
    
    broadcastToRoom(roomId, {
      type: 'participant-media-changed',
      roomId,
      userId,
      isVideoEnabled,
      isAudioEnabled
    }, ws);
  }
  
  // Broadcast message to all participants in a room except sender
  function broadcastToRoom(roomId: string, message: any, senderWs?: WebSocket) {
    const room = rooms.get(roomId);
    if (room) {
      room.forEach(participant => {
        if (participant.ws !== senderWs && participant.ws.readyState === WebSocket.OPEN) {
          participant.ws.send(JSON.stringify(message));
        }
      });
    }
  }
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    
    // Clean up participant from all rooms
    if (currentParticipant) {
      const { roomId, userId } = currentParticipant;
      const room = rooms.get(roomId);
      if (room) {
        room.delete(userId);
        
        // Notify others about participant leaving
        broadcastToRoom(roomId, {
          type: 'participant-left',
          roomId,
          userId
        });
        
        // Clean up empty rooms
        if (room.size === 0) {
          rooms.delete(roomId);
          console.log(`🗑️ Room ${roomId} deleted (empty)`);
        }
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

const PORT = Number(process.env.PORT) || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server available on ws://localhost:${PORT}/ws`);
  console.log(`🎥 Multi-user video conferencing ready`);
});