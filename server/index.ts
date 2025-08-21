#!/usr/bin/env tsx
import { createServer } from 'http';
import express from 'express';
import { WebRTCSignalingServer } from './webrtc-signaling';

console.log("🚀 Starting Arabic Learning Platform with WebRTC signaling...");

// Create Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.static('dist/public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebRTC signaling server
const webrtcServer = new WebRTCSignalingServer(server);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 WebRTC signaling available at ws://localhost:${PORT}/webrtc-signaling`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
});
