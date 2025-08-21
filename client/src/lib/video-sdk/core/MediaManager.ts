/**
 * MediaManager - Handles all media device operations
 * Camera, microphone, screen sharing, and media stream management
 */

import { EventEmitter } from './EventEmitter';

export interface MediaConstraints {
  video?: {
    width?: number;
    height?: number;
    frameRate?: number;
    facingMode?: 'user' | 'environment';
  };
  audio?: {
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
  };
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput' | 'audioinput' | 'audiooutput';
}

export class MediaManager extends EventEmitter {
  private config: any;
  private currentStream: MediaStream | null = null;
  private availableDevices: MediaDevice[] = [];
  private selectedDevices: {
    camera?: string;
    microphone?: string;
    speaker?: string;
  } = {};

  constructor(config: any) {
    super();
    this.config = config;
  }

  /**
   * Initialize media manager and get available devices
   */
  async initialize(): Promise<void> {
    try {
      // Get available devices first (may not have labels without permission)
      await this.updateAvailableDevices();
      
      // Listen for device changes
      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange.bind(this));
      
      this.emit('initialized');
      console.log('✅ MediaManager initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ MediaManager initialization failed:', errorMessage);
      this.emit('error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Get user media with specified constraints
   */
  async getUserMedia(constraints?: MediaConstraints): Promise<MediaStream> {
    try {
      // Start with simple constraints and fallback to basic if specific devices fail
      let mediaConstraints: MediaStreamConstraints = {
        video: constraints?.video ? {
          width: { ideal: constraints.video.width || 1280 },
          height: { ideal: constraints.video.height || 720 },
          frameRate: { ideal: constraints.video.frameRate || 30 },
          facingMode: constraints.video.facingMode || 'user'
          // Don't specify deviceId initially to avoid "device not found" errors
        } : true,
        audio: constraints?.audio ? {
          echoCancellation: constraints.audio.echoCancellation !== false,
          noiseSuppression: constraints.audio.noiseSuppression !== false,
          autoGainControl: constraints.audio.autoGainControl !== false
          // Don't specify deviceId initially to avoid "device not found" errors
        } : true
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        this.currentStream = stream;
        this.emit('stream-acquired', { stream });
        return stream;
      } catch (firstError) {
        // Fallback to basic constraints if advanced settings fail
        console.log('🔄 Falling back to basic media constraints...');
        const basicConstraints: MediaStreamConstraints = {
          video: true,
          audio: true
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
        this.currentStream = stream;
        this.emit('stream-acquired', { stream });
        return stream;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('❌ Failed to get user media:', errorMessage);
      this.emit('error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Toggle video track on/off
   */
  async toggleVideo(stream: MediaStream | null, enabled?: boolean): Promise<boolean> {
    if (!stream) return false;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return false;

    const isEnabled = enabled !== undefined ? enabled : !videoTrack.enabled;
    videoTrack.enabled = isEnabled;

    this.emit('video-toggled', { enabled: isEnabled });
    return isEnabled;
  }

  /**
   * Toggle audio track on/off
   */
  async toggleAudio(stream: MediaStream | null, enabled?: boolean): Promise<boolean> {
    if (!stream) return false;

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return false;

    const isEnabled = enabled !== undefined ? enabled : !audioTrack.enabled;
    audioTrack.enabled = isEnabled;

    this.emit('audio-toggled', { enabled: isEnabled });
    return isEnabled;
  }

  /**
   * Get screen share stream
   */
  async getScreenShare(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      this.emit('screen-share-acquired', { stream });
      return stream;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Screen share denied';
      this.emit('error', { error: errorMessage });
      throw error;
    }
  }

  /**
   * Update available devices
   */
  private async updateAvailableDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices
        .filter(device => device.kind !== 'audiooutput' || device.deviceId !== 'default')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `${device.kind} ${device.deviceId.slice(0, 8)}`,
          kind: device.kind as 'videoinput' | 'audioinput' | 'audiooutput'
        }));

      this.emit('devices-updated', { devices: this.availableDevices });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to enumerate devices';
      this.emit('error', { error: errorMessage });
    }
  }

  /**
   * Handle device change event
   */
  private handleDeviceChange(): void {
    this.updateAvailableDevices();
  }

  /**
   * Set selected devices
   */
  setSelectedDevices(devices: { camera?: string; microphone?: string; speaker?: string }): void {
    this.selectedDevices = { ...this.selectedDevices, ...devices };
    this.emit('devices-selected', { devices: this.selectedDevices });
  }

  /**
   * Get available devices
   */
  getAvailableDevices(): MediaDevice[] {
    return [...this.availableDevices];
  }

  /**
   * Get current stream
   */
  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  /**
   * Stop current stream
   */
  stopCurrentStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
      this.emit('stream-stopped');
    }
  }

  /**
   * Cleanup media manager
   */
  cleanup(): void {
    this.stopCurrentStream();
    navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange);
    this.removeAllListeners();
  }
}