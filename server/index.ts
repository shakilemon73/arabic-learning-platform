#!/usr/bin/env tsx
import { exec } from 'child_process';
import { VideoWebSocketServer } from './websocket-server';

console.log("🚀 Starting Arabic Learning Platform with Supabase + WebSocket backend...");
console.log("📱 Using Vite frontend with dedicated WebSocket server");
console.log("🔄 Supabase for data storage + WebSocket for real-time communication");

// Start WebSocket server for video conferencing
const wsServer = new VideoWebSocketServer(8080);

// Start Vite dev server
const viteProcess = exec('npx vite --host 0.0.0.0 --port 5000', (error, stdout, stderr) => {
  if (error) {
    console.error(`Vite process error: ${error}`);
    return;
  }
  if (stdout) console.log(`Vite stdout: ${stdout}`);
  if (stderr) console.error(`Vite stderr: ${stderr}`);
});

viteProcess.stdout?.on('data', (data) => {
  process.stdout.write(data);
});

viteProcess.stderr?.on('data', (data) => {
  process.stderr.write(data);
});

viteProcess.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
  process.exit(code || 0);
});

// Initialize WebSocket server
wsServer.start().then(() => {
  console.log('✅ Video conferencing infrastructure ready');
}).catch(error => {
  console.error('❌ Failed to start WebSocket server:', error);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  
  await wsServer.shutdown();
  viteProcess.kill('SIGINT');
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  
  await wsServer.shutdown();
  viteProcess.kill('SIGTERM');
});

// Prevent the process from exiting
setInterval(() => {}, 1000);
