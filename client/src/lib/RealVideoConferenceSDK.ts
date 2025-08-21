/**
 * Real Video Conference SDK - Production Implementation
 * Based on the existing enterprise video SDK architecture
 * Real multi-user video conferencing without mocks or demos
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MediaManager, MediaConstraints } from './video-sdk/core/MediaManager';
import { EventEmitter } from './video-sdk/core/EventEmitter';

interface RealConferenceConfig {
  supabaseUrl: string;
  supabaseKey: string;
  maxParticipants?: number;
}

interface RealParticipant {
  id: string;
  name: string;
  role: 'host' | 'participant';
  videoEnabled: boolean;
  audioEnabled: boolean;
  stream?: MediaStream;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  joinedAt: Date;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'join-room' | 'leave-room' | 'media-toggle';
  fromUserId: string;
  toUserId?: string;
  roomId: string;
  payload: any;
  timestamp: number;
}

export class RealVideoConferenceSDK extends EventEmitter {
  private supabase: SupabaseClient;
  private config: RealConferenceConfig;
  private mediaManager: MediaManager;
  private roomId: string | null = null;
  private userId: string | null = null;
  private displayName: string | null = null;
  private userRole: 'host' | 'participant' = 'participant';
  private isConnected = false;
  private channel: any = null;
  
  // Media management using enterprise MediaManager
  private localStream: MediaStream | null = null;
  private participants = new Map<string, RealParticipant>();
  private remoteStreams = new Map<string, MediaStream>();
  private peerConnections = new Map<string, RTCPeerConnection>();
  
  // WebRTC configuration
  private rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };
  
  // State
  private isVideoEnabled = true;
  private isAudioEnabled = true;

  constructor(config: RealConferenceConfig) {
    super();
    
    this.config = {
      maxParticipants: 100,
      ...config
    };

    // Initialize Supabase client for real-time signaling
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 50, // High frequency for video conferencing
        },
      },
    });

    // Initialize MediaManager for proper camera/microphone access
    this.mediaManager = new MediaManager(config);
    this.setupMediaManagerEvents();

    console.log('🚀 Real Video Conference SDK initialized');
  }

  /**
   * Setup MediaManager event handlers
   */
  private setupMediaManagerEvents(): void {
    this.mediaManager.on('stream-acquired', ({ stream }) => {
      console.log('📹 Local media stream acquired');
      this.localStream = stream;
      this.emit('local-stream', stream);
      
      // Add tracks to all existing peer connections
      this.peerConnections.forEach((pc, participantId) => {
        stream.getTracks().forEach((track: MediaStreamTrack) => {
          pc.addTrack(track, stream);
        });
      });
    });

    this.mediaManager.on('error', ({ error }) => {
      console.error('❌ Media Manager Error:', error);
      this.emit('error', { error: `Media access failed: ${error}` });
    });

    this.mediaManager.on('video-toggled', ({ enabled }) => {
      this.isVideoEnabled = enabled;
      this.broadcastMediaState();
    });

    this.mediaManager.on('audio-toggled', ({ enabled }) => {
      this.isAudioEnabled = enabled;
      this.broadcastMediaState();
    });
  }

  /**
   * Initialize media and get user camera/microphone
   */
  async initializeMedia(): Promise<MediaStream> {
    try {
      console.log('🎬 Initializing real media access...');
      
      // Initialize MediaManager first
      await this.mediaManager.initialize();
      
      // Get user media with optimal settings
      const constraints: MediaConstraints = {
        video: {
          width: 1280,
          height: 720,
          frameRate: 30,
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      const stream = await this.mediaManager.getUserMedia(constraints);
      console.log('✅ Real media stream acquired successfully');
      return stream;
      
    } catch (error) {
      console.error('❌ Failed to initialize media:', error);
      throw new Error(`Camera/microphone access failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Join a video conference room with real WebRTC
   */
  async joinRoom(roomId: string, userId: string, displayName: string): Promise<void> {
    try {
      console.log(`🎯 Joining real video conference: ${roomId}`);
      
      this.roomId = roomId;
      this.userId = userId;
      this.displayName = displayName;

      // Initialize real media first
      await this.initializeMedia();

      // Setup real-time signaling
      await this.setupRealtimeSignaling();

      // Determine role based on existing participants
      const existingParticipants = await this.getExistingParticipants();
      this.userRole = existingParticipants.length === 0 ? 'host' : 'participant';

      // Add participant to room
      await this.joinRoomInDatabase();

      this.isConnected = true;
      this.emit('connected', { roomId, userId, role: this.userRole });
      
      // Create peer connections to existing participants
      for (const participant of existingParticipants) {
        if (participant.id !== userId) {
          await this.createPeerConnection(participant.id, true);
        }
      }
      
      console.log(`✅ Successfully joined conference as ${this.userRole}`);
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      this.emit('error', { error: error instanceof Error ? error.message : 'Failed to join room' });
      throw error;
    }
  }

  /**
   * Setup real-time signaling using Supabase
   */
  private async setupRealtimeSignaling(): Promise<void> {
    if (!this.roomId) throw new Error('Room ID not set');

    this.channel = this.supabase.channel(`video-room-${this.roomId}`, {
      config: { broadcast: { self: false } }
    });

    // Handle signaling messages
    this.channel
      .on('broadcast', { event: 'signaling' }, (payload: any) => {
        this.handleSignalingMessage(payload.payload as SignalingMessage);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        console.log(`👤 Participant joined: ${key}`);
        this.handleParticipantJoined(key, newPresences[0]);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
        console.log(`👋 Participant left: ${key}`);
        this.handleParticipantLeft(key);
      });

    // Subscribe and track presence
    await this.channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await this.channel.track({
          user_id: this.userId,
          display_name: this.displayName,
          role: this.userRole,
          video_enabled: this.isVideoEnabled,
          audio_enabled: this.isAudioEnabled,
          joined_at: new Date().toISOString()
        });
        console.log('✅ Real-time signaling connected');
      }
    });
  }

  /**
   * Handle signaling messages for WebRTC
   */
  private async handleSignalingMessage(message: SignalingMessage): Promise<void> {
    if (message.toUserId && message.toUserId !== this.userId) return;

    console.log(`📨 Received signaling: ${message.type} from ${message.fromUserId}`);

    switch (message.type) {
      case 'offer':
        await this.handleOffer(message.fromUserId, message.payload);
        break;
      case 'answer':
        await this.handleAnswer(message.fromUserId, message.payload);
        break;
      case 'ice-candidate':
        await this.handleIceCandidate(message.fromUserId, message.payload);
        break;
      case 'media-toggle':
        this.handleMediaToggle(message.fromUserId, message.payload);
        break;
    }
  }

  /**
   * Create real WebRTC peer connection
   */
  private async createPeerConnection(participantId: string, initiator: boolean): Promise<void> {
    try {
      console.log(`🔗 Creating real peer connection to ${participantId} (initiator: ${initiator})`);

      const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
      this.peerConnections.set(participantId, peerConnection);

      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream!);
        });
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        console.log(`📺 Received remote stream from ${participantId}`);
        this.remoteStreams.set(participantId, remoteStream);
        this.emit('remote-stream', { participantId, stream: remoteStream });
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignalingMessage({
            type: 'ice-candidate',
            fromUserId: this.userId!,
            toUserId: participantId,
            roomId: this.roomId!,
            payload: event.candidate,
            timestamp: Date.now()
          });
        }
      };

      // Handle connection state
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log(`🔗 Connection state with ${participantId}: ${state}`);
        this.emit('connection-state-change', { participantId, state });
      };

      // If initiator, create offer
      if (initiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        this.sendSignalingMessage({
          type: 'offer',
          fromUserId: this.userId!,
          toUserId: participantId,
          roomId: this.roomId!,
          payload: offer,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      console.error(`❌ Failed to create peer connection to ${participantId}:`, error);
      this.emit('error', { error: `Connection failed to ${participantId}` });
    }
  }

  /**
   * Handle WebRTC offer
   */
  private async handleOffer(fromUserId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      let peerConnection = this.peerConnections.get(fromUserId);
      
      if (!peerConnection) {
        await this.createPeerConnection(fromUserId, false);
        peerConnection = this.peerConnections.get(fromUserId);
      }

      if (!peerConnection) throw new Error('Failed to create peer connection');

      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      this.sendSignalingMessage({
        type: 'answer',
        fromUserId: this.userId!,
        toUserId: fromUserId,
        roomId: this.roomId!,
        payload: answer,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error(`❌ Failed to handle offer from ${fromUserId}:`, error);
    }
  }

  /**
   * Handle WebRTC answer
   */
  private async handleAnswer(fromUserId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(fromUserId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error(`❌ Failed to handle answer from ${fromUserId}:`, error);
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(fromUserId: string, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(fromUserId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error(`❌ Failed to handle ICE candidate from ${fromUserId}:`, error);
    }
  }

  /**
   * Send signaling message via Supabase
   */
  private sendSignalingMessage(message: SignalingMessage): void {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'signaling',
        payload: message
      });
    }
  }

  /**
   * Handle participant joined
   */
  private async handleParticipantJoined(userId: string, presence: any): Promise<void> {
    if (userId === this.userId) return;

    const participant: RealParticipant = {
      id: userId,
      name: presence.display_name || 'Unknown',
      role: presence.role || 'participant',
      videoEnabled: presence.video_enabled || false,
      audioEnabled: presence.audio_enabled || false,
      connectionQuality: 'good',
      joinedAt: new Date(presence.joined_at || Date.now())
    };

    this.participants.set(userId, participant);
    this.emit('participant-joined', participant);

    // Create peer connection
    await this.createPeerConnection(userId, true);
  }

  /**
   * Handle participant left
   */
  private handleParticipantLeft(userId: string): void {
    const participant = this.participants.get(userId);
    if (participant) {
      this.participants.delete(userId);
      this.remoteStreams.delete(userId);
      
      const peerConnection = this.peerConnections.get(userId);
      if (peerConnection) {
        peerConnection.close();
        this.peerConnections.delete(userId);
      }
      
      this.emit('participant-left', participant);
    }
  }

  /**
   * Handle media toggle from remote participant
   */
  private handleMediaToggle(fromUserId: string, payload: any): void {
    const participant = this.participants.get(fromUserId);
    if (participant) {
      participant.videoEnabled = payload.videoEnabled;
      participant.audioEnabled = payload.audioEnabled;
      this.emit('participant-media-changed', participant);
    }
  }

  /**
   * Get existing participants from database
   */
  private async getExistingParticipants(): Promise<RealParticipant[]> {
    try {
      const { data, error } = await this.supabase
        .from('video_participants')
        .select('*')
        .eq('room_id', this.roomId)
        .eq('is_active', true);

      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.user_id,
        name: p.display_name,
        role: p.role,
        videoEnabled: p.video_enabled,
        audioEnabled: p.audio_enabled,
        connectionQuality: 'good' as const,
        joinedAt: new Date(p.joined_at)
      }));
    } catch (error) {
      console.error('❌ Failed to get existing participants:', error);
      return [];
    }
  }

  /**
   * Add participant to database
   */
  private async joinRoomInDatabase(): Promise<void> {
    try {
      await this.supabase
        .from('video_participants')
        .upsert({
          room_id: this.roomId,
          user_id: this.userId,
          display_name: this.displayName,
          role: this.userRole,
          video_enabled: this.isVideoEnabled,
          audio_enabled: this.isAudioEnabled,
          is_active: true,
          joined_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ Failed to join room in database:', error);
      // Don't throw - this is not critical for video functionality
    }
  }

  /**
   * Broadcast media state to other participants
   */
  private broadcastMediaState(): void {
    this.sendSignalingMessage({
      type: 'media-toggle',
      fromUserId: this.userId!,
      roomId: this.roomId!,
      payload: {
        videoEnabled: this.isVideoEnabled,
        audioEnabled: this.isAudioEnabled
      },
      timestamp: Date.now()
    });
  }

  /**
   * Toggle video on/off
   */
  async toggleVideo(): Promise<boolean> {
    if (this.localStream && this.mediaManager) {
      return await this.mediaManager.toggleVideo(this.localStream);
    }
    return false;
  }

  /**
   * Toggle audio on/off
   */
  async toggleAudio(): Promise<boolean> {
    if (this.localStream && this.mediaManager) {
      return await this.mediaManager.toggleAudio(this.localStream);
    }
    return false;
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get remote stream for participant
   */
  getRemoteStream(participantId: string): MediaStream | null {
    return this.remoteStreams.get(participantId) || null;
  }

  /**
   * Get all participants
   */
  getParticipants(): RealParticipant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get current user role
   */
  getCurrentRole(): 'host' | 'participant' {
    return this.userRole;
  }

  /**
   * Check if user is host
   */
  isHost(): boolean {
    return this.userRole === 'host';
  }

  /**
   * Leave the room and cleanup
   */
  async leaveRoom(): Promise<void> {
    try {
      // Update database
      if (this.roomId && this.userId) {
        await this.supabase
          .from('video_participants')
          .update({ is_active: false, left_at: new Date().toISOString() })
          .eq('room_id', this.roomId)
          .eq('user_id', this.userId);
      }

      // Close peer connections
      this.peerConnections.forEach(pc => pc.close());
      this.peerConnections.clear();

      // Stop local media
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Unsubscribe from channel
      if (this.channel) {
        await this.channel.unsubscribe();
        this.channel = null;
      }

      this.isConnected = false;
      this.emit('disconnected');
      
      console.log('✅ Successfully left room');
      
    } catch (error) {
      console.error('❌ Error leaving room:', error);
    }
  }

  /**
   * Check if connected
   */
  isConnectedToRoom(): boolean {
    return this.isConnected;
  }
}