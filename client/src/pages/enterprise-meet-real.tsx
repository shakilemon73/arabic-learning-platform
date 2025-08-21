/**
 * Real Enterprise Video Conferencing with WebRTC
 * Actual peer-to-peer video connections, not just database tracking
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, VideoOff, Mic, MicOff, MonitorUp, Phone, PhoneOff,
  Settings, Users, MessageSquare, Camera, Volume2, VolumeX,
  MoreVertical, Grid3X3, Maximize2, Minimize2, Share2
} from 'lucide-react';
import Header from '@/components/Header';
import { WebRTCClient } from '@/lib/webrtc-client';

interface Participant {
  id: string;
  name: string;
  role: 'host' | 'moderator' | 'participant';
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
}

export default function EnterpriseRealMeetPage() {
  const { user, profile } = useAuth();
  const [, navigate] = useLocation();

  // WebRTC Client
  const webrtcClient = useRef<WebRTCClient | null>(null);
  
  // Room state
  const [roomId, setRoomId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room') || `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  
  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Initialize WebRTC
  const initializeWebRTC = useCallback(async () => {
    if (!user || webrtcClient.current) return;

    setIsConnecting(true);
    
    try {
      const displayName = (profile as any)?.display_name || user.email?.split('@')[0] || 'User';
      
      // Create WebRTC client
      const client = new WebRTCClient();
      webrtcClient.current = client;

      // Set up event handlers
      client.onLocalStreamReceived((stream) => {
        console.log('📺 Local stream received');
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      });

      client.onRemoteStreamReceived((participantId, stream) => {
        console.log('📺 Remote stream received from:', participantId);
        setRemoteStreams(prev => new Map(prev).set(participantId, stream));
        
        // Set video element source
        const videoElement = remoteVideoRefs.current.get(participantId);
        if (videoElement) {
          videoElement.srcObject = stream;
        }
      });

      client.onParticipantJoin((participant) => {
        console.log('👤 Participant joined:', participant.name);
        setParticipants(prev => [...prev.filter(p => p.id !== participant.id), participant]);
      });

      client.onParticipantLeave((participantId) => {
        console.log('👋 Participant left:', participantId);
        setParticipants(prev => prev.filter(p => p.id !== participantId));
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(participantId);
          return newMap;
        });
        remoteVideoRefs.current.delete(participantId);
      });

      client.onParticipantMediaChange((participantId, mediaState) => {
        setParticipants(prev => prev.map(p => 
          p.id === participantId 
            ? { ...p, ...mediaState }
            : p
        ));
      });

      client.onConnectionChange((state) => {
        setConnectionState(state);
        setIsConnected(state === 'connected');
      });

      // Initialize and connect
      await client.initialize(user.id, displayName);
      await client.connectSignaling();
      await client.joinRoom(roomId, 'participant');

      setIsConnecting(false);
      console.log('✅ WebRTC connection established');

    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error);
      setIsConnecting(false);
      // Show error to user
      alert('Failed to initialize video conferencing. Please check camera/microphone permissions.');
    }
  }, [user, profile, roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webrtcClient.current) {
        webrtcClient.current.disconnect();
      }
    };
  }, []);

  // Initialize on component mount
  useEffect(() => {
    if (user) {
      initializeWebRTC();
    }
  }, [user, initializeWebRTC]);

  // Media controls
  const toggleVideo = () => {
    if (webrtcClient.current) {
      const enabled = webrtcClient.current.toggleVideo();
      setIsVideoEnabled(enabled);
    }
  };

  const toggleAudio = () => {
    if (webrtcClient.current) {
      const enabled = webrtcClient.current.toggleAudio();
      setIsAudioEnabled(enabled);
    }
  };

  const leaveCall = () => {
    if (webrtcClient.current) {
      webrtcClient.current.disconnect();
    }
    navigate('/dashboard');
  };

  // Create video element for remote participant
  const createRemoteVideoRef = (participantId: string) => {
    return (ref: HTMLVideoElement | null) => {
      if (ref) {
        remoteVideoRefs.current.set(participantId, ref);
        const stream = remoteStreams.get(participantId);
        if (stream) {
          ref.srcObject = stream;
        }
      }
    };
  };

  if (!user) {
    return <div>Please log in to join the meeting</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header />
      
      {/* Meeting Container */}
      <div className="container mx-auto px-4 py-6">
        
        {/* Connection Status */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnecting ? 'Connecting...' : connectionState}
            </Badge>
            <span className="text-sm text-slate-400">Room: {roomId}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowParticipants(!showParticipants)}
            >
              <Users className="w-4 h-4 mr-2" />
              Participants ({participants.length + 1})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          
          {/* Local Video */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-2">
              <div className="relative aspect-video bg-slate-700 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
                  You {!isVideoEnabled && '(video off)'}
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  {!isVideoEnabled && (
                    <div className="bg-red-500 p-1 rounded">
                      <VideoOff className="w-3 h-3" />
                    </div>
                  )}
                  {!isAudioEnabled && (
                    <div className="bg-red-500 p-1 rounded">
                      <MicOff className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remote Videos */}
          {participants.map((participant) => (
            <Card key={participant.id} className="bg-slate-800 border-slate-700">
              <CardContent className="p-2">
                <div className="relative aspect-video bg-slate-700 rounded-lg overflow-hidden">
                  <video
                    ref={createRemoteVideoRef(participant.id)}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-sm">
                    {participant.name} {!participant.videoEnabled && '(video off)'}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1">
                    {!participant.videoEnabled && (
                      <div className="bg-red-500 p-1 rounded">
                        <VideoOff className="w-3 h-3" />
                      </div>
                    )}
                    {!participant.audioEnabled && (
                      <div className="bg-red-500 p-1 rounded">
                        <MicOff className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-full shadow-lg">
            
            {/* Video Toggle */}
            <Button
              onClick={toggleVideo}
              size="lg"
              variant={isVideoEnabled ? "default" : "destructive"}
              className="rounded-full"
            >
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            {/* Audio Toggle */}
            <Button
              onClick={toggleAudio}
              size="lg"
              variant={isAudioEnabled ? "default" : "destructive"}
              className="rounded-full"
            >
              {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>

            {/* Screen Share */}
            <Button
              size="lg"
              variant="outline"
              className="rounded-full"
              disabled
            >
              <MonitorUp className="w-5 h-5" />
            </Button>

            {/* More Options */}
            <Button
              size="lg"
              variant="outline"
              className="rounded-full"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>

            {/* Leave Call */}
            <Button
              onClick={leaveCall}
              size="lg"
              variant="destructive"
              className="rounded-full"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Participants Panel */}
        {showParticipants && (
          <Card className="fixed right-4 top-20 w-80 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Local user */}
                <div className="flex items-center gap-3 p-2 rounded bg-slate-700">
                  <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">You</div>
                    <div className="text-xs text-slate-400">Host</div>
                  </div>
                  <div className="flex gap-1">
                    {isVideoEnabled && <Video className="w-4 h-4 text-green-400" />}
                    {isAudioEnabled && <Volume2 className="w-4 h-4 text-green-400" />}
                  </div>
                </div>

                {/* Remote participants */}
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3 p-2 rounded bg-slate-700">
                    <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{participant.name}</div>
                      <div className="text-xs text-slate-400">{participant.role}</div>
                    </div>
                    <div className="flex gap-1">
                      {participant.videoEnabled && <Video className="w-4 h-4 text-green-400" />}
                      {participant.audioEnabled && <Volume2 className="w-4 h-4 text-green-400" />}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}