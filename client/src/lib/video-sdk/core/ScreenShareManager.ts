/**
 * ScreenShareManager - Handle screen sharing functionality
 */

import { EventEmitter } from './EventEmitter';

export class ScreenShareManager extends EventEmitter {
  private screenStream: MediaStream | null = null;
  private isSharing = false;

  constructor() {
    super();
  }

  async startScreenShare(): Promise<MediaStream | null> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      this.isSharing = true;
      this.emit('screen-share-started', { stream: this.screenStream });
      
      // Handle screen share ending
      this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
        this.stopScreenShare();
      });

      return this.screenStream;
    } catch (error) {
      this.emit('error', { error: 'Screen share permission denied' });
      return null;
    }
  }

  async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    
    this.isSharing = false;
    this.emit('screen-share-stopped');
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  isScreenSharing(): boolean {
    return this.isSharing;
  }

  cleanup(): void {
    this.stopScreenShare();
    this.removeAllListeners();
  }
}