/**
 * Production Video Conference SDK - Complete Zoom-like Platform
 * Real multi-user video conferencing with screen sharing and enterprise features
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export class VideoConferenceSDK {
  private supabase: SupabaseClient;
  private config: ConferenceConfig;
  private roomId: string | null = null;
  private userId: string | null = null;
  private displayName: string | null = null;
  private isConnected = false;
  private channel: any = null;
  
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
  
  // Event listeners
  private eventListeners = new Map<string, Function[]>();

  constructor(config: ConferenceConfig) {
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

    console.log('🚀 VideoConferenceSDK initialized');
  }

  /**
   * Event system
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Join a video conference room
   */
  async joinRoom(roomId: string, userId: string, displayName: string, role: 'host' | 'moderator' | 'participant' = 'participant'): Promise<void> {
    try {
      console.log(`🎯 Joining conference room: ${roomId}`);
      console.log(`👤 DEBUG: VideoSDK.joinRoom() - userId: "${userId}", displayName: "${displayName}"`);
      
      this.roomId = roomId;
      this.userId = userId;
      this.displayName = displayName;
      
      console.log(`💾 DEBUG: Stored in VideoSDK - this.userId: "${this.userId}", this.displayName: "${this.displayName}"`);

      // Initialize local media
      await this.initializeLocalMedia();

      // Setup real-time signaling
      await this.setupSignaling();

      // Add participant to database
      await this.addParticipantToDatabase(role);

      this.isConnected = true;
      this.emit('connected', { roomId, userId });
      
      console.log('✅ Successfully joined conference room');
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      this.emit('error', { message: 'Failed to join room: ' + (error as Error).message });
      throw error;
    }
  }

  /**
   * Initialize local camera and microphone
   */
  private async initializeLocalMedia(): Promise<void> {
    try {
      console.log('🎥 Initializing local media (camera & microphone)...');
      
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
      this.emit('local-stream', { stream, type: 'camera' });
      
      console.log('✅ Local media initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to get user media:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Camera/microphone access denied. Please allow permissions and refresh.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No camera or microphone found. Please connect devices.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Camera or microphone is already in use.');
        }
      }
      throw error;
    }
  }

  /**
   * Setup real-time signaling with Supabase
   */
  private async setupSignaling(): Promise<void> {
    if (!this.roomId || !this.userId) return;

    try {
      console.log('📡 Setting up real-time signaling...');
      
      const channel = this.supabase
        .channel(`conference:${this.roomId}`)
        .on('presence', { event: 'sync' }, () => {
          console.log('🔄 Presence sync - getting all participants');
          const presenceState = channel.presenceState();
          
          // Connect to all existing participants
          Object.values(presenceState).forEach((presences: any) => {
            presences.forEach((presence: any) => {
              if (presence.userId !== this.userId) {
                this.handleParticipantJoined(presence);
              }
            });
          });
        })
        .on('presence', { event: 'join' }, (payload) => {
          console.log('👤 New participant joined:', payload);
          if (payload.newPresences) {
            payload.newPresences.forEach((presence: any) => {
              this.handleParticipantJoined(presence);
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
        .subscribe(async (status) => {
          console.log('📡 Signaling channel status:', status);
          if (status === 'SUBSCRIBED') {
            // Join presence
            const presenceData = {
              userId: this.userId,
              displayName: this.displayName,
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
      name: participantData.displayName,
      role: participantData.role || 'participant',
      videoEnabled: participantData.videoEnabled,
      audioEnabled: participantData.audioEnabled,
      screenSharing: participantData.screenSharing,
      handRaised: false,
      connectionQuality: 'good',
      joinedAt: new Date(participantData.joinedAt)
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

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
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
   * Handle received WebRTC offer
   */
  private async handleWebRTCOffer(payload: any): Promise<void> {
    if (!this.userId || payload.targetId !== this.userId) return;

    console.log('📞 Received WebRTC offer from:', payload.fromId);

    let pc = this.peerConnections.get(payload.fromId);
    if (!pc) {
      pc = await this.createPeerConnection(payload.fromId);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      await pc.setLocalDescription(answer);
      
      await this.sendSignalingMessage('webrtc-answer', {
        targetId: payload.fromId,
        answer: answer
      });
      
      console.log('✅ WebRTC answer sent to:', payload.fromId);
      
    } catch (error) {
      console.error('❌ Failed to handle WebRTC offer:', error);
    }
  }

  /**
   * Handle received WebRTC answer
   */
  private async handleWebRTCAnswer(payload: any): Promise<void> {
    if (!this.userId || payload.targetId !== this.userId) return;

    console.log('✅ Received WebRTC answer from:', payload.fromId);

    const pc = this.peerConnections.get(payload.fromId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
      console.log('🎯 WebRTC connection established with:', payload.fromId);
    } catch (error) {
      console.error('❌ Failed to handle WebRTC answer:', error);
    }
  }

  /**
   * Handle received ICE candidate
   */
  private async handleWebRTCIceCandidate(payload: any): Promise<void> {
    if (!this.userId || payload.targetId !== this.userId) return;

    const pc = this.peerConnections.get(payload.fromId);
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      console.log('✅ ICE candidate added for:', payload.fromId);
    } catch (error) {
      console.error('❌ Failed to handle ICE candidate:', error);
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
   * Toggle local video on/off
   */
  async toggleVideo(): Promise<void> {
    if (!this.localStream) return;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      this.isVideoEnabled = videoTrack.enabled;
      
      // Notify other participants
      await this.sendSignalingMessage('media-toggle', {
        type: 'video',
        enabled: this.isVideoEnabled
      });
      
      this.emit('video-toggled', { enabled: this.isVideoEnabled });
      console.log('📹 Video toggled:', this.isVideoEnabled ? 'ON' : 'OFF');
    }
  }

  /**
   * Toggle local audio on/off
   */
  async toggleAudio(): Promise<void> {
    if (!this.localStream) return;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      this.isAudioEnabled = audioTrack.enabled;
      
      // Notify other participants
      await this.sendSignalingMessage('media-toggle', {
        type: 'audio',
        enabled: this.isAudioEnabled
      });
      
      this.emit('audio-toggled', { enabled: this.isAudioEnabled });
      console.log('🎤 Audio toggled:', this.isAudioEnabled ? 'ON' : 'OFF');
    }
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