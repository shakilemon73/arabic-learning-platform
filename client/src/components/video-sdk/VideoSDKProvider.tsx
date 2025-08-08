/**
 * VideoSDKProvider - React Context Provider for the Video SDK
 * Manages SDK state and provides it to child components
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

      const newSDK = new VideoSDK(config);
      setSdk(newSDK);
      
      // Setup event listeners first
      setupSDKEventListeners(newSDK);
      
      // Mark as initialized immediately since the SDK instance is ready
      setIsInitialized(true);
      setError(null);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize SDK';
      setError(errorMessage);
      setIsInitialized(false);
      throw err;
    }
  };

  // Join room
  const joinRoom = async (sessionConfig: SessionConfig): Promise<void> => {
    if (!sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      setCurrentUser(sessionConfig);
      await sdk.initialize(sessionConfig);
      await sdk.joinRoom();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      setError(errorMessage);
      throw err;
    }
  };

  // Leave room
  const leaveRoom = async (): Promise<void> => {
    if (!sdk) return;

    try {
      await sdk.leaveRoom();
      setCurrentUser(null);
      setLocalStream(null);
      setParticipants([]);
      setIsConnected(false);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave room';
      setError(errorMessage);
    }
  };

  // Toggle video
  const toggleVideo = async (enabled?: boolean): Promise<boolean> => {
    if (!sdk) return false;

    try {
      const isEnabled = await sdk.toggleVideo(enabled);
      setIsVideoEnabled(isEnabled);
      return isEnabled;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle video';
      setError(errorMessage);
      return false;
    }
  };

  // Toggle audio
  const toggleAudio = async (enabled?: boolean): Promise<boolean> => {
    if (!sdk) return false;

    try {
      const isEnabled = await sdk.toggleAudio(enabled);
      setIsAudioEnabled(isEnabled);
      return isEnabled;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle audio';
      setError(errorMessage);
      return false;
    }
  };

  // Start screen share
  const startScreenShare = async (): Promise<MediaStream | null> => {
    if (!sdk) return null;

    try {
      const stream = await sdk.startScreenShare();
      setIsScreenSharing(true);
      return stream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start screen share';
      setError(errorMessage);
      return null;
    }
  };

  // Stop screen share
  const stopScreenShare = async (): Promise<void> => {
    if (!sdk) return;

    try {
      await sdk.stopScreenShare();
      setIsScreenSharing(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop screen share';
      setError(errorMessage);
    }
  };

  // Send chat message
  const sendChatMessage = async (message: string): Promise<void> => {
    if (!sdk) return;

    try {
      await sdk.sendChatMessage(message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
    }
  };

  // Setup SDK event listeners
  const setupSDKEventListeners = (sdkInstance: VideoSDK) => {
    sdkInstance.on('sdk-initialized', () => {
      setIsInitialized(true);
      setError(null);
    });

    sdkInstance.on('room-joined', ({ localStream }) => {
      setIsConnected(true);
      setLocalStream(localStream);
      setError(null);
    });

    sdkInstance.on('room-left', () => {
      setIsConnected(false);
      setLocalStream(null);
      setParticipants([]);
    });

    sdkInstance.on('participant-joined', ({ participant }) => {
      setParticipants(prev => [...prev, participant]);
    });

    sdkInstance.on('participant-left', ({ participantId }) => {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    });

    sdkInstance.on('video-toggled', ({ enabled }) => {
      setIsVideoEnabled(enabled);
    });

    sdkInstance.on('audio-toggled', ({ enabled }) => {
      setIsAudioEnabled(enabled);
    });

    sdkInstance.on('screen-share-started', () => {
      setIsScreenSharing(true);
    });

    sdkInstance.on('screen-share-stopped', () => {
      setIsScreenSharing(false);
    });

    sdkInstance.on('sdk-error', ({ error }) => {
      setError(error);
    });

    // Clear error on successful operations
    sdkInstance.on('room-joined', () => setError(null));
    sdkInstance.on('participant-joined', () => setError(null));
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sdk) {
        sdk.destroy().catch(console.error);
      }
    };
  }, [sdk]);

  const value: VideoSDKContextType = {
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
    isScreenSharing,
  };

  return (
    <VideoSDKContext.Provider value={value}>
      {children}
    </VideoSDKContext.Provider>
  );
}

export function useVideoSDK(): VideoSDKContextType {
  const context = useContext(VideoSDKContext);
  if (context === undefined) {
    throw new Error('useVideoSDK must be used within a VideoSDKProvider');
  }
  return context;
}