/**
 * Real Enterprise Video Conferencing
 * Production-grade video conferencing using enterprise video SDK architecture
 * No mocks, no demos - real video streaming
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, VideoOff, Mic, MicOff, MonitorUp, Phone, PhoneOff,
  Settings, Users, MessageSquare, Volume2, VolumeX,
  MoreVertical, Grid3X3, Maximize2, Share2
} from 'lucide-react';
import Header from '@/components/Header';
import { RealVideoConferenceSDK } from '@/lib/RealVideoConferenceSDK';

interface Participant {
  id: string;
  name: string;
  role: 'host' | 'participant';
  videoEnabled: boolean;
  audioEnabled: boolean;
  stream?: MediaStream;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  joinedAt: Date;
}

export default function EnterpriseRealMeetPage() {
  const { user, profile } = useAuth();
  const [, navigate] = useLocation();

  // Real Video Conference SDK
  const videoSDK = useRef<RealVideoConferenceSDK | null>(null);
  
  // Room state
  const [roomId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room') || 'arabic-learning-room';
  });
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [currentUserRole, setCurrentUserRole] = useState<'host' | 'participant'>('participant');
  
  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  /**
   * Initialize and join video conference
   */
  const joinRoom = useCallback(async () => {
    if (!user || !profile?.display_name || isConnecting) {
      console.log('❌ Cannot join: missing user data or already connecting');
      return;
    }

    setIsConnecting(true);
    try {
      const displayName = profile.display_name;
      
      // Initialize Real Video Conference SDK
      const sdk = new RealVideoConferenceSDK({
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL!,
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY!,
        maxParticipants: 100
      });
      
      videoSDK.current = sdk;

      // Set up event handlers
      sdk.on('local-stream', (stream: MediaStream) => {
        console.log('📹 Local stream received');
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      });

      sdk.on('remote-stream', ({ participantId, stream }: { participantId: string; stream: MediaStream }) => {
        console.log('📺 Remote stream received from:', participantId);
        setRemoteStreams(prev => new Map(prev.set(participantId, stream)));
      });

      sdk.on('participant-joined', (participant: Participant) => {
        console.log('👤 Participant joined:', participant);
        setParticipants(prev => {
          const existing = prev.find(p => p.id === participant.id);
          if (existing) return prev;
          return [...prev, participant];
        });
      });

      sdk.on('participant-left', (participant: Participant) => {
        console.log('👋 Participant left:', participant.id);
        setParticipants(prev => prev.filter(p => p.id !== participant.id));
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          newMap.delete(participant.id);
          return newMap;
        });
      });

      sdk.on('participant-media-changed', (participant: Participant) => {
        console.log('🔄 Participant media changed:', participant.id);
        setParticipants(prev => prev.map(p => 
          p.id === participant.id ? participant : p
        ));
      });

      sdk.on('connected', ({ role }: { role: 'host' | 'participant' }) => {
        setIsConnected(true);
        setCurrentUserRole(role);
        setConnectionState('connected');
        console.log(`✅ Connected as ${role}`);
      });

      sdk.on('error', ({ error }: { error: string }) => {
        console.error('❌ Video SDK Error:', error);
        setIsConnected(false);
        setConnectionState('failed');
      });

      // Join the room
      await sdk.joinRoom(roomId, user.id, displayName);

      console.log('✅ Successfully joined video conference');
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      setIsConnected(false);
      setConnectionState('failed');
    } finally {
      setIsConnecting(false);
    }
  }, [user, profile, roomId, isConnecting]);

  /**
   * Leave the video conference
   */
  const leaveRoom = useCallback(async () => {
    if (videoSDK.current) {
      await videoSDK.current.leaveRoom();
      videoSDK.current = null;
    }
    setIsConnected(false);
    setLocalStream(null);
    setRemoteStreams(new Map());
    setParticipants([]);
    navigate('/dashboard');
  }, [navigate]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(async () => {
    if (videoSDK.current) {
      const enabled = await videoSDK.current.toggleVideo();
      setIsVideoEnabled(enabled);
    }
  }, []);

  /**
   * Toggle audio on/off
   */
  const toggleAudio = useCallback(async () => {
    if (videoSDK.current) {
      const enabled = await videoSDK.current.toggleAudio();
      setIsAudioEnabled(enabled);
    }
  }, []);

  /**
   * Update remote video elements when streams change
   */
  useEffect(() => {
    remoteStreams.forEach((stream, participantId) => {
      const videoElement = remoteVideoRefs.current.get(participantId);
      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  /**
   * Auto-join on component mount
   */
  useEffect(() => {
    if (user && profile?.display_name && !isConnected && !isConnecting) {
      joinRoom();
    }
  }, [user, profile, isConnected, isConnecting, joinRoom]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (videoSDK.current) {
        videoSDK.current.leaveRoom();
      }
    };
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-6 text-center">
              <p>Please log in to join the video conference.</p>
              <Button className="mt-4" onClick={() => navigate('/login')}>
                Log In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
          
          {/* Main Video Area */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Real Video Conference</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={isConnected ? "default" : "destructive"}>
                      {isConnecting ? 'Connecting...' : connectionState}
                    </Badge>
                    <Badge variant={currentUserRole === 'host' ? "destructive" : "secondary"}>
                      {currentUserRole === 'host' ? '👑 Host' : '👤 Participant'}
                    </Badge>
                    <span className="text-sm text-slate-400">Room: {roomId}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="h-full pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
                  
                  {/* Local Video */}
                  <div className="relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      You ({currentUserRole})
                    </div>
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      {!isVideoEnabled && (
                        <div className="bg-red-500 p-1 rounded">
                          <VideoOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {!isAudioEnabled && (
                        <div className="bg-red-500 p-1 rounded">
                          <MicOff className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remote Videos */}
                  {participants.map((participant) => (
                    <div key={participant.id} className="relative bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                      <video
                        ref={(el) => {
                          if (el) {
                            remoteVideoRefs.current.set(participant.id, el);
                            const stream = remoteStreams.get(participant.id);
                            if (stream && el.srcObject !== stream) {
                              el.srcObject = stream;
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                        {participant.name} ({participant.role})
                      </div>
                      <div className="absolute bottom-2 right-2 flex gap-1">
                        {!participant.videoEnabled && (
                          <div className="bg-red-500 p-1 rounded">
                            <VideoOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {!participant.audioEnabled && (
                          <div className="bg-red-500 p-1 rounded">
                            <MicOff className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 right-2">
                        <div className={`w-2 h-2 rounded-full ${
                          participant.connectionQuality === 'excellent' ? 'bg-green-500' :
                          participant.connectionQuality === 'good' ? 'bg-yellow-500' :
                          participant.connectionQuality === 'poor' ? 'bg-orange-500' : 'bg-red-500'
                        }`} />
                      </div>
                    </div>
                  ))}

                  {/* Empty slots */}
                  {Array.from({ length: Math.max(0, 6 - participants.length - 1) }, (_, i) => (
                    <div key={`empty-${i}`} className="bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center">
                      <p className="text-slate-500">Waiting for participants...</p>
                    </div>
                  ))}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    variant={isAudioEnabled ? "default" : "destructive"}
                    size="lg"
                    onClick={toggleAudio}
                    className="rounded-full w-14 h-14"
                  >
                    {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                  </Button>

                  <Button
                    variant={isVideoEnabled ? "default" : "destructive"}
                    size="lg"
                    onClick={toggleVideo}
                    className="rounded-full w-14 h-14"
                  >
                    {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                  </Button>

                  <Button
                    variant="secondary"
                    size="lg"
                    className="rounded-full w-14 h-14"
                    disabled
                  >
                    <MonitorUp className="w-6 h-6" />
                  </Button>

                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={leaveRoom}
                    className="rounded-full w-14 h-14"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>

                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setShowSettings(!showSettings)}
                    className="rounded-full w-14 h-14"
                  >
                    <Settings className="w-6 h-6" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Participants Panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Participants ({participants.length + 1})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Current User */}
                <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {profile?.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">You</p>
                    <p className="text-xs text-slate-500">{currentUserRole}</p>
                  </div>
                  <div className="flex gap-1">
                    {isVideoEnabled ? <Video className="w-3 h-3 text-green-500" /> : <VideoOff className="w-3 h-3 text-red-500" />}
                    {isAudioEnabled ? <Mic className="w-3 h-3 text-green-500" /> : <MicOff className="w-3 h-3 text-red-500" />}
                  </div>
                </div>

                {/* Remote Participants */}
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3 p-2 rounded">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{participant.name}</p>
                      <p className="text-xs text-slate-500">{participant.role}</p>
                    </div>
                    <div className="flex gap-1">
                      {participant.videoEnabled ? <Video className="w-3 h-3 text-green-500" /> : <VideoOff className="w-3 h-3 text-red-500" />}
                      {participant.audioEnabled ? <Mic className="w-3 h-3 text-green-500" /> : <MicOff className="w-3 h-3 text-red-500" />}
                    </div>
                  </div>
                ))}

                {participants.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Waiting for other participants to join...
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Meeting Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Room Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Room ID</p>
                  <p className="text-xs text-slate-500 font-mono">{roomId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Connection</p>
                  <p className="text-xs text-slate-500">{connectionState}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Quality</p>
                  <p className="text-xs text-slate-500">
                    {isConnected ? 'Good' : 'Disconnected'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Copy Room Link
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}