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
      // Request permission to enumerate devices
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      // Get available devices
      await this.updateAvailableDevices();
      
      // Listen for device changes
      navigator.mediaDevices.addEventListener('devicechange', this.handleDeviceChange.bind(this));
      
      this.emit('initialized');
    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Get user media with specified constraints
   */
  async getUserMedia(constraints?: MediaConstraints): Promise<MediaStream> {
    try {
      const mediaConstraints: MediaStreamConstraints = {
        video: constraints?.video ? {
          width: { ideal: constraints.video.width || 1280 },
          height: { ideal: constraints.video.height || 720 },
          frameRate: { ideal: constraints.video.frameRate || 30 },
          facingMode: constraints.video.facingMode || 'user',
          deviceId: this.selectedDevices.camera ? { exact: this.selectedDevices.camera } : undefined
        } : true,
        audio: constraints?.audio ? {
          echoCancellation: constraints.audio.echoCancellation !== false,
          noiseSuppression: constraints.audio.noiseSuppression !== false,
          autoGainControl: constraints.audio.autoGainControl !== false,
          deviceId: this.selectedDevices.microphone ? { exact: this.selectedDevices.microphone } : undefined
        } : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      this.currentStream = stream;
      
      this.emit('stream-acquired', { stream });
      return stream;
    } catch (error) {
      this.emit('error', { error: error.message });
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
   * Switch camera device
   */
  async switchCamera(deviceId: string): Promise<MediaStream | null> {
    try {
      this.selectedDevices.camera = deviceId;
      
      if (this.currentStream) {
        // Stop current video track
        const videoTrack = this.currentStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          this.currentStream.removeTrack(videoTrack);
        }

        // Get new video track with selected device
        const newVideoStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } }
        });
        
        const newVideoTrack = newVideoStream.getVideoTracks()[0];
        this.currentStream.addTrack(newVideoTrack);

        this.emit('camera-switched', { deviceId, stream: this.currentStream });
        return this.currentStream;
      }
      
      return null;
    } catch (error) {
      this.emit('error', { error: error.message });
      return null;
    }
  }

  /**
   * Switch microphone device
   */
  async switchMicrophone(deviceId: string): Promise<MediaStream | null> {
    try {
      this.selectedDevices.microphone = deviceId;
      
      if (this.currentStream) {
        // Stop current audio track
        const audioTrack = this.currentStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.stop();
          this.currentStream.removeTrack(audioTrack);
        }

        // Get new audio track with selected device
        const newAudioStream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: deviceId } }
        });
        
        const newAudioTrack = newAudioStream.getAudioTracks()[0];
        this.currentStream.addTrack(newAudioTrack);

        this.emit('microphone-switched', { deviceId, stream: this.currentStream });
        return this.currentStream;
      }
      
      return null;
    } catch (error) {
      this.emit('error', { error: error.message });
      return null;
    }
  }

  /**
   * Get available media devices
   */
  getAvailableDevices(): MediaDevice[] {
    return this.availableDevices;
  }

  /**
   * Get cameras
   */
  getCameras(): MediaDevice[] {
    return this.availableDevices.filter(device => device.kind === 'videoinput');
  }

  /**
   * Get microphones
   */
  getMicrophones(): MediaDevice[] {
    return this.availableDevices.filter(device => device.kind === 'audioinput');
  }

  /**
   * Get speakers
   */
  getSpeakers(): MediaDevice[] {
    return this.availableDevices.filter(device => device.kind === 'audiooutput');
  }

  /**
   * Set speaker device (for audio output)
   */
  async setSpeaker(deviceId: string, audioElement?: HTMLAudioElement): Promise<void> {
    try {
      this.selectedDevices.speaker = deviceId;
      
      if (audioElement && 'setSinkId' in audioElement) {
        await (audioElement as any).setSinkId(deviceId);
        this.emit('speaker-switched', { deviceId });
      }
    } catch (error) {
      this.emit('error', { error: error.message });
    }
  }

  /**
   * Update available devices list
   */
  private async updateAvailableDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices.map(device => ({
        deviceId: device.deviceId,
        label: device.label || `${device.kind} (${device.deviceId.slice(0, 8)})`,
        kind: device.kind as 'videoinput' | 'audioinput' | 'audiooutput'
      }));

      this.emit('devices-updated', { devices: this.availableDevices });
    } catch (error) {
      this.emit('error', { error: error.message });
    }
  }

  /**
   * Handle device change events
   */
  private async handleDeviceChange(): Promise<void> {
    await this.updateAvailableDevices();
    this.emit('device-change', { devices: this.availableDevices });
  }

  /**
   * Stop all media tracks
   */
  stopAllTracks(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
  }

  /**
   * Cleanup media manager
   */
  destroy(): void {
    this.stopAllTracks();
    navigator.mediaDevices.removeEventListener('devicechange', this.handleDeviceChange.bind(this));
    this.removeAllListeners();
  }
}