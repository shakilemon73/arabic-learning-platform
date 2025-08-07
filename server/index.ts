#!/usr/bin/env tsx
import { exec } from 'child_process';

console.log("🚀 Starting Arabic Learning Platform with Supabase backend...");
console.log("📱 Express server removed - Using Vite frontend only");
console.log("🔄 This application now uses Supabase for authentication and data storage");

// Start Vite dev server with custom config that allows Replit hosts
const viteProcess = exec('npx vite --config vite.dev.config.ts', (error, stdout, stderr) => {
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
