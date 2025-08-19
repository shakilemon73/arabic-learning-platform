/**
 * VideoSDKProvider - React Context Provider for Real Video Conferencing
 * Manages real WebRTC connections and video/audio streams
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { VideoSDK, VideoSDKConfig, SessionConfig, ParticipantInfo } from '@/lib/video-sdk';

interface VideoSDKContextType {
  sdk: VideoSDK | null;
  isInitialized: boolean;
  isConnected: boolean;
  localStream: MediaStream | null;
  participants: ParticipantInfo[];
  currentUser: SessionConfig | null;
  // SDK methods
  initializeSDK: (config: VideoSDKConfig) => Promise<void>;
  joinRoom: (sessionConfig: SessionConfig) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleVideo: (enabled?: boolean) => Promise<boolean>;
  toggleAudio: (enabled?: boolean) => Promise<boolean>;
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  // SDK state
  error: string | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isScreenSharing: boolean;
}

const VideoSDKContext = createContext<VideoSDKContextType | undefined>(undefined);

interface VideoSDKProviderProps {
  children: ReactNode;
}

export function VideoSDKProvider({ children }: VideoSDKProviderProps) {
  const [sdk, setSdk] = useState<VideoSDK | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Initialize SDK
  const initializeSDK = async (config: VideoSDKConfig): Promise<void> => {
    try {
      if (sdk) {
        await sdk.destroy();
      }

      console.log('🚀 Initializing VideoSDK with config:', config);
      const newSDK = new VideoSDK(config);
      setSdk(newSDK);
      
      // Setup event listeners for real-time communication
      setupSDKEventListeners(newSDK);
      
      setIsInitialized(true);
      setError(null);
      console.log('✅ VideoSDK initialized successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize SDK';
      console.error('❌ SDK initialization failed:', errorMessage);
      setError(errorMessage);
      setIsInitialized(false);
      throw err;
    }
  };

  // Join room for real-time video conversation
  const joinRoom = async (sessionConfig: SessionConfig): Promise<void> => {
    if (!sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      setError(null);
      console.log('🔄 Joining video room:', sessionConfig);
      
      // Join room and establish WebRTC connections
      await sdk.joinRoom(sessionConfig);
      setCurrentUser(sessionConfig);
      setIsConnected(true);
      
      // Get local video stream immediately
      const stream = sdk.getLocalStream();
      if (stream) {
        setLocalStream(stream);
        setIsVideoEnabled(sdk.isVideoEnabledState());
        setIsAudioEnabled(sdk.isAudioEnabledState());
        console.log('🎥 Local video stream ready');
      }

      console.log('✅ Successfully joined video room');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      console.error('❌ Failed to join video room:', errorMessage);
      setError(errorMessage);
      setIsConnected(false);
      throw err;
    }
  };

  // Leave room
  const leaveRoom = async (): Promise<void> => {
    if (!sdk) return;

    try {
      console.log('🚪 Leaving video room...');
      await sdk.leaveRoom();
      setIsConnected(false);
      setLocalStream(null);
      setParticipants([]);
      setCurrentUser(null);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      setIsScreenSharing(false);
      console.log('✅ Left video room successfully');
    } catch (err) {
      console.error('❌ Failed to leave room:', err);
      setError('Failed to leave room');
    }
  };

  // Toggle video
  const toggleVideo = async (enabled?: boolean): Promise<boolean> => {
    if (!sdk) return false;

    try {
      const newState = await sdk.toggleVideo(enabled);
      setIsVideoEnabled(newState);
      return newState;
    } catch (err) {
      console.error('❌ Failed to toggle video:', err);
      return false;
    }
  };

  // Toggle audio
  const toggleAudio = async (enabled?: boolean): Promise<boolean> => {
    if (!sdk) return false;

    try {
      const newState = await sdk.toggleAudio(enabled);
      setIsAudioEnabled(newState);
      return newState;
    } catch (err) {
      console.error('❌ Failed to toggle audio:', err);
      return false;
    }
  };

  // Start screen sharing
  const startScreenShare = async (): Promise<MediaStream | null> => {
    if (!sdk) return null;

    try {
      const stream = await sdk.startScreenShare();
      setIsScreenSharing(true);
      return stream;
    } catch (err) {
      console.error('❌ Failed to start screen share:', err);
      return null;
    }
  };

  // Stop screen sharing
  const stopScreenShare = async (): Promise<void> => {
    if (!sdk) return;

    try {
      await sdk.stopScreenShare();
      setIsScreenSharing(false);
    } catch (err) {
      console.error('❌ Failed to stop screen share:', err);
    }
  };

  // Send chat message (placeholder)
  const sendChatMessage = async (message: string): Promise<void> => {
    console.log('💬 Chat message sent:', message);
  };

  // Setup real-time event listeners
  const setupSDKEventListeners = (sdkInstance: VideoSDK): void => {
    console.log('🎧 Setting up SDK event listeners...');

    // Connection events
    sdkInstance.on('connected', (data) => {
      console.log('🔗 Connected to room:', data.roomId);
      setIsConnected(true);
    });

    sdkInstance.on('disconnected', () => {
      console.log('🔌 Disconnected from room');
      setIsConnected(false);
      setLocalStream(null);
      setParticipants([]);
    });

    // Local stream events
    sdkInstance.on('local-stream', (data) => {
      console.log('📹 Local stream received');
      setLocalStream(data.stream);
    });

    // Participant events for real-time video
    sdkInstance.on('participant-joined', (data) => {
      console.log('👤 New participant joined:', data.participant.name);
      setParticipants(prev => [...prev, data.participant]);
    });

    sdkInstance.on('participant-left', (data) => {
      console.log('👋 Participant left:', data.participantId);
      setParticipants(prev => prev.filter(p => p.id !== data.participantId));
    });

    sdkInstance.on('participant-updated', (data) => {
      console.log('🔄 Participant updated:', data.participant.name);
      setParticipants(prev => 
        prev.map(p => p.id === data.participant.id ? data.participant : p)
      );
    });

    // Remote video stream events - CRITICAL FOR REAL CONVERSATIONS
    sdkInstance.on('remote-stream', (data) => {
      console.log('🎬 Remote video stream received from:', data.participantId);
      // This will trigger video element updates in VideoConference component
    });

    // Media state events
    sdkInstance.on('video-toggled', (data) => {
      setIsVideoEnabled(data.enabled);
    });

    sdkInstance.on('audio-toggled', (data) => {
      setIsAudioEnabled(data.enabled);
    });

    sdkInstance.on('screen-share-started', () => {
      setIsScreenSharing(true);
    });

    sdkInstance.on('screen-share-stopped', () => {
      setIsScreenSharing(false);
    });

    // Error events
    sdkInstance.on('error', (data) => {
      console.error('🚨 SDK Error:', data.message);
      setError(data.message);
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sdk) {
        sdk.destroy();
      }
    };
  }, [sdk]);

  const contextValue: VideoSDKContextType = {
    sdk,
    isInitialized,
    isConnected,
    localStream,
    participants,
    currentUser,
    initializeSDK,
    joinRoom,
    leaveRoom,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    error,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing
  };

  return (
    <VideoSDKContext.Provider value={contextValue}>
      {children}
    </VideoSDKContext.Provider>
  );
}

export function useVideoSDK(): VideoSDKContextType {
  const context = useContext(VideoSDKContext);
  if (!context) {
    throw new Error('useVideoSDK must be used within a VideoSDKProvider');
  }
  return context;
}