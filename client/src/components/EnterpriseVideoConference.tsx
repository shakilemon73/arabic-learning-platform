import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EnterpriseVideoSDK, createEnterpriseVideoSDK, ParticipantStream, RoomSession } from '../lib/video-sdk';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Record, Square, Users, Signal } from 'lucide-react';

interface EnterpriseVideoConferenceProps {
  roomId: string;
  userId: string;
  displayName: string;
  role?: 'host' | 'moderator' | 'participant';
  supabaseUrl: string;
  supabaseKey: string;
  onLeave?: () => void;
}

export default function EnterpriseVideoConference({
  roomId,
  userId,
  displayName,
  role = 'participant',
  supabaseUrl,
  supabaseKey,
  onLeave
}: EnterpriseVideoConferenceProps) {
  // SDK and session state
  const [sdk, setSdk] = useState<EnterpriseVideoSDK | null>(null);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, ParticipantStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  // Performance metrics
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'critical'>('good');
  const [participantCount, setParticipantCount] = useState(0);
  const [networkStats, setNetworkStats] = useState<any>(null);

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  /**
   * Initialize Enterprise Video SDK
   */
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        console.log('🚀 Initializing Enterprise Video SDK...');
        
        const enterpriseSDK = createEnterpriseVideoSDK({
          supabaseUrl,
          supabaseKey,
          region: 'us-east', // Auto-detect region in production
          maxParticipants: 100,
          enableSFU: true,
          enableAdaptiveBitrate: true,
          enableAudioProcessing: true,
          enableNetworkResilience: true,
          enableRecording: role === 'host' || role === 'moderator',
          audioConfig: {
            noiseSuppression: true,
            echoCancellation: true,
            autoGainControl: true,
            voiceActivityDetection: true,
            advancedNoiseSuppression: true,
            speechEnhancement: true
          },
          recordingConfig: {
            quality: 'high',
            format: 'mp4',
            includeAudio: true,
            includeVideo: true,
            includeScreenShare: true,
            autoUpload: true,
            encryptRecording: true
          }
        });

        // Set up comprehensive event handlers
        setupSDKEventHandlers(enterpriseSDK);

        await enterpriseSDK.initialize();
        setSdk(enterpriseSDK);

        console.log('✅ Enterprise Video SDK initialized');

      } catch (error) {
        console.error('❌ Failed to initialize SDK:', error);
        setIsInitializing(false);
      }
    };

    initializeSDK();

    return () => {
      if (sdk) {
        sdk.destroy();
      }
    };
  }, []);

  /**
   * Set up comprehensive SDK event handlers
   */
  const setupSDKEventHandlers = useCallback((enterpriseSDK: EnterpriseVideoSDK) => {
    // Core connection events
    enterpriseSDK.on('room-joined', (data) => {
      console.log('✅ Joined room with enterprise features:', data);
      setSession(data.session);
      setIsConnected(true);
      setIsInitializing(false);
    });

    enterpriseSDK.on('room-left', () => {
      console.log('👋 Left room');
      setIsConnected(false);
      setSession(null);
      setParticipants(new Map());
    });

    // Media events
    enterpriseSDK.on('media-initialized', (data) => {
      console.log('🎥 Media initialized:', data);
      const stream = enterpriseSDK.getLocalStream();
      setLocalStream(stream);
      
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    });

    enterpriseSDK.on('participant-stream-added', (data) => {
      console.log('📺 Participant stream added:', data.participantStream);
      const updatedParticipants = new Map(participants);
      updatedParticipants.set(data.participantStream.participantId, data.participantStream);
      setParticipants(updatedParticipants);
      
      // Set video element source
      const videoElement = participantVideoRefs.current.get(data.participantStream.participantId);
      if (videoElement) {
        videoElement.srcObject = data.participantStream.stream;
      }
    });

    // Quality and performance events
    enterpriseSDK.on('quality-adapted', (data) => {
      console.log('📊 Quality adapted:', data);
    });

    enterpriseSDK.on('connection-quality-changed', (data) => {
      console.log('🔗 Connection quality changed:', data);
      setConnectionQuality(data.quality);
    });

    enterpriseSDK.on('network-path-changed', (data) => {
      console.log('🌐 Network path changed:', data);
    });

    enterpriseSDK.on('packet-loss-recovery', (data) => {
      console.log('🔄 Packet loss recovery activated:', data);
    });

    // Recording events
    enterpriseSDK.on('recording-started', (data) => {
      console.log('🎬 Recording started:', data);
      setIsRecording(true);
      setRecordingId(data.session.id);
    });

    enterpriseSDK.on('recording-completed', (data) => {
      console.log('✅ Recording completed:', data);
      setIsRecording(false);
      setRecordingId(null);
    });

    // Audio processing events
    enterpriseSDK.on('voice-activity', (data) => {
      // Voice activity detection for UI feedback
      if (data.isActive) {
        console.log('🎤 Voice activity detected');
      }
    });

    enterpriseSDK.on('audio-metrics', (data) => {
      // Real-time audio metrics for monitoring
      console.log('📊 Audio metrics:', data);
    });

    // Participant events
    enterpriseSDK.on('participant-joined', (data) => {
      console.log('👥 Participant joined:', data);
      setParticipantCount(prev => prev + 1);
    });

    enterpriseSDK.on('participant-left', (data) => {
      console.log('👋 Participant left:', data);
      setParticipantCount(prev => Math.max(0, prev - 1));
      
      // Remove from participants map
      const updatedParticipants = new Map(participants);
      updatedParticipants.delete(data.userId);
      setParticipants(updatedParticipants);
    });

    // Performance monitoring
    enterpriseSDK.on('performance-alert', (data) => {
      console.warn('⚠️ Performance alert:', data);
    });

    // Error handling
    enterpriseSDK.on('error', (error) => {
      console.error('❌ SDK Error:', error);
    });
  }, [participants]);

  /**
   * Join room with enterprise features
   */
  useEffect(() => {
    if (sdk && !isConnected && !isInitializing) {
      const joinRoom = async () => {
        try {
          await sdk.joinRoom({
            roomId,
            userId,
            displayName,
            role
          });
        } catch (error) {
          console.error('❌ Failed to join room:', error);
          setIsInitializing(false);
        }
      };

      joinRoom();
    }
  }, [sdk, roomId, userId, displayName, role, isConnected, isInitializing]);

  /**
   * Collect real-time statistics
   */
  useEffect(() => {
    if (!sdk || !isConnected) return;

    const statsInterval = setInterval(async () => {
      try {
        const stats = await sdk.getStatistics();
        setNetworkStats(stats);
        setParticipantCount(stats.participantCount);
      } catch (error) {
        console.error('Failed to get statistics:', error);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(statsInterval);
  }, [sdk, isConnected]);

  /**
   * Handle media controls
   */
  const handleToggleVideo = async () => {
    if (!sdk) return;
    
    try {
      const enabled = await sdk.toggleVideo();
      setIsVideoEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  };

  const handleToggleAudio = async () => {
    if (!sdk) return;
    
    try {
      const enabled = await sdk.toggleAudio();
      setIsAudioEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle audio:', error);
    }
  };

  /**
   * Handle recording controls
   */
  const handleStartRecording = async () => {
    if (!sdk || isRecording) return;
    
    try {
      const sessionId = await sdk.startRecording({
        quality: 'high',
        format: 'mp4',
        maxDuration: 120 // 2 hours
      });
      console.log('🎬 Recording started:', sessionId);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStopRecording = async () => {
    if (!sdk || !isRecording) return;
    
    try {
      await sdk.stopRecording();
      console.log('⏹️ Recording stopped');
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  /**
   * Handle leaving room
   */
  const handleLeaveRoom = async () => {
    if (!sdk) return;
    
    try {
      await sdk.leaveRoom();
      if (onLeave) {
        onLeave();
      }
    } catch (error) {
      console.error('Failed to leave room:', error);
      if (onLeave) {
        onLeave();
      }
    }
  };

  /**
   * Get connection quality color
   */
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-yellow-500';
      case 'poor': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-islamic-green mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Initializing Enterprise Video SDK</h3>
            <p className="text-muted-foreground">
              Loading advanced video conferencing features...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header with controls and stats */}
      <div className="mb-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Signal className="h-5 w-5" />
                Enterprise Video Conference
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={isConnected ? 'default' : 'secondary'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getQualityColor(connectionQuality)}`}></div>
                  {connectionQuality}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {participantCount + 1}
                </Badge>
                {isRecording && (
                  <Badge variant="destructive" className="animate-pulse">
                    ● REC
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              {/* Media controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant={isVideoEnabled ? "default" : "destructive"}
                  size="sm"
                  onClick={handleToggleVideo}
                  data-testid="toggle-video-button"
                >
                  {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant={isAudioEnabled ? "default" : "destructive"}
                  size="sm"
                  onClick={handleToggleAudio}
                  data-testid="toggle-audio-button"
                >
                  {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>

                {/* Recording controls for host/moderator */}
                {(role === 'host' || role === 'moderator') && (
                  <Button
                    variant={isRecording ? "destructive" : "outline"}
                    size="sm"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    data-testid="toggle-recording-button"
                  >
                    {isRecording ? <Square className="h-4 w-4" /> : <Record className="h-4 w-4" />}
                  </Button>
                )}
              </div>

              {/* Room info */}
              <div className="text-sm text-muted-foreground">
                Room: {roomId} | Role: {role}
              </div>

              {/* Leave button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleLeaveRoom}
                data-testid="leave-room-button"
              >
                <PhoneOff className="h-4 w-4 mr-1" />
                Leave
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Local video */}
        <Card className="relative">
          <CardContent className="p-0">
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                data-testid="local-video"
              />
              <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                You ({displayName})
              </div>
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                  <VideoOff className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Participant videos */}
        {Array.from(participants.entries()).map(([participantId, participantStream]) => (
          <Card key={participantId} className="relative">
            <CardContent className="p-0">
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={(el) => {
                    if (el) {
                      participantVideoRefs.current.set(participantId, el);
                      el.srcObject = participantStream.stream;
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  data-testid={`participant-video-${participantId}`}
                />
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                  {participantId}
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <div className={`w-2 h-2 rounded-full ${getQualityColor(participantStream.connectionQuality)}`}></div>
                  {!participantStream.isVideoEnabled && (
                    <VideoOff className="h-4 w-4 text-white" />
                  )}
                  {!participantStream.isAudioEnabled && (
                    <MicOff className="h-4 w-4 text-white" />
                  )}
                </div>
                {!participantStream.isVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <div className="text-center text-white">
                      <VideoOff className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">{participantId}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance stats (debug info) */}
      {networkStats && (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Enterprise Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {networkStats.network && (
                  <div>
                    <p className="font-medium">Network</p>
                    <p>Latency: {Math.round(networkStats.network.averageLatency)}ms</p>
                    <p>Quality: {networkStats.network.connectionQuality}</p>
                  </div>
                )}
                {networkStats.quality && (
                  <div>
                    <p className="font-medium">Video Quality</p>
                    <p>{networkStats.quality.current.resolution.width}x{networkStats.quality.current.resolution.height}</p>
                    <p>{networkStats.quality.current.frameRate}fps</p>
                  </div>
                )}
                {networkStats.sfu && (
                  <div>
                    <p className="font-medium">SFU Performance</p>
                    <p>CPU: {Math.round(networkStats.sfu.cpuUsage)}%</p>
                    <p>Memory: {Math.round(networkStats.sfu.memoryUsage)}%</p>
                  </div>
                )}
                {networkStats.audio && (
                  <div>
                    <p className="font-medium">Audio Processing</p>
                    <p>VAD: {networkStats.audio.isCalibrated ? 'Active' : 'Calibrating'}</p>
                    <p>ML Models: {networkStats.audio.mlModelsLoaded ? 'Loaded' : 'Basic'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}