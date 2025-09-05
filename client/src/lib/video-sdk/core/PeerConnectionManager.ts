/**
 * PeerConnectionManager - Real WebRTC Implementation
 * Handles actual peer-to-peer video/audio connections like Zoom/Google Meet
 */

import { EventEmitter } from './EventEmitter';

export interface StreamQuality {
  resolution: '4K' | '1080p' | '720p' | '480p' | '360p';
  frameRate: 60 | 30 | 15;
  bitrate: number;
  adaptiveStreaming: boolean;
}

export interface ConnectionStats {
  participantId: string;
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  jitter: number;
  rtt: number;
  quality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

export class PeerConnectionManager extends EventEmitter {
  private config: any;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidate[]> = new Map();
  private localStream: MediaStream | null = null;
  private statsInterval: NodeJS.Timeout | null = null;
  private rtcConfiguration: RTCConfiguration;

  // Production enhancements
  private connectionAttempts: Map<string, number> = new Map();
  private maxConnectionAttempts = 3;
  private connectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private connectionTimeout = 30000; // 30 seconds
  private lastStatsUpdate: Map<string, number> = new Map();
  private performanceMetrics = {
    totalConnections: 0,
    successfulConnections: 0,
    failedConnections: 0,
    averageConnectionTime: 0,
    dataChannelMessages: 0
  };

  constructor(config: any) {
    super();
    this.config = config;

    // Configure RTCPeerConnection for real WebRTC
    this.rtcConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };

    // Start connection quality monitoring
    this.startStatsMonitoring();
  }

  /**
   * Create production-grade WebRTC peer connection
   */
  async createPeerConnection(participantId: string, localStream?: MediaStream): Promise<RTCPeerConnection> {
    try {
      console.log(`🔗 Creating peer connection for ${participantId}...`);
      
      // Validate inputs
      if (!participantId) {
        throw new Error('Participant ID is required');
      }

      if (this.peerConnections.has(participantId)) {
        console.warn(`⚠️ Peer connection already exists for ${participantId}, closing existing one`);
        this.closePeerConnection(participantId);
      }

      // Track connection attempt
      const attempts = this.connectionAttempts.get(participantId) || 0;
      if (attempts >= this.maxConnectionAttempts) {
        throw new Error(`Max connection attempts (${this.maxConnectionAttempts}) exceeded for ${participantId}`);
      }
      this.connectionAttempts.set(participantId, attempts + 1);

      // Enhanced RTCPeerConnection configuration for production
      const productionConfig: RTCConfiguration = {
        ...this.rtcConfiguration,
        iceCandidatePoolSize: 10,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceTransportPolicy: 'all', // Allow both STUN and TURN
      };

      const connectionStartTime = Date.now();
      const peerConnection = new RTCPeerConnection(productionConfig);

      // Set connection timeout
      this.setConnectionTimeout(participantId, connectionStartTime);

      // Add local stream tracks if provided
      if (localStream || this.localStream) {
        const stream = localStream || this.localStream!;
        console.log(`📤 Adding ${stream.getTracks().length} local tracks to peer connection`);
        
        stream.getTracks().forEach(track => {
          try {
            const sender = peerConnection.addTrack(track, stream);
            console.log(`✅ Added ${track.kind} track (${track.label})`);
            
            // Set initial encoding parameters for video
            if (track.kind === 'video' && sender.getParameters) {
              const params = sender.getParameters();
              if (params.encodings && params.encodings.length > 0) {
                // Set reasonable defaults
                params.encodings[0].maxBitrate = 1000000; // 1 Mbps
                params.encodings[0].maxFramerate = 30;
                sender.setParameters(params).catch(console.warn);
              }
            }
          } catch (error) {
            console.error(`❌ Failed to add ${track.kind} track:`, error);
          }
        });
      }

      // Create data channel with enhanced options
      const dataChannel = peerConnection.createDataChannel('messages', {
        ordered: true,
        maxRetransmits: 3,
        maxPacketLifeTime: 3000 // 3 seconds
      });
      this.dataChannels.set(participantId, dataChannel);

      // Setup comprehensive event handlers
      this.setupProductionEventHandlers(participantId, peerConnection, connectionStartTime);

      // Store peer connection
      this.peerConnections.set(participantId, peerConnection);
      this.performanceMetrics.totalConnections++;

      console.log(`✅ Created production WebRTC peer connection for ${participantId}`);
      this.emit('peer-connection-created', { participantId, peerConnection, attempts });
      return peerConnection;

    } catch (error) {
      this.performanceMetrics.failedConnections++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to create peer connection for ${participantId}:`, errorMessage);
      this.emit('error', { error: errorMessage, participantId, context: 'create-peer-connection' });
      throw error;
    }
  }

  /**
   * Set connection timeout to prevent hanging connections
   */
  private setConnectionTimeout(participantId: string, startTime: number): void {
    const timeout = setTimeout(() => {
      const connectionTime = Date.now() - startTime;
      console.warn(`⏰ Connection timeout for ${participantId} after ${connectionTime}ms`);
      
      this.handleConnectionTimeout(participantId);
    }, this.connectionTimeout);

    this.connectionTimeouts.set(participantId, timeout);
  }

  /**
   * Handle connection timeout
   */
  private handleConnectionTimeout(participantId: string): void {
    console.log(`🚫 Connection timeout for ${participantId}, attempting cleanup and retry...`);
    
    // Clean up timed out connection
    this.closePeerConnection(participantId);
    
    // Emit timeout event for upper layers to handle
    this.emit('connection-timeout', { participantId, timestamp: Date.now() });
  }

  /**
   * Clear connection timeout when connection succeeds
   */
  private clearConnectionTimeout(participantId: string): void {
    const timeout = this.connectionTimeouts.get(participantId);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(participantId);
    }
  }

  /**
   * Setup production-grade WebRTC event handlers
   */
  private setupProductionEventHandlers(participantId: string, peerConnection: RTCPeerConnection, startTime: number): void {
    // Handle remote stream (real video/audio from participant)
    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      console.log(`📺 Received real video/audio stream from ${participantId}`);
      this.emit('remote-stream', { participantId, stream });
    };

    // Handle ICE candidates for NAT traversal
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('ice-candidate', { participantId, candidate: event.candidate });
      }
    };

    // Handle connection state changes with production monitoring
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      const connectionTime = Date.now() - startTime;
      
      console.log(`🔗 Connection state changed for ${participantId}: ${state} (${connectionTime}ms)`);
      this.emit('connection-state-change', { participantId, state, connectionTime });

      switch (state) {
        case 'connected':
          // Connection successful
          this.clearConnectionTimeout(participantId);
          this.connectionAttempts.delete(participantId);
          this.performanceMetrics.successfulConnections++;
          this.updateAverageConnectionTime(connectionTime);
          console.log(`✅ WebRTC connection established with ${participantId} in ${connectionTime}ms`);
          break;
          
        case 'failed':
        case 'closed':
          this.clearConnectionTimeout(participantId);
          this.handleConnectionFailure(participantId);
          break;
          
        case 'disconnected':
          console.warn(`⚠️ Connection disconnected for ${participantId}, monitoring for recovery...`);
          // Give it some time to reconnect before failing
          setTimeout(() => {
            if (peerConnection.connectionState === 'disconnected') {
              this.handleConnectionFailure(participantId);
            }
          }, 5000);
          break;
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      this.emit('ice-connection-state-change', { participantId, state });
      
      if (state === 'failed') {
        // Try to restart ICE
        peerConnection.restartIce();
      }
    };

    // Handle data channel
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel;
      this.dataChannels.set(participantId, channel);
      this.setupDataChannelHandlers(participantId, channel);
    };
  }

  /**
   * Setup data channel handlers
   */
  private setupDataChannelHandlers(participantId: string, dataChannel: RTCDataChannel): void {
    dataChannel.onopen = () => {
      this.emit('data-channel-open', { participantId });
    };

    dataChannel.onmessage = (event) => {
      this.performanceMetrics.dataChannelMessages++;
      
      try {
        const message = JSON.parse(event.data);
        this.emit('data-channel-message', { participantId, message });
      } catch (error) {
        console.warn('⚠️ Failed to parse data channel message:', event.data);
        this.emit('data-channel-error', { participantId, error: 'Invalid message format' });
      }
    };

    dataChannel.onclose = () => {
      this.emit('data-channel-close', { participantId });
    };
  }

  /**
   * Create WebRTC offer
   */
  async createOffer(participantId: string): Promise<RTCSessionDescriptionInit> {
    try {
      const peerConnection = this.peerConnections.get(participantId);
      if (!peerConnection) {
        throw new Error(`No peer connection found for participant ${participantId}`);
      }

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await peerConnection.setLocalDescription(offer);
      console.log(`📤 Created WebRTC offer for ${participantId}`);
      return offer;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to create offer for ${participantId}:`, error);
      this.emit('error', { error: errorMessage, participantId });
      throw error;
    }
  }

  /**
   * Create WebRTC answer
   */
  async createAnswer(participantId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    try {
      const peerConnection = this.peerConnections.get(participantId);
      if (!peerConnection) {
        throw new Error(`No peer connection found for participant ${participantId}`);
      }

      await peerConnection.setRemoteDescription(offer);
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Process any pending ICE candidates
      const pendingCandidates = this.pendingCandidates.get(participantId) || [];
      for (const candidate of pendingCandidates) {
        await peerConnection.addIceCandidate(candidate);
      }
      this.pendingCandidates.delete(participantId);

      console.log(`📤 Created WebRTC answer for ${participantId}`);
      return answer;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to create answer for ${participantId}:`, error);
      this.emit('error', { error: errorMessage, participantId });
      throw error;
    }
  }

  /**
   * Handle WebRTC offer
   */
  async handleOffer(fromUserId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      let peerConnection = this.peerConnections.get(fromUserId);
      
      if (!peerConnection) {
        peerConnection = await this.createPeerConnection(fromUserId, this.localStream || undefined);
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

      // Add any pending ICE candidates
      const pendingCandidates = this.pendingCandidates.get(fromUserId) || [];
      for (const candidate of pendingCandidates) {
        await peerConnection.addIceCandidate(candidate);
      }
      this.pendingCandidates.delete(fromUserId);

      // Create and send answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.emit('answer-created', { participantId: fromUserId, answer });
      console.log(`✅ Handled WebRTC offer from ${fromUserId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to handle offer from ${fromUserId}:`, error);
      this.emit('error', { error: errorMessage, participantId: fromUserId });
    }
  }

  /**
   * Handle WebRTC answer
   */
  async handleAnswer(fromUserId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(fromUserId);
      if (!peerConnection) {
        throw new Error(`No peer connection found for ${fromUserId}`);
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

      // Add any pending ICE candidates
      const pendingCandidates = this.pendingCandidates.get(fromUserId) || [];
      for (const candidate of pendingCandidates) {
        await peerConnection.addIceCandidate(candidate);
      }
      this.pendingCandidates.delete(fromUserId);

      console.log(`✅ Handled WebRTC answer from ${fromUserId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to handle answer from ${fromUserId}:`, error);
      this.emit('error', { error: errorMessage, participantId: fromUserId });
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(fromUserId: string, candidate: RTCIceCandidate): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(fromUserId);
      
      if (!peerConnection) {
        // Store candidate for later if peer connection doesn't exist yet
        if (!this.pendingCandidates.has(fromUserId)) {
          this.pendingCandidates.set(fromUserId, []);
        }
        this.pendingCandidates.get(fromUserId)!.push(candidate);
        return;
      }

      if (peerConnection.remoteDescription) {
        await peerConnection.addIceCandidate(candidate);
      } else {
        // Store candidate if remote description not set yet
        if (!this.pendingCandidates.has(fromUserId)) {
          this.pendingCandidates.set(fromUserId, []);
        }
        this.pendingCandidates.get(fromUserId)!.push(candidate);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to handle ICE candidate from ${fromUserId}:`, error);
      this.emit('error', { error: errorMessage, participantId: fromUserId });
    }
  }

  /**
   * Set local stream for all peer connections
   */
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    
    // Add tracks to existing peer connections
    this.peerConnections.forEach((peerConnection, participantId) => {
      // Remove existing tracks
      peerConnection.getSenders().forEach((sender: RTCRtpSender) => {
        if (sender.track) {
          peerConnection.removeTrack(sender);
        }
      });
      
      // Add new tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
    });
    
    console.log('📹 Local stream updated for all peer connections');
    this.emit('local-stream-updated', { stream });
  }

  /**
   * Close peer connection
   */
  closePeerConnection(participantId: string): void {
    const peerConnection = this.peerConnections.get(participantId);
    const dataChannel = this.dataChannels.get(participantId);
    
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(participantId);
    }
    
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(participantId);
    }
    
    this.pendingCandidates.delete(participantId);
    console.log(`🔌 Closed peer connection for ${participantId}`);
    this.emit('peer-connection-closed', { participantId });
  }

  /**
   * Handle connection failure
   */
  private handleConnectionFailure(participantId: string): void {
    console.warn(`⚠️ Peer connection failed for participant ${participantId}`);
    
    // Security: Clean up failed connection resources
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(participantId);
    }
    
    // Clean up data channel
    const dataChannel = this.dataChannels.get(participantId);
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(participantId);
    }
    
    // Clear pending candidates
    this.pendingCandidates.delete(participantId);
    
    this.emit('connection-failed', { participantId, timestamp: Date.now() });
  }

  /**
   * Start monitoring connection statistics
   */
  private startStatsMonitoring(): void {
    this.statsInterval = setInterval(async () => {
      // Only collect stats if we have active connections
      if (!this.peerConnections || this.peerConnections.size === 0) {
        return;
      }

      this.peerConnections.forEach(async (peerConnection, participantId) => {
        try {
          // Only collect stats from connected peers
          if (peerConnection.connectionState === 'connected') {
            const stats = await peerConnection.getStats();
            const connectionStats = this.parseConnectionStats(participantId, stats);
            this.emit('connection-stats', connectionStats);
          }
        } catch (error) {
          // Don't spam console with stats errors - just emit the event
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.emit('stats-error', { participantId, error: errorMessage });
        }
      });
    }, 5000);
  }

  /**
   * Parse WebRTC statistics
   */
  private parseConnectionStats(participantId: string, stats: RTCStatsReport): ConnectionStats {
    let bytesReceived = 0;
    let bytesSent = 0;
    let packetsLost = 0;
    let jitter = 0;
    let rtt = 0;

    stats.forEach((report: any) => {
      if (report.type === 'inbound-rtp') {
        bytesReceived += report.bytesReceived || 0;
        packetsLost += report.packetsLost || 0;
        jitter = report.jitter || 0;
      } else if (report.type === 'outbound-rtp') {
        bytesSent += report.bytesSent || 0;
      } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        rtt = report.currentRoundTripTime || 0;
      }
    });

    // Determine quality based on stats
    let quality: 'excellent' | 'good' | 'poor' | 'disconnected' = 'excellent';
    if (packetsLost > 50 || rtt > 300) {
      quality = 'poor';
    } else if (packetsLost > 10 || rtt > 150) {
      quality = 'good';
    }

    return {
      participantId,
      bytesReceived,
      bytesSent,
      packetsLost,
      jitter,
      rtt,
      quality
    };
  }

  /**
   * Send data message to participant
   */
  sendDataMessage(participantId: string, message: any): void {
    const dataChannel = this.dataChannels.get(participantId);
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(message));
    }
  }

  /**
   * Get all peer connections
   */
  getPeerConnections(): Map<string, RTCPeerConnection> {
    return new Map(this.peerConnections);
  }

  /**
   * Cleanup all connections
   */
  cleanup(): void {
    console.log('🧹 Cleaning up all WebRTC connections...');
    
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    this.peerConnections.forEach((_, participantId) => {
      this.closePeerConnection(participantId);
    });
    
    this.emit('cleanup-complete');
  }

  /**
   * Close connection (alias for closePeerConnection)
   */
  closeConnection(participantId: string): void {
    this.closePeerConnection(participantId);
  }

  /**
   * Replace video track for screen sharing or camera switching
   */
  async replaceVideoTrack(newTrack: MediaStreamTrack): Promise<void> {
    try {
      const replacePromises: Promise<void>[] = [];
      
      this.peerConnections.forEach((peerConnection, participantId) => {
        const sender = peerConnection.getSenders().find((s: RTCRtpSender) => 
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          replacePromises.push(
            sender.replaceTrack(newTrack).then(() => {
              console.log(`🔄 Replaced video track for participant ${participantId}`);
            })
          );
        }
      });

      await Promise.all(replacePromises);
      this.emit('video-track-replaced', { newTrack });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to replace video track:', errorMessage);
      this.emit('error', { error: errorMessage });
    }
  }

  /**
   * Update stream quality for all connections (bitrate, resolution)
   */
  async updateStreamQuality(quality: { bitrate: number; frameRate: number }): Promise<void> {
    try {
      const bitrate = quality.bitrate;
      const updatePromises: Promise<void>[] = [];

      this.peerConnections.forEach((peerConnection, participantId) => {
        const sender = peerConnection.getSenders().find((s: RTCRtpSender) => 
          s.track && s.track.kind === 'video'
        );

        if (sender && sender.getParameters) {
          const params = sender.getParameters();
          
          if (params.encodings && params.encodings.length > 0) {
            params.encodings[0].maxBitrate = bitrate;
            params.encodings[0].maxFramerate = quality.frameRate;
            
            updatePromises.push(sender.setParameters(params));
          }
        }
      });

      await Promise.all(updatePromises);
      this.emit('stream-quality-updated', { quality });
      console.log(`📊 Updated stream quality: ${bitrate}kbps, ${quality.frameRate}fps`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to update stream quality:', errorMessage);
      this.emit('error', { error: errorMessage });
    }
  }

  /**
   * Update average connection time metric
   */
  private updateAverageConnectionTime(connectionTime: number): void {
    const currentAverage = this.performanceMetrics.averageConnectionTime;
    const totalConnected = this.performanceMetrics.successfulConnections;
    
    if (totalConnected === 1) {
      this.performanceMetrics.averageConnectionTime = connectionTime;
    } else {
      // Running average calculation
      this.performanceMetrics.averageConnectionTime = 
        ((currentAverage * (totalConnected - 1)) + connectionTime) / totalConnected;
    }
  }

  /**
   * Get comprehensive connection status for all participants
   */
  getConnectionStatus(): Map<string, any> {
    const status = new Map();
    
    this.peerConnections.forEach((peerConnection, participantId) => {
      status.set(participantId, {
        connectionState: peerConnection.connectionState,
        iceConnectionState: peerConnection.iceConnectionState,
        iceGatheringState: peerConnection.iceGatheringState,
        hasDataChannel: this.dataChannels.has(participantId),
        dataChannelState: this.dataChannels.get(participantId)?.readyState,
        attempts: this.connectionAttempts.get(participantId) || 0,
        lastStatsUpdate: this.lastStatsUpdate.get(participantId) || 0
      });
    });
    
    return status;
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): any {
    return {
      ...this.performanceMetrics,
      activeConnections: this.peerConnections.size,
      pendingCandidates: Array.from(this.pendingCandidates.entries()).map(([id, candidates]) => ({
        participantId: id,
        candidateCount: candidates.length
      })),
      connectionSuccessRate: this.performanceMetrics.totalConnections > 0 
        ? (this.performanceMetrics.successfulConnections / this.performanceMetrics.totalConnections) * 100 
        : 0
    };
  }

  /**
   * Retry failed connection with exponential backoff
   */
  async retryConnection(participantId: string, localStream?: MediaStream): Promise<RTCPeerConnection> {
    const attempts = this.connectionAttempts.get(participantId) || 0;
    const delay = Math.min(1000 * Math.pow(2, attempts), 10000); // Max 10 seconds
    
    console.log(`🔄 Retrying connection to ${participantId} (attempt ${attempts + 1}) in ${delay}ms`);
    
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const peerConnection = await this.createPeerConnection(participantId, localStream);
          resolve(peerConnection);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }

  /**
   * Force close and cleanup connection
   */
  forceCloseConnection(participantId: string, reason?: string): void {
    console.log(`🔧 Force closing connection for ${participantId}${reason ? ` (${reason})` : ''}`);
    
    this.clearConnectionTimeout(participantId);
    this.connectionAttempts.delete(participantId);
    this.lastStatsUpdate.delete(participantId);
    
    this.closePeerConnection(participantId);
    this.emit('connection-force-closed', { participantId, reason });
  }
}