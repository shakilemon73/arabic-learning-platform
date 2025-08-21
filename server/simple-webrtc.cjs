const { WebSocketServer } = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'WebRTC Signaling Server is running' });
});

const server = http.createServer(app);

// WebRTC signaling WebSocket server
const wss = new WebSocketServer({ 
  server, 
  path: '/webrtc-signaling' 
});

// Room management
const rooms = new Map();

function addParticipantToRoom(roomId, participantId, ws, participantData) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  
  const room = rooms.get(roomId);
  room.set(participantId, {
    ws,
    ...participantData,
    joinedAt: new Date()
  });
  
  console.log(`👤 Participant ${participantId} joined room ${roomId}`);
  console.log(`📊 Room ${roomId} now has ${room.size} participants`);
}

function removeParticipantFromRoom(roomId, participantId) {
  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    room.delete(participantId);
    
    console.log(`👋 Participant ${participantId} left room ${roomId}`);
    
    if (room.size === 0) {
      rooms.delete(roomId);
      console.log(`🗑️ Room ${roomId} deleted (empty)`);
    } else {
      console.log(`📊 Room ${roomId} now has ${room.size} participants`);
    }
  }
}

function broadcastToRoom(roomId, message, excludeParticipantId = null) {
  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    room.forEach((participant, participantId) => {
      if (participantId !== excludeParticipantId && participant.ws.readyState === 1) {
        participant.ws.send(JSON.stringify(message));
      }
    });
  }
}

function sendToParticipant(roomId, participantId, message) {
  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    const participant = room.get(participantId);
    if (participant && participant.ws.readyState === 1) {
      participant.ws.send(JSON.stringify(message));
    }
  }
}

wss.on('connection', (ws, req) => {
  console.log('🔗 New WebSocket connection from:', req.socket.remoteAddress);
  
  let currentRoomId = null;
  let currentParticipantId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', message.type, message);

      switch (message.type) {
        case 'join-room':
          currentRoomId = message.roomId;
          currentParticipantId = message.participantId;
          
          // Get existing participants before adding new one
          const existingParticipants = [];
          if (rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId);
            room.forEach((participant, id) => {
              existingParticipants.push({
                id,
                name: participant.name,
                role: participant.role,
                videoEnabled: participant.videoEnabled,
                audioEnabled: participant.audioEnabled
              });
            });
          }
          
          // Add participant to room
          addParticipantToRoom(currentRoomId, currentParticipantId, ws, message.data);
          
          // Send join confirmation to new participant
          ws.send(JSON.stringify({
            type: 'joined-room',
            roomId: currentRoomId,
            participantId: currentParticipantId,
            data: {
              participants: existingParticipants
            }
          }));
          
          // Notify other participants about new participant
          broadcastToRoom(currentRoomId, {
            type: 'participant-joined',
            roomId: currentRoomId,
            data: {
              participant: {
                id: currentParticipantId,
                name: message.data.name,
                role: message.data.role,
                videoEnabled: message.data.videoEnabled,
                audioEnabled: message.data.audioEnabled
              }
            }
          }, currentParticipantId);
          break;

        case 'leave-room':
          if (currentRoomId && currentParticipantId) {
            removeParticipantFromRoom(currentRoomId, currentParticipantId);
            
            // Notify other participants
            broadcastToRoom(currentRoomId, {
              type: 'participant-left',
              roomId: currentRoomId,
              participantId: currentParticipantId
            }, currentParticipantId);
          }
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Forward signaling messages between specific participants
          if (message.targetParticipantId && currentRoomId) {
            sendToParticipant(currentRoomId, message.targetParticipantId, {
              ...message,
              fromParticipantId: currentParticipantId
            });
          }
          break;

        case 'media-change':
          // Broadcast media state changes
          if (currentRoomId) {
            broadcastToRoom(currentRoomId, {
              type: 'participant-media-changed',
              roomId: currentRoomId,
              participantId: currentParticipantId,
              data: { mediaState: message.data }
            }, currentParticipantId);
          }
          break;

        default:
          console.log('❓ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    if (currentRoomId && currentParticipantId) {
      removeParticipantFromRoom(currentRoomId, currentParticipantId);
      
      // Notify other participants
      broadcastToRoom(currentRoomId, {
        type: 'participant-left',
        roomId: currentRoomId,
        participantId: currentParticipantId
      }, currentParticipantId);
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

const PORT = 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WebRTC Signaling Server running on port ${PORT}`);
  console.log(`🔗 WebRTC signaling available at ws://localhost:${PORT}/webrtc-signaling`);
  console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
});