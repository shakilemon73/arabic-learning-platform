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
   * Create real WebRTC peer connection
   */
  async createPeerConnection(participantId: string, localStream?: MediaStream): Promise<RTCPeerConnection> {
    try {
      if (this.peerConnections.has(participantId)) {
        throw new Error(`Peer connection already exists for participant ${participantId}`);
      }

      const peerConnection = new RTCPeerConnection(this.rtcConfiguration);

      // Add local stream tracks if provided
      if (localStream || this.localStream) {
        const stream = localStream || this.localStream!;
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream);
        });
      }

      // Create data channel for chat and control messages
      const dataChannel = peerConnection.createDataChannel('messages', {
        ordered: true
      });
      this.dataChannels.set(participantId, dataChannel);

      // Setup event handlers for real WebRTC
      this.setupPeerConnectionEventHandlers(participantId, peerConnection);

      // Store peer connection
      this.peerConnections.set(participantId, peerConnection);

      console.log(`✅ Created real WebRTC peer connection for ${participantId}`);
      this.emit('peer-connection-created', { participantId, peerConnection });
      return peerConnection;

    } catch (error) {
      console.error(`❌ Failed to create peer connection for ${participantId}:`, error);
      this.emit('error', { error: error.message, participantId });
      throw error;
    }
  }

  /**
   * Setup real WebRTC event handlers
   */
  private setupPeerConnectionEventHandlers(participantId: string, peerConnection: RTCPeerConnection): void {
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

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`🔗 Connection state changed for ${participantId}: ${state}`);
      this.emit('connection-state-change', { participantId, state });

      if (state === 'failed' || state === 'closed') {
        this.handleConnectionFailure(participantId);
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
      this.emit('data-channel-message', { 
        participantId, 
        message: JSON.parse(event.data) 
      });
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
      console.error(`❌ Failed to create offer for ${participantId}:`, error);
      this.emit('error', { error: error.message, participantId });
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
      console.error(`❌ Failed to create answer for ${participantId}:`, error);
      this.emit('error', { error: error.message, participantId });
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
      console.error(`❌ Failed to handle offer from ${fromUserId}:`, error);
      this.emit('error', { error: error.message, participantId: fromUserId });
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
      console.error(`❌ Failed to handle answer from ${fromUserId}:`, error);
      this.emit('error', { error: error.message, participantId: fromUserId });
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
      console.error(`❌ Failed to handle ICE candidate from ${fromUserId}:`, error);
      this.emit('error', { error: error.message, participantId: fromUserId });
    }
  }

  /**
   * Set local stream for all peer connections
   */
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    
    // Add tracks to existing peer connections
    for (const [participantId, peerConnection] of this.peerConnections.entries()) {
      // Remove existing tracks
      peerConnection.getSenders().forEach(sender => {
        if (sender.track) {
          peerConnection.removeTrack(sender);
        }
      });
      
      // Add new tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });
    }
    
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
    this.emit('connection-failed', { participantId });
  }

  /**
   * Start monitoring connection statistics
   */
  private startStatsMonitoring(): void {
    this.statsInterval = setInterval(async () => {
      for (const [participantId, peerConnection] of this.peerConnections.entries()) {
        try {
          const stats = await peerConnection.getStats();
          const connectionStats = this.parseConnectionStats(participantId, stats);
          this.emit('connection-stats', connectionStats);
        } catch (error) {
          // Stats gathering failed, connection might be closed
        }
      }
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

    for (const participantId of this.peerConnections.keys()) {
      this.closePeerConnection(participantId);
    }
    
    this.emit('cleanup-complete');
  }

  /**
   * Close connection (alias for closePeerConnection)
   */
  closeConnection(participantId: string): void {
    this.closePeerConnection(participantId);
  }
}