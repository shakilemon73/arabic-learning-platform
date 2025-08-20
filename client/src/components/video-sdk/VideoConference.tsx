/**
 * VideoConference - Main video conferencing component
 * Displays participants, local video, and controls
 */

import React, { useEffect, useRef, useState } from 'react';
import { useVideoSDK } from './VideoSDKProvider';
import { ParticipantVideo } from './ParticipantVideo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff, 
  Phone, 
  MessageSquare,
  Users,
  Settings,
  Circle,
  MoreVertical
} from 'lucide-react';

interface VideoConferenceProps {
  showChat?: boolean;
  showWhiteboard?: boolean;
  showControls?: boolean;
  onChatToggle?: () => void;
  onWhiteboardToggle?: () => void;
  onSettingsOpen?: () => void;
}

export function VideoConference({ 
  showChat = true, 
  showControls = true,
  onChatToggle,
  onSettingsOpen 
}: VideoConferenceProps) {
  const {
    isConnected,
    localStream,
    participants,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    leaveRoom,
    error,
    sdk
  } = useVideoSDK();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [participantStreams, setParticipantStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isRecording, setIsRecording] = useState(false);
  const [showParticipantList, setShowParticipantList] = useState(false);

  // Setup local video
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle participant video streams - ZOOM-LIKE REAL-TIME IMPLEMENTATION
  useEffect(() => {
    if (!isConnected || !sdk) return;

    console.log('🔄 Setting up REAL-TIME participant video stream handlers...');

    const handleRemoteStream = (data: any) => {
      console.log('🎥 RECEIVED REMOTE STREAM from participant:', data.participantId);
      const { participantId, stream } = data;
      
      setParticipantStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.set(participantId, stream);
        console.log('✅ Added stream for participant:', participantId, 'Total streams:', newStreams.size);
        return newStreams;
      });
    };

    const handleParticipantJoined = (data: any) => {
      console.log('👤 PARTICIPANT JOINED - preparing for video stream:', data.participant?.id);
      // Participant joined, stream will come via handleRemoteStream
    };

    const handleParticipantLeft = (data: any) => {
      console.log('👋 PARTICIPANT LEFT - removing video stream:', data.participantId);
      const { participantId } = data;
      
      setParticipantStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(participantId);
        console.log('🗑️ Removed stream for participant:', participantId, 'Remaining streams:', newStreams.size);
        return newStreams;
      });
    };

    // WebRTC Connection State Monitoring
    const handleConnectionStateChange = (data: any) => {
      console.log('🔗 WebRTC Connection state changed:', data);
    };

    // Add REAL SDK event listeners for ZOOM-like functionality
    if (sdk.on) {
      sdk.on('remote-stream', handleRemoteStream);
      sdk.on('participant-joined', handleParticipantJoined);
      sdk.on('participant-left', handleParticipantLeft);
      sdk.on('connection-state-changed', handleConnectionStateChange);

      console.log('✅ Real-time video event handlers registered');

      return () => {
        sdk.off('remote-stream', handleRemoteStream);
        sdk.off('participant-joined', handleParticipantJoined);
        sdk.off('participant-left', handleParticipantLeft);
        sdk.off('connection-state-changed', handleConnectionStateChange);
        console.log('🧹 Event handlers cleaned up');
      };
    } else {
      console.warn('⚠️ SDK event system not available - check VideoSDK implementation');
    }
  }, [isConnected, sdk]);

  // Debug participant streams state
  useEffect(() => {
    console.log('📊 CURRENT STATE - Participants:', participants.length, 'Streams:', participantStreams.size);
    console.log('📊 Participant IDs:', participants.map(p => p.id));
    console.log('📊 Stream IDs:', Array.from(participantStreams.keys()));
  }, [participants, participantStreams]);

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-islamic-green border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white font-bengali">ভিডিও কনফারেন্সে সংযোগ করা হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Main Video Area */}
      <div className="flex-1 relative">
        {/* Participants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full p-4">
          {/* Local Video */}
          <Card className="relative overflow-hidden bg-gray-800 border-gray-700">
            <CardContent className="p-0 h-full">
              <div className="relative h-full">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-islamic-green text-white px-2 py-1 rounded text-sm font-bengali">
                  আপনি (You)
                </div>
                <div className="absolute top-2 right-2">
                  <Badge variant={isVideoEnabled ? "default" : "destructive"} className="text-xs">
                    {isVideoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remote Participants */}
          {participants.map(participant => (
            <Card key={participant.id} className="relative overflow-hidden bg-gray-800 border-gray-700">
              <CardContent className="p-0 h-full">
                <div className="relative h-full">
                  {participantStreams.has(participant.id) ? (
                    <ParticipantVideo 
                      stream={participantStreams.get(participant.id)!} 
                      participant={participant}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-islamic-green rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-white text-lg font-bold">
                            {participant.name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <p className="text-white text-sm font-bengali">{participant.name}</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-sm font-bengali">
                    {participant.name}
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant={participant.videoEnabled ? "default" : "destructive"} className="text-xs">
                      {participant.videoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded font-bengali">
            <strong>ত্রুটি:</strong> {error}
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-2 rounded-lg flex items-center font-bengali">
            <Circle className="w-3 h-3 mr-2 fill-current animate-pulse" />
            রেকর্ডিং চলছে
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="bg-gray-800 px-4 py-3 flex items-center justify-center space-x-4">
          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="sm"
            onClick={() => toggleVideo()}
            className="rounded-full w-12 h-12"
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="sm"
            onClick={() => toggleAudio()}
            className="rounded-full w-12 h-12"
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          <Button
            variant={isScreenSharing ? "default" : "outline"}
            size="sm"
            onClick={() => isScreenSharing ? stopScreenShare() : startScreenShare()}
            className="rounded-full w-12 h-12"
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onChatToggle}
            className="rounded-full w-12 h-12"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowParticipantList(!showParticipantList)}
            className="rounded-full w-12 h-12"
          >
            <Users className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onSettingsOpen}
            className="rounded-full w-12 h-12"
          >
            <Settings className="w-5 h-5" />
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={leaveRoom}
            className="rounded-full w-12 h-12 ml-8"
          >
            <Phone className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Participants List Sidebar */}
      {showParticipantList && (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gray-800 border-l border-gray-700 p-4">
          <h3 className="font-bengali text-white text-lg mb-4">অংশগ্রহণকারী ({participants.length + 1})</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-2 bg-islamic-green/20 rounded">
              <div className="w-8 h-8 bg-islamic-green rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">আপনি</span>
              </div>
              <span className="text-white font-bengali">আপনি (হোস্ট)</span>
            </div>
            {participants.map(participant => (
              <div key={participant.id} className="flex items-center space-x-3 p-2 bg-gray-700 rounded">
                <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {participant.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-white font-bengali">{participant.name}</span>
                {participant.role === 'host' && (
                  <Badge variant="secondary" className="text-xs">হোস্ট</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

