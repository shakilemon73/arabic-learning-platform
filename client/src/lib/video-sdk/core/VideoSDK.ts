/**
 * WorldClass Video SDK - Core Engine (Simplified for Real Functionality)
 * Real WebRTC peer-to-peer video conferencing like Zoom
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from './EventEmitter';

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
    
    this.config = {
      stunServers: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302'
      ],
      turnServers: [],
      maxParticipants: 100,
      ...config
    };

    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.isInitialized = true;
  }

  // Initialize media and join room
  async joinRoom(sessionConfig: SessionConfig): Promise<void> {
    try {
      console.log('🔄 Joining room:', sessionConfig.roomId);
      this.session = sessionConfig;

      // Get user media first
      await this.initializeMedia();

      // Setup signaling
      await this.setupSignaling();

      // Join room in database
      await this.joinRoomInDatabase();

      this.isConnected = true;
      this.emit('connected', { roomId: sessionConfig.roomId });
      console.log('✅ Successfully joined room');
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      this.emit('error', { message: 'Failed to join room: ' + (error as Error).message });
      throw error;
    }
  }

  // Initialize camera and microphone
  private async initializeMedia(): Promise<void> {
    try {
      console.log('🎥 Initializing camera and microphone...');
      
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
      throw new Error('Camera/microphone access denied. Please allow permissions.');
    }
  }

  // Setup real-time signaling with Supabase
  private async setupSignaling(): Promise<void> {
    if (!this.session) return;

    // Listen for new participants
    const channel = this.supabase
      .channel(`room:${this.session.roomId}`)
      .on('presence', { event: 'join' }, (payload) => {
        console.log('👤 New participant joined:', payload);
        this.handleParticipantJoined(payload.data);
      })
      .on('presence', { event: 'leave' }, (payload) => {
        console.log('👋 Participant left:', payload);
        this.handleParticipantLeft(payload.data.userId);
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
      .subscribe();

    // Join presence
    await channel.track({
      userId: this.session.userId,
      displayName: this.session.displayName,
      role: this.session.userRole,
      videoEnabled: this.isVideoEnabled,
      audioEnabled: this.isAudioEnabled
    });
  }

  // Handle new participant joining
  private async handleParticipantJoined(participantData: any): Promise<void> {
    if (!this.session || participantData.userId === this.session.userId) return;

    console.log('🔄 Setting up connection with participant:', participantData.userId);

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

    // Create peer connection
    await this.createPeerConnection(participantData.userId);
    
    // If we're the host or existing participant, send offer
    if (this.session.userRole === 'host') {
      await this.createOffer(participantData.userId);
    }
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

  // Handle received offer
  private async handleOffer(payload: any): Promise<void> {
    if (!this.session || payload.targetId !== this.session.userId) return;

    const pc = this.peerConnections.get(payload.fromId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(payload.offer);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      this.sendSignalingMessage('answer', {
        answer,
        targetId: payload.fromId
      });
      
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
    }
  }

  // Handle received answer
  private async handleAnswer(payload: any): Promise<void> {
    if (!this.session || payload.targetId !== this.session.userId) return;

    const pc = this.peerConnections.get(payload.fromId);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(payload.answer);
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
    }
  }

  // Handle ICE candidate
  private async handleIceCandidate(payload: any): Promise<void> {
    if (!this.session || payload.targetId !== this.session.userId) return;

    const pc = this.peerConnections.get(payload.fromId);
    if (!pc) return;

    try {
      await pc.addIceCandidate(payload.candidate);
    } catch (error) {
      console.error('❌ Failed to handle ICE candidate:', error);
    }
  }

  // Send signaling message
  private sendSignalingMessage(event: string, payload: any): void {
    if (!this.session) return;

    this.supabase.channel(`room:${this.session.roomId}`).send({
      type: 'broadcast',
      event,
      payload: {
        ...payload,
        fromId: this.session.userId
      }
    });
  }

  // Join room in database
  private async joinRoomInDatabase(): Promise<void> {
    if (!this.session) return;

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
      console.error('❌ Failed to join room in database:', error);
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
      for (const [participantId, pc] of this.peerConnections) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
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
    for (const [participantId, pc] of this.peerConnections) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    }

    this.isScreenSharing = false;
    this.emit('screen-share-stopped');
  }

  // Leave room
  async leaveRoom(): Promise<void> {
    console.log('🚪 Leaving room...');

    // Close all peer connections
    for (const [participantId, pc] of this.peerConnections) {
      pc.close();
    }
    this.peerConnections.clear();

    // Stop local media
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
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