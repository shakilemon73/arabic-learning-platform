/**
 * WorldClass Video SDK - Main Export
 * Enterprise-grade video streaming, audio, live chat, and collaboration SDK
 */

// Core SDK
export { VideoSDK } from './core/VideoSDK';
export type { 
  VideoSDKConfig, 
  SessionConfig, 
  MediaConstraints, 
  ParticipantInfo, 
  StreamQuality 
} from './core/VideoSDK';

// Import for utility function
import { VideoSDK, VideoSDKConfig } from './core/VideoSDK';

// Event System
export { EventEmitter } from './core/EventEmitter';

// Media Management
export { MediaManager } from './core/MediaManager';
export type { MediaDevice } from './core/MediaManager';

// Signaling
export { SignalingManager } from './core/SignalingManager';
export type { 
  SignalingMessage, 
  UserJoinedData, 
  UserLeftData, 
  MediaStateData 
} from './core/SignalingManager';

// Peer Connection Management
export { PeerConnectionManager } from './core/PeerConnectionManager';
export type { ConnectionStats } from './core/PeerConnectionManager';

// Chat Management
export { ChatManager } from './core/ChatManager';
export type { 
  ChatMessage
} from './core/ChatManager';

// Screen Sharing
export { ScreenShareManager } from './core/ScreenShareManager';

// Interactive Whiteboard
export { WhiteboardManager } from './core/WhiteboardManager';

// Breakout Rooms
export { BreakoutRoomManager } from './core/BreakoutRoomManager';

// Waiting Room
export { WaitingRoomManager } from './core/WaitingRoomManager';

// Interactions (Hand raising, polls, Q&A)
export { InteractionManager } from './core/InteractionManager';

// Virtual Backgrounds
export { VirtualBackgroundManager } from './core/VirtualBackgroundManager';

// Recording (Legacy)
export { RecordingManager as LegacyRecordingManager } from './core/RecordingManager';

// Moderation
export { ModeratorManager } from './core/ModeratorManager';

// Stream Quality
export { StreamQualityManager } from './core/StreamQualityManager';

// Enterprise Features
export { EnterpriseVideoSDK, createEnterpriseVideoSDK } from './enterprise/EnterpriseVideoSDK';
export type { EnterpriseVideoSDKConfig, ParticipantStream, RoomSession } from './enterprise/EnterpriseVideoSDK';

export { SFUManager } from './enterprise/SFUManager';
export type { SFUConfig, MediaStream as SFUMediaStream, SFUStats } from './enterprise/SFUManager';

export { AdaptiveBitrateManager } from './enterprise/AdaptiveBitrateManager';
export type { NetworkConditions, QualitySettings, AdaptationRules } from './enterprise/AdaptiveBitrateManager';

export { AudioProcessingManager } from './enterprise/AudioProcessingManager';
export type { AudioProcessingConfig, AudioMetrics, VoiceActivityEvent } from './enterprise/AudioProcessingManager';

export { NetworkResilienceManager } from './enterprise/NetworkResilienceManager';
export type { TURNServerConfig, NetworkPath, NetworkStats } from './enterprise/NetworkResilienceManager';

export { RecordingManager as EnterpriseRecordingManager } from './enterprise/RecordingManager';
export type { RecordingConfig, RecordingSession, RecordingMetrics } from './enterprise/RecordingManager';

// SDK Version
export const SDK_VERSION = '2.0.0';

// SDK Info
export const SDK_INFO = {
  name: 'Enterprise Video SDK',
  version: SDK_VERSION,
  description: 'Production-grade video conferencing platform comparable to Zoom, Teams, Google Meet',
  features: [
    'SFU Architecture - Scalable media distribution for 1000+ participants',
    'Adaptive Bitrate Streaming - Real-time quality optimization',
    'Advanced Audio Processing - AI-powered noise suppression & echo cancellation', 
    'Network Resilience - TURN servers, packet loss recovery, path optimization',
    'Professional Recording - Multi-stream composition with cloud storage',
    'Geographic Distribution - Global edge servers for low latency',
    'Load Balancing - Automatic participant distribution across SFU instances',
    'Real-time Analytics - Performance monitoring and optimization',
    'WebRTC Security - End-to-end encryption and secure connections',
    'Enterprise Integration - Supabase backend with PostgreSQL storage'
  ],
  compatibility: {
    browsers: ['Chrome 80+', 'Firefox 75+', 'Safari 13+', 'Edge 80+'],
    platforms: ['Web', 'Mobile Web', 'Electron', 'React Native'],
    backends: ['Supabase', 'PostgreSQL', 'WebRTC', 'TURN Servers']
  },
  enterpriseFeatures: {
    sfu: 'Selective Forwarding Unit for scalable media distribution',
    adaptiveBitrate: 'AI-driven quality adaptation based on network conditions',
    audioProcessing: 'Professional audio pipeline with ML-based enhancement',
    networkResilience: 'Multi-path networking with automatic failover',
    recording: 'Server-side recording with multi-stream composition',
    loadBalancing: 'Geographic distribution and automatic scaling'
  }
};

// Utility function to create SDK instance
export function createVideoSDK(config: VideoSDKConfig): VideoSDK {
  return new VideoSDK(config);
}