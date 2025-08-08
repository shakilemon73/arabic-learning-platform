/**
 * ScreenShareManager - Handles screen sharing functionality
 * Desktop capture, application sharing, and screen share controls
 */

import { EventEmitter } from './EventEmitter';

export interface ScreenShareOptions {
  preferredDisplaySurface?: 'monitor' | 'window' | 'browser';
  width?: number;
  height?: number;
  frameRate?: number;
  cursor?: 'always' | 'motion' | 'never';
  audio?: boolean;
}

export class ScreenShareManager extends EventEmitter {
  private screenStream: MediaStream | null = null;
  private isScreenSharing = false;
  private originalVideoTrack: MediaStreamTrack | null = null;

  constructor() {
    super();
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(options?: ScreenShareOptions): Promise<MediaStream | null> {
    try {
      if (this.isScreenSharing) {
        throw new Error('Screen sharing already active');
      }

      // Check browser support
      if (!navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Screen sharing not supported in this browser');
      }

      const constraints: DisplayMediaStreamConstraints = {
        video: {
          width: { ideal: options?.width || 1920 },
          height: { ideal: options?.height || 1080 },
          frameRate: { ideal: options?.frameRate || 30 },
          cursor: options?.cursor || 'always',
          displaySurface: options?.preferredDisplaySurface
        } as any,
        audio: options?.audio || false
      };

      // Get display media stream
      this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);

      // Listen for screen share end (when user clicks "Stop sharing")
      this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.handleScreenShareEnded();
      });

      this.isScreenSharing = true;
      this.emit('screen-share-started', { 
        stream: this.screenStream,
        hasAudio: this.screenStream.getAudioTracks().length > 0
      });

      return this.screenStream;

    } catch (error) {
      this.emit('error', { error: error.message });
      return null;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    try {
      if (!this.isScreenSharing || !this.screenStream) {
        return;
      }

      // Stop all screen share tracks
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
      this.isScreenSharing = false;

      this.emit('screen-share-stopped');

    } catch (error) {
      this.emit('error', { error: error.message });
    }
  }

  /**
   * Switch screen share source
   */
  async switchScreenShareSource(options?: ScreenShareOptions): Promise<MediaStream | null> {
    try {
      // Stop current screen share
      await this.stopScreenShare();
      
      // Start new screen share with different options
      return await this.startScreenShare(options);

    } catch (error) {
      this.emit('error', { error: error.message });
      return null;
    }
  }

  /**
   * Get available screen share sources (if supported by browser)
   */
  async getAvailableSources(): Promise<any[]> {
    try {
      // Note: This is a placeholder for future API support
      // Currently, browsers don't provide programmatic access to screen sources
      // Users select through browser's built-in picker
      return [];
    } catch (error) {
      this.emit('error', { error: error.message });
      return [];
    }
  }

  /**
   * Toggle screen share audio
   */
  async toggleScreenShareAudio(enabled?: boolean): Promise<boolean> {
    if (!this.screenStream) return false;

    const audioTracks = this.screenStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    const audioTrack = audioTracks[0];
    const isEnabled = enabled !== undefined ? enabled : !audioTrack.enabled;
    audioTrack.enabled = isEnabled;

    this.emit('screen-share-audio-toggled', { enabled: isEnabled });
    return isEnabled;
  }

  /**
   * Get screen sharing statistics
   */
  async getScreenShareStats(): Promise<any> {
    if (!this.screenStream) return null;

    const videoTrack = this.screenStream.getVideoTracks()[0];
    if (!videoTrack) return null;

    const settings = videoTrack.getSettings();
    const constraints = videoTrack.getConstraints();
    const capabilities = videoTrack.getCapabilities();

    return {
      settings,
      constraints,
      capabilities,
      isActive: this.isScreenSharing,
      hasAudio: this.screenStream.getAudioTracks().length > 0
    };
  }

  /**
   * Handle screen share ended (when user stops from browser UI)
   */
  private handleScreenShareEnded(): void {
    this.isScreenSharing = false;
    this.screenStream = null;
    this.emit('screen-share-ended-by-user');
  }

  /**
   * Check if screen sharing is active
   */
  isActive(): boolean {
    return this.isScreenSharing;
  }

  /**
   * Get current screen share stream
   */
  getCurrentStream(): MediaStream | null {
    return this.screenStream;
  }

  /**
   * Destroy screen share manager
   */
  destroy(): void {
    this.stopScreenShare();
    this.removeAllListeners();
  }
}