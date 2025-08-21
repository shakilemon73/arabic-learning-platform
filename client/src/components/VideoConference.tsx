/**
 * Zoom-like Video Conference Component
 * Multi-user video conferencing with screen sharing
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, VideoOff, Mic, MicOff, MonitorUp, MonitorOff, 
  Phone, PhoneOff, Users, Settings, Maximize2, Grid3X3
} from 'lucide-react';
import { VideoConferenceSDK } from '@/lib/video-sdk/VideoConferenceSDK';

interface VideoConferenceProps {
  roomId: string;
  userId: string;
  displayName: string;
  userRole: 'host' | 'moderator' | 'participant';
  supabaseUrl: string;
  supabaseKey: string;
  onLeave?: () => void;
}

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  role: 'host' | 'moderator' | 'participant';
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  joinedAt: Date;
}

export const VideoConference: React.FC<VideoConferenceProps> = ({
  roomId,
  userId,
  displayName,
  userRole,
  supabaseUrl,
  supabaseKey,
  onLeave
}) => {
  // SDK instance
  const [sdk, setSdk] = useState<VideoConferenceSDK | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Participants and streams
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  
  // Media states
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // UI states
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery');
  const [showParticipants, setShowParticipants] = useState(false);
  
  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Initialize SDK on component mount
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        console.log('🚀 Initializing VideoConference...');
        
        const videoSDK = new VideoConferenceSDK({
          supabaseUrl,
          supabaseKey,
          maxParticipants: 100,
          enableSFU: true
        });

        // Set up event listeners
        videoSDK.on('connected', () => {
          console.log('✅ Connected to conference');
          setIsConnected(true);
        });

        videoSDK.on('disconnected', () => {
          console.log('👋 Disconnected from conference');
          setIsConnected(false);
        });

        videoSDK.on('local-stream', (data: any) => {
          console.log('📺 Local stream received');
          setLocalStream(data.stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = data.stream;
          }
        });

        videoSDK.on('remote-stream', (data: any) => {
          console.log('📺 Remote stream received:', data.participantId);
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(data.participantId, data.stream);
            return newStreams;
          });
          
          // Connect to video element
          const videoElement = participantVideoRefs.current.get(data.participantId);
          if (videoElement) {
            videoElement.srcObject = data.stream;
          }
        });

        videoSDK.on('participant-joined', (data: any) => {
          console.log('👤 Participant joined:', data.participant.name);
          setParticipants(prev => [...prev, data.participant]);
        });

        videoSDK.on('participant-left', (data: any) => {
          console.log('👋 Participant left:', data.participant.name);
          setParticipants(prev => prev.filter(p => p.id !== data.participant.id));
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.delete(data.participant.id);
            return newStreams;
          });
        });

        videoSDK.on('participant-updated', (data: any) => {
          setParticipants(prev => 
            prev.map(p => p.id === data.participant.id ? data.participant : p)
          );
        });

        videoSDK.on('video-toggled', (data: any) => {
          setIsVideoEnabled(data.enabled);
        });

        videoSDK.on('audio-toggled', (data: any) => {
          setIsAudioEnabled(data.enabled);
        });

        videoSDK.on('screen-share-started', () => {
          setIsScreenSharing(true);
        });

        videoSDK.on('screen-share-stopped', () => {
          setIsScreenSharing(false);
        });

        videoSDK.on('error', (data: any) => {
          console.error('❌ VideoSDK Error:', data.message);
          alert('Conference Error: ' + data.message);
        });

        setSdk(videoSDK);

        // Join the room with proper role
        await videoSDK.joinRoom(roomId, userId, displayName, userRole);
        
      } catch (error) {
        console.error('❌ Failed to initialize video conference:', error);
        alert('Failed to join conference: ' + (error as Error).message);
      }
    };

    initializeSDK();

    // Cleanup on unmount
    return () => {
      if (sdk) {
        sdk.leaveRoom();
      }
    };
  }, [roomId, userId, displayName, supabaseUrl, supabaseKey]);

  // Update video refs when participants change
  useEffect(() => {
    participants.forEach(participant => {
      const stream = remoteStreams.get(participant.id);
      const videoElement = participantVideoRefs.current.get(participant.id);
      
      if (stream && videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }
    });
  }, [participants, remoteStreams]);

  // Media controls
  const toggleVideo = useCallback(async () => {
    if (sdk) {
      await sdk.toggleVideo();
    }
  }, [sdk]);

  const toggleAudio = useCallback(async () => {
    if (sdk) {
      await sdk.toggleAudio();
    }
  }, [sdk]);

  const toggleScreenShare = useCallback(async () => {
    if (sdk) {
      if (isScreenSharing) {
        await sdk.stopScreenShare();
      } else {
        await sdk.startScreenShare();
      }
    }
  }, [sdk, isScreenSharing]);

  const leaveConference = useCallback(async () => {
    if (sdk) {
      await sdk.leaveRoom();
    }
    if (onLeave) {
      onLeave();
    }
  }, [sdk, onLeave]);

  const getVideoRef = useCallback((participantId: string) => {
    return (element: HTMLVideoElement | null) => {
      if (element) {
        participantVideoRefs.current.set(participantId, element);
        
        // Set stream if it already exists
        const stream = remoteStreams.get(participantId);
        if (stream) {
          element.srcObject = stream;
        }
      } else {
        participantVideoRefs.current.delete(participantId);
      }
    };
  }, [remoteStreams]);

  // Calculate video grid layout
  const getGridLayout = () => {
    const totalVideos = participants.length + 1; // +1 for local video
    
    if (totalVideos <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalVideos <= 4) return 'grid-cols-2';
    if (totalVideos <= 6) return 'grid-cols-2 md:grid-cols-3';
    if (totalVideos <= 9) return 'grid-cols-3';
    return 'grid-cols-3 md:grid-cols-4';
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Connecting to conference...</p>
          <p className="text-sm text-gray-400">Room: {roomId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-white font-semibold">Conference: {roomId}</h1>
          <Badge variant="secondary" className="bg-green-600">
            {participants.length + 1} participants
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode(viewMode === 'gallery' ? 'speaker' : 'gallery')}
            className="text-white"
          >
            {viewMode === 'gallery' ? <Maximize2 className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParticipants(!showParticipants)}
            className="text-white"
          >
            <Users className="h-4 w-4 mr-2" />
            Participants
          </Button>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 p-4">
        {viewMode === 'gallery' ? (
          <div className={`grid ${getGridLayout()} gap-4 h-full`}>
            {/* Local video */}
            <Card className="relative bg-gray-800 overflow-hidden">
              <CardContent className="p-0 h-full">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
                  You {!isVideoEnabled && '(Video Off)'}
                </div>
                <div className="absolute top-2 right-2 flex space-x-1">
                  {!isVideoEnabled && (
                    <div className="bg-red-500 p-1 rounded">
                      <VideoOff className="h-3 w-3 text-white" />
                    </div>
                  )}
                  {!isAudioEnabled && (
                    <div className="bg-red-500 p-1 rounded">
                      <MicOff className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Remote participant videos */}
            {participants.map((participant) => (
              <Card key={participant.id} className="relative bg-gray-800 overflow-hidden">
                <CardContent className="p-0 h-full">
                  <video
                    ref={getVideoRef(participant.id)}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-sm">
                    {participant.name} {!participant.videoEnabled && '(Video Off)'}
                  </div>
                  <div className="absolute top-2 right-2 flex space-x-1">
                    {!participant.videoEnabled && (
                      <div className="bg-red-500 p-1 rounded">
                        <VideoOff className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {!participant.audioEnabled && (
                      <div className="bg-red-500 p-1 rounded">
                        <MicOff className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {participant.screenSharing && (
                      <div className="bg-blue-500 p-1 rounded">
                        <MonitorUp className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 left-2">
                    <div className={`w-2 h-2 rounded-full ${
                      participant.connectionQuality === 'excellent' ? 'bg-green-500' :
                      participant.connectionQuality === 'good' ? 'bg-yellow-500' :
                      participant.connectionQuality === 'poor' ? 'bg-orange-500' : 'bg-red-500'
                    }`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Speaker view - largest video + thumbnails
          <div className="h-full flex">
            <div className="flex-1 pr-4">
              <Card className="h-full bg-gray-800 overflow-hidden">
                <CardContent className="p-0 h-full">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="w-48 space-y-2">
              {participants.map((participant) => (
                <Card key={participant.id} className="bg-gray-800 overflow-hidden">
                  <CardContent className="p-0 aspect-video">
                    <video
                      ref={getVideoRef(participant.id)}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex items-center justify-center space-x-4">
        <Button
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleVideo}
          className="rounded-full"
        >
          {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>

        <Button
          variant={isAudioEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleAudio}
          className="rounded-full"
        >
          {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>

        <Button
          variant={isScreenSharing ? "secondary" : "outline"}
          size="lg"
          onClick={toggleScreenShare}
          className="rounded-full"
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
        </Button>

        <div className="w-px h-8 bg-gray-600" />

        <Button
          variant="destructive"
          size="lg"
          onClick={leaveConference}
          className="rounded-full"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      {/* Participants panel */}
      {showParticipants && (
        <div className="absolute right-4 top-20 bottom-20 w-80 bg-gray-800 rounded-lg p-4 shadow-xl">
          <h3 className="text-white font-semibold mb-4">Participants ({participants.length + 1})</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-2 rounded bg-gray-700">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-white">You</span>
              <Badge variant="outline" className="ml-auto">
                {userRole === 'host' ? 'Host' : userRole === 'moderator' ? 'Moderator' : 'Participant'}
              </Badge>
            </div>
            
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-3 p-2 rounded bg-gray-700">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                  {participant.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <span className="text-white">{participant.name}</span>
                  <Badge 
                    variant="outline" 
                    className={`ml-2 text-xs ${
                      participant.role === 'host' ? 'border-blue-500 text-blue-400' :
                      participant.role === 'moderator' ? 'border-yellow-500 text-yellow-400' :
                      'border-gray-500 text-gray-400'
                    }`}
                  >
                    {participant.role === 'host' ? 'Host' : participant.role === 'moderator' ? 'Moderator' : 'Student'}
                  </Badge>
                </div>
                <div className="flex space-x-1">
                  {!participant.videoEnabled && <VideoOff className="h-4 w-4 text-red-400" />}
                  {!participant.audioEnabled && <MicOff className="h-4 w-4 text-red-400" />}
                  {participant.screenSharing && <MonitorUp className="h-4 w-4 text-blue-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};