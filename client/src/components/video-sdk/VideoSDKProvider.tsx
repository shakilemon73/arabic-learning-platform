/**
 * VideoSDKProvider - React Context Provider for Real Video Conferencing
 * Manages real WebRTC connections and video/audio streams
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { VideoSDK, VideoSDKConfig, SessionConfig, ParticipantInfo } from '@/lib/video-sdk';
import { supabase } from '@/lib/supabase';

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
      console.log('🚀 Initializing VideoSDK with config:', {
        supabaseUrl: config.supabaseUrl ? 'configured' : 'missing',
        supabaseKey: config.supabaseKey ? 'configured' : 'missing',
        maxParticipants: config.maxParticipants
      });
      
      if (sdk) {
        console.log('🧹 Destroying existing SDK instance...');
        await sdk.destroy();
      }

      // Create SDK instance
      const newSDK = new VideoSDK(config);
      setSdk(newSDK);
      
      // Wait for async initialization to complete
      console.log('⏳ Waiting for SDK async initialization...');
      await newSDK.initialize();
      
      // Setup event listeners for real-time communication
      setupSDKEventListeners(newSDK);
      
      setIsInitialized(true);
      setError(null);
      console.log('✅ VideoSDK fully initialized and ready for use');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize SDK';
      console.error('❌ SDK initialization failed:', errorMessage);
      console.error('📋 Full error:', err);
      setError(errorMessage);
      setIsInitialized(false);
      setSdk(null);
      throw err;
    }
  };

  // Join room for real-time video conversation
  const joinRoom = async (sessionConfig: SessionConfig): Promise<void> => {
    if (!sdk) {
      throw new Error('SDK not initialized - please wait for initialization to complete');
    }

    if (!isInitialized) {
      throw new Error('SDK not properly initialized - initialization state is false');
    }

    try {
      setError(null);
      console.log('🔄 Joining video room with session config:', sessionConfig);
      console.log('📊 Current SDK state:', {
        sdkExists: !!sdk,
        isInitialized,
        isConnected
      });
      
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
        console.log('🎥 Local video stream ready with tracks:', {
          video: stream.getVideoTracks().length,
          audio: stream.getAudioTracks().length
        });
      } else {
        console.log('⚠️ No local stream available yet');
      }

      console.log('✅ Successfully joined video room');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
      console.error('❌ Failed to join video room:', errorMessage);
      console.error('📋 Join room error details:', err);
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
      // Setup database participant subscription when connected
      setupParticipantSubscription(data.roomId);
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
      setParticipants(prev => {
        const exists = prev.find(p => p.id === data.participant.id);
        return exists ? prev : [...prev, data.participant];
      });
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

  // Setup real-time participant database subscription
  const setupParticipantSubscription = (roomId: string): void => {
    console.log('📡 Setting up participant database subscription for room:', roomId);
    
    const participantChannel = supabase
      .channel(`participants:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_conference_participants',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('🔄 Participant database change:', payload);
          handleParticipantDBChange(payload);
        }
      )
      .subscribe();

    // Store channel for cleanup
    (window as any).__participantChannel = participantChannel;
  };

  // Handle participant database changes
  const handleParticipantDBChange = (payload: any): void => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    switch (eventType) {
      case 'INSERT':
        if (newRecord && newRecord.is_active) {
          const participant: ParticipantInfo = {
            id: newRecord.user_id,
            name: newRecord.display_name,
            avatar: newRecord.avatar_url,
            role: newRecord.role,
            videoEnabled: newRecord.is_video_enabled,
            audioEnabled: newRecord.is_audio_enabled,
            screenSharing: newRecord.is_screen_sharing,
            connectionQuality: newRecord.connection_quality || 'good',
            joinedAt: new Date(newRecord.joined_at)
          };
          
          setParticipants(prev => {
            const exists = prev.find(p => p.id === participant.id);
            return exists ? prev : [...prev, participant];
          });
          
          console.log('➕ Added participant from DB:', participant.name);
        }
        break;
        
      case 'UPDATE':
        if (newRecord) {
          if (newRecord.is_active) {
            const updatedParticipant: ParticipantInfo = {
              id: newRecord.user_id,
              name: newRecord.display_name,
              avatar: newRecord.avatar_url,
              role: newRecord.role,
              videoEnabled: newRecord.is_video_enabled,
              audioEnabled: newRecord.is_audio_enabled,
              screenSharing: newRecord.is_screen_sharing,
              connectionQuality: newRecord.connection_quality || 'good',
              joinedAt: new Date(newRecord.joined_at)
            };
            
            setParticipants(prev => 
              prev.map(p => p.id === updatedParticipant.id ? updatedParticipant : p)
            );
            
            console.log('🔄 Updated participant from DB:', updatedParticipant.name);
          } else {
            // Participant became inactive - remove them
            setParticipants(prev => prev.filter(p => p.id !== newRecord.user_id));
            console.log('➖ Removed inactive participant from DB:', newRecord.display_name);
          }
        }
        break;
        
      case 'DELETE':
        if (oldRecord) {
          setParticipants(prev => prev.filter(p => p.id !== oldRecord.user_id));
          console.log('🗑️ Deleted participant from DB:', oldRecord.display_name);
        }
        break;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sdk) {
        sdk.destroy();
      }
      // Cleanup participant subscription
      if ((window as any).__participantChannel) {
        supabase.removeChannel((window as any).__participantChannel);
        (window as any).__participantChannel = null;
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