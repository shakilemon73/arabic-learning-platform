/**
 * PeerConnectionManager - Manages WebRTC peer connections
 * Handles multiple peer connections, media stream management, and connection quality
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

    // Configure RTCPeerConnection
    this.rtcConfiguration = {
      iceServers: [
        ...config.stunServers?.map((url: string) => ({ urls: url })) || [
          { urls: 'stun:stun.l.google.com:19302' }
        ],
        ...config.turnServers || []
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all'
    };

    // Start connection quality monitoring
    this.startStatsMonitoring();
  }

  /**
   * Create a peer connection for a participant
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

      // Create data channel for additional communication
      const dataChannel = peerConnection.createDataChannel('messages', {
        ordered: true
      });
      this.dataChannels.set(participantId, dataChannel);

      // Setup event handlers
      this.setupPeerConnectionEventHandlers(participantId, peerConnection);

      // Store peer connection
      this.peerConnections.set(participantId, peerConnection);

      this.emit('peer-connection-created', { participantId, peerConnection });
      return peerConnection;

    } catch (error) {
      this.emit('error', { error: error.message, participantId });
      throw error;
    }
  }

  /**
   * Setup event handlers for a peer connection
   */
  private setupPeerConnectionEventHandlers(participantId: string, peerConnection: RTCPeerConnection): void {
    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      this.emit('remote-stream', { participantId, stream });
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('ice-candidate', { participantId, candidate: event.candidate });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      this.emit('connection-state-change', { participantId, state });

      if (state === 'failed' || state === 'closed') {
        this.handleConnectionFailure(participantId);
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      this.emit('ice-connection-state-change', { participantId, state });
    };

    // Handle data channel
    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      this.setupDataChannelEventHandlers(participantId, dataChannel);
    };
  }

  /**
   * Setup data channel event handlers
   */
  private setupDataChannelEventHandlers(participantId: string, dataChannel: RTCDataChannel): void {
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

    dataChannel.onerror = (error) => {
      this.emit('data-channel-error', { participantId, error });
    };
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

    } catch (error) {
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

    } catch (error) {
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
      this.emit('error', { error: error.message, participantId: fromUserId });
    }
  }

  /**
   * Create and send offer to participant
   */
  async createOffer(participantId: string, localStream?: MediaStream): Promise<void> {
    try {
      let peerConnection = this.peerConnections.get(participantId);
      
      if (!peerConnection) {
        peerConnection = await this.createPeerConnection(participantId, localStream);
      }

      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await peerConnection.setLocalDescription(offer);

      this.emit('offer-created', { participantId, offer });

    } catch (error) {
      this.emit('error', { error: error.message, participantId });
    }
  }

  /**
   * Replace video track (for screen sharing)
   */
  async replaceVideoTrack(newTrack: MediaStreamTrack): Promise<void> {
    try {
      for (const [participantId, peerConnection] of this.peerConnections) {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );

        if (sender) {
          await sender.replaceTrack(newTrack);
        }
      }

      this.emit('video-track-replaced', { newTrack });

    } catch (error) {
      this.emit('error', { error: error.message });
    }
  }

  /**
   * Update stream quality for all connections
   */
  async updateStreamQuality(quality: StreamQuality): Promise<void> {
    try {
      const bitrate = quality.bitrate;

      for (const [participantId, peerConnection] of this.peerConnections) {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );

        if (sender && sender.getParameters) {
          const params = sender.getParameters();
          
          if (params.encodings && params.encodings.length > 0) {
            params.encodings[0].maxBitrate = bitrate;
            params.encodings[0].maxFramerate = quality.frameRate;
            
            await sender.setParameters(params);
          }
        }
      }

      this.emit('stream-quality-updated', { quality });

    } catch (error) {
      this.emit('error', { error: error.message });
    }
  }

  /**
   * Send data message to participant
   */
  async sendDataMessage(participantId: string, message: any): Promise<void> {
    try {
      const dataChannel = this.dataChannels.get(participantId);
      if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(message));
      }
    } catch (error) {
      this.emit('error', { error: error.message, participantId });
    }
  }

  /**
   * Close connection to specific participant
   */
  closeConnection(participantId: string): void {
    const peerConnection = this.peerConnections.get(participantId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(participantId);
    }

    const dataChannel = this.dataChannels.get(participantId);
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(participantId);
    }

    this.pendingCandidates.delete(participantId);

    this.emit('connection-closed', { participantId });
  }

  /**
   * Close all peer connections
   */
  closeAllConnections(): void {
    for (const participantId of this.peerConnections.keys()) {
      this.closeConnection(participantId);
    }
  }

  /**
   * Handle connection failure
   */
  private async handleConnectionFailure(participantId: string): Promise<void> {
    this.emit('connection-failed', { participantId });
    
    // Attempt to recreate connection after a delay
    setTimeout(async () => {
      try {
        this.closeConnection(participantId);
        await this.createPeerConnection(participantId, this.localStream || undefined);
        this.emit('connection-reconnect-attempt', { participantId });
      } catch (error) {
        this.emit('connection-reconnect-failed', { participantId, error: error.message });
      }
    }, 2000);
  }

  /**
   * Start connection quality monitoring
   */
  private startStatsMonitoring(): void {
    this.statsInterval = setInterval(async () => {
      for (const [participantId, peerConnection] of this.peerConnections) {
        try {
          const stats = await this.getConnectionStats(participantId);
          if (stats) {
            this.emit('connection-stats', stats);
          }
        } catch (error) {
          // Ignore stats errors
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(participantId: string): Promise<ConnectionStats | null> {
    const peerConnection = this.peerConnections.get(participantId);
    if (!peerConnection) return null;

    try {
      const stats = await peerConnection.getStats();
      let bytesReceived = 0;
      let bytesSent = 0;
      let packetsLost = 0;
      let jitter = 0;
      let rtt = 0;

      stats.forEach(stat => {
        if (stat.type === 'inbound-rtp') {
          bytesReceived += stat.bytesReceived || 0;
          packetsLost += stat.packetsLost || 0;
          jitter += stat.jitter || 0;
        } else if (stat.type === 'outbound-rtp') {
          bytesSent += stat.bytesSent || 0;
        } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
          rtt = stat.currentRoundTripTime || 0;
        }
      });

      // Calculate quality based on stats
      let quality: ConnectionStats['quality'] = 'excellent';
      if (packetsLost > 10 || rtt > 300) {
        quality = 'poor';
      } else if (packetsLost > 5 || rtt > 150) {
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

    } catch (error) {
      return null;
    }
  }

  /**
   * Set local stream
   */
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
  }

  /**
   * Get peer connection
   */
  getPeerConnection(participantId: string): RTCPeerConnection | null {
    return this.peerConnections.get(participantId) || null;
  }

  /**
   * Get all peer connections
   */
  getAllPeerConnections(): Map<string, RTCPeerConnection> {
    return new Map(this.peerConnections);
  }

  /**
   * Cleanup and destroy manager
   */
  destroy(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    this.closeAllConnections();
    this.removeAllListeners();
  }
}