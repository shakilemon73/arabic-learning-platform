import { EventEmitter } from '../core/EventEmitter';
import { SupabaseClient } from '@supabase/supabase-js';
import { SFUManager, SFUConfig } from './SFUManager';
import { AdaptiveBitrateManager } from './AdaptiveBitrateManager';
import { AudioProcessingManager, AudioProcessingConfig } from './AudioProcessingManager';
import { NetworkResilienceManager } from './NetworkResilienceManager';
import { RecordingManager, RecordingConfig } from './RecordingManager';

export interface EnterpriseVideoSDKConfig {
  supabaseUrl: string;
  supabaseKey: string;
  region: 'us-east' | 'us-west' | 'eu-west' | 'asia-pacific';
  maxParticipants: number;
  enableSFU: boolean;
  enableAdaptiveBitrate: boolean;
  enableAudioProcessing: boolean;
  enableNetworkResilience: boolean;
  enableRecording: boolean;
  audioConfig?: Partial<AudioProcessingConfig>;
  recordingConfig?: Partial<RecordingConfig>;
}

export interface ParticipantStream {
  participantId: string;
  stream: MediaStream;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
}

export interface RoomSession {
  roomId: string;
  userId: string;
  displayName: string;
  role: 'host' | 'moderator' | 'participant';
  isRecording: boolean;
  startTime: Date;
}

/**
 * Enterprise Video SDK
 * Full-featured video conferencing platform comparable to Zoom, Teams, Google Meet
 */
export class EnterpriseVideoSDK extends EventEmitter {
  private supabase: SupabaseClient;
  private config: EnterpriseVideoSDKConfig;
  private currentSession: RoomSession | null = null;
  private isInitialized = false;
  private isConnected = false;

  // Enterprise managers
  private sfuManager: SFUManager | null = null;
  private adaptiveBitrateManager: AdaptiveBitrateManager | null = null;
  private audioProcessingManager: AudioProcessingManager | null = null;
  private networkResilienceManager: NetworkResilienceManager | null = null;
  private recordingManager: RecordingManager | null = null;

  // Media management
  private localStream: MediaStream | null = null;
  private processedAudioStream: MediaStream | null = null;
  private participantStreams = new Map<string, ParticipantStream>();
  private peerConnections = new Map<string, RTCPeerConnection>();

  // Real-time communication
  private rtcConfiguration: RTCConfiguration;
  private signalChannel: any = null;

  constructor(config: EnterpriseVideoSDKConfig) {
    super();
    
    this.config = config;
    
    // Initialize Supabase client
    this.supabase = this.createSupabaseClient();
    
    // Configure enterprise RTCPeerConnection
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
    
    console.log('🚀 Enterprise Video SDK initialized');
  }

  /**
   * Create optimized Supabase client for video conferencing
   */
  private createSupabaseClient(): SupabaseClient {
    const { createClient } = require('@supabase/supabase-js');
    
    return createClient(this.config.supabaseUrl, this.config.supabaseKey, {
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
  }

  /**
   * Initialize all enterprise features
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing enterprise video features...');

      // Initialize SFU Manager for scalable media distribution
      if (this.config.enableSFU) {
        const sfuConfig: SFUConfig = {
          region: this.config.region,
          maxParticipants: this.config.maxParticipants,
          bitrateLimits: {
            video: { min: 150, max: 8000 },
            audio: { min: 64, max: 320 }
          },
          redundancy: true
        };
        
        this.sfuManager = new SFUManager(this.supabase, sfuConfig);
        
        // Forward SFU events
        this.sfuManager.on('sfu-initialized', (data) => this.emit('sfu-ready', data));
        this.sfuManager.on('stream-received', (data) => this.handleSFUStream(data));
        this.sfuManager.on('performance-alert', (data) => this.emit('performance-alert', data));
      }

      // Initialize Audio Processing for professional audio quality
      if (this.config.enableAudioProcessing) {
        this.audioProcessingManager = new AudioProcessingManager(this.config.audioConfig);
        await this.audioProcessingManager.initialize();
        
        // Forward audio events
        this.audioProcessingManager.on('voice-activity', (data) => this.emit('voice-activity', data));
        this.audioProcessingManager.on('audio-metrics', (data) => this.emit('audio-metrics', data));
      }

      // Initialize Network Resilience for robust connections
      if (this.config.enableNetworkResilience) {
        this.networkResilienceManager = new NetworkResilienceManager();
        
        // Forward network events
        this.networkResilienceManager.on('path-changed', (data) => this.emit('network-path-changed', data));
        this.networkResilienceManager.on('packet-loss-recovery', (data) => this.emit('packet-loss-recovery', data));
      }

      // Initialize Recording Manager for professional recording
      if (this.config.enableRecording) {
        this.recordingManager = new RecordingManager(this.supabase);
        
        // Forward recording events
        this.recordingManager.on('recording-started', (data) => this.emit('recording-started', data));
        this.recordingManager.on('recording-completed', (data) => this.emit('recording-completed', data));
      }

      this.isInitialized = true;
      console.log('✅ Enterprise video SDK initialized successfully');
      this.emit('sdk-initialized');

    } catch (error) {
      console.error('❌ Failed to initialize enterprise SDK:', error);
      throw error;
    }
  }

  /**
   * Join room with enterprise features
   */
  async joinRoom(sessionConfig: {
    roomId: string;
    userId: string;
    displayName: string;
    role?: 'host' | 'moderator' | 'participant';
  }): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log(`🚪 Joining room ${sessionConfig.roomId} with enterprise features...`);

      // Create session
      this.currentSession = {
        roomId: sessionConfig.roomId,
        userId: sessionConfig.userId,
        displayName: sessionConfig.displayName,
        role: sessionConfig.role || 'participant',
        isRecording: false,
        startTime: new Date()
      };

      // Initialize SFU for this room
      if (this.sfuManager) {
        await this.sfuManager.initializeRoom(sessionConfig.roomId);
      }

      // Set up real-time signaling
      await this.setupEnterpriseSignaling();

      // Initialize media with enterprise processing
      await this.initializeEnterpriseMedia();

      // Start network monitoring
      if (this.networkResilienceManager) {
        await this.networkResilienceManager.startMonitoring(this.peerConnections);
      }

      // Start adaptive bitrate management
      if (this.config.enableAdaptiveBitrate) {
        this.adaptiveBitrateManager = new AdaptiveBitrateManager(
          sessionConfig.userId,
          this.peerConnections
        );
        this.adaptiveBitrateManager.startMonitoring();
        
        // Forward quality events
        this.adaptiveBitrateManager.on('quality-adapted', (data) => this.emit('quality-adapted', data));
      }

      this.isConnected = true;
      console.log('✅ Successfully joined room with enterprise features');
      this.emit('room-joined', { session: this.currentSession });

    } catch (error) {
      console.error('❌ Failed to join room:', error);
      throw error;
    }
  }

  /**
   * Set up enterprise-grade signaling
   */
  private async setupEnterpriseSignaling(): Promise<void> {
    if (!this.currentSession) return;

    const channelName = `enterprise-room-${this.currentSession.roomId}`;
    this.signalChannel = this.supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: this.currentSession.userId }
      }
    });

    // Set up comprehensive event handlers
    this.signalChannel
      .on('broadcast', { event: 'webrtc-signal' }, (payload: any) => {
        this.handleWebRTCSignal(payload.payload);
      })
      .on('broadcast', { event: 'media-state-change' }, (payload: any) => {
        this.handleMediaStateChange(payload.payload);
      })
      .on('broadcast', { event: 'quality-request' }, (payload: any) => {
        this.handleQualityRequest(payload.payload);
      })
      .on('presence', { event: 'sync' }, () => {
        this.handlePresenceSync();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        this.handleParticipantJoined(key, newPresences[0]);
      })
      .on('presence', { event: 'leave' }, ({ key }: any) => {
        this.handleParticipantLeft(key);
      });

    // Subscribe and track presence
    await this.signalChannel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await this.signalChannel.track({
          userId: this.currentSession!.userId,
          displayName: this.currentSession!.displayName,
          role: this.currentSession!.role,
          hasVideo: true,
          hasAudio: true,
          joinedAt: new Date().toISOString()
        });
      }
    });

    console.log('✅ Enterprise signaling established');
  }

  /**
   * Initialize media with enterprise processing
   */
  private async initializeEnterpriseMedia(): Promise<void> {
    try {
      console.log('🎥 Initializing enterprise media pipeline...');

      // Get user media with optimal settings
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Process audio with enterprise features
      if (this.audioProcessingManager && this.localStream) {
        this.processedAudioStream = await this.audioProcessingManager.processAudioStream(this.localStream);
        
        // Replace audio tracks with processed audio
        const videoTracks = this.localStream.getVideoTracks();
        const processedAudioTracks = this.processedAudioStream.getAudioTracks();
        
        this.localStream = new MediaStream([...videoTracks, ...processedAudioTracks]);
      }

      console.log('✅ Enterprise media pipeline initialized');
      this.emit('media-initialized', { 
        hasVideo: this.localStream.getVideoTracks().length > 0,
        hasAudio: this.localStream.getAudioTracks().length > 0 
      });

    } catch (error) {
      console.error('❌ Failed to initialize enterprise media:', error);
      throw error;
    }
  }

  /**
   * Handle WebRTC signaling with enterprise features
   */
  private async handleWebRTCSignal(signal: any): Promise<void> {
    const { type, fromUserId, payload } = signal;

    try {
      let peerConnection = this.peerConnections.get(fromUserId);
      
      if (!peerConnection) {
        peerConnection = await this.createEnterprisePeerConnection(fromUserId);
      }

      switch (type) {
        case 'offer':
          await peerConnection.setRemoteDescription(payload);
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          
          await this.sendSignal('answer', fromUserId, answer);
          break;

        case 'answer':
          await peerConnection.setRemoteDescription(payload);
          break;

        case 'ice-candidate':
          await peerConnection.addIceCandidate(payload);
          break;
      }

    } catch (error) {
      console.error('❌ WebRTC signaling error:', error);
    }
  }

  /**
   * Create enterprise-grade peer connection
   */
  private async createEnterprisePeerConnection(participantId: string): Promise<RTCPeerConnection> {
    try {
      const peerConnection = new RTCPeerConnection(this.rtcConfiguration);

      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, this.localStream!);
        });
      }

      // Handle remote streams
      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;
        this.handleRemoteStream(participantId, stream);
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal('ice-candidate', participantId, event.candidate);
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        this.handleConnectionStateChange(participantId, peerConnection.connectionState);
      };

      this.peerConnections.set(participantId, peerConnection);
      console.log(`✅ Enterprise peer connection created for ${participantId}`);

      return peerConnection;

    } catch (error) {
      console.error(`❌ Failed to create peer connection for ${participantId}:`, error);
      throw error;
    }
  }

  /**
   * Handle remote streams with enterprise processing
   */
  private handleRemoteStream(participantId: string, stream: MediaStream): void {
    const participantStream: ParticipantStream = {
      participantId,
      stream,
      quality: 'medium', // Will be updated by adaptive bitrate
      isAudioEnabled: stream.getAudioTracks().length > 0,
      isVideoEnabled: stream.getVideoTracks().length > 0,
      connectionQuality: 'good'
    };

    this.participantStreams.set(participantId, participantStream);
    
    console.log(`📺 Received enterprise stream from ${participantId}`);
    this.emit('participant-stream-added', { participantStream });
  }

  /**
   * Start recording with enterprise features
   */
  async startRecording(customConfig?: Partial<RecordingConfig>): Promise<string> {
    if (!this.recordingManager || !this.currentSession) {
      throw new Error('Recording not available');
    }

    try {
      const sessionId = await this.recordingManager.startRecording(
        this.currentSession.roomId,
        this.getAllStreams(),
        customConfig
      );

      this.currentSession.isRecording = true;
      console.log(`🎬 Recording started: ${sessionId}`);
      
      return sessionId;

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<void> {
    if (!this.recordingManager) {
      throw new Error('Recording not available');
    }

    try {
      await this.recordingManager.stopRecording();
      
      if (this.currentSession) {
        this.currentSession.isRecording = false;
      }

      console.log('⏹️ Recording stopped');

    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Get all participant streams for recording/processing
   */
  private getAllStreams(): Map<string, MediaStream> {
    const allStreams = new Map<string, MediaStream>();
    
    // Add local stream
    if (this.localStream && this.currentSession) {
      allStreams.set(this.currentSession.userId, this.localStream);
    }
    
    // Add participant streams
    for (const [participantId, participantStream] of this.participantStreams) {
      allStreams.set(participantId, participantStream.stream);
    }
    
    return allStreams;
  }

  /**
   * Handle various enterprise events
   */
  private handleSFUStream(data: any): void {
    // Process SFU stream data
    this.emit('sfu-stream-received', data);
  }

  private handleMediaStateChange(data: any): void {
    const { participantId, isVideoEnabled, isAudioEnabled } = data;
    const participant = this.participantStreams.get(participantId);
    
    if (participant) {
      participant.isVideoEnabled = isVideoEnabled;
      participant.isAudioEnabled = isAudioEnabled;
      this.emit('participant-media-changed', { participantId, isVideoEnabled, isAudioEnabled });
    }
  }

  private handleQualityRequest(data: any): void {
    // Handle quality adaptation requests
    if (this.adaptiveBitrateManager) {
      this.emit('quality-request-received', data);
    }
  }

  private handlePresenceSync(): void {
    const users = this.signalChannel?.presenceState() || {};
    this.emit('participants-updated', { participants: Object.keys(users) });
  }

  private async handleParticipantJoined(userId: string, presence: any): Promise<void> {
    if (userId === this.currentSession?.userId) return;

    console.log(`👥 Participant joined: ${userId}`);
    
    // Create peer connection for new participant
    const peerConnection = await this.createEnterprisePeerConnection(userId);
    
    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await this.sendSignal('offer', userId, offer);
    
    this.emit('participant-joined', { userId, presence });
  }

  private handleParticipantLeft(userId: string): void {
    console.log(`👋 Participant left: ${userId}`);
    
    // Cleanup peer connection
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
    
    // Remove participant stream
    this.participantStreams.delete(userId);
    
    this.emit('participant-left', { userId });
  }

  private handleConnectionStateChange(participantId: string, state: RTCPeerConnectionState): void {
    console.log(`🔗 Connection state changed for ${participantId}: ${state}`);
    
    const participant = this.participantStreams.get(participantId);
    if (participant) {
      participant.connectionQuality = this.mapConnectionStateToQuality(state);
      this.emit('connection-quality-changed', { participantId, quality: participant.connectionQuality });
    }
  }

  private mapConnectionStateToQuality(state: RTCPeerConnectionState): 'excellent' | 'good' | 'poor' | 'critical' {
    switch (state) {
      case 'connected': return 'excellent';
      case 'connecting': return 'good';
      case 'disconnected': return 'poor';
      case 'failed': return 'critical';
      default: return 'good';
    }
  }

  /**
   * Send signaling message
   */
  private async sendSignal(type: string, toUserId: string, payload: any): Promise<void> {
    if (!this.signalChannel || !this.currentSession) return;
    
    await this.signalChannel.send({
      type: 'broadcast',
      event: 'webrtc-signal',
      payload: {
        type,
        fromUserId: this.currentSession.userId,
        toUserId,
        payload
      }
    });
  }

  /**
   * Toggle local video
   */
  async toggleVideo(): Promise<boolean> {
    if (!this.localStream) return false;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      
      // Notify other participants
      await this.sendMediaStateChange();
      
      console.log(`📹 Video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
      this.emit('local-video-toggled', { enabled: videoTrack.enabled });
      
      return videoTrack.enabled;
    }
    
    return false;
  }

  /**
   * Toggle local audio
   */
  async toggleAudio(): Promise<boolean> {
    if (!this.localStream) return false;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      
      // Notify other participants
      await this.sendMediaStateChange();
      
      console.log(`🎤 Audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
      this.emit('local-audio-toggled', { enabled: audioTrack.enabled });
      
      return audioTrack.enabled;
    }
    
    return false;
  }

  /**
   * Send media state change notification
   */
  private async sendMediaStateChange(): Promise<void> {
    if (!this.signalChannel || !this.currentSession || !this.localStream) return;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    const audioTrack = this.localStream.getAudioTracks()[0];
    
    await this.signalChannel.send({
      type: 'broadcast',
      event: 'media-state-change',
      payload: {
        participantId: this.currentSession.userId,
        isVideoEnabled: videoTrack?.enabled || false,
        isAudioEnabled: audioTrack?.enabled || false
      }
    });
  }

  /**
   * Leave room and cleanup
   */
  async leaveRoom(): Promise<void> {
    try {
      console.log('🚪 Leaving room with enterprise cleanup...');

      // Stop recording if active
      if (this.currentSession?.isRecording) {
        await this.stopRecording();
      }

      // Cleanup peer connections
      for (const [participantId, peerConnection] of this.peerConnections) {
        peerConnection.close();
      }
      this.peerConnections.clear();

      // Stop enterprise managers
      if (this.adaptiveBitrateManager) {
        this.adaptiveBitrateManager.stopMonitoring();
        this.adaptiveBitrateManager = null;
      }

      if (this.networkResilienceManager) {
        this.networkResilienceManager.stopMonitoring();
      }

      if (this.audioProcessingManager) {
        this.audioProcessingManager.stopProcessing();
      }

      if (this.sfuManager) {
        await this.sfuManager.cleanup();
      }

      // Disconnect signaling
      if (this.signalChannel) {
        await this.signalChannel.unsubscribe();
        this.signalChannel = null;
      }

      // Stop media tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Clear participant streams
      this.participantStreams.clear();

      this.isConnected = false;
      this.currentSession = null;

      console.log('✅ Successfully left room');
      this.emit('room-left');

    } catch (error) {
      console.error('❌ Failed to leave room:', error);
      throw error;
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession(): RoomSession | null {
    return this.currentSession;
  }

  /**
   * Get participant streams
   */
  getParticipantStreams(): Map<string, ParticipantStream> {
    return new Map(this.participantStreams);
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Check if connected
   */
  isConnectedToRoom(): boolean {
    return this.isConnected;
  }

  /**
   * Get real-time statistics
   */
  async getStatistics(): Promise<any> {
    const stats: any = {
      session: this.currentSession,
      participantCount: this.participantStreams.size,
      connectionState: this.isConnected ? 'connected' : 'disconnected'
    };

    // Get SFU statistics
    if (this.sfuManager?.isHealthy()) {
      stats.sfu = await this.sfuManager.getCurrentStats();
    }

    // Get network statistics
    if (this.networkResilienceManager?.isActive()) {
      stats.network = this.networkResilienceManager.getNetworkStats();
    }

    // Get adaptive bitrate statistics
    if (this.adaptiveBitrateManager) {
      stats.quality = {
        current: this.adaptiveBitrateManager.getCurrentQuality(),
        network: this.adaptiveBitrateManager.getNetworkConditions(),
        history: this.adaptiveBitrateManager.getAdaptationHistory()
      };
    }

    // Get audio processing statistics
    if (this.audioProcessingManager?.isActive()) {
      stats.audio = this.audioProcessingManager.getProcessingStats();
    }

    return stats;
  }

  /**
   * Cleanup all resources
   */
  async destroy(): Promise<void> {
    if (this.isConnected) {
      await this.leaveRoom();
    }

    // Destroy enterprise managers
    if (this.recordingManager) {
      this.recordingManager.destroy();
    }

    if (this.audioProcessingManager) {
      this.audioProcessingManager.cleanup();
    }

    if (this.networkResilienceManager) {
      this.networkResilienceManager.cleanup();
    }

    this.removeAllListeners();
    this.isInitialized = false;

    console.log('🧹 Enterprise Video SDK destroyed');
  }
}

// Export singleton instance creator
export function createEnterpriseVideoSDK(config: EnterpriseVideoSDKConfig): EnterpriseVideoSDK {
  return new EnterpriseVideoSDK(config);
}