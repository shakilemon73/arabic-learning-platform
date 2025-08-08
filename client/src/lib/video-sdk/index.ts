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
  ChatMessage, 
  ChatReaction, 
  SendMessageData, 
  ChatSettings 
} from './core/ChatManager';

// Screen Sharing
export { ScreenShareManager } from './core/ScreenShareManager';
export type { ScreenShareOptions } from './core/ScreenShareManager';

// Interactive Whiteboard
export { WhiteboardManager } from './core/WhiteboardManager';
export type { 
  DrawingAction, 
  WhiteboardSettings 
} from './core/WhiteboardManager';

// Recording
export { RecordingManager } from './core/RecordingManager';
export type { 
  RecordingConfig, 
  Recording 
} from './core/RecordingManager';

// Moderation
export { ModeratorManager } from './core/ModeratorManager';
export type { 
  ModeratorAction, 
  ModerationRequest, 
  ParticipantPermissions, 
  RoomSettings 
} from './core/ModeratorManager';

// Stream Quality
export { StreamQualityManager } from './core/StreamQualityManager';
export type { 
  QualityProfile, 
  NetworkStats, 
  AdaptiveSettings 
} from './core/StreamQualityManager';

// SDK Version
export const SDK_VERSION = '1.0.0';

// SDK Info
export const SDK_INFO = {
  name: 'WorldClass Video SDK',
  version: SDK_VERSION,
  description: 'Enterprise-grade video streaming, audio, live chat, and collaboration SDK',
  features: [
    'Multi-participant video conferencing (1000+ users)',
    'Live streaming to unlimited audiences',
    'Real-time chat with moderation',
    'Interactive whiteboard collaboration',
    'Screen sharing and recording',
    'Advanced moderator controls',
    'Adaptive streaming quality',
    'WebRTC SFU architecture',
    'Supabase real-time backend',
    'AI-powered features'
  ],
  compatibility: {
    browsers: ['Chrome 80+', 'Firefox 75+', 'Safari 13+', 'Edge 80+'],
    platforms: ['Web', 'Mobile Web', 'Electron', 'React Native (planned)'],
    backends: ['Supabase', 'PostgreSQL', 'WebRTC']
  }
};

// Utility function to create SDK instance
export function createVideoSDK(config: VideoSDKConfig): VideoSDK {
  return new VideoSDK(config);
}