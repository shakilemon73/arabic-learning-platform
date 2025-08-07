#!/usr/bin/env tsx
import { exec } from 'child_process';

console.log("🚀 Starting Arabic Learning Platform with Supabase backend...");
console.log("📱 Express server removed - Using Vite frontend only");
console.log("🔄 This application now uses Supabase for authentication and data storage");

// Start Vite dev server with dynamic config that handles all Replit hosts
const viteProcess = exec('npx vite --config vite.dynamic.config.ts --host 0.0.0.0 --port 5000', (error, stdout, stderr) => {
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

// Keep the process alive and handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  viteProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  viteProcess.kill('SIGTERM');
});

// Prevent the process from exiting
setInterval(() => {}, 1000);
