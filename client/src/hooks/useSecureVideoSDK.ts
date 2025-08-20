// Secure Video SDK Hook for Arabic Learning Platform
import { useCallback, useEffect, useRef } from 'react';
import { useVideoSDK } from '@/components/video-sdk/VideoSDKProvider';
import { videoSecurityManager } from '@/lib/videoSecurity';
import { securityManager } from '@/lib/security';
import { useAuth } from '@/contexts/AuthContext';

export function useSecureVideoSDK() {
  const { user } = useAuth();
  const videoSDK = useVideoSDK();
  const connectionIdRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Security: Enhanced join room with validation
  const secureJoinRoom = useCallback(async (config: any) => {
    if (!user) {
      throw new Error('Authentication required to join video room');
    }

    try {
      // Security: Validate connection attempt
      const validation = videoSecurityManager.validateConnectionAttempt(user.id, config.roomId);
      if (!validation.allowed) {
        throw new Error(validation.reason || 'Connection not allowed');
      }

      // Security: Sanitize configuration
      const secureConfig = {
        ...config,
        displayName: videoSecurityManager.sanitizeDisplayName(config.displayName),
        userId: user.id // Ensure user ID matches authenticated user
      };

      // Attempt to join room
      await videoSDK.joinRoom(secureConfig);
      
      // Register successful connection
      const connectionId = `${user.id}-${config.roomId}-${Date.now()}`;
      connectionIdRef.current = connectionId;
      videoSecurityManager.registerConnection(connectionId, user.id);
      
      // Reset retry count on success
      retryCountRef.current = 0;

    } catch (error) {
      console.error('Secure video room join failed:', error);
      
      // Retry logic for network issues
      if (retryCountRef.current < maxRetries && error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('timeout')) {
          retryCountRef.current++;
          console.log(`Retrying connection (${retryCountRef.current}/${maxRetries})...`);
          
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCountRef.current));
          return secureJoinRoom(config);
        }
      }
      
      throw error;
    }
  }, [user, videoSDK]);

  // Security: Enhanced leave room with cleanup
  const secureLeaveRoom = useCallback(async () => {
    try {
      await videoSDK.leaveRoom();
      
      // Unregister connection
      if (connectionIdRef.current) {
        videoSecurityManager.unregisterConnection(connectionIdRef.current);
        connectionIdRef.current = null;
      }
      
    } catch (error) {
      console.error('Secure video room leave failed:', error);
      // Still cleanup connection tracking
      if (connectionIdRef.current) {
        videoSecurityManager.unregisterConnection(connectionIdRef.current);
        connectionIdRef.current = null;
      }
      throw error;
    }
  }, [videoSDK]);

  // Security: Validated media toggle
  const secureToggleVideo = useCallback(async (enabled?: boolean) => {
    if (!videoSDK.isConnected) {
      throw new Error('Cannot toggle video - not connected to room');
    }

    try {
      const result = await videoSDK.toggleVideo(enabled);
      
      // Log media state change for security monitoring
      securityManager.logSecurityEvent('video_toggle', {
        userId: user?.id,
        enabled: result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.error('Secure video toggle failed:', error);
      throw error;
    }
  }, [videoSDK, user]);

  // Security: Validated audio toggle
  const secureToggleAudio = useCallback(async (enabled?: boolean) => {
    if (!videoSDK.isConnected) {
      throw new Error('Cannot toggle audio - not connected to room');
    }

    try {
      const result = await videoSDK.toggleAudio(enabled);
      
      // Log media state change for security monitoring
      securityManager.logSecurityEvent('audio_toggle', {
        userId: user?.id,
        enabled: result,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      console.error('Secure audio toggle failed:', error);
      throw error;
    }
  }, [videoSDK, user]);

  // Security: Monitored screen share
  const secureStartScreenShare = useCallback(async () => {
    if (!videoSDK.isConnected) {
      throw new Error('Cannot start screen share - not connected to room');
    }

    try {
      const stream = await videoSDK.startScreenShare();
      
      // Log screen share start for security monitoring
      securityManager.logSecurityEvent('screen_share_started', {
        userId: user?.id,
        timestamp: Date.now()
      });
      
      return stream;
    } catch (error) {
      console.error('Secure screen share failed:', error);
      throw error;
    }
  }, [videoSDK, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionIdRef.current) {
        videoSecurityManager.unregisterConnection(connectionIdRef.current);
      }
    };
  }, []);

  // Monitor connection quality
  useEffect(() => {
    if (videoSDK.isConnected && connectionIdRef.current) {
      const interval = setInterval(() => {
        // Get connection stats from SDK if available
        try {
          const stats = videoSDK.sdk?.getConnectionStats?.();
          if (stats && connectionIdRef.current) {
            videoSecurityManager.monitorConnectionQuality(connectionIdRef.current, stats);
          }
        } catch (error) {
          console.warn('Connection quality monitoring failed:', error);
        }
      }, 10000); // Monitor every 10 seconds

      return () => clearInterval(interval);
    }
  }, [videoSDK.isConnected, videoSDK.sdk]);

  return {
    ...videoSDK,
    joinRoom: secureJoinRoom,
    leaveRoom: secureLeaveRoom,
    toggleVideo: secureToggleVideo,
    toggleAudio: secureToggleAudio,
    startScreenShare: secureStartScreenShare,
    connectionStats: videoSecurityManager.getConnectionStats()
  };
}