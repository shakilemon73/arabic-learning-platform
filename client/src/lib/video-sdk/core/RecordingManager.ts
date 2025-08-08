/**
 * RecordingManager - Handles session recording and playback
 * Video recording, audio recording, and cloud storage
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from './EventEmitter';

export interface RecordingConfig {
  roomId: string;
  initiatedBy: string;
  recordVideo: boolean;
  recordAudio: boolean;
  recordScreen: boolean;
  quality: 'low' | 'medium' | 'high' | 'hd';
  format: 'webm' | 'mp4';
  maxDuration?: number; // in minutes
}

export interface Recording {
  id: string;
  roomId: string;
  initiatedBy: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  fileUrl?: string;
  fileName: string;
  fileSize?: number;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  participants: string[];
}

export class RecordingManager extends EventEmitter {
  private supabase: SupabaseClient;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private currentRecording: Recording | null = null;
  private recordingStream: MediaStream | null = null;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  /**
   * Start recording session
   */
  async startRecording(config: RecordingConfig): Promise<void> {
    try {
      if (this.isRecording) {
        throw new Error('Recording already in progress');
      }

      // Create recording entry in database
      const recording: Partial<Recording> = {
        roomId: config.roomId,
        initiatedBy: config.initiatedBy,
        startTime: new Date(),
        fileName: `recording-${config.roomId}-${Date.now()}`,
        status: 'recording',
        participants: [] // Will be populated as we detect participants
      };

      const { data, error } = await this.supabase
        .from('recordings')
        .insert(recording)
        .select()
        .single();

      if (error) throw error;

      this.currentRecording = {
        ...recording,
        id: data.id,
        duration: 0
      } as Recording;

      // Setup media stream for recording
      await this.setupRecordingStream(config);

      // Start MediaRecorder
      await this.startMediaRecorder(config);

      this.isRecording = true;
      this.emit('recording-started', { recording: this.currentRecording });

      // Set up automatic stop if max duration is specified
      if (config.maxDuration) {
        setTimeout(() => {
          if (this.isRecording) {
            this.stopRecording(config.roomId);
          }
        }, config.maxDuration * 60 * 1000);
      }

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Setup recording stream
   */
  private async setupRecordingStream(config: RecordingConfig): Promise<void> {
    try {
      const audioTracks: MediaStreamTrack[] = [];
      const videoTracks: MediaStreamTrack[] = [];

      // Get display media if recording screen
      if (config.recordScreen) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: config.recordAudio
        });

        videoTracks.push(...displayStream.getVideoTracks());
        if (config.recordAudio) {
          audioTracks.push(...displayStream.getAudioTracks());
        }
      }

      // Get user media if recording camera/microphone
      if (config.recordVideo || config.recordAudio) {
        const userStream = await navigator.mediaDevices.getUserMedia({
          video: config.recordVideo && !config.recordScreen,
          audio: config.recordAudio
        });

        if (config.recordVideo && !config.recordScreen) {
          videoTracks.push(...userStream.getVideoTracks());
        }
        if (config.recordAudio) {
          audioTracks.push(...userStream.getAudioTracks());
        }
      }

      // Create combined stream
      this.recordingStream = new MediaStream([...videoTracks, ...audioTracks]);

    } catch (error) {
      throw new Error(`Failed to setup recording stream: ${error.message}`);
    }
  }

  /**
   * Start MediaRecorder
   */
  private async startMediaRecorder(config: RecordingConfig): Promise<void> {
    if (!this.recordingStream) {
      throw new Error('Recording stream not available');
    }

    // Determine MIME type based on format and browser support
    let mimeType = '';
    const requestedFormat = config.format;
    
    if (requestedFormat === 'webm') {
      if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')) {
        mimeType = 'video/webm; codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus')) {
        mimeType = 'video/webm; codecs=vp8,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }
    } else if (requestedFormat === 'mp4') {
      if (MediaRecorder.isTypeSupported('video/mp4; codecs=h264,aac')) {
        mimeType = 'video/mp4; codecs=h264,aac';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      }
    }

    // Fallback to any supported type
    if (!mimeType) {
      const supportedTypes = [
        'video/webm; codecs=vp9,opus',
        'video/webm; codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];

      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
    }

    if (!mimeType) {
      throw new Error('No supported recording format found');
    }

    // Set bitrate based on quality
    const bitrates = {
      low: 500000,    // 500 kbps
      medium: 1000000, // 1 Mbps
      high: 2500000,   // 2.5 Mbps
      hd: 5000000      // 5 Mbps
    };

    const options: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: bitrates[config.quality],
      audioBitsPerSecond: 128000 // 128 kbps for audio
    };

    this.mediaRecorder = new MediaRecorder(this.recordingStream, options);
    this.recordedChunks = [];

    // Setup event handlers
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = async () => {
      await this.processRecording();
    };

    this.mediaRecorder.onerror = (event) => {
      this.emit('error', { error: `Recording error: ${event}` });
    };

    // Start recording
    this.mediaRecorder.start(1000); // Collect data every second

  }

  /**
   * Stop recording
   */
  async stopRecording(roomId: string): Promise<void> {
    try {
      if (!this.isRecording || !this.currentRecording) {
        return;
      }

      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }

      // Stop all recording stream tracks
      if (this.recordingStream) {
        this.recordingStream.getTracks().forEach(track => track.stop());
        this.recordingStream = null;
      }

      // Update recording end time
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - this.currentRecording.startTime.getTime()) / 1000);

      await this.supabase
        .from('recordings')
        .update({
          end_time: endTime.toISOString(),
          duration,
          status: 'processing'
        })
        .eq('id', this.currentRecording.id);

      this.currentRecording.endTime = endTime;
      this.currentRecording.duration = duration;
      this.currentRecording.status = 'processing';

      this.isRecording = false;
      this.emit('recording-stopped', { recording: this.currentRecording });

    } catch (error) {
      this.emit('error', { error: error.message });
    }
  }

  /**
   * Process recorded video and upload to storage
   */
  private async processRecording(): Promise<void> {
    try {
      if (!this.currentRecording || this.recordedChunks.length === 0) {
        throw new Error('No recording data to process');
      }

      // Create blob from recorded chunks
      const recordingBlob = new Blob(this.recordedChunks, { 
        type: this.mediaRecorder?.mimeType || 'video/webm' 
      });

      const fileSize = recordingBlob.size;
      const fileName = `${this.currentRecording.fileName}.webm`;
      const filePath = `recordings/${this.currentRecording.roomId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await this.supabase.storage
        .from('recordings')
        .upload(filePath, recordingBlob, {
          contentType: recordingBlob.type,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('recordings')
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      // Update recording in database
      await this.supabase
        .from('recordings')
        .update({
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
          status: 'completed'
        })
        .eq('id', this.currentRecording.id);

      this.currentRecording.fileUrl = fileUrl;
      this.currentRecording.fileName = fileName;
      this.currentRecording.fileSize = fileSize;
      this.currentRecording.status = 'completed';

      this.emit('recording-processed', { recording: this.currentRecording });

      // Clean up
      this.recordedChunks = [];
      this.mediaRecorder = null;

    } catch (error) {
      // Update recording status to failed
      if (this.currentRecording) {
        await this.supabase
          .from('recordings')
          .update({ status: 'failed' })
          .eq('id', this.currentRecording.id);

        this.currentRecording.status = 'failed';
      }

      this.emit('recording-failed', { error: error.message });
    }
  }

  /**
   * Get recordings for a room
   */
  async getRoomRecordings(roomId: string): Promise<Recording[]> {
    try {
      const { data, error } = await this.supabase
        .from('recordings')
        .select('*')
        .eq('room_id', roomId)
        .order('start_time', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.transformDatabaseRecording);

    } catch (error) {
      this.emit('error', { error: error.message });
      return [];
    }
  }

  /**
   * Get recording by ID
   */
  async getRecording(recordingId: string): Promise<Recording | null> {
    try {
      const { data, error } = await this.supabase
        .from('recordings')
        .select('*')
        .eq('id', recordingId)
        .single();

      if (error) throw error;

      return this.transformDatabaseRecording(data);

    } catch (error) {
      this.emit('error', { error: error.message });
      return null;
    }
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string): Promise<void> {
    try {
      // Get recording details
      const recording = await this.getRecording(recordingId);
      if (!recording) {
        throw new Error('Recording not found');
      }

      // Delete file from storage
      if (recording.fileName) {
        const filePath = `recordings/${recording.roomId}/${recording.fileName}`;
        await this.supabase.storage
          .from('recordings')
          .remove([filePath]);
      }

      // Delete database record
      const { error } = await this.supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId);

      if (error) throw error;

      this.emit('recording-deleted', { recordingId });

    } catch (error) {
      this.emit('error', { error: error.message });
    }
  }

  /**
   * Download recording
   */
  async downloadRecording(recordingId: string): Promise<string | null> {
    try {
      const recording = await this.getRecording(recordingId);
      if (!recording || !recording.fileUrl) {
        throw new Error('Recording file not available');
      }

      return recording.fileUrl;

    } catch (error) {
      this.emit('error', { error: error.message });
      return null;
    }
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.emit('recording-paused');
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.emit('recording-resumed');
    }
  }

  /**
   * Check if recording is active
   */
  isRecordingActive(): boolean {
    return this.isRecording;
  }

  /**
   * Get current recording
   */
  getCurrentRecording(): Recording | null {
    return this.currentRecording;
  }

  /**
   * Get recording duration
   */
  getRecordingDuration(): number {
    if (!this.currentRecording) return 0;
    
    const now = new Date();
    return Math.floor((now.getTime() - this.currentRecording.startTime.getTime()) / 1000);
  }

  /**
   * Transform database recording
   */
  private transformDatabaseRecording(dbRecording: any): Recording {
    return {
      id: dbRecording.id,
      roomId: dbRecording.room_id,
      initiatedBy: dbRecording.initiated_by,
      startTime: new Date(dbRecording.start_time),
      endTime: dbRecording.end_time ? new Date(dbRecording.end_time) : undefined,
      duration: dbRecording.duration || 0,
      fileUrl: dbRecording.file_url,
      fileName: dbRecording.file_name,
      fileSize: dbRecording.file_size,
      status: dbRecording.status,
      participants: dbRecording.participants || []
    };
  }

  /**
   * Destroy recording manager
   */
  destroy(): void {
    if (this.isRecording) {
      this.stopRecording(this.currentRecording?.roomId || '');
    }
    
    this.removeAllListeners();
  }
}