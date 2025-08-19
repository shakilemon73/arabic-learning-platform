/**
 * RecordingManager - Video/audio recording functionality
 */

import { EventEmitter } from './EventEmitter';
import { SupabaseClient } from '@supabase/supabase-js';

export class RecordingManager extends EventEmitter {
  private supabase: SupabaseClient;
  private isRecording = false;
  private mediaRecorder: MediaRecorder | null = null;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  async startRecording(stream: MediaStream): Promise<void> {
    try {
      this.mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        this.emit('recording-ready', { blob });
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.emit('recording-started');
    } catch (error) {
      this.emit('error', { error: 'Recording failed to start' });
    }
  }

  async stopRecording(): Promise<void> {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.emit('recording-stopped');
    }
  }

  cleanup(): void {
    this.stopRecording();
    this.removeAllListeners();
  }
}