#!/usr/bin/env tsx
import { exec } from 'child_process';

console.log("🚀 Starting Arabic Learning Platform with Supabase backend...");
console.log("📱 Express server removed - Using Vite frontend only");

// Start Vite dev server
const viteProcess = exec('npx vite --port 5000 --host 0.0.0.0', (error, stdout, stderr) => {
  if (error) {
    console.error(`Vite process error: ${error}`);
    return;
  }
  console.log(`Vite stdout: ${stdout}`);
  console.error(`Vite stderr: ${stderr}`);
});

viteProcess.stdout?.on('data', (data) => {
  console.log(data.toString());
});

viteProcess.stderr?.on('data', (data) => {
  console.error(data.toString());
});

viteProcess.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
});

// Keep the process alive
process.on('SIGINT', () => {
  console.log('Shutting down...');
  viteProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  viteProcess.kill();
  process.exit(0);
});