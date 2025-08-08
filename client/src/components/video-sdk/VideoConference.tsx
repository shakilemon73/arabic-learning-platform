/**
 * VideoConference - Main video conferencing component
 * Displays participants, local video, and controls
 */

import React, { useEffect, useRef, useState } from 'react';
import { useVideoSDK } from './VideoSDKProvider';
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
    error
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

  // Handle participant video streams
  useEffect(() => {
    // This would be connected to the SDK's remote stream events
    // For now, we'll just track participants
  }, [participants]);

  const handleVideoToggle = async () => {
    await toggleVideo();
  };

  const handleAudioToggle = async () => {
    await toggleAudio();
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  const handleLeaveRoom = async () => {
    await leaveRoom();
  };

  const handleStartRecording = () => {
    setIsRecording(!isRecording);
    // This would call the SDK's recording functionality
  };

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8">
          <CardContent className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Not Connected</h2>
            <p className="text-muted-foreground">Please join a room to start the video conference.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Error Display */}
      {error && (
        <div className="bg-red-500 text-white px-4 py-2 text-sm">
          Error: {error}
        </div>
      )}

      {/* Main Video Area */}
      <div className="flex-1 relative">
        {/* Participants Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 h-full">
          {/* Local Video */}
          <div className="relative">
            <Card className="h-full bg-black">
              <CardContent className="p-0 h-full relative">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    You
                  </Badge>
                </div>
                <div className="absolute bottom-2 right-2 flex space-x-1">
                  {!isVideoEnabled && (
                    <div className="bg-red-500 p-1 rounded">
                      <VideoOff size={16} className="text-white" />
                    </div>
                  )}
                  {!isAudioEnabled && (
                    <div className="bg-red-500 p-1 rounded">
                      <MicOff size={16} className="text-white" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Remote Participants */}
          {participants.map((participant) => (
            <ParticipantVideo
              key={participant.id}
              participant={participant}
              stream={participantStreams.get(participant.id)}
            />
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 8 - participants.length - 1) }).map((_, index) => (
            <Card key={index} className="h-full bg-gray-800 border-gray-700">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <Users size={48} />
                  <p className="mt-2 text-sm">Waiting for participant</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Participant Count */}
        <div className="absolute top-4 left-4">
          <Badge variant="outline" className="bg-black/50 text-white border-gray-600">
            <Users size={16} className="mr-2" />
            {participants.length + 1} participants
          </Badge>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4">
            <Badge variant="destructive" className="animate-pulse">
              <Circle size={16} className="mr-2 fill-current" />
              Recording
            </Badge>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="bg-gray-800 p-4 flex items-center justify-center space-x-4">
          {/* Video Control */}
          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={handleVideoToggle}
            className="rounded-full w-12 h-12 p-0"
          >
            {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
          </Button>

          {/* Audio Control */}
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={handleAudioToggle}
            className="rounded-full w-12 h-12 p-0"
          >
            {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
          </Button>

          {/* Screen Share */}
          <Button
            variant={isScreenSharing ? "secondary" : "outline"}
            size="lg"
            onClick={handleScreenShare}
            className="rounded-full w-12 h-12 p-0"
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
          </Button>

          {/* Chat Toggle */}
          {showChat && onChatToggle && (
            <Button
              variant="outline"
              size="lg"
              onClick={onChatToggle}
              className="rounded-full w-12 h-12 p-0"
            >
              <MessageSquare size={20} />
            </Button>
          )}

          {/* Recording */}
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="lg"
            onClick={handleStartRecording}
            className="rounded-full w-12 h-12 p-0"
          >
            <Circle size={20} className={isRecording ? "fill-current" : ""} />
          </Button>

          {/* Settings */}
          {onSettingsOpen && (
            <Button
              variant="outline"
              size="lg"
              onClick={onSettingsOpen}
              className="rounded-full w-12 h-12 p-0"
            >
              <Settings size={20} />
            </Button>
          )}

          {/* More Options */}
          <Button
            variant="outline"
            size="lg"
            className="rounded-full w-12 h-12 p-0"
          >
            <MoreVertical size={20} />
          </Button>

          {/* Leave Room */}
          <Button
            variant="destructive"
            size="lg"
            onClick={handleLeaveRoom}
            className="rounded-full w-12 h-12 p-0"
          >
            <Phone size={20} className="transform rotate-135" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Participant Video Component
interface ParticipantVideoProps {
  participant: any;
  stream?: MediaStream;
}

function ParticipantVideo({ participant, stream }: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative">
      <Card className="h-full bg-black">
        <CardContent className="p-0 h-full relative">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-700">
              <div className="text-center text-white">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-semibold">
                  {participant.displayName.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm">{participant.displayName}</p>
              </div>
            </div>
          )}
          
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="bg-black/70 text-white">
              {participant.displayName}
            </Badge>
          </div>

          <div className="absolute bottom-2 right-2 flex space-x-1">
            {!participant.isVideoEnabled && (
              <div className="bg-red-500 p-1 rounded">
                <VideoOff size={16} className="text-white" />
              </div>
            )}
            {!participant.isAudioEnabled && (
              <div className="bg-red-500 p-1 rounded">
                <MicOff size={16} className="text-white" />
              </div>
            )}
          </div>

          {/* Connection Quality Indicator */}
          <div className="absolute top-2 right-2">
            <div className={`w-2 h-2 rounded-full ${
              participant.connectionQuality === 'excellent' ? 'bg-green-500' :
              participant.connectionQuality === 'good' ? 'bg-yellow-500' :
              participant.connectionQuality === 'poor' ? 'bg-red-500' :
              'bg-gray-500'
            }`} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}