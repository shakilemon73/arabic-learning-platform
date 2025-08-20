/**
 * WorldClass Video SDK - Core Engine (Simplified for Real Functionality)
 * Real WebRTC peer-to-peer video conferencing like Zoom
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from './EventEmitter';
import { WebSocketSignalingManager } from './WebSocketSignalingManager';

export interface VideoSDKConfig {
  supabaseUrl: string;
  supabaseKey: string;
  stunServers?: string[];
  turnServers?: Array<{
    urls: string;
    username?: string;
    credential?: string;
  }>;
  maxParticipants?: number;
}

export interface SessionConfig {
  roomId: string;
  userId: string;
  userRole: 'host' | 'moderator' | 'participant' | 'viewer';
  displayName: string;
  avatar?: string;
}

export interface ParticipantInfo {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  joinedAt: Date;
}

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

export interface StreamQuality {
  resolution: '4K' | '1080p' | '720p' | '480p' | '360p';
  frameRate: 60 | 30 | 15;
  bitrate: number;
  adaptiveStreaming: boolean;
}

export class VideoSDK extends EventEmitter {
  private supabase: SupabaseClient;
  private config: VideoSDKConfig;
  private session: SessionConfig | null = null;
  private isInitialized = false;
  private isConnected = false;
  private channel: any = null;
  private wsSignaling: WebSocketSignalingManager;

  // WebRTC Connection Management
  private localStream: MediaStream | null = null;
  private participants = new Map<string, ParticipantInfo>();
  private peerConnections = new Map<string, RTCPeerConnection>();
  private remoteStreams = new Map<string, MediaStream>();
  
  // Media state
  private isVideoEnabled = true;
  private isAudioEnabled = true;
  private isScreenSharing = false;

  constructor(config: VideoSDKConfig) {
    super();
    
    // Security: Validate configuration
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('VideoSDK requires valid Supabase credentials');
    }

    // Security: Validate URL format
    try {
      new URL(config.supabaseUrl);
    } catch {
      throw new Error('Invalid Supabase URL format');
    }
    
    this.config = {
      stunServers: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302'
      ],
      turnServers: [],
      maxParticipants: Math.min(config.maxParticipants || 100, 1000), // Security: Limit max participants
      ...config
    };

    // Initialize synchronously - don't set isInitialized until async init completes
    try {
      this.supabase = createClient(config.supabaseUrl, config.supabaseKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: false, // Security: Don't persist sessions in VideoSDK
        },
        realtime: {
          params: {
            eventsPerSecond: 20, // Higher for video conferencing
          },
        },
      });

      // Initialize WebSocket signaling manager for better real-time performance
      this.wsSignaling = new WebSocketSignalingManager();
      this.setupWebSocketSignaling();
      
      console.log('🚀 VideoSDK constructor completed successfully');
    } catch (error) {
      console.error('🔒 VideoSDK initialization failed:', error);
      throw new Error('Failed to initialize VideoSDK with provided configuration');
    }
  }

  /**
   * Async initialization method - must be called after construction
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Starting VideoSDK async initialization...');
      
      // Test Supabase connection
      const { error } = await this.supabase.from('rooms').select('count').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 is just "no rows" which is fine
        console.warn('⚠️ Supabase connection test warning:', error.message);
      }
      
      // Connect WebSocket signaling if needed
      try {
        if (this.wsSignaling && typeof this.wsSignaling.connect === 'function') {
          await this.wsSignaling.connect();
          console.log('✅ WebSocket signaling connected');
        } else {
          console.log('⏭️ WebSocket signaling not available, using Supabase only');
        }
      } catch (wsError) {
        console.warn('⚠️ WebSocket connection failed, using Supabase only:', wsError);
        // Continue without WebSocket - Supabase realtime can handle signaling
      }
      
      this.isInitialized = true;
      console.log('✅ VideoSDK fully initialized and ready');
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ VideoSDK async initialization failed:', error);
      this.isInitialized = false;
      throw new Error('Failed to complete VideoSDK initialization: ' + (error as Error).message);
    }
  }

  // Initialize media and join room with security validation
  async joinRoom(sessionConfig: SessionConfig): Promise<void> {
    try {
      // Security: Import and validate connection attempt
      const { videoSecurityManager } = await import('../../videoSecurity');
      const validation = videoSecurityManager.validateConnectionAttempt(
        sessionConfig.userId, 
        sessionConfig.roomId
      );
      
      if (!validation.allowed) {
        throw new Error(validation.reason || 'Connection not allowed');
      }

      // Security: Sanitize display name
      sessionConfig.displayName = videoSecurityManager.sanitizeDisplayName(sessionConfig.displayName);
      console.log('🔄 Joining room:', sessionConfig.roomId);
      console.log('📋 Session config:', sessionConfig);
      this.session = sessionConfig;

      // Get user media first
      console.log('🎯 Step 1: Initializing media...');
      await this.initializeMedia();

      // Setup signaling (now using WebSocket + Supabase hybrid)
      console.log('🎯 Step 2: Setting up enhanced signaling...');
      await this.setupHybridSignaling();

      // Join room in database (optional)
      console.log('🎯 Step 3: Recording participation...');
      await this.joinRoomInDatabase();

      this.isConnected = true;
      this.emit('connected', { roomId: sessionConfig.roomId });
      console.log('✅ Successfully joined room');
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      console.error('🔍 Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      this.emit('error', { message: 'Failed to join room: ' + (error as Error).message });
      throw error;
    }
  }

  // Initialize camera and microphone
  private async initializeMedia(): Promise<void> {
    try {
      console.log('🎥 Initializing camera and microphone...');
      
      // Check if media devices are available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported by this browser');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
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

      this.localStream = stream;
      this.emit('local-stream', { stream });
      console.log('✅ Media initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Camera/microphone access denied. Please allow permissions and refresh the page.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No camera or microphone found. Please connect a camera and microphone.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Camera or microphone is already in use by another application.');
        }
      }
      throw new Error('Failed to access camera/microphone: ' + (error as Error).message);
    }
  }

  /**
   * Setup WebSocket signaling event handlers
   */
  private setupWebSocketSignaling(): void {
    this.wsSignaling.on('connected', (data) => {
      console.log('✅ WebSocket signaling connected', data);
    });

    this.wsSignaling.on('room-joined', (data) => {
      console.log('🏠 Joined room via WebSocket', data);
    });

    this.wsSignaling.on('user-joined', (data) => {
      console.log('👤 User joined via WebSocket:', data.userId);
      this.handleParticipantJoined({
        userId: data.userId,
        displayName: data.displayName,
        role: data.role
      });
    });

    this.wsSignaling.on('user-left', (data) => {
      console.log('👋 User left via WebSocket:', data.userId);
      this.handleParticipantLeft(data.userId);
    });

    this.wsSignaling.on('offer-received', (data) => {
      console.log('📞 Received offer via WebSocket:', data.fromUserId);
      this.handleOffer({
        offer: data.offer,
        fromId: data.fromUserId,
        targetId: this.session?.userId
      });
    });

    this.wsSignaling.on('answer-received', (data) => {
      console.log('✅ Received answer via WebSocket:', data.fromUserId);
      this.handleAnswer({
        answer: data.answer,
        fromId: data.fromUserId,
        targetId: this.session?.userId
      });
    });

    this.wsSignaling.on('ice-candidate-received', (data) => {
      console.log('🧊 Received ICE candidate via WebSocket:', data.fromUserId);
      this.handleIceCandidate({
        candidate: data.candidate,
        fromId: data.fromUserId,
        targetId: this.session?.userId
      });
    });

    this.wsSignaling.on('error', (data) => {
      console.error('❌ WebSocket signaling error:', data.error);
      this.emit('error', { message: data.error });
    });
  }

  /**
   * Setup hybrid signaling (WebSocket + Supabase fallback)
   */
  private async setupHybridSignaling(): Promise<void> {
    if (!this.session) return;

    // Try WebSocket signaling first
    try {
      console.log('🔗 Attempting WebSocket signaling connection...');
      await this.wsSignaling.connect(
        this.session.roomId, 
        this.session.userId,
        {
          displayName: this.session.displayName,
          role: this.session.userRole,
          capabilities: {
            canSpeak: true,
            canShare: true,
            canChat: true
          }
        }
      );
      console.log('✅ WebSocket signaling active');
      
    } catch (error) {
      console.warn('⚠️ WebSocket signaling failed, falling back to Supabase:', error);
      // Fallback to original Supabase signaling
      await this.setupSignaling();
    }
  }

  // Setup real-time signaling with Supabase - ENHANCED FOR ZOOM-LIKE FUNCTIONALITY
  private async setupSignaling(): Promise<void> {
    if (!this.session) return;

    try {
      console.log('📡 Setting up ENHANCED Supabase real-time signaling for ZOOM-LIKE functionality...');
      
      // Listen for new participants and handle existing ones
      const channel = this.supabase
        .channel(`room:${this.session.roomId}`)
        .on('presence', { event: 'sync' }, () => {
          console.log('🔄 PRESENCE SYNC: Getting all current participants...');
          const presenceState = channel.presenceState();
          console.log('👥 Current participants in room:', presenceState);
          
          // Connect to all existing participants
          Object.values(presenceState).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              if (presence.userId !== this.session!.userId) {
                this.handleParticipantJoined(presence);
              }
            });
          });
        })
        .on('presence', { event: 'join' }, (payload) => {
          console.log('👤 PRESENCE: New participant joined:', payload);
          if (payload.newPresences && payload.newPresences.length > 0) {
            payload.newPresences.forEach((presence: any) => {
              this.handleParticipantJoined(presence);
            });
          }
        })
        .on('presence', { event: 'leave' }, (payload) => {
          console.log('👋 PRESENCE: Participant left:', payload);
          if (payload.leftPresences && payload.leftPresences.length > 0) {
            payload.leftPresences.forEach((presence: any) => {
              this.handleParticipantLeft(presence.userId);
            });
          }
        })
        .on('broadcast', { event: 'offer' }, (payload) => {
          this.handleOffer(payload.payload);
        })
        .on('broadcast', { event: 'answer' }, (payload) => {
          this.handleAnswer(payload.payload);
        })
        .on('broadcast', { event: 'ice-candidate' }, (payload) => {
          this.handleIceCandidate(payload.payload);
        })
        .subscribe((status) => {
          console.log('📡 Supabase channel subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ REAL-TIME SIGNALING ACTIVE - Ready for ZOOM-LIKE functionality!');
          }
        });

      // Store channel reference for later use
      this.channel = channel;

      // Join presence
      console.log('👋 Joining presence with user data...');
      await channel.track({
        userId: this.session.userId,
        displayName: this.session.displayName,
        role: this.session.userRole,
        videoEnabled: this.isVideoEnabled,
        audioEnabled: this.isAudioEnabled
      });
      
      console.log('✅ Signaling setup completed - ZOOM-LIKE FUNCTIONALITY READY!');
    } catch (error) {
      console.error('❌ Failed to setup signaling:', error);
      throw error;
    }
  }

  // Handle new participant joining - REAL ZOOM-LIKE LOGIC
  private async handleParticipantJoined(participantData: any): Promise<void> {
    if (!this.session || participantData.userId === this.session.userId) return;

    console.log('👥 NEW PARTICIPANT JOINED - Setting up bidirectional connection:', participantData.userId);

    const participant: ParticipantInfo = {
      id: participantData.userId,
      name: participantData.displayName,
      role: participantData.role,
      videoEnabled: participantData.videoEnabled,
      audioEnabled: participantData.audioEnabled,
      screenSharing: false,
      connectionQuality: 'good',
      joinedAt: new Date()
    };

    this.participants.set(participantData.userId, participant);
    this.emit('participant-joined', { participant });

    // Create peer connection for this participant
    await this.createPeerConnection(participantData.userId);
    
    // CRITICAL: ALL participants initiate connections (not just host)
    // This creates the full mesh network like Zoom
    await this.createOffer(participantData.userId);
    
    console.log('✅ Bidirectional connection setup initiated with:', participantData.userId);
  }

  // Create WebRTC peer connection
  private async createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: [
        ...this.config.stunServers!.map(url => ({ urls: url })),
        ...this.config.turnServers!
      ]
    });

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('🎬 Received remote stream from:', participantId);
      const [remoteStream] = event.streams;
      this.remoteStreams.set(participantId, remoteStream);
      this.emit('remote-stream', { participantId, stream: remoteStream });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage('ice-candidate', {
          candidate: event.candidate,
          targetId: participantId
        });
      }
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log('🔗 Connection state with', participantId, ':', pc.connectionState);
      if (pc.connectionState === 'connected') {
        const participant = this.participants.get(participantId);
        if (participant) {
          participant.connectionQuality = 'excellent';
          this.emit('participant-updated', { participant });
        }
      }
    };

    this.peerConnections.set(participantId, pc);
    return pc;
  }

  // Create and send offer
  private async createOffer(participantId: string): Promise<void> {
    const pc = this.peerConnections.get(participantId);
    if (!pc) return;

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(offer);
      
      this.sendSignalingMessage('offer', {
        offer,
        targetId: participantId
      });
      
    } catch (error) {
      console.error('❌ Failed to create offer:', error);
    }
  }

  // Handle received offer - REAL ZOOM-LIKE OFFER HANDLING
  private async handleOffer(payload: any): Promise<void> {
    if (!this.session || payload.targetId !== this.session.userId) return;

    console.log('📞 RECEIVED OFFER from:', payload.fromId, 'to:', payload.targetId);

    // Create peer connection if it doesn't exist
    let pc = this.peerConnections.get(payload.fromId);
    if (!pc) {
      console.log('🔧 Creating new peer connection for incoming offer from:', payload.fromId);
      pc = await this.createPeerConnection(payload.fromId);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(answer);
      
      this.sendSignalingMessage('answer', {
        answer,
        targetId: payload.fromId
      });
      
      console.log('✅ SENT ANSWER back to:', payload.fromId);
      
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
    }
  }

  // Handle received answer - REAL ZOOM-LIKE ANSWER HANDLING
  private async handleAnswer(payload: any): Promise<void> {
    if (!this.session || payload.targetId !== this.session.userId) return;

    console.log('✅ RECEIVED ANSWER from:', payload.fromId, 'to:', payload.targetId);

    const pc = this.peerConnections.get(payload.fromId);
    if (!pc) {
      console.error('⚠️ No peer connection found for answer from:', payload.fromId);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
      console.log('🎯 CONNECTION ESTABLISHED with:', payload.fromId);
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
    }
  }

  // Handle ICE candidate - REAL ZOOM-LIKE ICE HANDLING
  private async handleIceCandidate(payload: any): Promise<void> {
    if (!this.session || payload.targetId !== this.session.userId) return;

    console.log('🧊 RECEIVED ICE CANDIDATE from:', payload.fromId);

    const pc = this.peerConnections.get(payload.fromId);
    if (!pc) {
      console.error('⚠️ No peer connection found for ICE candidate from:', payload.fromId);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      console.log('✅ ICE CANDIDATE added for:', payload.fromId);
    } catch (error) {
      console.error('❌ Failed to handle ICE candidate:', error);
    }
  }

  // Send signaling message (hybrid WebSocket + Supabase)
  private async sendSignalingMessage(event: string, payload: any): Promise<void> {
    if (!this.session) return;

    try {
      // Try WebSocket first
      if (this.wsSignaling.isSignalingConnected() && payload.targetId) {
        switch (event) {
          case 'offer':
            await this.wsSignaling.sendOffer(payload.targetId, payload.offer);
            break;
          case 'answer':
            await this.wsSignaling.sendAnswer(payload.targetId, payload.answer);
            break;
          case 'ice-candidate':
            await this.wsSignaling.sendIceCandidate(payload.targetId, new RTCIceCandidate(payload.candidate));
            break;
        }
      } else {
        // Fallback to Supabase
        this.supabase.channel(`room:${this.session.roomId}`).send({
          type: 'broadcast',
          event,
          payload: {
            ...payload,
            fromId: this.session.userId
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to send via WebSocket, using Supabase fallback:', error);
      // Always have Supabase as fallback
      this.supabase.channel(`room:${this.session.roomId}`).send({
        type: 'broadcast',
        event,
        payload: {
          ...payload,
          fromId: this.session.userId
        }
      });
    }
  }

  // Join room in database
  private async joinRoomInDatabase(): Promise<void> {
    if (!this.session) return;

    try {
      console.log('💾 Attempting to record participation in database...');
      
      const { error } = await this.supabase
        .from('video_room_participants')
        .insert({
          room_id: this.session.roomId,
          user_id: this.session.userId,
          display_name: this.session.displayName,
          role: this.session.userRole,
          joined_at: new Date().toISOString()
        });

      if (error) {
        console.log('⚠️ Database participation recording failed (this is optional):', error.message);
        // Don't throw error - this is optional functionality
      } else {
        console.log('✅ Participation recorded in database');
      }
    } catch (error) {
      console.log('⚠️ Database operation failed (continuing anyway):', error);
      // Don't throw error - database recording is optional
    }
  }

  // Handle participant leaving
  private handleParticipantLeft(participantId: string): void {
    // Close peer connection
    const pc = this.peerConnections.get(participantId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(participantId);
    }

    // Remove streams and participant
    this.remoteStreams.delete(participantId);
    this.participants.delete(participantId);
    
    this.emit('participant-left', { participantId });
  }

  // Toggle video
  async toggleVideo(enabled?: boolean): Promise<boolean> {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return false;

    const newState = enabled !== undefined ? enabled : !this.isVideoEnabled;
    videoTrack.enabled = newState;
    this.isVideoEnabled = newState;

    this.emit('video-toggled', { enabled: newState });
    return newState;
  }

  // Toggle audio
  async toggleAudio(enabled?: boolean): Promise<boolean> {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return false;

    const newState = enabled !== undefined ? enabled : !this.isAudioEnabled;
    audioTrack.enabled = newState;
    this.isAudioEnabled = newState;

    this.emit('audio-toggled', { enabled: newState });
    return newState;
  }

  // Start screen sharing
  async startScreenShare(): Promise<MediaStream | null> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      for (const [participantId, pc] of Array.from(this.peerConnections.entries())) {
        const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      this.isScreenSharing = true;
      this.emit('screen-share-started', { stream: screenStream });
      return screenStream;
      
    } catch (error) {
      console.error('❌ Failed to start screen share:', error);
      return null;
    }
  }

  // Stop screen sharing
  async stopScreenShare(): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    
    // Replace screen track with camera track in all peer connections
    for (const [participantId, pc] of Array.from(this.peerConnections.entries())) {
      const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === 'video');
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    }

    this.isScreenSharing = false;
    this.emit('screen-share-stopped');
  }

  // Leave room - ENHANCED CLEANUP
  async leaveRoom(): Promise<void> {
    console.log('🚪 Leaving room...');

    // Close all peer connections
    for (const [participantId, pc] of Array.from(this.peerConnections.entries())) {
      pc.close();
    }
    this.peerConnections.clear();

    // Stop local media
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Disconnect WebSocket signaling
    await this.wsSignaling.disconnect();

    // Leave Supabase channel
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }

    // Leave database room
    if (this.session) {
      await this.supabase
        .from('video_room_participants')
        .delete()
        .eq('room_id', this.session.roomId)
        .eq('user_id', this.session.userId);
    }

    // Clear state
    this.participants.clear();
    this.remoteStreams.clear();
    this.session = null;
    this.isConnected = false;

    this.emit('disconnected');
  }

  // Getters
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getParticipants(): ParticipantInfo[] {
    return Array.from(this.participants.values());
  }

  getRemoteStream(participantId: string): MediaStream | null {
    return this.remoteStreams.get(participantId) || null;
  }

  isVideoEnabledState(): boolean {
    return this.isVideoEnabled;
  }

  isAudioEnabledState(): boolean {
    return this.isAudioEnabled;
  }

  isScreenSharingState(): boolean {
    return this.isScreenSharing;
  }

  isConnectedState(): boolean {
    return this.isConnected;
  }

  // Cleanup
  async destroy(): Promise<void> {
    await this.leaveRoom();
  }
}