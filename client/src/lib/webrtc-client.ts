/**
 * Real WebRTC Client for Enterprise Video Conferencing
 * Handles actual peer-to-peer video connections with signaling
 */

interface WebRTCConfig {
  iceServers: RTCIceServer[];
  signalingUrl: string;
}

interface Participant {
  id: string;
  name: string;
  role: 'host' | 'moderator' | 'participant';
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
}

interface SignalingMessage {
  type: string;
  roomId?: string;
  participantId?: string;
  targetParticipantId?: string;
  fromParticipantId?: string;
  data?: any;
}

export class WebRTCClient {
  private ws: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  private config: WebRTCConfig;
  private roomId: string = '';
  private participantId: string = '';
  private participantName: string = '';
  private isConnected: boolean = false;

  // Event handlers
  private onParticipantJoined?: (participant: Participant) => void;
  private onParticipantLeft?: (participantId: string) => void;
  private onRemoteStream?: (participantId: string, stream: MediaStream) => void;
  private onLocalStream?: (stream: MediaStream) => void;
  private onParticipantMediaChanged?: (participantId: string, mediaState: any) => void;
  private onConnectionStateChange?: (state: string) => void;

  constructor(config: Partial<WebRTCConfig> = {}) {
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers for production
        ...(config.iceServers || [])
      ],
      signalingUrl: config.signalingUrl || this.getSignalingUrl()
    };
  }

  private getSignalingUrl(): string {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/webrtc-signaling`;
  }

  // Initialize WebRTC client
  async initialize(participantId: string, participantName: string): Promise<void> {
    this.participantId = participantId;
    this.participantName = participantName;

    try {
      // Get local media stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }

      console.log('✅ WebRTC client initialized with local media');
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      throw new Error('Camera and microphone access required');
    }
  }

  // Connect to signaling server
  async connectSignaling(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.signalingUrl);

        this.ws.onopen = () => {
          console.log('🔗 Connected to signaling server');
          this.isConnected = true;
          if (this.onConnectionStateChange) {
            this.onConnectionStateChange('connected');
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleSignalingMessage(JSON.parse(event.data));
        };

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from signaling server');
          this.isConnected = false;
          if (this.onConnectionStateChange) {
            this.onConnectionStateChange('disconnected');
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ Signaling connection error:', error);
          reject(new Error('Failed to connect to signaling server'));
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // Join room
  async joinRoom(roomId: string, role: string = 'participant'): Promise<void> {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to signaling server');
    }

    this.roomId = roomId;

    this.sendSignalingMessage({
      type: 'join-room',
      roomId,
      participantId: this.participantId,
      data: {
        name: this.participantName,
        role,
        videoEnabled: this.isVideoEnabled(),
        audioEnabled: this.isAudioEnabled()
      }
    });
  }

  // Leave room
  leaveRoom(): void {
    if (this.ws && this.isConnected) {
      this.sendSignalingMessage({
        type: 'leave-room',
        roomId: this.roomId,
        participantId: this.participantId
      });
    }

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
  }

  // Handle signaling messages
  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    switch (message.type) {
      case 'joined-room':
        console.log('✅ Successfully joined room:', message.roomId);
        // Create peer connections to existing participants
        if (message.data?.participants) {
          for (const participant of message.data.participants) {
            if (participant.id !== this.participantId) {
              await this.createPeerConnection(participant.id, true);
            }
          }
        }
        break;

      case 'participant-joined':
        console.log('👤 New participant joined:', message.data?.participant);
        if (this.onParticipantJoined && message.data?.participant) {
          this.onParticipantJoined(message.data.participant);
        }
        // The joining participant will initiate the connection
        break;

      case 'participant-left':
        console.log('👋 Participant left:', message.participantId);
        if (message.participantId) {
          this.closePeerConnection(message.participantId);
          if (this.onParticipantLeft) {
            this.onParticipantLeft(message.participantId);
          }
        }
        break;

      case 'offer':
        if (message.fromParticipantId && message.data) {
          await this.handleOffer(message.fromParticipantId, message.data);
        }
        break;

      case 'answer':
        if (message.fromParticipantId && message.data) {
          await this.handleAnswer(message.fromParticipantId, message.data);
        }
        break;

      case 'ice-candidate':
        if (message.fromParticipantId && message.data) {
          await this.handleIceCandidate(message.fromParticipantId, message.data);
        }
        break;

      case 'participant-media-changed':
        if (this.onParticipantMediaChanged && message.participantId) {
          this.onParticipantMediaChanged(message.participantId, message.data?.mediaState);
        }
        break;
    }
  }

  // Create peer connection
  private async createPeerConnection(participantId: string, createOffer: boolean = false): Promise<void> {
    if (this.peerConnections.has(participantId)) {
      return; // Already exists
    }

    const pc = new RTCPeerConnection({ iceServers: this.config.iceServers });
    this.peerConnections.set(participantId, pc);

    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('📺 Received remote stream from:', participantId);
      const remoteStream = event.streams[0];
      this.remoteStreams.set(participantId, remoteStream);
      if (this.onRemoteStream) {
        this.onRemoteStream(participantId, remoteStream);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          roomId: this.roomId,
          participantId: this.participantId,
          targetParticipantId: participantId,
          data: event.candidate
        });
      }
    };

    // Create offer if initiating
    if (createOffer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      this.sendSignalingMessage({
        type: 'offer',
        roomId: this.roomId,
        participantId: this.participantId,
        targetParticipantId: participantId,
        data: offer
      });
    }
  }

  // Handle offer
  private async handleOffer(fromParticipantId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    await this.createPeerConnection(fromParticipantId, false);
    const pc = this.peerConnections.get(fromParticipantId);
    
    if (pc) {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      this.sendSignalingMessage({
        type: 'answer',
        roomId: this.roomId,
        participantId: this.participantId,
        targetParticipantId: fromParticipantId,
        data: answer
      });
    }
  }

  // Handle answer
  private async handleAnswer(fromParticipantId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(fromParticipantId);
    if (pc) {
      await pc.setRemoteDescription(answer);
    }
  }

  // Handle ICE candidate
  private async handleIceCandidate(fromParticipantId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(fromParticipantId);
    if (pc) {
      await pc.addIceCandidate(candidate);
    }
  }

  // Close peer connection
  private closePeerConnection(participantId: string): void {
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(participantId);
    }
    this.remoteStreams.delete(participantId);
  }

  // Send signaling message
  private sendSignalingMessage(message: SignalingMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Media controls
  toggleVideo(): boolean {
    if (!this.localStream) return false;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.notifyMediaStateChange();
      return videoTrack.enabled;
    }
    return false;
  }

  toggleAudio(): boolean {
    if (!this.localStream) return false;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.notifyMediaStateChange();
      return audioTrack.enabled;
    }
    return false;
  }

  isVideoEnabled(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    return videoTrack ? videoTrack.enabled : false;
  }

  isAudioEnabled(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    return audioTrack ? audioTrack.enabled : false;
  }

  private notifyMediaStateChange(): void {
    this.sendSignalingMessage({
      type: 'media-state-change',
      roomId: this.roomId,
      participantId: this.participantId,
      data: {
        videoEnabled: this.isVideoEnabled(),
        audioEnabled: this.isAudioEnabled(),
        screenSharing: false // TODO: Implement screen sharing
      }
    });
  }

  // Event handler setters
  onParticipantJoin(handler: (participant: Participant) => void): void {
    this.onParticipantJoined = handler;
  }

  onParticipantLeave(handler: (participantId: string) => void): void {
    this.onParticipantLeft = handler;
  }

  onRemoteStreamReceived(handler: (participantId: string, stream: MediaStream) => void): void {
    this.onRemoteStream = handler;
  }

  onLocalStreamReceived(handler: (stream: MediaStream) => void): void {
    this.onLocalStream = handler;
  }

  onParticipantMediaChange(handler: (participantId: string, mediaState: any) => void): void {
    this.onParticipantMediaChanged = handler;
  }

  onConnectionChange(handler: (state: string) => void): void {
    this.onConnectionStateChange = handler;
  }

  // Get streams
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(participantId: string): MediaStream | null {
    return this.remoteStreams.get(participantId) || null;
  }

  getAllRemoteStreams(): Map<string, MediaStream> {
    return new Map(this.remoteStreams);
  }

  // Cleanup
  disconnect(): void {
    this.leaveRoom();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnected = false;
  }
}