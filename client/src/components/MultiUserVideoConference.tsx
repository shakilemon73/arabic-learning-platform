/**
 * Multi-User Video Conference Component
 * Real-time video conferencing with Supabase authentication
 * Supports admin/host and student roles with proper WebRTC connections
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Video, VideoOff, Mic, MicOff, MonitorUp, Phone, PhoneOff,
  Users, MessageSquare, Volume2, VolumeX, Settings, Crown, UserCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: 'admin' | 'student';
  is_video_enabled: boolean;
  is_audio_enabled: boolean;
  is_screen_sharing: boolean;
  connection_quality: 'excellent' | 'good' | 'poor' | 'disconnected';
  joined_at: string;
  stream?: MediaStream;
}

interface MultiUserVideoConferenceProps {
  roomId: string;
  classId?: string;
  onLeave?: () => void;
}

export const MultiUserVideoConference: React.FC<MultiUserVideoConferenceProps> = ({
  roomId,
  classId,
  onLeave
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map());
  
  // Media states
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const channelRef = useRef<any>(null);
  
  // Determine user role
  const userRole = (profile as any)?.role === 'admin' ? 'admin' : 'student';
  const displayName = (profile as any)?.first_name || user?.email?.split('@')[0] || 'User';
  
  // WebRTC configuration
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  /**
   * Initialize local media stream
   */
  const initializeLocalStream = useCallback(async () => {
    try {
      console.log('🎥 Initializing local media stream...');
      
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      // Get optimal constraints based on actual device capabilities
      const deviceManager = (await import('@/lib/deviceManager')).DeviceManager.getInstance();
      
      // Check browser support first
      if (!deviceManager.checkBrowserSupport()) {
        throw new Error('WebRTC not supported in this browser. Please use Chrome, Firefox, or Safari.');
      }
      
      // Test device access
      const deviceTest = await deviceManager.testDeviceAccess();
      if (!deviceTest.video && !deviceTest.audio) {
        throw new Error(deviceTest.error || 'No video or audio devices found');
      }
      
      console.log('📱 Device capabilities:', deviceTest);
      
      // Get optimal constraints for this device
      const constraints = await deviceManager.getOptimalConstraints();
      
      let stream: MediaStream | null = null;
      let lastError: Error | null = null;
      
      for (const constraint of constraints) {
        try {
          console.log('🔄 Trying media constraint:', constraint);
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log('✅ Media stream acquired successfully');
          break;
        } catch (error) {
          console.warn('⚠️ Failed with constraint, trying next:', error);
          lastError = error as Error;
          continue;
        }
      }
      
      if (!stream) {
        throw lastError || new Error('Failed to access any media devices');
      }
      
      setLocalStream(stream);
      
      // Set initial media states based on actual tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (videoTrack) {
        setIsVideoEnabled(videoTrack.enabled);
        console.log('📹 Video track available and enabled');
      } else {
        console.log('📹 No video track available');
        setIsVideoEnabled(false);
      }
      
      if (audioTrack) {
        setIsAudioEnabled(audioTrack.enabled);
        console.log('🎤 Audio track available and enabled');
      } else {
        console.log('🎤 No audio track available');
        setIsAudioEnabled(false);
      }
      
      // Set local video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      console.log('✅ Local media stream initialized successfully');
      return stream;
      
    } catch (error) {
      console.error('❌ Failed to get local media stream:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      let userMessage = "ক্যামেরা এবং মাইক্রোফোন অ্যাক্সেসের অনুমতি প্রয়োজন";
      
      // Production error handling using DeviceManager
      const deviceManager = (await import('@/lib/deviceManager')).DeviceManager.getInstance();
      userMessage = deviceManager.getErrorMessage(error as Error);
      
      toast({
        title: "মিডিয়া অ্যাক্সেস ব্যর্থ",
        description: userMessage + " - কেবল চ্যাট এবং অডিও দিয়ে অংশগ্রহণ করুন",
        variant: "destructive"
      });
      
      // Don't throw error - allow participation without media
      // Create an empty stream for compatibility
      const emptyStream = new MediaStream();
      setLocalStream(emptyStream);
      setIsVideoEnabled(false);
      setIsAudioEnabled(false);
      
      console.log('⚠️ Continuing with audio-only/text-only mode');
      return emptyStream;
    }
  }, [toast]);

  /**
   * Create WebRTC peer connection for a participant
   */
  const createPeerConnection = useCallback(async (participantId: string): Promise<RTCPeerConnection> => {
    console.log(`🔗 Creating peer connection for participant: ${participantId}`);
    
    const peerConnection = new RTCPeerConnection(rtcConfig);
    
    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }
    
    // Handle incoming remote stream
    peerConnection.ontrack = (event) => {
      console.log(`📡 Received remote stream from ${participantId}`);
      const [remoteStream] = event.streams;
      
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(participantId, remoteStream);
        return newStreams;
      });
      
      // Set remote video element
      const videoElement = remoteVideoRefs.current.get(participantId);
      if (videoElement) {
        videoElement.srcObject = remoteStream;
      }
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && channelRef.current && channelRef.current.readyState === WebSocket.OPEN) {
        channelRef.current.send(JSON.stringify({
          type: 'webrtc-signal',
          roomId,
          fromUserId: user?.id,
          toUserId: participantId,
          signal: {
            type: 'ice-candidate',
            candidate: event.candidate
          }
        }));
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`🔄 Peer connection state for ${participantId}:`, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'connected') {
        updateParticipantConnectionQuality(participantId, 'excellent');
      } else if (peerConnection.connectionState === 'disconnected') {
        updateParticipantConnectionQuality(participantId, 'disconnected');
      }
    };
    
    // Store peer connection
    setPeerConnections(prev => {
      const newConnections = new Map(prev);
      newConnections.set(participantId, peerConnection);
      return newConnections;
    });
    
    return peerConnection;
  }, [localStream, user?.id, roomId]);

  /**
   * Update participant connection quality
   */
  const updateParticipantConnectionQuality = useCallback((participantId: string, quality: Participant['connection_quality']) => {
    setParticipants(prev => 
      prev.map(p => 
        p.user_id === participantId 
          ? { ...p, connection_quality: quality }
          : p
      )
    );
  }, []);

  /**
   * Handle WebRTC signaling messages
   */
  const handleSignalingMessage = useCallback(async (payload: any) => {
    const { type, fromUserId, toUserId } = payload;
    
    // Only process messages intended for this user
    if (toUserId !== user?.id) return;
    
    console.log(`📨 Received signaling message: ${type} from ${fromUserId}`);
    
    const peerConnection = peerConnections.get(fromUserId) || await createPeerConnection(fromUserId);
    
    switch (type) {
      case 'offer':
        await peerConnection.setRemoteDescription(payload.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        // Send answer back
        if (channelRef.current && channelRef.current.readyState === WebSocket.OPEN) {
          channelRef.current.send(JSON.stringify({
            type: 'webrtc-signal',
            roomId,
            fromUserId: user?.id,
            toUserId: fromUserId,
            signal: {
              type: 'answer',
              answer
            }
          }));
        }
        break;
        
      case 'answer':
        await peerConnection.setRemoteDescription(payload.answer);
        break;
        
      case 'ice-candidate':
        await peerConnection.addIceCandidate(payload.candidate);
        break;
    }
  }, [user?.id, peerConnections, createPeerConnection, roomId]);

  /**
   * Join the video conference room
   */
  const joinRoom = useCallback(async () => {
    if (!user || isJoining) return;
    
    setIsJoining(true);
    
    try {
      console.log(`🚪 Joining room: ${roomId} as ${userRole}`);
      
      // Initialize local media stream first (with graceful fallback)
      try {
        await initializeLocalStream();
        console.log('✅ Media stream initialized successfully');
      } catch (mediaError) {
        console.warn('⚠️ Media access failed, continuing with audio-only mode:', mediaError);
        // Continue without throwing - allow text/audio-only participation
      }
      
      // Create WebSocket connection for real-time signaling
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      
      channelRef.current = ws;
      
      // WebSocket event handlers
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        
        // Join the room
        ws.send(JSON.stringify({
          type: 'join-room',
          roomId,
          userId: user.id,
          displayName,
          role: userRole
        }));
      };
      
      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message.type);
          
          switch (message.type) {
            case 'room-joined':
              // Successfully joined the room - update connection state
              setIsConnected(true);
              console.log('✅ Successfully joined video conference room');
              
              // Update participants list with existing participants
              const existingParticipants: Participant[] = message.participants.map((p: any) => ({
                id: p.id,
                user_id: p.userId,
                display_name: p.displayName,
                email: '',
                role: p.role,
                is_video_enabled: true,
                is_audio_enabled: true,
                is_screen_sharing: false,
                connection_quality: 'excellent' as const,
                joined_at: p.joinedAt
              }));
              
              setParticipants(existingParticipants);
              
              // Create peer connections for existing participants
              for (const participant of existingParticipants) {
                if (!peerConnections.has(participant.user_id)) {
                  const peerConnection = await createPeerConnection(participant.user_id);
                  
                  // Create and send offer if this user joined first (alphabetical order)
                  if (user.id < participant.user_id) {
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    
                    ws.send(JSON.stringify({
                      type: 'webrtc-signal',
                      roomId,
                      fromUserId: user.id,
                      toUserId: participant.user_id,
                      signal: {
                        type: 'offer',
                        offer
                      }
                    }));
                  }
                }
              }
              break;
              
            case 'participant-joined':
              // New participant joined
              const newParticipant: Participant = {
                id: message.participant.id,
                user_id: message.participant.userId,
                display_name: message.participant.displayName,
                email: '',
                role: message.participant.role,
                is_video_enabled: true,
                is_audio_enabled: true,
                is_screen_sharing: false,
                connection_quality: 'excellent',
                joined_at: message.participant.joinedAt
              };
              
              setParticipants(prev => [...prev, newParticipant]);
              
              // Create peer connection for new participant
              if (!peerConnections.has(newParticipant.user_id)) {
                const peerConnection = await createPeerConnection(newParticipant.user_id);
                
                // Create and send offer if this user should initiate
                if (user.id < newParticipant.user_id) {
                  const offer = await peerConnection.createOffer();
                  await peerConnection.setLocalDescription(offer);
                  
                  ws.send(JSON.stringify({
                    type: 'webrtc-signal',
                    roomId,
                    fromUserId: user.id,
                    toUserId: newParticipant.user_id,
                    signal: {
                      type: 'offer',
                      offer
                    }
                  }));
                }
              }
              break;
              
            case 'participant-left':
              // Participant left
              setParticipants(prev => prev.filter(p => p.user_id !== message.userId));
              
              // Clean up peer connection
              const leftPeerConnection = peerConnections.get(message.userId);
              if (leftPeerConnection) {
                leftPeerConnection.close();
                setPeerConnections(prev => {
                  const newConnections = new Map(prev);
                  newConnections.delete(message.userId);
                  return newConnections;
                });
              }
              
              // Clean up remote stream
              setRemoteStreams(prev => {
                const newStreams = new Map(prev);
                newStreams.delete(message.userId);
                return newStreams;
              });
              break;
              
            case 'webrtc-signal':
              // Handle WebRTC signaling
              await handleSignalingMessage({
                type: message.signal.type,
                fromUserId: message.fromUserId,
                toUserId: user.id,
                ...message.signal
              });
              break;
              
            case 'participant-media-changed':
              // Update participant media state
              setParticipants(prev => 
                prev.map(p => 
                  p.user_id === message.userId 
                    ? { 
                        ...p, 
                        is_video_enabled: message.isVideoEnabled,
                        is_audio_enabled: message.isAudioEnabled 
                      }
                    : p
                )
              );
              break;
          }
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        toast({
          title: "সংযোগে সমস্যা",
          description: "ভিডিও কনফারেন্সে সংযোগ সমস্যা হয়েছে",
          variant: "destructive"
        });
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket connection closed');
        setIsConnected(false);
      };
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      toast({
        title: "রুমে যোগদানে ত্রুটি",
        description: "লাইভ ক্লাসে যোগ দিতে সমস্যা হয়েছে",
        variant: "destructive"
      });
    } finally {
      setIsJoining(false);
    }
  }, [user, roomId, userRole, displayName, isVideoEnabled, isAudioEnabled, isScreenSharing, isJoining, initializeLocalStream, handleSignalingMessage, createPeerConnection, peerConnections, toast]);

  /**
   * Leave the video conference room
   */
  const leaveRoom = useCallback(async () => {
    console.log('🚪 Leaving video conference room...');
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // Close all peer connections
    peerConnections.forEach(pc => pc.close());
    setPeerConnections(new Map());
    
    // Clear remote streams
    setRemoteStreams(new Map());
    
    // Close WebSocket connection
    if (channelRef.current && channelRef.current.readyState === WebSocket.OPEN) {
      channelRef.current.send(JSON.stringify({
        type: 'leave-room',
        roomId,
        userId: user?.id
      }));
      channelRef.current.close();
      channelRef.current = null;
    }
    
    setIsConnected(false);
    setParticipants([]);
    
    if (onLeave) {
      onLeave();
    }
    
    console.log('✅ Successfully left video conference room');
  }, [localStream, peerConnections, onLeave]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(async () => {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      
      // Update media state via WebSocket
      if (channelRef.current && channelRef.current.readyState === WebSocket.OPEN) {
        channelRef.current.send(JSON.stringify({
          type: 'media-state-change',
          roomId,
          userId: user?.id,
          isVideoEnabled: videoTrack.enabled,
          isAudioEnabled: isAudioEnabled
        }));
      }
    }
  }, [localStream, user?.id, displayName, userRole, isAudioEnabled, isScreenSharing]);

  /**
   * Toggle audio on/off
   */
  const toggleAudio = useCallback(async () => {
    if (!localStream) return;
    
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
      
      // Update media state via WebSocket
      if (channelRef.current && channelRef.current.readyState === WebSocket.OPEN) {
        channelRef.current.send(JSON.stringify({
          type: 'media-state-change',
          roomId,
          userId: user?.id,
          isVideoEnabled: isVideoEnabled,
          isAudioEnabled: audioTrack.enabled
        }));
      }
    }
  }, [localStream, user?.id, displayName, userRole, isVideoEnabled, isScreenSharing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return (
    <div className="w-full h-full bg-gray-900 text-white relative">
      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 h-full">
        {/* Local Video */}
        <Card className="relative bg-gray-800 border-gray-700">
          <CardContent className="p-0 h-64 relative">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute bottom-2 left-2 flex items-center space-x-2">
              <Badge variant={userRole === 'admin' ? 'default' : 'secondary'} className="text-xs">
                {userRole === 'admin' ? (
                  <>
                    <Crown className="w-3 h-3 mr-1" />
                    প্রশিক্ষক
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3 h-3 mr-1" />
                    শিক্ষার্থী
                  </>
                )}
              </Badge>
              <span className="text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                {displayName} (আপনি)
              </span>
            </div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-700 flex items-center justify-center rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-islamic-green text-white text-xl">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remote Videos */}
        {participants.map((participant) => (
          <Card key={participant.id} className="relative bg-gray-800 border-gray-700">
            <CardContent className="p-0 h-64 relative">
              <video
                ref={(el) => {
                  if (el) {
                    remoteVideoRefs.current.set(participant.user_id, el);
                    const stream = remoteStreams.get(participant.user_id);
                    if (stream) {
                      el.srcObject = stream;
                    }
                  }
                }}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute bottom-2 left-2 flex items-center space-x-2">
                <Badge variant={participant.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                  {participant.role === 'admin' ? (
                    <>
                      <Crown className="w-3 h-3 mr-1" />
                      প্রশিক্ষক
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3 h-3 mr-1" />
                      শিক্ষার্থী
                    </>
                  )}
                </Badge>
                <span className="text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                  {participant.display_name}
                </span>
              </div>
              <div className="absolute top-2 right-2 flex space-x-1">
                {!participant.is_audio_enabled && (
                  <div className="bg-red-500 rounded-full p-1">
                    <MicOff className="w-3 h-3" />
                  </div>
                )}
                {!participant.is_video_enabled && (
                  <div className="bg-red-500 rounded-full p-1">
                    <VideoOff className="w-3 h-3" />
                  </div>
                )}
              </div>
              {!participant.is_video_enabled && (
                <div className="absolute inset-0 bg-gray-700 flex items-center justify-center rounded-lg">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-islamic-green text-white text-xl">
                      {participant.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center space-x-4 bg-gray-800 rounded-full px-6 py-3">
          <Button
            size="sm"
            variant={isAudioEnabled ? "default" : "destructive"}
            className="rounded-full w-12 h-12"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          
          <Button
            size="sm"
            variant={isVideoEnabled ? "default" : "destructive"}
            className="rounded-full w-12 h-12"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
          
          {!isConnected ? (
            <Button
              size="sm"
              className="bg-islamic-green hover:bg-dark-green rounded-full px-6"
              onClick={joinRoom}
              disabled={isJoining}
            >
              {isJoining ? 'যোগ দিচ্ছি...' : 'ক্লাসে যোগ দিন'}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              className="rounded-full w-12 h-12"
              onClick={leaveRoom}
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          )}
          
          <div className="flex items-center space-x-2 text-sm">
            <Users className="w-4 h-4" />
            <span>{participants.length + 1}</span>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {isConnected && (
        <div className="absolute top-4 right-4">
          <Badge variant="default" className="bg-green-500">
            সংযুক্ত
          </Badge>
        </div>
      )}
    </div>
  );
};

export default MultiUserVideoConference;