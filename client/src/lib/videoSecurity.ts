// Video SDK Security Manager for Arabic Learning Platform
import { securityManager } from './security';

export class VideoSDKSecurityManager {
  private static instance: VideoSDKSecurityManager;
  private activeConnections = new Map<string, { timestamp: number; userId: string }>();
  private maxConnectionsPerUser = 3;
  private connectionTimeout = 300000; // 5 minutes

  static getInstance(): VideoSDKSecurityManager {
    if (!VideoSDKSecurityManager.instance) {
      VideoSDKSecurityManager.instance = new VideoSDKSecurityManager();
    }
    return VideoSDKSecurityManager.instance;
  }

  // Validate WebRTC connection attempt
  validateConnectionAttempt(userId: string, roomId: string): { allowed: boolean; reason?: string } {
    // Rate limiting for connections
    const connectionKey = `video_connection:${userId}`;
    if (!securityManager.checkRateLimit(connectionKey, 3, 60000)) { // 3 connections per minute
      return { allowed: false, reason: 'Too many connection attempts. Please wait.' };
    }

    // Check maximum concurrent connections per user
    let userConnections = 0;
    const now = Date.now();
    
    for (const [connectionId, connection] of this.activeConnections) {
      // Clean up expired connections
      if (now - connection.timestamp > this.connectionTimeout) {
        this.activeConnections.delete(connectionId);
        continue;
      }
      
      if (connection.userId === userId) {
        userConnections++;
      }
    }

    if (userConnections >= this.maxConnectionsPerUser) {
      return { allowed: false, reason: 'Maximum connections per user exceeded.' };
    }

    // Validate room ID format
    if (!this.isValidRoomId(roomId)) {
      return { allowed: false, reason: 'Invalid room identifier.' };
    }

    return { allowed: true };
  }

  // Register new connection
  registerConnection(connectionId: string, userId: string): void {
    this.activeConnections.set(connectionId, {
      timestamp: Date.now(),
      userId: userId
    });

    securityManager.logSecurityEvent('video_connection_established', {
      connectionId,
      userId,
      totalConnections: this.activeConnections.size
    });
  }

  // Unregister connection
  unregisterConnection(connectionId: string): void {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      this.activeConnections.delete(connectionId);
      securityManager.logSecurityEvent('video_connection_closed', {
        connectionId,
        userId: connection.userId,
        duration: Date.now() - connection.timestamp
      });
    }
  }

  // Validate room ID format
  private isValidRoomId(roomId: string): boolean {
    if (!roomId || typeof roomId !== 'string') return false;
    
    // Allow alphanumeric, hyphens, and underscores, reasonable length
    const validFormat = /^[a-zA-Z0-9_-]{1,100}$/.test(roomId);
    return validFormat;
  }

  // Sanitize user display name
  sanitizeDisplayName(name: string): string {
    if (!name) return 'Anonymous User';
    
    return securityManager.sanitizeInput(name)
      .replace(/[^\p{L}\p{N}\s\-_]/gu, '') // Keep letters, numbers, spaces, hyphens, underscores
      .trim()
      .slice(0, 50) || 'Anonymous User';
  }

  // Validate media constraints
  validateMediaConstraints(constraints: any): { valid: boolean; sanitized?: any; error?: string } {
    try {
      const sanitized: any = {};

      if (constraints.video) {
        sanitized.video = {
          width: Math.min(constraints.video.width || 1280, 1920),
          height: Math.min(constraints.video.height || 720, 1080),
          frameRate: Math.min(constraints.video.frameRate || 30, 60),
          facingMode: ['user', 'environment'].includes(constraints.video.facingMode) 
            ? constraints.video.facingMode : 'user'
        };
      }

      if (constraints.audio) {
        sanitized.audio = {
          echoCancellation: Boolean(constraints.audio.echoCancellation),
          noiseSuppression: Boolean(constraints.audio.noiseSuppression),
          autoGainControl: Boolean(constraints.audio.autoGainControl)
        };
      }

      return { valid: true, sanitized };
    } catch (error) {
      return { valid: false, error: 'Invalid media constraints format' };
    }
  }

  // Get secure RTCConfiguration
  getSecureRTCConfiguration(): RTCConfiguration {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all'
    };
  }

  // Monitor connection quality and detect suspicious activity
  monitorConnectionQuality(connectionId: string, stats: any): void {
    if (!stats) return;

    const connection = this.activeConnections.get(connectionId);
    if (!connection) return;

    // Detect potential abuse patterns
    if (stats.packetsLost > 50) { // High packet loss might indicate network issues or DoS
      securityManager.logSecurityEvent('high_packet_loss_detected', {
        connectionId,
        userId: connection.userId,
        packetsLost: stats.packetsLost
      });
    }

    if (stats.bytesReceived > 100 * 1024 * 1024) { // > 100MB received, might indicate data abuse
      securityManager.logSecurityEvent('high_bandwidth_usage', {
        connectionId,
        userId: connection.userId,
        bytesReceived: stats.bytesReceived
      });
    }
  }

  // Clean up expired connections
  cleanupExpiredConnections(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [connectionId, connection] of this.activeConnections) {
      if (now - connection.timestamp > this.connectionTimeout) {
        expired.push(connectionId);
      }
    }

    expired.forEach(connectionId => this.unregisterConnection(connectionId));
  }

  // Get connection statistics
  getConnectionStats(): {
    totalConnections: number;
    activeUsers: number;
    avgConnectionDuration: number;
  } {
    const now = Date.now();
    const userIds = new Set<string>();
    let totalDuration = 0;
    let activeConnections = 0;

    for (const [, connection] of this.activeConnections) {
      if (now - connection.timestamp <= this.connectionTimeout) {
        userIds.add(connection.userId);
        totalDuration += now - connection.timestamp;
        activeConnections++;
      }
    }

    return {
      totalConnections: activeConnections,
      activeUsers: userIds.size,
      avgConnectionDuration: activeConnections > 0 ? totalDuration / activeConnections : 0
    };
  }
}

export const videoSecurityManager = VideoSDKSecurityManager.getInstance();