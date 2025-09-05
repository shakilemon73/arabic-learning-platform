/**
 * MediaManager - Production-grade media device operations
 * Camera, microphone, screen sharing, and media stream management
 * Enhanced with device optimization and robust error handling
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
   * Get user media with production-grade constraints and fallback
   */
  async getUserMedia(constraints?: MediaConstraints): Promise<MediaStream> {
    try {
      console.log('🎥 Getting user media with constraints:', constraints);

      // Check browser support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }

      // Import DeviceManager for optimal constraints
      const { DeviceManager } = await import('@/lib/deviceManager');
      const deviceManager = DeviceManager.getInstance();

      // Check browser and device support
      if (!deviceManager.checkBrowserSupport()) {
        throw new Error('WebRTC not supported in this browser');
      }

      // Test device access first
      const deviceTest = await deviceManager.testDeviceAccess();
      if (!deviceTest.video && !deviceTest.audio) {
        throw new Error(deviceTest.error || 'No video or audio devices found');
      }

      // Get optimal constraints based on actual device capabilities
      const optimalConstraints = await deviceManager.getOptimalConstraints();
      console.log('📱 Using optimal constraints:', optimalConstraints);

      let stream: MediaStream | null = null;
      let lastError: Error | null = null;

      // Try constraints in order of preference (best to fallback)
      for (const constraint of optimalConstraints) {
        try {
          console.log('🔄 Trying constraint:', constraint);
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          
          // Verify stream has tracks
          if (stream.getTracks().length === 0) {
            stream.getTracks().forEach(track => track.stop());
            throw new Error('No tracks in stream');
          }

          console.log('✅ Stream acquired with tracks:', {
            video: stream.getVideoTracks().length,
            audio: stream.getAudioTracks().length
          });
          break;

        } catch (error) {
          console.warn('⚠️ Failed with constraint, trying next:', error);
          lastError = error as Error;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
          }
        }
      }

      // If no constraints worked, throw the last error
      if (!stream) {
        throw lastError || new Error('All media constraints failed');
      }

      // Store stream and set up event listeners
      this.currentStream = stream;
      this.setupStreamEventListeners(stream);

      // Emit success event
      this.emit('stream-acquired', { 
        stream, 
        quality: this.analyzeStreamQuality(stream),
        devices: {
          video: deviceTest.video,
          audio: deviceTest.audio
        }
      });

      return stream;

    } catch (error) {
      const errorMessage = this.getMediaErrorMessage(error as Error);
      console.error('❌ Failed to get user media:', errorMessage);
      this.emit('error', { error: errorMessage, originalError: error });
      throw new Error(errorMessage);
    }
  }

  /**
   * Setup stream event listeners for proper cleanup
   */
  private setupStreamEventListeners(stream: MediaStream): void {
    stream.getTracks().forEach(track => {
      track.addEventListener('ended', () => {
        console.log(`📡 Track ended: ${track.kind}`);
        this.emit('track-ended', { kind: track.kind, track });
        
        if (track.kind === 'video') {
          this.emit('video-track-ended');
        } else if (track.kind === 'audio') {
          this.emit('audio-track-ended');
        }
      });

      track.addEventListener('mute', () => {
        console.log(`🔇 Track muted: ${track.kind}`);
        this.emit('track-muted', { kind: track.kind, track });
      });

      track.addEventListener('unmute', () => {
        console.log(`🔊 Track unmuted: ${track.kind}`);
        this.emit('track-unmuted', { kind: track.kind, track });
      });
    });
  }

  /**
   * Analyze stream quality and capabilities
   */
  private analyzeStreamQuality(stream: MediaStream): any {
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];

    const quality: any = {
      video: null,
      audio: null
    };

    if (videoTrack) {
      const settings = videoTrack.getSettings();
      quality.video = {
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
        aspectRatio: settings.aspectRatio,
        facingMode: settings.facingMode,
        deviceId: settings.deviceId
      };
    }

    if (audioTrack) {
      const settings = audioTrack.getSettings();
      quality.audio = {
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl,
        deviceId: settings.deviceId
      };
    }

    return quality;
  }

  /**
   * Get user-friendly error message for media errors
   */
  private getMediaErrorMessage(error: Error): string {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Camera/microphone access denied. Please allow permissions and refresh.';
      case 'NotFoundError':
        return 'No camera or microphone found. Please connect devices and try again.';
      case 'NotReadableError':
        return 'Camera or microphone is already in use by another application.';
      case 'OverconstrainedError':
        return 'Camera/microphone settings not supported by your device.';
      case 'SecurityError':
        return 'Media access blocked due to security restrictions.';
      case 'AbortError':
        return 'Media access was interrupted.';
      default:
        return error.message || 'Failed to access camera/microphone.';
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