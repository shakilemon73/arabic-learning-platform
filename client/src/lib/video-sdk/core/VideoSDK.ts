/**
 * WorldClass Video SDK - Core Engine
 * Enterprise-grade video streaming, audio, live chat, and collaboration SDK
 * Built for scalability with WebRTC SFU architecture and Supabase backend
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from './EventEmitter';
import { MediaManager } from './MediaManager';
import { SignalingManager } from './SignalingManager';
import { PeerConnectionManager } from './PeerConnectionManager';
import { ChatManager } from './ChatManager';
import { ScreenShareManager } from './ScreenShareManager';
import { WhiteboardManager } from './WhiteboardManager';
import { RecordingManager } from './RecordingManager';
import { ModeratorManager } from './ModeratorManager';
import { StreamQualityManager } from './StreamQualityManager';

export interface VideoSDKConfig {
  supabaseUrl: string;
  supabaseKey: string;
  stunServers?: string[];
  turnServers?: Array<{
    urls: string;
    username?: string;
    credential?: string;
  }>;
  enableAI?: boolean;
  enableRecording?: boolean;
  enableWhiteboard?: boolean;
  maxParticipants?: number;
  bitrate?: {
    video: number;
    audio: number;
  };
}

export interface SessionConfig {
  roomId: string;
  userId: string;
  userRole: 'host' | 'moderator' | 'participant' | 'viewer';
  displayName: string;
  avatar?: string;
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

export interface ParticipantInfo {
  id: string;
  displayName: string;
  avatar?: string;
  role: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  joinedAt: Date;
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

  // Core managers
  private mediaManager!: MediaManager;
  private signalingManager!: SignalingManager;
  private peerConnectionManager!: PeerConnectionManager;
  private chatManager!: ChatManager;
  private screenShareManager!: ScreenShareManager;
  private whiteboardManager!: WhiteboardManager;
  private recordingManager!: RecordingManager;
  private moderatorManager!: ModeratorManager;
  private streamQualityManager!: StreamQualityManager;

  // State management
  private localStream: MediaStream | null = null;
  private participants = new Map<string, ParticipantInfo>();
  private remoteStreams = new Map<string, MediaStream>();

  constructor(config: VideoSDKConfig) {
    super();
    
    this.config = {
      stunServers: ['stun:stun.l.google.com:19302'],
      turnServers: [],
      enableAI: true,
      enableRecording: true,
      enableWhiteboard: true,
      maxParticipants: 1000,
      bitrate: {
        video: 2500, // kbps
        audio: 128   // kbps
      },
      ...config
    };

    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.initializeManagers();
  }

  private initializeManagers(): void {
    // Initialize core managers
    this.mediaManager = new MediaManager(this.config);
    this.signalingManager = new SignalingManager(this.supabase);
    this.peerConnectionManager = new PeerConnectionManager(this.config);
    this.chatManager = new ChatManager(this.supabase);
    this.screenShareManager = new ScreenShareManager();
    this.whiteboardManager = new WhiteboardManager(this.supabase);
    this.recordingManager = new RecordingManager(this.supabase);
    this.moderatorManager = new ModeratorManager(this.supabase);
    this.streamQualityManager = new StreamQualityManager();

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Signaling events
    this.signalingManager.on('user-joined', this.handleUserJoined.bind(this));
    this.signalingManager.on('user-left', this.handleUserLeft.bind(this));
    this.signalingManager.on('offer', this.handleOffer.bind(this));
    this.signalingManager.on('answer', this.handleAnswer.bind(this));
    this.signalingManager.on('ice-candidate', this.handleIceCandidate.bind(this));

    // Peer connection events
    this.peerConnectionManager.on('remote-stream', this.handleRemoteStream.bind(this));
    this.peerConnectionManager.on('connection-state-change', this.handleConnectionStateChange.bind(this));

    // Chat events
    this.chatManager.on('message-received', this.handleChatMessage.bind(this));

    // Screen share events
    this.screenShareManager.on('screen-share-started', this.handleScreenShareStarted.bind(this));
    this.screenShareManager.on('screen-share-stopped', this.handleScreenShareStopped.bind(this));

    // Stream quality events
    this.streamQualityManager.on('quality-changed', this.handleQualityChanged.bind(this));
  }

  /**
   * Initialize the SDK with session configuration
   */
  async initialize(sessionConfig: SessionConfig): Promise<void> {
    try {
      if (this.isInitialized) {
        throw new Error('SDK already initialized');
      }

      this.session = sessionConfig;
      
      // Initialize signaling connection
      await this.signalingManager.connect(sessionConfig.roomId, sessionConfig.userId);
      
      // Initialize media devices
      await this.mediaManager.initialize();
      
      this.isInitialized = true;
      this.emit('sdk-initialized', { sessionConfig });
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
      throw error;
    }
  }

  /**
   * Join a room and start the session
   */
  async joinRoom(mediaConstraints?: MediaConstraints): Promise<void> {
    try {
      if (!this.isInitialized) {
        throw new Error('SDK not initialized');
      }

      if (!this.session) {
        throw new Error('Session configuration missing');
      }

      // Get user media
      this.localStream = await this.mediaManager.getUserMedia(mediaConstraints);
      
      // Join room in database
      await this.supabase
        .from('participants')
        .insert({
          room_id: this.session.roomId,
          user_id: this.session.userId,
          display_name: this.session.displayName,
          user_role: this.session.userRole,
          avatar_url: this.session.avatar,
          is_connected: true
        });

      // Announce joining to other participants
      await this.signalingManager.broadcastUserJoined({
        userId: this.session.userId,
        displayName: this.session.displayName,
        role: this.session.userRole,
        avatar: this.session.avatar
      });

      this.isConnected = true;
      this.emit('room-joined', { 
        roomId: this.session.roomId, 
        localStream: this.localStream 
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
      throw error;
    }
  }

  /**
   * Leave the room and cleanup
   */
  async leaveRoom(): Promise<void> {
    try {
      if (!this.session || !this.isConnected) {
        return;
      }

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Stop screen sharing if active
      await this.stopScreenShare();

      // Update database
      await this.supabase
        .from('participants')
        .update({ 
          is_connected: false,
          left_at: new Date().toISOString()
        })
        .eq('room_id', this.session.roomId)
        .eq('user_id', this.session.userId);

      // Announce leaving
      await this.signalingManager.broadcastUserLeft({
        userId: this.session.userId
      });

      // Cleanup connections
      this.peerConnectionManager.closeAllConnections();
      this.participants.clear();
      this.remoteStreams.clear();

      this.isConnected = false;
      this.emit('room-left', { roomId: this.session.roomId });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
    }
  }

  /**
   * Toggle local video on/off
   */
  async toggleVideo(enabled?: boolean): Promise<boolean> {
    try {
      const isEnabled = await this.mediaManager.toggleVideo(this.localStream, enabled);
      
      // Update participant state
      await this.updateParticipantState({
        is_video_enabled: isEnabled
      });

      this.emit('video-toggled', { enabled: isEnabled });
      return isEnabled;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
      return false;
    }
  }

  /**
   * Toggle local audio on/off
   */
  async toggleAudio(enabled?: boolean): Promise<boolean> {
    try {
      const isEnabled = await this.mediaManager.toggleAudio(this.localStream, enabled);
      
      // Update participant state
      await this.updateParticipantState({
        is_audio_enabled: isEnabled
      });

      this.emit('audio-toggled', { enabled: isEnabled });
      return isEnabled;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
      return false;
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(): Promise<MediaStream | null> {
    try {
      const screenStream = await this.screenShareManager.startScreenShare();
      
      if (screenStream) {
        // Replace video track in peer connections
        await this.peerConnectionManager.replaceVideoTrack(screenStream.getVideoTracks()[0]);
        
        // Update participant state
        await this.updateParticipantState({
          is_screen_sharing: true
        });

        this.emit('screen-share-started', { stream: screenStream });
      }

      return screenStream;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
      return null;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare(): Promise<void> {
    try {
      await this.screenShareManager.stopScreenShare();
      
      // Restore camera video track
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          await this.peerConnectionManager.replaceVideoTrack(videoTrack);
        }
      }

      // Update participant state
      await this.updateParticipantState({
        is_screen_sharing: false
      });

      this.emit('screen-share-stopped');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
    }
  }

  /**
   * Send chat message
   */
  async sendChatMessage(message: string, type: 'text' | 'emoji' | 'file' = 'text'): Promise<void> {
    try {
      if (!this.session) {
        throw new Error('Session not initialized');
      }

      await this.chatManager.sendMessage({
        roomId: this.session.roomId,
        userId: this.session.userId,
        displayName: this.session.displayName,
        message,
        type
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
    }
  }

  /**
   * Start recording session
   */
  async startRecording(): Promise<void> {
    try {
      if (!this.session) {
        throw new Error('Session not initialized');
      }

      // Check if user has permission
      if (this.session.userRole !== 'host' && this.session.userRole !== 'moderator') {
        throw new Error('Permission denied: Only hosts and moderators can start recording');
      }

      await this.recordingManager.startRecording({
        roomId: this.session.roomId,
        initiatedBy: this.session.userId,
        recordVideo: true,
        recordAudio: true,
        recordScreen: false,
        quality: 'medium' as const,
        format: 'mp4'
      });

      this.emit('recording-started');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
    }
  }

  /**
   * Stop recording session
   */
  async stopRecording(): Promise<void> {
    try {
      if (!this.session) {
        throw new Error('Session not initialized');
      }

      await this.recordingManager.stopRecording(this.session.roomId);
      this.emit('recording-stopped');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
    }
  }

  /**
   * Change stream quality
   */
  async setStreamQuality(quality: StreamQuality): Promise<void> {
    try {
      await this.streamQualityManager.setQuality(quality);
      
      // Update peer connections with new quality
      await this.peerConnectionManager.updateStreamQuality(quality);

      this.emit('stream-quality-changed', { quality });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
    }
  }

  /**
   * Moderator: Mute participant
   */
  async muteParticipant(participantId: string, mediaType: 'audio' | 'video'): Promise<void> {
    try {
      if (!this.session) {
        throw new Error('Session not initialized');
      }

      // Check moderator permissions
      if (this.session.userRole !== 'host' && this.session.userRole !== 'moderator') {
        throw new Error('Permission denied: Only hosts and moderators can mute participants');
      }

      await this.moderatorManager.muteParticipant({
        roomId: this.session.roomId,
        moderatorId: this.session.userId,
        participantId,
        mediaType,
        action: 'mute'
      });

      this.emit('participant-muted', { participantId, mediaType });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
    }
  }

  /**
   * Get all participants in the room
   */
  getParticipants(): ParticipantInfo[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get remote stream by participant ID
   */
  getRemoteStream(participantId: string): MediaStream | null {
    return this.remoteStreams.get(participantId) || null;
  }

  /**
   * Check if SDK is initialized
   */
  isSDKInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if connected to room
   */
  isRoomConnected(): boolean {
    return this.isConnected;
  }

  // Private helper methods
  private async updateParticipantState(updates: any): Promise<void> {
    if (!this.session) return;

    await this.supabase
      .from('participants')
      .update(updates)
      .eq('room_id', this.session.roomId)
      .eq('user_id', this.session.userId);
  }

  private handleUserJoined(data: any): void {
    const participant: ParticipantInfo = {
      id: data.userId,
      displayName: data.displayName,
      avatar: data.avatar,
      role: data.role,
      isVideoEnabled: true,
      isAudioEnabled: true,
      isScreenSharing: false,
      connectionQuality: 'good',
      joinedAt: new Date()
    };

    this.participants.set(data.userId, participant);
    this.emit('participant-joined', { participant });
  }

  private handleUserLeft(data: any): void {
    this.participants.delete(data.userId);
    this.remoteStreams.delete(data.userId);
    this.peerConnectionManager.closeConnection(data.userId);
    this.emit('participant-left', { participantId: data.userId });
  }

  private async handleOffer(data: any): Promise<void> {
    // Handle WebRTC offer from another participant
    await this.peerConnectionManager.handleOffer(data.fromUserId, data.offer);
  }

  private async handleAnswer(data: any): Promise<void> {
    // Handle WebRTC answer from another participant
    await this.peerConnectionManager.handleAnswer(data.fromUserId, data.answer);
  }

  private async handleIceCandidate(data: any): Promise<void> {
    // Handle ICE candidate from another participant
    await this.peerConnectionManager.handleIceCandidate(data.fromUserId, data.candidate);
  }

  private handleRemoteStream(data: any): void {
    this.remoteStreams.set(data.participantId, data.stream);
    this.emit('remote-stream-added', {
      participantId: data.participantId,
      stream: data.stream
    });
  }

  private handleConnectionStateChange(data: any): void {
    const participant = this.participants.get(data.participantId);
    if (participant) {
      participant.connectionQuality = data.quality;
      this.emit('connection-quality-changed', {
        participantId: data.participantId,
        quality: data.quality
      });
    }
  }

  private handleChatMessage(data: any): void {
    this.emit('chat-message-received', data);
  }

  private handleScreenShareStarted(data: any): void {
    this.emit('screen-share-started', data);
  }

  private handleScreenShareStopped(data: any): void {
    this.emit('screen-share-stopped', data);
  }

  private handleQualityChanged(data: any): void {
    this.emit('stream-quality-changed', data);
  }

  /**
   * Cleanup and destroy SDK instance
   */
  async destroy(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.leaveRoom();
      }

      // Cleanup managers
      this.signalingManager?.disconnect();
      this.mediaManager?.destroy();
      this.peerConnectionManager?.destroy();
      this.chatManager?.destroy();
      this.screenShareManager?.destroy();
      this.whiteboardManager?.destroy();
      this.recordingManager?.destroy();
      this.moderatorManager?.destroy();
      this.streamQualityManager?.destroy();

      this.participants.clear();
      this.remoteStreams.clear();
      this.removeAllListeners();

      this.isInitialized = false;
      this.isConnected = false;
      this.session = null;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.emit('sdk-error', { error: errorMsg });
    }
  }
}

export default VideoSDK;