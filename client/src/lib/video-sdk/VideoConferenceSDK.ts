/**
 * Production Video Conference SDK - Complete Zoom-like Platform
 * Real multi-user video conferencing with screen sharing and enterprise features
 * Enhanced with enterprise-grade core modules for professional video conferencing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from './core/EventEmitter';
import { MediaManager, MediaConstraints } from './core/MediaManager';
import { SignalingManager } from './core/SignalingManager';
import { PeerConnectionManager } from './core/PeerConnectionManager';

interface ConferenceConfig {
  supabaseUrl: string;
  supabaseKey: string;
  maxParticipants?: number;
  enableSFU?: boolean;
  enableRecording?: boolean;
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  role: 'host' | 'moderator' | 'participant';
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  joinedAt: Date;
}

interface MediaStreamData {
  participantId: string;
  stream: MediaStream;
  type: 'camera' | 'screen';
}

export class VideoConferenceSDK extends EventEmitter {
  private supabase: SupabaseClient;
  private config: ConferenceConfig;
  private roomId: string | null = null;
  private userId: string | null = null;
  private displayName: string | null = null;
  private isConnected = false;
  private channel: any = null;
  
  // Enterprise-grade core modules
  private mediaManager: MediaManager;
  private signalingManager: SignalingManager;
  private peerConnectionManager: PeerConnectionManager;
  
  // Media management
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private participants = new Map<string, Participant>();
  private remoteStreams = new Map<string, MediaStream>();
  private peerConnections = new Map<string, RTCPeerConnection>();
  
  // State
  private isVideoEnabled = true;
  private isAudioEnabled = true;
  private isScreenSharing = false;
  private userRole: 'host' | 'moderator' | 'participant' = 'participant';

  constructor(config: ConferenceConfig) {
    super();
    
    this.config = {
      maxParticipants: 100,
      enableSFU: true,
      enableRecording: false,
      ...config
    };

    this.supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 30, // High frequency for video conferencing
        },
      },
    });

    // Initialize enterprise-grade core modules
    this.mediaManager = new MediaManager(this.config);
    this.signalingManager = new SignalingManager(this.supabase);
    this.peerConnectionManager = new PeerConnectionManager(this.config);

    // Setup inter-module communication
    this.setupModuleEventHandlers();

    console.log('🚀 VideoConferenceSDK initialized with enterprise modules');
  }

  /**
   * Setup communication between enterprise modules
   */
  private setupModuleEventHandlers(): void {
    // Media Manager events
    this.mediaManager.on('stream-acquired', (data: any) => {
      this.localStream = data.stream;
      this.emit('local-stream', data);
    });

    this.mediaManager.on('video-toggled', (data: any) => {
      this.isVideoEnabled = data.enabled;
      this.emit('video-toggled', data);
    });

    this.mediaManager.on('audio-toggled', (data: any) => {
      this.isAudioEnabled = data.enabled;
      this.emit('audio-toggled', data);
    });

    this.mediaManager.on('error', (data: any) => {
      this.emit('error', data);
    });

    // Signaling Manager events
    this.signalingManager.on('connected', (data: any) => {
      this.isConnected = true;
      this.emit('connected', data);
    });

    this.signalingManager.on('disconnected', () => {
      this.isConnected = false;
      this.emit('disconnected');
    });

    this.signalingManager.on('user-joined', (data: any) => {
      this.handleParticipantJoined(data);
    });

    this.signalingManager.on('user-left', (data: any) => {
      this.handleParticipantLeft(data.userId);
    });

    this.signalingManager.on('signaling-message', (data: any) => {
      this.handleWebRTCSignalingMessage(data);
    });

    this.signalingManager.on('error', (data: any) => {
      this.emit('error', data);
    });

    // Peer Connection Manager events
    this.peerConnectionManager.on('remote-stream', (data: any) => {
      this.remoteStreams.set(data.participantId, data.stream);
      this.emit('remote-stream', data);
    });

    this.peerConnectionManager.on('connection-state-change', (data: any) => {
      const participant = this.participants.get(data.participantId);
      if (participant) {
        participant.connectionQuality = this.mapConnectionStateToQuality(data.state);
        this.emit('participant-updated', { participant });
      }
    });

    this.peerConnectionManager.on('error', (data: any) => {
      this.emit('error', data);
    });
  }

  /**
   * Map WebRTC connection state to quality indicator
   */
  private mapConnectionStateToQuality(state: string): 'excellent' | 'good' | 'poor' | 'disconnected' {
    switch (state) {
      case 'connected': return 'excellent';
      case 'connecting': return 'good';
      case 'disconnected': return 'poor';
      case 'failed':
      case 'closed': return 'disconnected';
      default: return 'good';
    }
  }

  /**
   * Join a video conference room
   */
  async joinRoom(roomId: string, userId: string, displayName: string, role: 'host' | 'moderator' | 'participant' = 'participant'): Promise<void> {
    try {
      console.log(`🎯 Joining conference room: ${roomId}`);
      console.log(`👤 DEBUG: VideoSDK.joinRoom() - userId: "${userId}", displayName: "${displayName}", role: "${role}"`);
      
      this.roomId = roomId;
      this.userId = userId;
      this.displayName = displayName;
      this.userRole = role;
      
      console.log(`💾 DEBUG: Stored in VideoSDK - this.userId: "${this.userId}", this.displayName: "${this.displayName}", role: "${this.userRole}"`);

      // Check if room exists, create if doesn't exist and user is admin
      await this.ensureRoomExists(role);

      // Initialize local media using enterprise MediaManager
      await this.mediaManager.initialize();
      const stream = await this.mediaManager.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      this.localStream = stream;

      // Setup real-time signaling using enterprise SignalingManager
      await this.signalingManager.connect(roomId, userId);

      // Add participant to database
      await this.addParticipantToDatabase(role);

      this.isConnected = true;
      this.emit('connected', { roomId, userId, role });
      
      console.log('✅ Successfully joined conference room');
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      this.emit('error', { message: 'Failed to join room: ' + (error as Error).message });
      throw error;
    }
  }

  /**
   * Handle WebRTC signaling messages
   */
  private async handleWebRTCSignalingMessage(message: any): Promise<void> {
    try {
      const { type, fromUserId, payload } = message;
      
      switch (type) {
        case 'offer':
          await this.handleWebRTCOffer(fromUserId, payload);
          break;
        case 'answer':
          await this.handleWebRTCAnswer(fromUserId, payload);
          break;
        case 'ice-candidate':
          await this.handleWebRTCIceCandidate(fromUserId, payload);
          break;
        default:
          console.warn('Unknown signaling message type:', type);
      }
    } catch (error) {
      console.error('Error handling signaling message:', error);
      this.emit('error', { message: 'Signaling error: ' + (error as Error).message });
    }
  }

  /**
   * Handle WebRTC offer from remote peer
   */
  private async handleWebRTCOffer(fromUserId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const peerConnection = await this.peerConnectionManager.createPeerConnection(fromUserId, this.localStream!);
      await peerConnection.setRemoteDescription(offer);
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      await this.signalingManager.sendAnswer(fromUserId, answer);
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
    }
  }

  /**
   * Handle WebRTC answer from remote peer
   */
  private async handleWebRTCAnswer(fromUserId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const peerConnection = this.peerConnectionManager.getPeerConnection(fromUserId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
    }
  }

  /**
   * Handle ICE candidate from remote peer
   */
  private async handleWebRTCIceCandidate(fromUserId: string, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      const peerConnection = this.peerConnectionManager.getPeerConnection(fromUserId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  /**
   * Initialize local camera and microphone with proper error handling (Legacy method)
   */
  private async initializeLocalMedia(): Promise<void> {
    try {
      console.log('🎥 Initializing local media (camera & microphone)...');
      
      // Check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported in this browser');
      }

      // Request media stream with optimal settings
      const constraints = {
        video: {
          width: { min: 320, ideal: 640, max: 1280 },
          height: { min: 240, ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      };

      console.log('🔊 Requesting media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Verify stream tracks
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      console.log(`📊 Stream tracks - Video: ${videoTracks.length}, Audio: ${audioTracks.length}`);
      
      if (videoTracks.length === 0 && audioTracks.length === 0) {
        throw new Error('No media tracks available');
      }

      this.localStream = stream;
      this.isVideoEnabled = videoTracks.length > 0 && videoTracks[0].enabled;
      this.isAudioEnabled = audioTracks.length > 0 && audioTracks[0].enabled;
      
      console.log(`✅ Media initialized - Video: ${this.isVideoEnabled}, Audio: ${this.isAudioEnabled}`);
      
      // Set up track event listeners
      stream.getTracks().forEach(track => {
        console.log(`🎬 Track details: ${track.kind} - enabled: ${track.enabled}, readyState: ${track.readyState}`);
        
        track.addEventListener('ended', () => {
          console.log(`📡 Track ended: ${track.kind}`);
          if (track.kind === 'video') {
            this.isVideoEnabled = false;
            this.emit('video-toggled', { enabled: false });
          } else if (track.kind === 'audio') {
            this.isAudioEnabled = false;
            this.emit('audio-toggled', { enabled: false });
          }
        });
      });
      
      // Emit local stream for UI
      this.emit('local-stream', { stream, type: 'camera' });
      
      console.log('✅ Local media setup complete');
      
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Camera/microphone access denied. Please allow permissions and refresh the page.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No camera or microphone found. Please connect devices and try again.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Camera or microphone is already in use by another application.');
        } else if (error.name === 'OverconstrainedError') {
          console.log('🔄 Trying with fallback constraints...');
          // Try with simpler constraints
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true
            });
            this.localStream = fallbackStream;
            this.isVideoEnabled = fallbackStream.getVideoTracks().length > 0;
            this.isAudioEnabled = fallbackStream.getAudioTracks().length > 0;
            this.emit('local-stream', { stream: fallbackStream, type: 'camera' });
            console.log('✅ Fallback media initialized');
            return;
          } catch (fallbackError) {
            throw new Error('Media constraints not supported. Please try a different browser.');
          }
        }
      }
      throw error;
    }
  }

  /**
   * Setup real-time signaling with Supabase
   */
  private async setupSignaling(role: string): Promise<void> {
    if (!this.roomId || !this.userId) return;

    try {
      console.log('📡 Setting up real-time signaling...');
      
      const channel = this.supabase
        .channel(`conference:${this.roomId}`)
        .on('presence', { event: 'sync' }, () => {
          console.log('🔄 Presence sync - getting all participants');
          const presenceState = channel.presenceState();
          
          // Clear existing participants to avoid duplicates
          this.participants.clear();
          
          // Connect to all existing participants
          Object.values(presenceState).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              if (presence.userId !== this.userId) {
                console.log('👥 Found existing participant:', presence.userId, presence.displayName);
                this.handleParticipantJoined(presence);
              }
            });
          });
        })
        .on('presence', { event: 'join' }, (payload) => {
          console.log('👤 New participant joined:', payload);
          if (payload.newPresences) {
            payload.newPresences.forEach((presence: any) => {
              if (presence.userId !== this.userId) {
                this.handleParticipantJoined(presence);
              }
            });
          }
        })
        .on('presence', { event: 'leave' }, (payload) => {
          console.log('👋 Participant left:', payload);
          if (payload.leftPresences) {
            payload.leftPresences.forEach((presence: any) => {
              this.handleParticipantLeft(presence.userId);
            });
          }
        })
        .on('broadcast', { event: 'webrtc-offer' }, (payload) => {
          this.handleWebRTCOffer(payload.payload);
        })
        .on('broadcast', { event: 'webrtc-answer' }, (payload) => {
          this.handleWebRTCAnswer(payload.payload);
        })
        .on('broadcast', { event: 'webrtc-ice-candidate' }, (payload) => {
          this.handleWebRTCIceCandidate(payload.payload);
        })
        .on('broadcast', { event: 'media-toggle' }, (payload) => {
          this.handleMediaToggle(payload.payload);
        })
        .on('broadcast', { event: 'screen-share' }, (payload) => {
          this.handleScreenShare(payload.payload);
        })
        .on('broadcast', { event: 'participant-role-update' }, (payload) => {
          this.handleParticipantRoleUpdate(payload.payload);
        })
        .subscribe(async (status) => {
          console.log('📡 Signaling channel status:', status);
          if (status === 'SUBSCRIBED') {
            // Join presence with role information
            const presenceData = {
              userId: this.userId,
              displayName: this.displayName,
              role: role,
              videoEnabled: this.isVideoEnabled,
              audioEnabled: this.isAudioEnabled,
              screenSharing: this.isScreenSharing,
              joinedAt: new Date().toISOString()
            };
            console.log(`📡 DEBUG: Supabase presence track() - data:`, presenceData);
            await channel.track(presenceData);
            console.log('✅ Real-time signaling active');
          }
        });

      this.channel = channel;
      
    } catch (error) {
      console.error('❌ Failed to setup signaling:', error);
      throw error;
    }
  }

  /**
   * Add participant to database for persistence
   */
  private async addParticipantToDatabase(role: string): Promise<void> {
    if (!this.roomId || !this.userId) return;

    try {
      const dbData = {
        room_id: this.roomId,
        user_id: this.userId,
        display_name: this.displayName,
        role: role
      };
      console.log(`💽 DEBUG: Database insert - data:`, dbData);
      
      await this.supabase
        .from('video_conference_participants')
        .insert({
          room_id: this.roomId,
          user_id: this.userId,
          display_name: this.displayName,
          role: role,
          is_video_enabled: this.isVideoEnabled,
          is_audio_enabled: this.isAudioEnabled,
          is_hand_raised: false,
          connection_quality: 'excellent',
          is_screen_sharing: this.isScreenSharing,
          is_active: true,
          joined_at: new Date().toISOString()
        });
        
      console.log('✅ Participant added to database');
    } catch (error) {
      console.warn('⚠️ Failed to add participant to database (continuing anyway):', error);
    }
  }

  /**
   * Handle new participant joining
   */
  private async handleParticipantJoined(participantData: any): Promise<void> {
    console.log(`🔄 DEBUG: handleParticipantJoined() - incoming:`, participantData);
    console.log(`🔄 DEBUG: My userId: "${this.userId}", Their userId: "${participantData.userId}"`);
    
    if (!this.userId || participantData.userId === this.userId) {
      console.log(`⏭️ DEBUG: Skipping self or invalid participant`);
      return;
    }

    console.log('👥 Handling new participant:', participantData.userId);

    const participant: Participant = {
      id: participantData.userId,
      name: participantData.displayName || participantData.userId,
      role: participantData.role || 'participant',
      videoEnabled: participantData.videoEnabled !== false,
      audioEnabled: participantData.audioEnabled !== false,
      screenSharing: participantData.screenSharing || false,
      handRaised: false,
      connectionQuality: 'good',
      joinedAt: new Date(participantData.joinedAt || new Date().toISOString())
    };

    this.participants.set(participantData.userId, participant);
    this.emit('participant-joined', { participant });

    // Create WebRTC peer connection
    await this.createPeerConnection(participantData.userId);
    
    // Determine who initiates the connection (to avoid duplicate offers)
    if (this.userId > participantData.userId) {
      console.log('🎯 Initiating WebRTC connection to:', participantData.userId);
      await this.createWebRTCOffer(participantData.userId);
    } else {
      console.log('⏳ Waiting for WebRTC connection from:', participantData.userId);
    }
  }

  /**
   * Create WebRTC peer connection
   */
  private async createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    // Add local stream tracks with detailed logging
    if (this.localStream && this.localStream.getTracks().length > 0) {
      console.log(`📤 Adding ${this.localStream.getTracks().length} local tracks to peer connection with ${participantId}`);
      
      this.localStream.getTracks().forEach(track => {
        console.log(`📡 Adding ${track.kind} track - enabled: ${track.enabled}, readyState: ${track.readyState}`);
        try {
          pc.addTrack(track, this.localStream!);
          console.log(`✅ ${track.kind} track added successfully`);
        } catch (error) {
          console.error(`❌ Failed to add ${track.kind} track:`, error);
        }
      });
    } else {
      console.warn('⚠️ No local stream available when creating peer connection');
    }

    // Add screen share stream if active
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => {
        pc.addTrack(track, this.screenStream!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('🎬 Received remote stream from:', participantId);
      const [remoteStream] = event.streams;
      
      this.remoteStreams.set(participantId, remoteStream);
      this.emit('remote-stream', { participantId, stream: remoteStream });
      
      console.log('📺 Remote stream details:', {
        participantId,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage('webrtc-ice-candidate', {
          targetId: participantId,
          candidate: event.candidate
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state with', participantId, ':', pc.connectionState);
      
      const participant = this.participants.get(participantId);
      if (participant) {
        switch (pc.connectionState) {
          case 'connected':
            participant.connectionQuality = 'excellent';
            break;
          case 'disconnected':
            participant.connectionQuality = 'poor';
            break;
          case 'failed':
            participant.connectionQuality = 'disconnected';
            break;
        }
        this.emit('participant-updated', { participant });
      }
    };

    this.peerConnections.set(participantId, pc);
    return pc;
  }

  /**
   * Create and send WebRTC offer
   */
  private async createWebRTCOffer(participantId: string): Promise<void> {
    const pc = this.peerConnections.get(participantId);
    if (!pc) return;

    try {
      console.log('📞 Creating WebRTC offer for:', participantId);
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(offer);
      
      await this.sendSignalingMessage('webrtc-offer', {
        targetId: participantId,
        offer: offer
      });
      
      console.log('📤 WebRTC offer sent to:', participantId);
      
    } catch (error) {
      console.error('❌ Failed to create WebRTC offer:', error);
    }
  }



  /**
   * Send signaling message via Supabase
   */
  private async sendSignalingMessage(event: string, payload: any): Promise<void> {
    if (!this.channel || !this.userId) return;

    try {
      await this.channel.send({
        type: 'broadcast',
        event,
        payload: {
          ...payload,
          fromId: this.userId
        }
      });
    } catch (error) {
      console.error('❌ Failed to send signaling message:', error);
    }
  }

  /**
   * Toggle local video on/off using enterprise MediaManager
   */
  async toggleVideo(): Promise<void> {
    if (!this.localStream) return;

    // Use enterprise MediaManager for video toggling
    const newState = await this.mediaManager.toggleVideo(this.localStream, !this.isVideoEnabled);
    this.isVideoEnabled = newState;
      
    // Notify other participants
    await this.sendSignalingMessage('media-toggle', {
      type: 'video',
      enabled: this.isVideoEnabled
    });
      
    this.emit('video-toggled', { enabled: this.isVideoEnabled });
    console.log('📹 Video toggled:', this.isVideoEnabled ? 'ON' : 'OFF');
  }

  /**
   * Toggle local audio on/off using enterprise MediaManager
   */
  async toggleAudio(): Promise<void> {
    if (!this.localStream) return;

    // Use enterprise MediaManager for audio toggling
    const newState = await this.mediaManager.toggleAudio(this.localStream, !this.isAudioEnabled);
    this.isAudioEnabled = newState;
      
    // Notify other participants
    await this.sendSignalingMessage('media-toggle', {
      type: 'audio',
      enabled: this.isAudioEnabled
    });
      
    this.emit('audio-toggled', { enabled: this.isAudioEnabled });
    console.log('🎤 Audio toggled:', this.isAudioEnabled ? 'ON' : 'OFF');
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<void> {
    try {
      console.log('🖥️ Starting screen share...');
      
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      this.screenStream = screenStream;
      this.isScreenSharing = true;

      // Add screen share tracks to all peer connections
      const screenVideoTrack = screenStream.getVideoTracks()[0];
      const screenAudioTrack = screenStream.getAudioTracks()[0];

      Array.from(this.peerConnections.entries()).forEach(([participantId, pc]) => {
        if (screenVideoTrack) {
          pc.addTrack(screenVideoTrack, screenStream);
        }
        if (screenAudioTrack) {
          pc.addTrack(screenAudioTrack, screenStream);
        }
      });

      // Handle screen share ending
      screenVideoTrack.onended = () => {
        this.stopScreenShare();
      };

      // Notify other participants
      await this.sendSignalingMessage('screen-share', {
        action: 'start'
      });

      this.emit('screen-share-started', { stream: screenStream });
      console.log('✅ Screen sharing started');
      
    } catch (error) {
      console.error('❌ Failed to start screen share:', error);
      this.emit('error', { message: 'Failed to start screen sharing: ' + (error as Error).message });
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    if (!this.screenStream) return;

    try {
      console.log('🛑 Stopping screen share...');
      
      // Stop all screen share tracks
      this.screenStream.getTracks().forEach(track => track.stop());

      // Remove screen share tracks from peer connections
      Array.from(this.peerConnections.entries()).forEach(([participantId, pc]) => {
        const senders = pc.getSenders();
        senders.forEach((sender: RTCRtpSender) => {
          if (sender.track && this.screenStream?.getTracks().includes(sender.track)) {
            pc.removeTrack(sender);
          }
        });
      });

      this.screenStream = null;
      this.isScreenSharing = false;

      // Notify other participants
      await this.sendSignalingMessage('screen-share', {
        action: 'stop'
      });

      this.emit('screen-share-stopped');
      console.log('✅ Screen sharing stopped');
      
    } catch (error) {
      console.error('❌ Failed to stop screen share:', error);
    }
  }

  /**
   * Handle media toggle from other participants
   */
  private handleMediaToggle(payload: any): void {
    const participant = this.participants.get(payload.fromId);
    if (!participant) return;

    if (payload.type === 'video') {
      participant.videoEnabled = payload.enabled;
    } else if (payload.type === 'audio') {
      participant.audioEnabled = payload.enabled;
    }

    this.emit('participant-updated', { participant });
  }

  /**
   * Handle screen share events from other participants
   */
  private handleScreenShare(payload: any): void {
    const participant = this.participants.get(payload.fromId);
    if (!participant) return;

    participant.screenSharing = payload.action === 'start';
    this.emit('participant-updated', { participant });
    
    if (payload.action === 'start') {
      this.emit('participant-screen-share-started', { participantId: payload.fromId });
    } else {
      this.emit('participant-screen-share-stopped', { participantId: payload.fromId });
    }
  }

  /**
   * Handle participant leaving
   */
  private async handleParticipantLeft(participantId: string): Promise<void> {
    console.log('👋 Participant left:', participantId);

    // Clean up peer connection
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(participantId);
    }

    // Remove streams
    this.remoteStreams.delete(participantId);

    // Remove participant
    const participant = this.participants.get(participantId);
    if (participant) {
      this.participants.delete(participantId);
      this.emit('participant-left', { participant });
    }
  }

  /**
   * Leave the conference room
   */
  async leaveRoom(): Promise<void> {
    try {
      console.log('👋 Leaving conference room...');

      // Update database
      if (this.roomId && this.userId) {
        await this.supabase
          .from('video_conference_participants')
          .update({ 
            is_active: false, 
            left_at: new Date().toISOString() 
          })
          .eq('room_id', this.roomId)
          .eq('user_id', this.userId);
      }

      // Stop local streams
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }

      // Close all peer connections
      this.peerConnections.forEach(pc => pc.close());
      this.peerConnections.clear();

      // Clear data
      this.participants.clear();
      this.remoteStreams.clear();

      // Unsubscribe from channel
      if (this.channel) {
        await this.supabase.removeChannel(this.channel);
        this.channel = null;
      }

      this.isConnected = false;
      this.roomId = null;
      this.userId = null;

      this.emit('disconnected');
      console.log('✅ Left conference room successfully');
      
    } catch (error) {
      console.error('❌ Error leaving room:', error);
    }
  }

  /**
   * Get current participants
   */
  getParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get remote stream for participant
   */
  getRemoteStream(participantId: string): MediaStream | null {
    return this.remoteStreams.get(participantId) || null;
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get screen share stream
   */
  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  /**
   * Get connection status
   */
  isConnectionActive(): boolean {
    return this.isConnected;
  }

  /**
   * Ensure room exists in database, create if it doesn't
   */
  private async ensureRoomExists(role: string): Promise<void> {
    if (!this.roomId) return;

    try {
      // Check if room exists
      const { data: existingRoom, error: fetchError } = await this.supabase
        .from('video_conference_rooms')
        .select('*')
        .eq('room_id', this.roomId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.warn('⚠️ Error checking room existence:', fetchError);
        return;
      }

      if (!existingRoom) {
        // Create room if it doesn't exist and user has permission
        if (role === 'host' || role === 'moderator') {
          await this.supabase
            .from('video_conference_rooms')
            .insert({
              room_id: this.roomId,
              room_name: `Conference ${this.roomId}`,
              created_by: this.userId,
              host_user_id: this.userId,
              max_participants: this.config.maxParticipants,
              is_active: true,
              is_public: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          console.log('✅ Room created in database');
        }
      } else {
        console.log('✅ Room already exists in database');
      }
    } catch (error) {
      console.warn('⚠️ Failed to ensure room exists (continuing anyway):', error);
    }
  }

  /**
   * Handle participant role updates
   */
  private handleParticipantRoleUpdate(payload: any): void {
    console.log('👤 Participant role update:', payload);
    
    const participant = this.participants.get(payload.participantId);
    if (participant) {
      participant.role = payload.role;
      this.emit('participant-updated', { participant });
    }
  }

  /**
   * Get current user role
   */
  getUserRole(): 'host' | 'moderator' | 'participant' {
    return this.userRole;
  }

  /**
   * Change participant role (host/moderator only)
   */
  async changeParticipantRole(participantId: string, newRole: 'host' | 'moderator' | 'participant'): Promise<void> {
    if (this.userRole !== 'host' && this.userRole !== 'moderator') {
      throw new Error('Only hosts and moderators can change participant roles');
    }

    try {
      // Update in database
      await this.supabase
        .from('video_conference_participants')
        .update({ role: newRole })
        .eq('room_id', this.roomId)
        .eq('user_id', participantId);

      // Broadcast role change
      await this.sendSignalingMessage('participant-role-update', {
        participantId,
        role: newRole
      });

      console.log(`✅ Changed role for ${participantId} to ${newRole}`);
    } catch (error) {
      console.error('❌ Failed to change participant role:', error);
      throw error;
    }
  }

  /**
   * Remove participant (host/moderator only)
   */
  async removeParticipant(participantId: string, reason?: string): Promise<void> {
    if (this.userRole !== 'host' && this.userRole !== 'moderator') {
      throw new Error('Only hosts and moderators can remove participants');
    }

    try {
      // Update in database
      await this.supabase
        .from('video_conference_participants')
        .update({ 
          is_active: false,
          removed_by: this.userId,
          removal_reason: reason || 'Removed by moderator',
          left_at: new Date().toISOString()
        })
        .eq('room_id', this.roomId)
        .eq('user_id', participantId);

      // Broadcast removal
      await this.sendSignalingMessage('participant-removed', {
        participantId,
        reason: reason || 'Removed by moderator'
      });

      console.log(`✅ Removed participant ${participantId}`);
    } catch (error) {
      console.error('❌ Failed to remove participant:', error);
      throw error;
    }
  }

  /**
   * Get media states
   */
  getMediaStates() {
    return {
      video: this.isVideoEnabled,
      audio: this.isAudioEnabled,
      screenSharing: this.isScreenSharing
    };
  }
}