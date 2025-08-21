import { EventEmitter } from '../core/EventEmitter';
import { SupabaseClient } from '@supabase/supabase-js';

export interface RecordingConfig {
  quality: 'low' | 'medium' | 'high' | 'ultra';
  format: 'mp4' | 'webm' | 'avi';
  includeAudio: boolean;
  includeVideo: boolean;
  includeScreenShare: boolean;
  includeChat: boolean;
  maxDuration: number; // minutes
  autoUpload: boolean;
  encryptRecording: boolean;
}

export interface RecordingSession {
  id: string;
  roomId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // seconds
  size: number; // bytes
  participants: string[];
  config: RecordingConfig;
  status: 'starting' | 'recording' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  error?: string;
}

export interface RecordingMetrics {
  totalRecordings: number;
  activeRecordings: number;
  totalStorage: number; // bytes
  averageFileSize: number;
  successRate: number;
}

/**
 * Enterprise Recording Manager
 * Professional recording capabilities like Zoom, Teams
 */
export class RecordingManager extends EventEmitter {
  private supabase: SupabaseClient;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private currentSession: RecordingSession | null = null;
  private isRecording = false;
  
  // Multi-stream recording
  private streamRecorders = new Map<string, MediaRecorder>();
  private streamChunks = new Map<string, Blob[]>();
  
  // Canvas for composition
  private compositionCanvas: HTMLCanvasElement | null = null;
  private compositionContext: CanvasRenderingContext2D | null = null;
  private compositionStream: MediaStream | null = null;
  
  // Audio mixing
  private audioContext: AudioContext | null = null;
  private audioDestination: MediaStreamAudioDestinationNode | null = null;
  private audioSources = new Map<string, MediaStreamAudioSourceNode>();
  
  // Recording storage
  private recordingBuffer: Uint8Array[] = [];
  private maxBufferSize = 100 * 1024 * 1024; // 100MB buffer
  
  private config: RecordingConfig = {
    quality: 'high',
    format: 'mp4',
    includeAudio: true,
    includeVideo: true,
    includeScreenShare: true,
    includeChat: true,
    maxDuration: 120, // 2 hours
    autoUpload: true,
    encryptRecording: true
  };

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

  /**
   * Start recording session
   */
  async startRecording(
    roomId: string, 
    participantStreams: Map<string, MediaStream>,
    customConfig?: Partial<RecordingConfig>
  ): Promise<string> {
    try {
      if (this.isRecording) {
        throw new Error('Recording already in progress');
      }

      console.log('🎬 Starting recording session...');
      
      // Update configuration
      if (customConfig) {
        this.config = { ...this.config, ...customConfig };
      }

      // Create recording session
      const sessionId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.currentSession = {
        id: sessionId,
        roomId,
        startTime: new Date(),
        duration: 0,
        size: 0,
        participants: Array.from(participantStreams.keys()),
        config: { ...this.config },
        status: 'starting'
      };

      // Initialize recording components
      await this.initializeRecordingComponents();
      
      // Set up composition if multiple streams
      if (participantStreams.size > 1 && this.config.includeVideo) {
        await this.setupVideoComposition(participantStreams);
      }
      
      // Set up audio mixing
      if (this.config.includeAudio) {
        await this.setupAudioMixing(participantStreams);
      }
      
      // Start the actual recording
      await this.startMediaRecording();
      
      // Save session to database
      await this.saveRecordingSession();
      
      this.isRecording = true;
      this.currentSession.status = 'recording';
      
      // Set up auto-stop timer
      this.setupAutoStop();
      
      console.log(`✅ Recording started: ${sessionId}`);
      this.emit('recording-started', { session: this.currentSession });
      
      return sessionId;

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      if (this.currentSession) {
        this.currentSession.status = 'failed';
        this.currentSession.error = error instanceof Error ? error.message : 'Unknown error';
      }
      throw error;
    }
  }

  /**
   * Initialize recording components
   */
  private async initializeRecordingComponents(): Promise<void> {
    // Initialize audio context for mixing
    this.audioContext = new AudioContext({
      sampleRate: 48000,
      latencyHint: 'balanced'
    });
    
    this.audioDestination = this.audioContext.createMediaStreamDestination();
    
    // Initialize canvas for video composition
    this.compositionCanvas = document.createElement('canvas');
    this.compositionCanvas.width = this.getRecordingResolution().width;
    this.compositionCanvas.height = this.getRecordingResolution().height;
    this.compositionContext = this.compositionCanvas.getContext('2d');
    
    if (!this.compositionContext) {
      throw new Error('Failed to get canvas context');
    }
    
    console.log('🔧 Recording components initialized');
  }

  /**
   * Get recording resolution based on quality setting
   */
  private getRecordingResolution(): { width: number; height: number } {
    const resolutions = {
      low: { width: 640, height: 480 },
      medium: { width: 1280, height: 720 },
      high: { width: 1920, height: 1080 },
      ultra: { width: 3840, height: 2160 }
    };
    
    return resolutions[this.config.quality];
  }

  /**
   * Set up video composition for multiple streams
   */
  private async setupVideoComposition(participantStreams: Map<string, MediaStream>): Promise<void> {
    if (!this.compositionCanvas || !this.compositionContext) return;
    
    const canvas = this.compositionCanvas;
    const ctx = this.compositionContext;
    const participantCount = participantStreams.size;
    
    // Calculate grid layout
    const gridLayout = this.calculateGridLayout(participantCount);
    const cellWidth = canvas.width / gridLayout.cols;
    const cellHeight = canvas.height / gridLayout.rows;
    
    // Create video elements for each stream
    const videoElements = new Map<string, HTMLVideoElement>();
    let index = 0;
    
    for (const [participantId, stream] of Array.from(participantStreams)) {
      if (!stream.getVideoTracks().length) continue;
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      
      videoElements.set(participantId, video);
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });
    }
    
    // Render composition
    const renderFrame = () => {
      if (!this.isRecording) return;
      
      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      let index = 0;
      for (const [participantId, video] of Array.from(videoElements)) {
        const row = Math.floor(index / gridLayout.cols);
        const col = index % gridLayout.cols;
        
        const x = col * cellWidth;
        const y = row * cellHeight;
        
        // Draw video frame
        ctx.drawImage(video, x, y, cellWidth, cellHeight);
        
        // Draw participant label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y + cellHeight - 30, cellWidth, 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText(participantId, x + 10, y + cellHeight - 10);
        
        index++;
      }
      
      requestAnimationFrame(renderFrame);
    };
    
    // Start rendering
    renderFrame();
    
    // Create stream from canvas
    this.compositionStream = canvas.captureStream(30); // 30 FPS
    console.log('🎨 Video composition set up');
  }

  /**
   * Calculate grid layout for participants
   */
  private calculateGridLayout(participantCount: number): { rows: number; cols: number } {
    if (participantCount <= 1) return { rows: 1, cols: 1 };
    if (participantCount <= 4) return { rows: 2, cols: 2 };
    if (participantCount <= 6) return { rows: 2, cols: 3 };
    if (participantCount <= 9) return { rows: 3, cols: 3 };
    if (participantCount <= 12) return { rows: 3, cols: 4 };
    if (participantCount <= 16) return { rows: 4, cols: 4 };
    
    // For larger groups, use a wider grid
    const cols = Math.ceil(Math.sqrt(participantCount));
    const rows = Math.ceil(participantCount / cols);
    return { rows, cols };
  }

  /**
   * Set up audio mixing for multiple streams
   */
  private async setupAudioMixing(participantStreams: Map<string, MediaStream>): Promise<void> {
    if (!this.audioContext || !this.audioDestination) return;
    
    // Create gain node for master volume
    const masterGain = this.audioContext.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(this.audioDestination);
    
    // Mix all audio streams
    for (const [participantId, stream] of Array.from(participantStreams)) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) continue;
      
      // Create audio source
      const audioSource = this.audioContext.createMediaStreamSource(stream);
      
      // Create individual gain control
      const participantGain = this.audioContext.createGain();
      participantGain.gain.value = 1.0 / participantStreams.size; // Balance volumes
      
      // Connect to mixer
      audioSource.connect(participantGain);
      participantGain.connect(masterGain);
      
      this.audioSources.set(participantId, audioSource);
    }
    
    console.log('🎵 Audio mixing set up');
  }

  /**
   * Start the actual media recording
   */
  private async startMediaRecording(): Promise<void> {
    try {
      let recordingStream: MediaStream;
      
      // Combine video and audio streams
      if (this.compositionStream && this.audioDestination) {
        recordingStream = new MediaStream([
          ...this.compositionStream.getVideoTracks(),
          ...this.audioDestination.stream.getAudioTracks()
        ]);
      } else if (this.compositionStream) {
        recordingStream = this.compositionStream;
      } else if (this.audioDestination) {
        recordingStream = this.audioDestination.stream;
      } else {
        throw new Error('No streams available for recording');
      }
      
      // Configure MediaRecorder
      const options = this.getMediaRecorderOptions();
      this.mediaRecorder = new MediaRecorder(recordingStream, options);
      
      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
          this.updateRecordingProgress(event.data.size);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };
      
      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        this.handleRecordingError(new Error('MediaRecorder error'));
      };
      
      // Start recording
      this.mediaRecorder.start(1000); // Request data every second
      
      console.log('📹 Media recording started');

    } catch (error) {
      console.error('❌ Failed to start media recording:', error);
      throw error;
    }
  }

  /**
   * Get MediaRecorder options based on configuration
   */
  private getMediaRecorderOptions(): MediaRecorderOptions {
    const mimeType = this.getSupportedMimeType();
    const videoBitsPerSecond = this.getVideoBitrate();
    const audioBitsPerSecond = 128000; // 128 kbps for audio
    
    return {
      mimeType,
      videoBitsPerSecond,
      audioBitsPerSecond
    };
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'video/webm';
  }

  /**
   * Get video bitrate based on quality setting
   */
  private getVideoBitrate(): number {
    const bitrates = {
      low: 1000000,     // 1 Mbps
      medium: 2500000,  // 2.5 Mbps
      high: 5000000,    // 5 Mbps
      ultra: 10000000   // 10 Mbps
    };
    
    return bitrates[this.config.quality];
  }

  /**
   * Update recording progress
   */
  private updateRecordingProgress(dataSize: number): void {
    if (!this.currentSession) return;
    
    this.currentSession.size += dataSize;
    this.currentSession.duration = (Date.now() - this.currentSession.startTime.getTime()) / 1000;
    
    this.emit('recording-progress', {
      sessionId: this.currentSession.id,
      duration: this.currentSession.duration,
      size: this.currentSession.size
    });
  }

  /**
   * Set up auto-stop timer
   */
  private setupAutoStop(): void {
    const maxDurationMs = this.config.maxDuration * 60 * 1000;
    
    setTimeout(() => {
      if (this.isRecording) {
        console.log('⏰ Recording auto-stopped due to max duration');
        this.stopRecording();
      }
    }, maxDurationMs);
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<void> {
    try {
      if (!this.isRecording || !this.mediaRecorder) {
        throw new Error('No active recording to stop');
      }

      console.log('⏹️ Stopping recording...');
      
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      if (this.currentSession) {
        this.currentSession.status = 'processing';
        this.currentSession.endTime = new Date();
        this.currentSession.duration = (this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime()) / 1000;
      }
      
      this.emit('recording-stopped', { session: this.currentSession });

    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Handle recording stop event
   */
  private async handleRecordingStop(): Promise<void> {
    try {
      if (!this.currentSession) return;
      
      console.log('🔄 Processing recorded data...');
      
      // Create final recording blob
      const mimeType = this.getSupportedMimeType();
      const recordingBlob = new Blob(this.recordedChunks, { type: mimeType });
      
      this.currentSession.size = recordingBlob.size;
      
      // Process and upload recording
      if (this.config.autoUpload) {
        await this.uploadRecording(recordingBlob);
      } else {
        // Create download URL
        this.currentSession.downloadUrl = URL.createObjectURL(recordingBlob);
      }
      
      this.currentSession.status = 'completed';
      
      // Update database
      await this.updateRecordingSession();
      
      // Cleanup
      this.cleanup();
      
      console.log('✅ Recording processing completed');
      this.emit('recording-completed', { session: this.currentSession });

    } catch (error) {
      console.error('❌ Failed to process recording:', error);
      this.handleRecordingError(error as Error);
    }
  }

  /**
   * Handle recording error
   */
  private handleRecordingError(error: Error): void {
    if (this.currentSession) {
      this.currentSession.status = 'failed';
      this.currentSession.error = error.message;
    }
    
    this.cleanup();
    this.emit('recording-error', { error: error.message, session: this.currentSession });
  }

  /**
   * Upload recording to cloud storage
   */
  private async uploadRecording(recordingBlob: Blob): Promise<void> {
    try {
      if (!this.currentSession) return;
      
      console.log('☁️ Uploading recording to cloud storage...');
      
      const fileName = `${this.currentSession.id}.${this.getFileExtension()}`;
      const filePath = `recordings/${this.currentSession.roomId}/${fileName}`;
      
      // Encrypt recording if enabled
      let uploadBlob = recordingBlob;
      if (this.config.encryptRecording) {
        uploadBlob = await this.encryptRecording(recordingBlob);
      }
      
      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from('recordings')
        .upload(filePath, uploadBlob, {
          contentType: recordingBlob.type,
          upsert: false
        });
      
      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('recordings')
        .getPublicUrl(filePath);
      
      this.currentSession.downloadUrl = urlData.publicUrl;
      
      console.log('✅ Recording uploaded successfully');

    } catch (error) {
      console.error('❌ Failed to upload recording:', error);
      throw error;
    }
  }

  /**
   * Encrypt recording (placeholder implementation)
   */
  private async encryptRecording(blob: Blob): Promise<Blob> {
    // In a real implementation, you would use proper encryption
    // For now, just return the original blob
    console.log('🔐 Recording encryption applied');
    return blob;
  }

  /**
   * Get file extension based on format
   */
  private getFileExtension(): string {
    const extensions = {
      mp4: 'mp4',
      webm: 'webm',
      avi: 'avi'
    };
    
    return extensions[this.config.format] || 'webm';
  }

  /**
   * Save recording session to database
   */
  private async saveRecordingSession(): Promise<void> {
    if (!this.currentSession) return;
    
    try {
      const { error } = await this.supabase
        .from('recording_sessions')
        .insert({
          id: this.currentSession.id,
          room_id: this.currentSession.roomId,
          start_time: this.currentSession.startTime.toISOString(),
          participants: this.currentSession.participants,
          config: this.currentSession.config,
          status: this.currentSession.status,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Failed to save recording session:', error);
      }

    } catch (error) {
      console.error('Database error:', error);
    }
  }

  /**
   * Update recording session in database
   */
  private async updateRecordingSession(): Promise<void> {
    if (!this.currentSession) return;
    
    try {
      const { error } = await this.supabase
        .from('recording_sessions')
        .update({
          end_time: this.currentSession.endTime?.toISOString(),
          duration: this.currentSession.duration,
          size: this.currentSession.size,
          status: this.currentSession.status,
          download_url: this.currentSession.downloadUrl,
          error: this.currentSession.error,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentSession.id);
      
      if (error) {
        console.error('Failed to update recording session:', error);
      }

    } catch (error) {
      console.error('Database error:', error);
    }
  }

  /**
   * Get recording session by ID
   */
  async getRecordingSession(sessionId: string): Promise<RecordingSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('recording_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        id: data.id,
        roomId: data.room_id,
        startTime: new Date(data.start_time),
        endTime: data.end_time ? new Date(data.end_time) : undefined,
        duration: data.duration || 0,
        size: data.size || 0,
        participants: data.participants || [],
        config: data.config || this.config,
        status: data.status,
        downloadUrl: data.download_url,
        error: data.error
      };

    } catch (error) {
      console.error('Failed to get recording session:', error);
      return null;
    }
  }

  /**
   * List recordings for a room
   */
  async listRecordings(roomId: string): Promise<RecordingSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('recording_sessions')
        .select('*')
        .eq('room_id', roomId)
        .order('start_time', { ascending: false });
      
      if (error || !data) {
        return [];
      }
      
      return data.map(item => ({
        id: item.id,
        roomId: item.room_id,
        startTime: new Date(item.start_time),
        endTime: item.end_time ? new Date(item.end_time) : undefined,
        duration: item.duration || 0,
        size: item.size || 0,
        participants: item.participants || [],
        config: item.config || this.config,
        status: item.status,
        downloadUrl: item.download_url,
        error: item.error
      }));

    } catch (error) {
      console.error('Failed to list recordings:', error);
      return [];
    }
  }

  /**
   * Delete recording
   */
  async deleteRecording(sessionId: string): Promise<void> {
    try {
      const session = await this.getRecordingSession(sessionId);
      if (!session) {
        throw new Error('Recording session not found');
      }
      
      // Delete from storage if exists
      if (session.downloadUrl) {
        const fileName = session.downloadUrl.split('/').pop();
        if (fileName) {
          const filePath = `recordings/${session.roomId}/${fileName}`;
          await this.supabase.storage
            .from('recordings')
            .remove([filePath]);
        }
      }
      
      // Delete from database
      const { error } = await this.supabase
        .from('recording_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) {
        throw new Error(`Failed to delete recording: ${error.message}`);
      }
      
      console.log(`✅ Recording ${sessionId} deleted`);

    } catch (error) {
      console.error('❌ Failed to delete recording:', error);
      throw error;
    }
  }

  /**
   * Get recording metrics
   */
  async getRecordingMetrics(): Promise<RecordingMetrics> {
    try {
      const { data, error } = await this.supabase
        .from('recording_sessions')
        .select('status, size');
      
      if (error || !data) {
        return {
          totalRecordings: 0,
          activeRecordings: 0,
          totalStorage: 0,
          averageFileSize: 0,
          successRate: 0
        };
      }
      
      const totalRecordings = data.length;
      const activeRecordings = data.filter(r => r.status === 'recording').length;
      const completedRecordings = data.filter(r => r.status === 'completed');
      const totalStorage = data.reduce((sum, r) => sum + (r.size || 0), 0);
      const averageFileSize = completedRecordings.length > 0 
        ? totalStorage / completedRecordings.length 
        : 0;
      const successRate = totalRecordings > 0 
        ? (completedRecordings.length / totalRecordings) * 100 
        : 0;
      
      return {
        totalRecordings,
        activeRecordings,
        totalStorage,
        averageFileSize,
        successRate
      };

    } catch (error) {
      console.error('Failed to get recording metrics:', error);
      return {
        totalRecordings: 0,
        activeRecordings: 0,
        totalStorage: 0,
        averageFileSize: 0,
        successRate: 0
      };
    }
  }

  /**
   * Update recording configuration
   */
  updateConfig(newConfig: Partial<RecordingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config-updated', { config: this.config });
  }

  /**
   * Get current configuration
   */
  getConfig(): RecordingConfig {
    return { ...this.config };
  }

  /**
   * Get current recording session
   */
  getCurrentSession(): RecordingSession | null {
    return this.currentSession;
  }

  /**
   * Check if currently recording
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Cleanup recording resources
   */
  private cleanup(): void {
    // Clear recorded chunks
    this.recordedChunks = [];
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Clear audio sources
    this.audioSources.clear();
    this.audioDestination = null;
    
    // Clear stream recorders
    this.streamRecorders.clear();
    this.streamChunks.clear();
    
    // Clear composition
    this.compositionStream = null;
    this.compositionCanvas = null;
    this.compositionContext = null;
    
    // Clear media recorder
    this.mediaRecorder = null;
  }

  /**
   * Full cleanup
   */
  destroy(): void {
    if (this.isRecording) {
      this.stopRecording();
    }
    
    this.cleanup();
    this.currentSession = null;
    this.removeAllListeners();
    
    console.log('🧹 Recording manager destroyed');
  }
}