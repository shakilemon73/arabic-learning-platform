import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createEnterpriseVideoSDK, EnterpriseVideoSDK, ParticipantStream, RoomSession } from '../lib/video-sdk';
import { WhiteboardManager } from '../lib/video-sdk/core/WhiteboardManager';
import { BreakoutRoomManager } from '../lib/video-sdk/core/BreakoutRoomManager';
import { InteractionManager } from '../lib/video-sdk/core/InteractionManager';
import { VirtualBackgroundManager } from '../lib/video-sdk/core/VirtualBackgroundManager';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Square, Users, Signal, 
  Circle, StopCircle, Palette, MessageSquare, Hand, Settings,
  Monitor, MonitorOff, VolumeX, Volume2, Wifi, WifiOff
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface ComprehensiveEnterpriseVideoConferenceProps {
  roomId: string;
  userId: string;
  displayName: string;
  role?: 'host' | 'moderator' | 'participant';
  supabaseUrl: string;
  supabaseKey: string;
  onLeave?: () => void;
}

export default function ComprehensiveEnterpriseVideoConference({
  roomId,
  userId,
  displayName,
  role = 'participant',
  supabaseUrl,
  supabaseKey,
  onLeave
}: ComprehensiveEnterpriseVideoConferenceProps) {
  const { toast } = useToast();
  
  // Core SDK state
  const [sdk, setSdk] = useState<EnterpriseVideoSDK | null>(null);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Media state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, ParticipantStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Enterprise features state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'critical'>('good');
  const [networkStats, setNetworkStats] = useState<any>(null);
  const [audioMetrics, setAudioMetrics] = useState<any>(null);
  const [sfuStats, setSfuStats] = useState<any>(null);
  
  // Advanced features managers
  const [whiteboardManager, setWhiteboardManager] = useState<WhiteboardManager | null>(null);
  const [breakoutManager, setBreakoutManager] = useState<BreakoutRoomManager | null>(null);
  const [interactionManager, setInteractionManager] = useState<InteractionManager | null>(null);
  const [virtualBgManager, setVirtualBgManager] = useState<VirtualBackgroundManager | null>(null);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'video' | 'whiteboard' | 'breakout' | 'settings'>('video');
  const [showSettings, setShowSettings] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(true);
  const [virtualBackgroundEnabled, setVirtualBackgroundEnabled] = useState(false);

  // Video element refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const participantVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  /**
   * Initialize Comprehensive Enterprise Video SDK with all features
   */
  useEffect(() => {
    const initializeComprehensiveSDK = async () => {
      try {
        console.log('🚀 Initializing Comprehensive Enterprise Video SDK...');
        
        const enterpriseSDK = createEnterpriseVideoSDK({
          supabaseUrl,
          supabaseKey,
          region: 'us-east',
          maxParticipants: 1000,
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
            quality: 'ultra',
            format: 'mp4',
            includeAudio: true,
            includeVideo: true,
            includeScreenShare: true,
            autoUpload: true,
            encryptRecording: true,
            generateTranscript: true,
            generateSummary: true
          }
        });

        // Set up comprehensive event handlers
        setupComprehensiveEventHandlers(enterpriseSDK);

        // Initialize all advanced feature managers
        await initializeAdvancedManagers(enterpriseSDK);

        await enterpriseSDK.initialize();
        setSdk(enterpriseSDK);

        console.log('✅ Comprehensive Enterprise Video SDK initialized with all features');
        toast({
          title: "এন্টারপ্রাইজ ভিডিও সিস্টেম প্রস্তুত",
          description: "সকল উন্নত ফিচার সহ ভিডিও কনফারেন্স প্রস্তুত",
        });

      } catch (error) {
        console.error('❌ Failed to initialize comprehensive SDK:', error);
        toast({
          title: "ইনিশিয়ালাইজেশন ব্যর্থ",
          description: "এন্টারপ্রাইজ ভিডিও সিস্টেম চালু করতে সমস্যা হয়েছে",
          variant: "destructive"
        });
        setIsInitializing(false);
      }
    };

    initializeComprehensiveSDK();

    return () => {
      // Cleanup all managers
      whiteboardManager?.destroy();
      breakoutManager?.destroy();
      interactionManager?.destroy();
      virtualBgManager?.destroy();
      sdk?.destroy();
    };
  }, []);

  /**
   * Initialize all advanced feature managers
   */
  const initializeAdvancedManagers = async (enterpriseSDK: EnterpriseVideoSDK) => {
    try {
      // Initialize Whiteboard Manager
      const whiteboard = new WhiteboardManager();
      await whiteboard.initialize(roomId);
      setWhiteboardManager(whiteboard);
      
      whiteboard.on('drawing-updated', (data) => {
        console.log('🎨 Whiteboard drawing updated:', data);
      });

      // Initialize Breakout Room Manager
      const breakout = new BreakoutRoomManager(enterpriseSDK['supabase']);
      setBreakoutManager(breakout);
      
      breakout.on('room-created', (data) => {
        console.log('🚪 Breakout room created:', data);
        toast({
          title: "ব্রেকআউট রুম তৈরি",
          description: `নতুন ব্রেকআউট রুম: ${data.roomName}`,
        });
      });

      // Initialize Interaction Manager
      const interaction = new InteractionManager();
      await interaction.initialize(roomId);
      setInteractionManager(interaction);
      
      interaction.on('hand-raised', (data) => {
        console.log('🙋 Hand raised:', data);
        toast({
          title: "হাত তোলা হয়েছে",
          description: `${data.participantName} প্রশ্ন করতে চান`,
        });
      });

      // Initialize Virtual Background Manager
      const virtualBg = new VirtualBackgroundManager();
      await virtualBg.initialize();
      setVirtualBgManager(virtualBg);
      
      virtualBg.on('background-applied', (data) => {
        console.log('🌆 Virtual background applied:', data);
      });

      console.log('✅ All advanced managers initialized');
    } catch (error) {
      console.error('❌ Failed to initialize advanced managers:', error);
    }
  };

  /**
   * Set up comprehensive SDK event handlers for all enterprise features
   */
  const setupComprehensiveEventHandlers = useCallback((enterpriseSDK: EnterpriseVideoSDK) => {
    // Core connection events
    enterpriseSDK.on('room-joined', (data) => {
      console.log('✅ Joined enterprise room:', data);
      setSession(data.session);
      setIsConnected(true);
      setIsInitializing(false);
      toast({
        title: "রুমে যোগদান সফল",
        description: "এন্টারপ্রাইজ ভিডিও কনফারেন্স শুরু হয়েছে",
      });
    });

    enterpriseSDK.on('room-left', () => {
      console.log('👋 Left enterprise room');
      setIsConnected(false);
      setSession(null);
      setParticipants(new Map());
    });

    // Media events
    enterpriseSDK.on('media-initialized', (data) => {
      console.log('🎥 Enterprise media initialized:', data);
      const stream = enterpriseSDK.getLocalStream();
      setLocalStream(stream);
      
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    });

    // Participant events with enterprise features
    enterpriseSDK.on('participant-stream-added', (data) => {
      console.log('📺 Enterprise participant stream added:', data.participantStream);
      const updatedParticipants = new Map(participants);
      updatedParticipants.set(data.participantStream.participantId, data.participantStream);
      setParticipants(updatedParticipants);
      
      const videoElement = participantVideoRefs.current.get(data.participantStream.participantId);
      if (videoElement) {
        videoElement.srcObject = data.participantStream.stream;
      }
    });

    // SFU and performance events
    enterpriseSDK.on('sfu-ready', (data) => {
      console.log('🚀 SFU system ready:', data);
      setSfuStats(data);
    });

    enterpriseSDK.on('quality-adapted', (data) => {
      console.log('📊 Video quality adapted:', data);
      toast({
        title: "গুণমান অপ্টিমাইজ করা হয়েছে",
        description: `ভিডিও গুণমান: ${data.newQuality}`,
      });
    });

    enterpriseSDK.on('connection-quality-changed', (data) => {
      console.log('🔗 Connection quality changed:', data);
      setConnectionQuality(data.quality);
    });

    // Network resilience events
    enterpriseSDK.on('network-path-changed', (data) => {
      console.log('🌐 Network path optimized:', data);
    });

    enterpriseSDK.on('packet-loss-recovery', (data) => {
      console.log('🔄 Network issue recovered:', data);
      toast({
        title: "নেটওয়ার্ক পুনরুদ্ধার",
        description: "নেটওয়ার্ক সমস্যা স্বয়ংক্রিয়ভাবে সমাধান হয়েছে",
      });
    });

    // Audio processing events
    enterpriseSDK.on('voice-activity', (data) => {
      console.log('🎤 Voice activity detected:', data);
    });

    enterpriseSDK.on('audio-metrics', (data) => {
      setAudioMetrics(data);
    });

    // Recording events
    enterpriseSDK.on('recording-started', (data) => {
      console.log('🎬 Enterprise recording started:', data);
      setIsRecording(true);
      setRecordingId(data.recordingId);
      toast({
        title: "রেকর্ডিং শুরু",
        description: "প্রফেশনাল কোয়ালিটিতে সেশন রেকর্ড হচ্ছে",
      });
    });

    enterpriseSDK.on('recording-completed', (data) => {
      console.log('✅ Enterprise recording completed:', data);
      setIsRecording(false);
      setRecordingId(null);
      toast({
        title: "রেকর্ডিং সম্পন্ন",
        description: "রেকর্ডিং স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়েছে",
      });
    });

    // Error handling
    enterpriseSDK.on('error', (data) => {
      console.error('❌ Enterprise SDK error:', data);
      toast({
        title: "সিস্টেম ত্রুটি",
        description: data.error,
        variant: "destructive"
      });
    });
  }, [participants, toast]);

  /**
   * Join room with all enterprise features
   */
  const joinRoom = async () => {
    if (sdk && !isConnected) {
      try {
        await sdk.joinRoom({
          roomId,
          userId,
          displayName,
          role
        });
      } catch (error) {
        console.error('❌ Failed to join room:', error);
        toast({
          title: "রুমে যোগদান ব্যর্থ",
          description: "ভিডিও কনফারেন্সে যোগ দিতে সমস্যা হয়েছে",
          variant: "destructive"
        });
      }
    }
  };

  // Auto-join when SDK is ready
  useEffect(() => {
    if (sdk && !isConnected && !isInitializing) {
      joinRoom();
    }
  }, [sdk, isConnected, isInitializing]);

  /**
   * Media control functions with enterprise features
   */
  const toggleVideo = async () => {
    if (sdk) {
      try {
        const newState = await sdk.toggleVideo();
        setIsVideoEnabled(newState);
      } catch (error) {
        console.error('❌ Failed to toggle video:', error);
      }
    }
  };

  const toggleAudio = async () => {
    if (sdk) {
      try {
        const newState = await sdk.toggleAudio();
        setIsAudioEnabled(newState);
      } catch (error) {
        console.error('❌ Failed to toggle audio:', error);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (sdk) {
      try {
        if (isScreenSharing) {
          await sdk.stopScreenShare();
        } else {
          await sdk.startScreenShare();
        }
        setIsScreenSharing(!isScreenSharing);
      } catch (error) {
        console.error('❌ Failed to toggle screen share:', error);
      }
    }
  };

  /**
   * Enterprise recording controls
   */
  const startRecording = async () => {
    if (sdk && (role === 'host' || role === 'moderator')) {
      try {
        const recordingSession = await sdk.startRecording();
        setIsRecording(true);
        setRecordingId(recordingSession.id);
      } catch (error) {
        console.error('❌ Failed to start recording:', error);
      }
    }
  };

  const stopRecording = async () => {
    if (sdk && recordingId) {
      try {
        await sdk.stopRecording(recordingId);
        setIsRecording(false);
        setRecordingId(null);
      } catch (error) {
        console.error('❌ Failed to stop recording:', error);
      }
    }
  };

  /**
   * Advanced feature controls
   */
  const toggleHandRaise = async () => {
    if (interactionManager) {
      try {
        if (handRaised) {
          await interactionManager.lowerHand(userId);
        } else {
          await interactionManager.raiseHand(userId, displayName);
        }
        setHandRaised(!handRaised);
      } catch (error) {
        console.error('❌ Failed to toggle hand raise:', error);
      }
    }
  };

  const createBreakoutRooms = async () => {
    if (breakoutManager && (role === 'host' || role === 'moderator')) {
      try {
        const rooms = await breakoutManager.createBreakoutRooms(roomId, {
          numberOfRooms: 4,
          assignmentType: 'automatic'
        });
        toast({
          title: "ব্রেকআউট রুম তৈরি",
          description: `${rooms.length}টি ব্রেকআউট রুম তৈরি হয়েছে`,
        });
      } catch (error) {
        console.error('❌ Failed to create breakout rooms:', error);
      }
    }
  };

  const toggleVirtualBackground = async () => {
    if (virtualBgManager) {
      try {
        if (virtualBackgroundEnabled) {
          await virtualBgManager.removeBackground();
        } else {
          await virtualBgManager.applyBackground('blur');
        }
        setVirtualBackgroundEnabled(!virtualBackgroundEnabled);
      } catch (error) {
        console.error('❌ Failed to toggle virtual background:', error);
      }
    }
  };

  /**
   * Leave room
   */
  const handleLeave = async () => {
    if (sdk) {
      await sdk.leaveRoom();
    }
    if (onLeave) {
      onLeave();
    }
  };

  // Loading state
  if (isInitializing) {
    return (
      <Card className="w-full h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-islamic-green border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg font-medium">এন্টারপ্রাইজ ভিডিও সিস্টেম লোড হচ্ছে...</p>
            <p className="text-sm text-gray-600 mt-2">সকল উন্নত ফিচার প্রস্তুত করা হচ্ছে</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Enterprise Status Bar */}
      <div className="bg-gradient-to-r from-islamic-green to-dark-green text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="bg-white text-islamic-green">
            এন্টারপ্রাইজ ভিডিও
          </Badge>
          <div className="flex items-center space-x-2">
            <Signal className="w-4 h-4" />
            <span className="text-sm">
              গুণমান: {connectionQuality === 'excellent' ? 'চমৎকার' : 
                      connectionQuality === 'good' ? 'ভাল' : 
                      connectionQuality === 'poor' ? 'দুর্বল' : 'সমস্যা'}
            </span>
          </div>
          {isRecording && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm">রেকর্ডিং চলছে</span>
            </div>
          )}
          {sfuStats && (
            <span className="text-sm">
              অংশগ্রহণকারী: {sfuStats.participantCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleLeave}
            variant="destructive"
            size="sm"
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            ছেড়ে দিন
          </Button>
        </div>
      </div>

      {/* Main Conference Area */}
      <div className="flex-1 flex">
        {/* Video Conference */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="video">
                <Video className="w-4 h-4 mr-2" />
                ভিডিও
              </TabsTrigger>
              <TabsTrigger value="whiteboard">
                <Palette className="w-4 h-4 mr-2" />
                হোয়াইটবোর্ড
              </TabsTrigger>
              <TabsTrigger value="breakout">
                <Users className="w-4 h-4 mr-2" />
                ব্রেকআউট রুম
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="w-4 h-4 mr-2" />
                সেটিংস
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="flex-1">
              {/* Video Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 h-full">
                {/* Local Video */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    {displayName} (আপনি)
                  </div>
                  <div className="absolute bottom-2 right-2 flex space-x-1">
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

                {/* Remote Participants */}
                {Array.from(participants.values()).map((participant) => (
                  <div
                    key={participant.participantId}
                    className="relative bg-gray-900 rounded-lg overflow-hidden"
                  >
                    <video
                      ref={(el) => {
                        if (el) {
                          participantVideoRefs.current.set(participant.participantId, el);
                        }
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      srcObject={participant.stream}
                    />
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                      অংশগ্রহণকারী
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge 
                        variant={participant.connectionQuality === 'excellent' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {participant.quality}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="whiteboard" className="flex-1">
              <div className="w-full h-full bg-white rounded-lg border">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="text-lg font-semibold">সহযোগী হোয়াইটবোর্ড</h3>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      <Square className="w-4 h-4 mr-2" />
                      আকৃতি
                    </Button>
                    <Button size="sm" variant="outline">
                      পেন
                    </Button>
                  </div>
                </div>
                <div className="flex-1 p-4">
                  <div className="w-full h-96 bg-gray-50 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <p className="text-gray-500">হোয়াইটবোর্ড এলাকা - সহযোগী আঁকার জন্য প্রস্তুত</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="breakout" className="flex-1">
              <div className="p-4">
                <Card>
                  <CardHeader>
                    <CardTitle>ব্রেকআউট রুম ব্যবস্থাপনা</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(role === 'host' || role === 'moderator') ? (
                      <div className="space-y-4">
                        <Button onClick={createBreakoutRooms} className="w-full">
                          <Users className="w-4 h-4 mr-2" />
                          ৪টি ব্রেকআউট রুম তৈরি করুন
                        </Button>
                        <p className="text-sm text-gray-600">
                          অংশগ্রহণকারীরা স্বয়ংক্রিয়ভাবে ছোট গ্রুপে বিভক্ত হবে
                        </p>
                      </div>
                    ) : (
                      <p className="text-center text-gray-600">
                        প্রশিক্ষক ব্রেকআউট রুম সেটআপ করবেন
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="flex-1">
              <div className="p-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>অডিও সেটিংস</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>শব্দ দমন</span>
                      <Button
                        onClick={() => setNoiseSuppressionEnabled(!noiseSuppressionEnabled)}
                        variant={noiseSuppressionEnabled ? "default" : "outline"}
                        size="sm"
                      >
                        {noiseSuppressionEnabled ? 'চালু' : 'বন্ধ'}
                      </Button>
                    </div>
                    {audioMetrics && (
                      <div className="text-sm text-gray-600">
                        <p>অডিও মেট্রিক্স: ভলিউম {Math.round(audioMetrics.volume * 100)}%</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>ভিডিও সেটিংস</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>ভার্চুয়াল ব্যাকগ্রাউন্ড</span>
                      <Button
                        onClick={toggleVirtualBackground}
                        variant={virtualBackgroundEnabled ? "default" : "outline"}
                        size="sm"
                      >
                        {virtualBackgroundEnabled ? 'চালু' : 'বন্ধ'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {networkStats && (
                  <Card>
                    <CardHeader>
                      <CardTitle>নেটওয়ার্ক পরিসংখ্যান</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm space-y-2">
                        <p>ব্যান্ডউইথ: {Math.round(networkStats.bandwidth / 1024)} kbps</p>
                        <p>লেটেন্সি: {networkStats.latency}ms</p>
                        <p>প্যাকেট লস: {(networkStats.packetLoss * 100).toFixed(1)}%</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Enterprise Control Bar */}
      <div className="bg-white border-t px-4 py-3 flex items-center justify-center space-x-4">
        <Button
          onClick={toggleAudio}
          variant={isAudioEnabled ? "default" : "destructive"}
          size="lg"
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        
        <Button
          onClick={toggleVideo}
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        
        <Button
          onClick={toggleScreenShare}
          variant={isScreenSharing ? "default" : "outline"}
          size="lg"
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </Button>
        
        <Button
          onClick={toggleHandRaise}
          variant={handRaised ? "default" : "outline"}
          size="lg"
        >
          <Hand className={`w-5 h-5 ${handRaised ? 'animate-bounce' : ''}`} />
        </Button>

        {(role === 'host' || role === 'moderator') && (
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
          >
            {isRecording ? <StopCircle className="w-5 h-5" /> : <Record className="w-5 h-5" />}
          </Button>
        )}
      </div>
    </div>
  );
}