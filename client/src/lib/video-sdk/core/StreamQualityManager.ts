/**
 * StreamQualityManager - Handles adaptive streaming and quality management
 * Bandwidth detection, quality adjustment, and performance optimization
 */

import { EventEmitter } from './EventEmitter';

export interface StreamQuality {
  resolution: '4K' | '1080p' | '720p' | '480p' | '360p';
  frameRate: 60 | 30 | 15;
  bitrate: number;
  adaptiveStreaming: boolean;
}

export interface QualityProfile {
  name: string;
  video: {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
  };
  audio: {
    bitrate: number;
    sampleRate: number;
  };
  minBandwidth: number; // kbps
}

export interface NetworkStats {
  bandwidth: number; // kbps
  latency: number; // ms
  packetLoss: number; // percentage
  jitter: number; // ms
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface AdaptiveSettings {
  enabled: boolean;
  aggressiveness: 'conservative' | 'balanced' | 'aggressive';
  minQuality: string;
  maxQuality: string;
  bandwidthThreshold: number; // kbps
}

export class StreamQualityManager extends EventEmitter {
  private currentQuality: StreamQuality;
  private adaptiveSettings: AdaptiveSettings;
  private qualityProfiles: Map<string, QualityProfile>;
  private networkStats: NetworkStats;
  private bandwidthMonitor: NodeJS.Timeout | null = null;
  private qualityHistory: Array<{ timestamp: number; quality: string; reason: string }> = [];
  private isMonitoring = false;

  constructor() {
    super();
    
    this.currentQuality = {
      resolution: '720p',
      frameRate: 30,
      bitrate: 2500,
      adaptiveStreaming: true
    };

    this.adaptiveSettings = {
      enabled: true,
      aggressiveness: 'balanced',
      minQuality: '360p',
      maxQuality: '1080p',
      bandwidthThreshold: 500 // kbps
    };

    this.networkStats = {
      bandwidth: 0,
      latency: 0,
      packetLoss: 0,
      jitter: 0,
      quality: 'good'
    };

    this.initializeQualityProfiles();
  }

  /**
   * Initialize quality profiles
   */
  private initializeQualityProfiles(): void {
    this.qualityProfiles = new Map([
      ['4K', {
        name: '4K Ultra HD',
        video: { width: 3840, height: 2160, frameRate: 30, bitrate: 8000 },
        audio: { bitrate: 256, sampleRate: 48000 },
        minBandwidth: 9000
      }],
      ['1080p', {
        name: 'Full HD',
        video: { width: 1920, height: 1080, frameRate: 30, bitrate: 4000 },
        audio: { bitrate: 192, sampleRate: 48000 },
        minBandwidth: 5000
      }],
      ['720p', {
        name: 'HD',
        video: { width: 1280, height: 720, frameRate: 30, bitrate: 2500 },
        audio: { bitrate: 128, sampleRate: 44100 },
        minBandwidth: 3000
      }],
      ['480p', {
        name: 'SD',
        video: { width: 854, height: 480, frameRate: 30, bitrate: 1000 },
        audio: { bitrate: 96, sampleRate: 44100 },
        minBandwidth: 1500
      }],
      ['360p', {
        name: 'Low',
        video: { width: 640, height: 360, frameRate: 30, bitrate: 600 },
        audio: { bitrate: 64, sampleRate: 22050 },
        minBandwidth: 800
      }]
    ]);
  }

  /**
   * Start quality monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // Monitor bandwidth and network conditions every 5 seconds
    this.bandwidthMonitor = setInterval(() => {
      this.measureNetworkStats();
    }, 5000);

    this.emit('monitoring-started');
  }

  /**
   * Stop quality monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    if (this.bandwidthMonitor) {
      clearInterval(this.bandwidthMonitor);
      this.bandwidthMonitor = null;
    }

    this.emit('monitoring-stopped');
  }

  /**
   * Set stream quality manually
   */
  async setQuality(quality: StreamQuality): Promise<void> {
    try {
      const profile = this.qualityProfiles.get(quality.resolution);
      if (!profile) {
        throw new Error(`Quality profile ${quality.resolution} not found`);
      }

      const previousQuality = this.currentQuality.resolution;
      this.currentQuality = quality;

      // Update quality history
      this.addQualityHistory(quality.resolution, 'manual');

      this.emit('quality-changed', {
        newQuality: quality,
        previousQuality,
        reason: 'manual',
        profile
      });

    } catch (error) {
      this.emit('error', { error: error.message });
      throw error;
    }
  }

  /**
   * Enable/disable adaptive streaming
   */
  setAdaptiveStreaming(enabled: boolean, settings?: Partial<AdaptiveSettings>): void {
    this.adaptiveSettings = {
      ...this.adaptiveSettings,
      enabled,
      ...settings
    };

    this.currentQuality.adaptiveStreaming = enabled;

    this.emit('adaptive-streaming-changed', {
      enabled,
      settings: this.adaptiveSettings
    });

    if (enabled && !this.isMonitoring) {
      this.startMonitoring();
    }
  }

  /**
   * Measure network statistics
   */
  private async measureNetworkStats(): Promise<void> {
    try {
      // Estimate bandwidth using performance API and connection info
      const bandwidth = await this.estimateBandwidth();
      const latency = await this.measureLatency();
      
      this.networkStats = {
        bandwidth,
        latency,
        packetLoss: this.estimatePacketLoss(),
        jitter: this.estimateJitter(),
        quality: this.calculateNetworkQuality(bandwidth, latency)
      };

      this.emit('network-stats-updated', this.networkStats);

      // Auto-adjust quality if adaptive streaming is enabled
      if (this.adaptiveSettings.enabled) {
        await this.autoAdjustQuality();
      }

    } catch (error) {
      this.emit('error', { error: error.message });
    }
  }

  /**
   * Estimate bandwidth
   */
  private async estimateBandwidth(): Promise<number> {
    // Use Connection API if available
    const connection = (navigator as any).connection;
    if (connection && connection.downlink) {
      return connection.downlink * 1000; // Convert Mbps to kbps
    }

    // Fallback: Simple download test
    try {
      const startTime = performance.now();
      const response = await fetch('data:text/plain,test', { cache: 'no-store' });
      await response.text();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      const bytes = new Blob(['test']).size;
      const kbps = (bytes * 8) / (duration / 1000) / 1024;
      
      return Math.max(kbps, 100); // Minimum 100 kbps
    } catch (error) {
      return 1000; // Default fallback
    }
  }

  /**
   * Measure latency
   */
  private async measureLatency(): Promise<number> {
    try {
      const startTime = performance.now();
      await fetch('data:text/plain,ping', { cache: 'no-store' });
      const endTime = performance.now();
      
      return endTime - startTime;
    } catch (error) {
      return 100; // Default fallback
    }
  }

  /**
   * Estimate packet loss (simplified)
   */
  private estimatePacketLoss(): number {
    // This is a simplified estimation
    // In real implementation, you'd get this from WebRTC stats
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      switch (effectiveType) {
        case 'slow-2g': return 5;
        case '2g': return 3;
        case '3g': return 1;
        case '4g': return 0.1;
        default: return 0.5;
      }
    }
    return 0.5; // Default
  }

  /**
   * Estimate jitter (simplified)
   */
  private estimateJitter(): number {
    // Simplified jitter estimation
    return this.networkStats.latency * 0.1;
  }

  /**
   * Calculate network quality
   */
  private calculateNetworkQuality(bandwidth: number, latency: number): NetworkStats['quality'] {
    if (bandwidth > 5000 && latency < 50) return 'excellent';
    if (bandwidth > 2000 && latency < 100) return 'good';
    if (bandwidth > 1000 && latency < 200) return 'fair';
    return 'poor';
  }

  /**
   * Auto-adjust quality based on network conditions
   */
  private async autoAdjustQuality(): Promise<void> {
    const { bandwidth, quality: networkQuality } = this.networkStats;
    const currentProfile = this.qualityProfiles.get(this.currentQuality.resolution);
    
    if (!currentProfile) return;

    let targetQuality: string | null = null;
    let reason = '';

    // Determine if we need to upgrade or downgrade
    const availableBandwidth = bandwidth * 0.8; // Use 80% of available bandwidth

    if (availableBandwidth < currentProfile.minBandwidth) {
      // Need to downgrade
      targetQuality = this.findSuitableQuality(availableBandwidth, 'down');
      reason = 'insufficient_bandwidth';
    } else if (networkQuality === 'excellent' && availableBandwidth > currentProfile.minBandwidth * 1.5) {
      // Can potentially upgrade
      targetQuality = this.findSuitableQuality(availableBandwidth, 'up');
      reason = 'improved_conditions';
    }

    if (targetQuality && targetQuality !== this.currentQuality.resolution) {
      // Apply quality change with rate limiting
      if (this.shouldChangeQuality(targetQuality)) {
        await this.setQuality({
          ...this.currentQuality,
          resolution: targetQuality as StreamQuality['resolution']
        });

        this.addQualityHistory(targetQuality, `adaptive_${reason}`);
      }
    }
  }

  /**
   * Find suitable quality based on available bandwidth
   */
  private findSuitableQuality(availableBandwidth: number, direction: 'up' | 'down'): string | null {
    const qualities = ['360p', '480p', '720p', '1080p', '4K'];
    const currentIndex = qualities.indexOf(this.currentQuality.resolution);

    if (direction === 'down') {
      // Look for lower quality that fits bandwidth
      for (let i = currentIndex - 1; i >= 0; i--) {
        const quality = qualities[i];
        const profile = this.qualityProfiles.get(quality);
        if (profile && profile.minBandwidth <= availableBandwidth) {
          // Check if it's within allowed range
          if (this.isQualityAllowed(quality)) {
            return quality;
          }
        }
      }
    } else {
      // Look for higher quality that fits bandwidth
      for (let i = currentIndex + 1; i < qualities.length; i++) {
        const quality = qualities[i];
        const profile = this.qualityProfiles.get(quality);
        if (profile && profile.minBandwidth <= availableBandwidth) {
          // Check if it's within allowed range
          if (this.isQualityAllowed(quality)) {
            return quality;
          }
        }
      }
    }

    return null;
  }

  /**
   * Check if quality change should be applied (rate limiting)
   */
  private shouldChangeQuality(targetQuality: string): boolean {
    const now = Date.now();
    const recentChanges = this.qualityHistory.filter(h => now - h.timestamp < 30000); // Last 30 seconds

    // Prevent too frequent changes
    if (recentChanges.length >= 3) {
      return false;
    }

    // Apply aggressiveness settings
    const timeSinceLastChange = recentChanges.length > 0 
      ? now - recentChanges[recentChanges.length - 1].timestamp 
      : Infinity;

    const minInterval = this.getMinChangeInterval();
    return timeSinceLastChange >= minInterval;
  }

  /**
   * Get minimum interval between quality changes
   */
  private getMinChangeInterval(): number {
    switch (this.adaptiveSettings.aggressiveness) {
      case 'conservative': return 60000; // 1 minute
      case 'balanced': return 30000; // 30 seconds
      case 'aggressive': return 10000; // 10 seconds
      default: return 30000;
    }
  }

  /**
   * Check if quality is within allowed range
   */
  private isQualityAllowed(quality: string): boolean {
    const qualities = ['360p', '480p', '720p', '1080p', '4K'];
    const minIndex = qualities.indexOf(this.adaptiveSettings.minQuality);
    const maxIndex = qualities.indexOf(this.adaptiveSettings.maxQuality);
    const targetIndex = qualities.indexOf(quality);

    return targetIndex >= minIndex && targetIndex <= maxIndex;
  }

  /**
   * Add entry to quality history
   */
  private addQualityHistory(quality: string, reason: string): void {
    this.qualityHistory.push({
      timestamp: Date.now(),
      quality,
      reason
    });

    // Keep only last 50 entries
    if (this.qualityHistory.length > 50) {
      this.qualityHistory.shift();
    }
  }

  /**
   * Get current quality
   */
  getCurrentQuality(): StreamQuality {
    return { ...this.currentQuality };
  }

  /**
   * Get available quality profiles
   */
  getQualityProfiles(): QualityProfile[] {
    return Array.from(this.qualityProfiles.values());
  }

  /**
   * Get network statistics
   */
  getNetworkStats(): NetworkStats {
    return { ...this.networkStats };
  }

  /**
   * Get quality history
   */
  getQualityHistory(): Array<{ timestamp: number; quality: string; reason: string }> {
    return [...this.qualityHistory];
  }

  /**
   * Get recommended quality for current network conditions
   */
  getRecommendedQuality(): string {
    const availableBandwidth = this.networkStats.bandwidth * 0.8;
    return this.findSuitableQuality(availableBandwidth, 'down') || '360p';
  }

  /**
   * Force quality recalculation
   */
  async recalculateQuality(): Promise<void> {
    await this.measureNetworkStats();
    
    if (this.adaptiveSettings.enabled) {
      await this.autoAdjustQuality();
    }
  }

  /**
   * Export quality settings
   */
  exportSettings(): any {
    return {
      currentQuality: this.currentQuality,
      adaptiveSettings: this.adaptiveSettings,
      networkStats: this.networkStats,
      qualityHistory: this.qualityHistory
    };
  }

  /**
   * Import quality settings
   */
  importSettings(settings: any): void {
    if (settings.currentQuality) {
      this.currentQuality = settings.currentQuality;
    }
    if (settings.adaptiveSettings) {
      this.adaptiveSettings = settings.adaptiveSettings;
    }
    
    this.emit('settings-imported', settings);
  }

  /**
   * Destroy stream quality manager
   */
  destroy(): void {
    this.stopMonitoring();
    this.qualityHistory = [];
    this.removeAllListeners();
  }
}