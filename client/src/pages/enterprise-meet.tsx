/**
 * Enterprise Video Conferencing Platform
 * World-class video conferencing that competes with Zoom, Teams, Google Meet, Webex, GoTo Meeting
 * Showcases ALL video SDK capabilities in a professional enterprise interface
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Video, VideoOff, Mic, MicOff, MonitorUp, MonitorOff, Phone, PhoneOff,
  Settings, Users, MessageSquare, Presentation, Camera, Palette,
  Hand, Heart, ThumbsUp, Laugh, Volume2, VolumeX, Wifi, Signal,
  MoreVertical, Grid3X3, Maximize2, Minimize2, RotateCw, Share2,
  Circle, Square, Play, Pause, Download, Upload, Eye, EyeOff,
  UserPlus, UserMinus, Crown, Shield, Zap, Brain, Radio,
  BarChart3, Activity, Timer, Award, Target, Layers,
  PenTool, Eraser, Type, MousePointer, Shapes, Image as ImageIcon
} from 'lucide-react';
import Header from '@/components/Header';

// SDK Imports - ALL managers for complete enterprise platform
import { 
  VideoSDK, 
  EnterpriseVideoSDK,
  BreakoutRoomManager,
  WaitingRoomManager,
  InteractionManager,
  VirtualBackgroundManager,
  AudioProcessingManager,
  AdaptiveBitrateManager,
  EnterpriseRecordingManager as RecordingManager,
  ScreenShareManager,
  WhiteboardManager,
  ModeratorManager,
  ChatManager,
  MediaManager
} from '@/lib/video-sdk';

import { createClient } from '@supabase/supabase-js';

// Enterprise Configuration
const ENTERPRISE_CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://sgyanvjlwlrzcrpjwlsd.supabase.co',
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneWFudmpsd2xyemNycGp3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTg1MjAsImV4cCI6MjA3MDEzNDUyMH0.5xjMdSUdeHGln68tfuw626q4xDZkuR8Xg_e_w6g9iJk',
  region: 'us-east' as const,
  maxParticipants: 1000,
  enableAI: true,
  enableRecording: true,
  enableLiveStream: true,
  enableWhiteboard: true,
  enableBreakoutRooms: true,
  enableWaitingRoom: true,
  enableVirtualBackgrounds: true,
  enableAdvancedAudio: true,
  enableAdaptiveBitrate: true
};

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  role: 'host' | 'moderator' | 'participant' | 'viewer';
  videoEnabled: boolean;
  audioEnabled: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
  isInBreakoutRoom?: boolean;
  breakoutRoomId?: string;
}

export default function EnterpriseMeetPage() {
  // Authentication
  const { user, profile } = useAuth();
  const [, navigate] = useLocation();

  // Core Platform State
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [roomId, setRoomId] = useState<string>(() => {
    // Get room ID from URL parameters or generate one
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room') || `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // SDK Managers
  const [videoSDK, setVideoSDK] = useState<EnterpriseVideoSDK | null>(null);
  const [breakoutManager, setBreakoutManager] = useState<BreakoutRoomManager | null>(null);
  const [waitingManager, setWaitingManager] = useState<WaitingRoomManager | null>(null);
  const [interactionManager, setInteractionManager] = useState<InteractionManager | null>(null);
  const [virtualBgManager, setVirtualBgManager] = useState<VirtualBackgroundManager | null>(null);
  const [audioManager, setAudioManager] = useState<AudioProcessingManager | null>(null);
  const [bitrateManager, setBitrateManager] = useState<AdaptiveBitrateManager | null>(null);
  const [recordingManager, setRecordingManager] = useState<RecordingManager | null>(null);
  const [screenManager, setScreenManager] = useState<ScreenShareManager | null>(null);
  const [whiteboardManager, setWhiteboardManager] = useState<WhiteboardManager | null>(null);
  const [chatManager, setChatManager] = useState<ChatManager | null>(null);

  // Media Controls State
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState('video');
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker' | 'presentation'>('gallery');
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // Video stream state for remote participants
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const participantVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Advanced Features State
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(true);
  const [breakoutRoomsActive, setBreakoutRoomsActive] = useState(false);
  const [virtualBackground, setVirtualBackground] = useState('none');
  const [audioEnhancement, setAudioEnhancement] = useState(true);
  const [adaptiveQuality, setAdaptiveQuality] = useState(true);

  // Performance Metrics
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor'>('excellent');
  const [bandwidth, setBandwidth] = useState(1000);
  const [latency, setLatency] = useState(45);

  // UI References
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Enterprise Platform
  const initializeEnterprisePlatform = useCallback(async () => {
    if (!user) return;

    try {
      console.log('🚀 Initializing World-Class Enterprise Video Platform...');

      // Create Supabase client
      const supabase = createClient(ENTERPRISE_CONFIG.supabaseUrl, ENTERPRISE_CONFIG.supabaseKey);

      // Initialize Enterprise Video SDK with proper config
      const enterpriseSDK = new EnterpriseVideoSDK({
        ...ENTERPRISE_CONFIG,
        enableSFU: true,
        enableAudioProcessing: true,
        enableNetworkResilience: true
      });
      await enterpriseSDK.initialize();
      setVideoSDK(enterpriseSDK);

      // Initialize ALL Professional Managers
      console.log('🏢 Initializing enterprise managers...');

      // 1. Breakout Room Manager (Professional small group collaboration)
      const breakout = new BreakoutRoomManager(supabase);
      await breakout.initialize(roomId, user.id, {
        maxRooms: 20,
        defaultCapacity: 8,
        autoAssign: false,
        allowParticipantChoice: true,
        timeLimit: 30,
        broadcastMessages: true
      });
      setBreakoutManager(breakout);

      // 2. Waiting Room Manager (Security admission control)
      const waiting = new WaitingRoomManager(supabase);
      await waiting.initialize(roomId, user.id, {
        enabled: waitingRoomEnabled,
        autoAdmit: false,
        requireApproval: true,
        maxWaitingParticipants: 100,
        waitingMessage: 'Please wait while the host admits you to the meeting',
        hostNotifications: true
      });
      setWaitingManager(waiting);

      // 3. Interaction Manager (Hand raising, reactions, polls, Q&A)
      const interaction = new InteractionManager(supabase);
      await interaction.initialize(roomId, user.id, {
        handRaiseEnabled: true,
        reactionsEnabled: true,
        pollsEnabled: true,
        qaEnabled: true,
        anonymousQuestionsAllowed: true,
        participantPollsAllowed: true,
        reactionDuration: 3
      });
      setInteractionManager(interaction);

      // 4. Virtual Background Manager (Professional background effects)
      const virtualBg = new VirtualBackgroundManager();
      await virtualBg.initialize();
      setVirtualBgManager(virtualBg);

      // 5. Audio Processing Manager (AI-powered audio enhancement)
      const audio = new AudioProcessingManager({
        noiseSuppression: true,
        echoCancellation: true,
        autoGainControl: true,
        voiceActivityDetection: true,
        advancedNoiseSuppression: true,
        speechEnhancement: true,
        backgroundMusicSuppression: true
      });
      await audio.initialize();
      setAudioManager(audio);

      // 6. Adaptive Bitrate Manager (Smart quality adaptation)
      const bitrate = new AdaptiveBitrateManager();
      bitrate.startMonitoring();
      setBitrateManager(bitrate);

      // 7. Recording Manager (Professional recording)
      const recording = new RecordingManager(supabase);
      setRecordingManager(recording);

      // 8. Screen Share Manager (Advanced screen sharing)
      const screen = new ScreenShareManager();
      setScreenManager(screen);

      // 9. Whiteboard Manager (Collaborative whiteboard)
      const whiteboard = new WhiteboardManager(supabase);
      setWhiteboardManager(whiteboard);

      // 10. Chat Manager (Advanced messaging)
      const chat = new ChatManager(supabase);
      await chat.initialize(roomId, user.id);
      setChatManager(chat);

      setIsInitialized(true);
      console.log('✅ Enterprise Video Platform Fully Initialized - ALL Managers Active');

    } catch (error) {
      console.error('❌ Enterprise Platform Initialization Failed:', error);
    }
  }, [user, roomId, waitingRoomEnabled]);

  // Join Enterprise Meeting
  const joinEnterpriseMeeting = useCallback(async () => {
    if (!user || !videoSDK) return;

    try {
      console.log('🎯 Joining Enterprise Meeting with Full Feature Set...');

      // Join main video room with real participant tracking
      await videoSDK.joinRoom({
        roomId,
        userId: user.id,
        displayName: (profile as any)?.display_name || user.email?.split('@')[0] || 'Enterprise User',
        role: 'participant'
      });

      // Set up event handlers for real video streams
      videoSDK.on('local-stream', (data) => {
        console.log('📺 Local media stream received, setting up video display');
        const stream = data.stream;
        setLocalStream(stream);
        if (stream && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log('✅ Local video stream connected to video element');
        }
      });

      videoSDK.on('remote-stream', (data) => {
        console.log('📺 Remote participant stream received:', data);
        
        // Store the remote stream
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.set(data.participantId, data.stream);
          return newStreams;
        });
        
        // Update participants list with stream
        setParticipants(prev => {
          const updated = [...prev];
          const participantIndex = updated.findIndex(p => p.id === data.participantId);
          if (participantIndex >= 0) {
            // Participant exists, just note that stream is available
            console.log('🔄 Stream added for existing participant:', data.participantId);
          } else {
            // Add new participant with stream
            updated.push({
              id: data.participantId,
              name: data.participantId,
              role: 'participant',
              videoEnabled: true,
              audioEnabled: true,
              screenSharing: false,
              handRaised: false,
              connectionQuality: 'excellent'
            });
          }
          return updated;
        });
        
        // Immediately connect the stream to video element if ref exists
        const videoElement = participantVideoRefs.current.get(data.participantId);
        if (videoElement && data.stream) {
          videoElement.srcObject = data.stream;
          console.log('✅ Connected remote stream to video element for:', data.participantId);
        }
      });

      videoSDK.on('participant-joined', (data) => {
        console.log('👥 Real participant joined:', data);
        // Participant will be added when their stream arrives
      });

      videoSDK.on('participant-left', (data) => {
        console.log('👋 Real participant left:', data);
        setParticipants(prev => prev.filter(p => p.id !== data.participantId));
        
        // Remove their stream
        setRemoteStreams(prev => {
          const newStreams = new Map(prev);
          newStreams.delete(data.participantId);
          return newStreams;
        });
        
        // Remove video ref
        participantVideoRefs.current.delete(data.participantId);
      });

      // Add participant to Supabase database
      const supabase = createClient(ENTERPRISE_CONFIG.supabaseUrl, ENTERPRISE_CONFIG.supabaseKey);
      await supabase.from('video_conference_participants').insert({
        room_id: roomId,
        user_id: user.id,
        display_name: (profile as any)?.display_name || user.email?.split('@')[0] || 'Enterprise User',
        role: 'participant',
        is_video_enabled: true,
        is_audio_enabled: true,
        is_hand_raised: false,
        connection_quality: 'excellent',
        is_screen_sharing: false,
        is_active: true,
        joined_at: new Date().toISOString()
      });

      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 }, // Ultra HD quality
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true 
        }
      });

      // Apply professional audio processing
      if (audioManager && audioEnhancement) {
        const processedStream = await audioManager.processAudioStream(stream);
        setLocalStream(processedStream);
      } else {
        setLocalStream(stream);
      }

      // Apply virtual background if enabled
      if (virtualBgManager && virtualBackground !== 'none') {
        const bgStream = await virtualBgManager.applyVirtualBackground(stream);
        setLocalStream(bgStream);
      }

      // Set up local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setIsConnected(true);
      console.log('✅ Successfully Connected to Enterprise Meeting');

    } catch (error) {
      console.error('❌ Failed to Join Enterprise Meeting:', error);
    }
  }, [user, videoSDK, audioManager, virtualBgManager, profile, roomId, audioEnhancement, virtualBackground]);

  // Leave Meeting with real cleanup
  const leaveMeeting = useCallback(async () => {
    try {
      console.log('👋 Leaving Enterprise Meeting...');

      // Remove participant from Supabase database
      if (user) {
        const supabase = createClient(ENTERPRISE_CONFIG.supabaseUrl, ENTERPRISE_CONFIG.supabaseKey);
        await supabase
          .from('video_conference_participants')
          .update({ is_active: false, left_at: new Date().toISOString() })
          .eq('room_id', roomId)
          .eq('user_id', user.id);
      }

      // Stop all processing
      if (audioManager) audioManager.cleanup();
      if (virtualBgManager) await virtualBgManager.stopProcessing();
      if (bitrateManager) bitrateManager.cleanup();
      if (recordingManager && isRecording) await recordingManager.stopRecording();
      if (screenManager) screenManager.cleanup();

      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      // Leave video room
      if (videoSDK) {
        await videoSDK.leaveRoom();
      }

      setIsConnected(false);
      setParticipants([]);
      console.log('✅ Left Enterprise Meeting Successfully');

    } catch (error) {
      console.error('❌ Error leaving meeting:', error);
    }
  }, [user, roomId, audioManager, virtualBgManager, bitrateManager, recordingManager, screenManager, localStream, videoSDK, isRecording]);

  // Initialize platform on component mount
  useEffect(() => {
    if (user && !isInitialized) {
      initializeEnterprisePlatform();
    }
  }, [user, isInitialized, initializeEnterprisePlatform]);

  // Professional Media Controls
  const toggleVideo = useCallback(async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleAudio = useCallback(async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleScreenShare = useCallback(async () => {
    if (!screenManager) return;

    try {
      if (isScreenSharing) {
        await screenManager.stopScreenShare();
      } else {
        await screenManager.startScreenShare();
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (error) {
      console.error('Screen share toggle failed:', error);
    }
  }, [screenManager, isScreenSharing]);

  const toggleRecording = useCallback(async () => {
    if (!recordingManager || !localStream) return;

    try {
      if (isRecording) {
        await recordingManager.stopRecording();
      } else {
        await recordingManager.startRecording(localStream);
      }
      setIsRecording(!isRecording);
    } catch (error) {
      console.error('Recording toggle failed:', error);
    }
  }, [recordingManager, localStream, isRecording]);

  // Professional Interaction Features
  const raiseHand = useCallback(async () => {
    if (interactionManager) {
      await interactionManager.raiseHand('I have a question', 'normal');
    }
  }, [interactionManager]);

  const sendReaction = useCallback(async (emoji: string) => {
    if (interactionManager) {
      await interactionManager.sendReaction(emoji);
    }
  }, [interactionManager]);

  const createPoll = useCallback(async () => {
    if (interactionManager) {
      await interactionManager.createPoll({
        question: 'How is the meeting quality?',
        options: ['Excellent', 'Good', 'Fair', 'Poor'],
        type: 'single',
        duration: 5,
        allowAnonymous: false
      });
    }
  }, [interactionManager]);

  const askQuestion = useCallback(async (question: string) => {
    if (interactionManager) {
      await interactionManager.askQuestion(question, true, 'general');
    }
  }, [interactionManager]);

  // Breakout Room Controls
  const createBreakoutRooms = useCallback(async () => {
    if (breakoutManager) {
      const participantIds = participants.map(p => p.id);
      await breakoutManager.createBreakoutRooms({
        count: 3,
        names: ['Room 1: Arabic Grammar', 'Room 2: Vocabulary', 'Room 3: Pronunciation'],
        participants: participantIds
      });
      await breakoutManager.openBreakoutRooms();
      setBreakoutRoomsActive(true);
    }
  }, [breakoutManager, participants]);

  const closeBreakoutRooms = useCallback(async () => {
    if (breakoutManager) {
      await breakoutManager.closeBreakoutRooms(30); // 30 second countdown
      setBreakoutRoomsActive(false);
    }
  }, [breakoutManager]);

  // UI State Management
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const changeViewMode = useCallback((mode: 'gallery' | 'speaker' | 'presentation') => {
    setViewMode(mode);
  }, []);

  // Real-time participants from Supabase
  useEffect(() => {
    if (!isConnected || !videoSDK) return;

    const loadRealParticipants = async () => {
      try {
        // Get current participants from Supabase database
        const supabase = createClient(ENTERPRISE_CONFIG.supabaseUrl, ENTERPRISE_CONFIG.supabaseKey);
        
        const { data: participantsData, error } = await supabase
          .from('video_conference_participants')
          .select(`
            id,
            user_id,
            display_name,
            role,
            is_video_enabled,
            is_audio_enabled,
            is_hand_raised,
            connection_quality,
            is_screen_sharing,
            joined_at
          `)
          .eq('room_id', roomId)
          .eq('is_active', true);

        if (error) {
          console.error('Failed to load participants:', error);
          return;
        }

        // Convert to participant format
        const realParticipants: Participant[] = participantsData?.map(p => ({
          id: p.user_id,
          name: p.display_name,
          role: p.role as 'host' | 'moderator' | 'participant' | 'viewer',
          videoEnabled: p.is_video_enabled,
          audioEnabled: p.is_audio_enabled,
          screenSharing: p.is_screen_sharing,
          handRaised: p.is_hand_raised,
          connectionQuality: p.connection_quality as 'excellent' | 'good' | 'poor' | 'disconnected'
        })) || [];

        setParticipants(realParticipants);

        // Set up real-time subscription for participant changes
        const subscription = supabase
          .channel(`room-${roomId}-participants`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'video_conference_participants',
            filter: `room_id=eq.${roomId}`
          }, (payload) => {
            console.log('Participant update:', payload);
            loadRealParticipants(); // Reload participants on any change
          })
          .subscribe();

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error loading real participants:', error);
      }
    };

    loadRealParticipants();
  }, [isConnected, videoSDK, roomId]);

  // Don't render if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-soft-mint via-white to-cream">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
              <p className="text-gray-600 mb-6">Please log in to access the Enterprise Video Platform</p>
              <Button onClick={() => navigate('/')}>Return to Home</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Connection Screen
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-soft-mint via-white to-cream">
        <Header />
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Platform Overview */}
            <Card className="bento-card-featured">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-white">
                  🚀 Enterprise Video Platform
                </CardTitle>
                <p className="text-lg text-white/90">
                  World-class video conferencing with ALL professional features
                </p>
              </CardHeader>
              <CardContent className="text-white">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 rounded-lg p-4">
                    <Crown className="w-8 h-8 mb-2 text-yellow-400" />
                    <h3 className="font-semibold">Enterprise Grade</h3>
                    <p className="text-sm opacity-90">Zoom-level quality & features</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <Users className="w-8 h-8 mb-2 text-blue-400" />
                    <h3 className="font-semibold">1000+ Participants</h3>
                    <p className="text-sm opacity-90">Massive scale support</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <Brain className="w-8 h-8 mb-2 text-purple-400" />
                    <h3 className="font-semibold">AI Features</h3>
                    <p className="text-sm opacity-90">Smart audio & video processing</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <Shield className="w-8 h-8 mb-2 text-green-400" />
                    <h3 className="font-semibold">Enterprise Security</h3>
                    <p className="text-sm opacity-90">Waiting rooms & controls</p>
                  </div>
                </div>

                <Button 
                  onClick={joinEnterpriseMeeting}
                  disabled={!isInitialized}
                  className="w-full bg-white text-islamic-green hover:bg-gray-100 font-bold text-lg py-6"
                  data-testid="button-join-enterprise"
                >
                  {isInitialized ? '🎯 Join Enterprise Meeting' : '⏳ Initializing Platform...'}
                </Button>
              </CardContent>
            </Card>

            {/* Feature Showcase */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>🎯 Professional Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      Breakout Rooms
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-green-500" />
                      Waiting Room
                    </div>
                    <div className="flex items-center gap-2">
                      <Hand className="w-4 h-4 text-yellow-500" />
                      Hand Raising
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-500" />
                      Live Polls
                    </div>
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-pink-500" />
                      Virtual Backgrounds
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-orange-500" />
                      AI Audio Processing
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle className="w-4 h-4 text-red-500" />
                      Professional Recording
                    </div>
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-indigo-500" />
                      Live Streaming
                    </div>
                    <div className="flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-teal-500" />
                      Interactive Whiteboard
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Adaptive Quality
                    </div>
                    <div className="flex items-center gap-2">
                      <MonitorUp className="w-4 h-4 text-cyan-500" />
                      Screen Sharing
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-rose-500" />
                      Real-time Analytics
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>⚙️ Pre-Meeting Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="waiting-room">Waiting Room</Label>
                    <Switch
                      id="waiting-room"
                      checked={waitingRoomEnabled}
                      onCheckedChange={setWaitingRoomEnabled}
                      data-testid="switch-waiting-room"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="audio-enhancement">AI Audio Enhancement</Label>
                    <Switch
                      id="audio-enhancement"
                      checked={audioEnhancement}
                      onCheckedChange={setAudioEnhancement}
                      data-testid="switch-audio-enhancement"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="adaptive-quality">Adaptive Quality</Label>
                    <Switch
                      id="adaptive-quality"
                      checked={adaptiveQuality}
                      onCheckedChange={setAdaptiveQuality}
                      data-testid="switch-adaptive-quality"
                    />
                  </div>
                  <div>
                    <Label>Virtual Background</Label>
                    <Select value={virtualBackground} onValueChange={setVirtualBackground}>
                      <SelectTrigger data-testid="select-virtual-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Original</SelectItem>
                        <SelectItem value="blur">Professional Blur</SelectItem>
                        <SelectItem value="office">Office Background</SelectItem>
                        <SelectItem value="nature">Nature Scene</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* System Status */}
              <Card>
                <CardHeader>
                  <CardTitle>📊 System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Platform Status</span>
                      <Badge variant={isInitialized ? "default" : "secondary"}>
                        {isInitialized ? 'Ready' : 'Initializing'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Video SDK</span>
                      <Badge variant="default">Enterprise v2.0</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Network Quality</span>
                      <div className="flex items-center gap-2">
                        <Signal className="w-4 h-4 text-green-500" />
                        <Badge variant="default">Excellent</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Enterprise Video Interface
  return (
    <div ref={containerRef} className="min-h-screen bg-gray-900 text-white" data-testid="enterprise-meeting-room">
      {/* Enterprise Header */}
      <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Enterprise Meeting Room</h1>
              <div className="flex items-center space-x-4 text-sm opacity-90">
                <span>🎯 Room: {roomId}</span>
                <span>👥 {participants.length} Participants</span>
                <span>🌐 Enterprise Platform</span>
                {isRecording && (
                  <div className="flex items-center gap-1 text-red-400">
                    <Circle className="w-4 h-4" />
                    Recording
                  </div>
                )}
                {isLiveStreaming && (
                  <div className="flex items-center gap-1 text-green-400">
                    <Radio className="w-4 h-4" />
                    Live
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Network Status */}
            <div className="flex items-center space-x-2 text-sm">
              <Wifi className="w-4 h-4" />
              <span>{bandwidth}kbps</span>
              <Signal className={`w-4 h-4 ${networkQuality === 'excellent' ? 'text-green-500' : networkQuality === 'good' ? 'text-yellow-500' : 'text-red-500'}`} />
              <span>{latency}ms</span>
            </div>
            
            {/* View Mode Controls */}
            <div className="flex items-center space-x-2">
              <Button 
                variant={viewMode === 'gallery' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => changeViewMode('gallery')}
                data-testid="button-view-gallery"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'speaker' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => changeViewMode('speaker')}
                data-testid="button-view-speaker"
              >
                <Users className="w-4 h-4" />
              </Button>
              <Button 
                variant={viewMode === 'presentation' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => changeViewMode('presentation')}
                data-testid="button-view-presentation"
              >
                <Presentation className="w-4 h-4" />
              </Button>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleFullscreen}
              data-testid="button-fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            
            <Button 
              variant="destructive" 
              onClick={leaveMeeting}
              data-testid="button-leave-meeting"
            >
              <PhoneOff className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Main Video Content */}
      <div className="flex-1 flex">
        {/* Video Grid */}
        <div className="flex-1 p-4">
          {viewMode === 'gallery' && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full">
              {/* Local Video */}
              <div className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  data-testid="video-local"
                />
                <div className="absolute bottom-2 left-2 flex items-center space-x-1">
                  <span className="text-sm font-medium">You</span>
                  {user?.id === participants[0]?.id && (
                    <Crown className="w-3 h-3 text-yellow-400" />
                  )}
                </div>
                <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                  {!isVideoEnabled && <VideoOff className="w-4 h-4 text-red-500" />}
                  {!isAudioEnabled && <MicOff className="w-4 h-4 text-red-500" />}
                </div>
              </div>

              {/* Remote Participants */}
              {participants.slice(1).map((participant) => {
                const hasStream = remoteStreams.has(participant.id);
                return (
                  <div 
                    key={participant.id} 
                    className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video group"
                    data-testid={`video-participant-${participant.id}`}
                  >
                    {hasStream ? (
                      // Real video stream
                      <video
                        ref={(el) => {
                          if (el) {
                            participantVideoRefs.current.set(participant.id, el);
                            const stream = remoteStreams.get(participant.id);
                            if (stream) {
                              el.srcObject = stream;
                              console.log('✅ Connected stream to video element for:', participant.id);
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        data-testid={`video-stream-${participant.id}`}
                      />
                    ) : (
                      // Fallback avatar while waiting for stream
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                        <div className="text-4xl font-bold">
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}
                  
                  {/* Participant Info */}
                  <div className="absolute bottom-2 left-2 flex items-center space-x-1">
                    <span className="text-sm font-medium">{participant.name}</span>
                    {participant.role === 'host' && <Crown className="w-3 h-3 text-yellow-400" />}
                    {participant.role === 'moderator' && <Shield className="w-3 h-3 text-blue-400" />}
                  </div>
                  
                  {/* Status Indicators */}
                  <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                    {!participant.videoEnabled && <VideoOff className="w-4 h-4 text-red-500" />}
                    {!participant.audioEnabled && <MicOff className="w-4 h-4 text-red-500" />}
                    {participant.handRaised && <Hand className="w-4 h-4 text-yellow-500" />}
                    {participant.screenSharing && <MonitorUp className="w-4 h-4 text-green-500" />}
                  </div>

                  {/* Connection Quality */}
                  <div className="absolute top-2 right-2">
                    <Signal className={`w-4 h-4 ${
                      participant.connectionQuality === 'excellent' ? 'text-green-500' : 
                      participant.connectionQuality === 'good' ? 'text-yellow-500' : 'text-red-500'
                    }`} />
                  </div>

                  {/* Participant Controls (on hover) */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                    <Button size="sm" variant="ghost" className="text-white">
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {viewMode === 'speaker' && (
            <div className="h-full flex flex-col">
              {/* Main Speaker */}
              <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden mb-4">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Participant Strip */}
              <div className="flex space-x-2 overflow-x-auto">
                {participants.map((participant) => (
                  <div 
                    key={participant.id}
                    className="flex-shrink-0 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden relative"
                  >
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                      <span className="text-lg font-bold">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute bottom-1 left-1 text-xs">{participant.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'presentation' && (
            <div className="h-full grid grid-cols-4 gap-4">
              {/* Presentation Area */}
              <div className="col-span-3 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                <div className="text-center">
                  <MonitorUp className="w-24 h-24 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-xl font-semibold mb-2">Screen Share Ready</h3>
                  <p className="text-gray-400">Click the share button to start presenting</p>
                </div>
              </div>
              
              {/* Participants Sidebar */}
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div 
                    key={participant.id}
                    className="bg-gray-800 rounded-lg overflow-hidden aspect-video relative"
                  >
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                      <span className="text-sm font-bold">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute bottom-1 left-1 text-xs">{participant.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Panels */}
        {(showParticipants || showChat) && (
          <div className="w-80 bg-gray-800 border-l border-gray-700">
            <Tabs value={showParticipants ? 'participants' : 'chat'} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                <TabsTrigger 
                  value="participants" 
                  onClick={() => { setShowParticipants(true); setShowChat(false); }}
                  data-testid="tab-participants"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Participants ({participants.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="chat"
                  onClick={() => { setShowChat(true); setShowParticipants(false); }}
                  data-testid="tab-chat"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="participants" className="flex-1 p-4 space-y-3">
                {participants.map((participant) => (
                  <div 
                    key={participant.id} 
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                    data-testid={`participant-item-${participant.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-sm font-bold">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{participant.name}</span>
                          {participant.role === 'host' && <Crown className="w-3 h-3 text-yellow-400" />}
                          {participant.role === 'moderator' && <Shield className="w-3 h-3 text-blue-400" />}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                          <Signal className={`w-3 h-3 ${
                            participant.connectionQuality === 'excellent' ? 'text-green-500' : 
                            participant.connectionQuality === 'good' ? 'text-yellow-500' : 'text-red-500'
                          }`} />
                          <span>{participant.connectionQuality}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      {participant.handRaised && <Hand className="w-4 h-4 text-yellow-500" />}
                      {!participant.audioEnabled && <MicOff className="w-4 h-4 text-red-500" />}
                      {!participant.videoEnabled && <VideoOff className="w-4 h-4 text-red-500" />}
                      {participant.screenSharing && <MonitorUp className="w-4 h-4 text-green-500" />}
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="chat" className="flex-1 flex flex-col p-4">
                <div className="flex-1 space-y-3 overflow-y-auto mb-4">
                  {/* Mock chat messages */}
                  <div className="space-y-3">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="text-sm font-medium text-blue-400 mb-1">Dr. Ahmed Hassan</div>
                      <div className="text-sm">Welcome to our enterprise meeting! All features are active.</div>
                      <div className="text-xs text-gray-400 mt-1">2:34 PM</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="text-sm font-medium text-green-400 mb-1">Sarah Johnson</div>
                      <div className="text-sm">The video quality is excellent! 🎯</div>
                      <div className="text-xs text-gray-400 mt-1">2:35 PM</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Type a message..." 
                    className="flex-1 bg-gray-700 border-gray-600"
                    data-testid="input-chat-message"
                  />
                  <Button size="sm" data-testid="button-send-message">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Enterprise Control Bar */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Left Controls - Media */}
          <div className="flex items-center space-x-2">
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleAudio}
              className="rounded-full w-12 h-12"
              data-testid="button-toggle-audio"
            >
              {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="lg"
              onClick={toggleVideo}
              className="rounded-full w-12 h-12"
              data-testid="button-toggle-video"
            >
              {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            <Button
              variant={isScreenSharing ? "default" : "ghost"}
              size="lg"
              onClick={toggleScreenShare}
              className="rounded-full w-12 h-12"
              data-testid="button-screen-share"
            >
              {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
            </Button>
          </div>

          {/* Center Controls - Professional Features */}
          <div className="flex items-center space-x-2">
            {/* Hand Raise */}
            <Button
              variant="ghost"
              size="lg"
              onClick={raiseHand}
              className="rounded-full w-12 h-12"
              title="Raise Hand"
              data-testid="button-raise-hand"
            >
              <Hand className="w-5 h-5" />
            </Button>

            {/* Reactions */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sendReaction('👍')}
                data-testid="button-reaction-thumbs-up"
              >
                👍
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sendReaction('❤️')}
                data-testid="button-reaction-heart"
              >
                ❤️
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sendReaction('😂')}
                data-testid="button-reaction-laugh"
              >
                😂
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sendReaction('👏')}
                data-testid="button-reaction-clap"
              >
                👏
              </Button>
            </div>

            {/* Breakout Rooms */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-full w-12 h-12"
                  title="Breakout Rooms"
                  data-testid="button-breakout-rooms"
                >
                  <Users className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 text-white">
                <DialogHeader>
                  <DialogTitle>Professional Breakout Rooms</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-gray-300">Create small group sessions for collaborative learning</p>
                  
                  {!breakoutRoomsActive ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Number of Rooms</Label>
                        <Select defaultValue="3">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Rooms</SelectItem>
                            <SelectItem value="3">3 Rooms</SelectItem>
                            <SelectItem value="4">4 Rooms</SelectItem>
                            <SelectItem value="5">5 Rooms</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Assignment</Label>
                        <Select defaultValue="auto">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Automatic</SelectItem>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="choice">Let participants choose</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button onClick={createBreakoutRooms} className="w-full">
                        Create Breakout Rooms
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-green-900/50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-400 mb-2">Breakout Rooms Active</h4>
                        <p className="text-sm text-gray-300">3 rooms created with participants assigned</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <span>Room 1: Arabic Grammar</span>
                          <span className="text-sm text-gray-400">2 participants</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <span>Room 2: Vocabulary</span>
                          <span className="text-sm text-gray-400">1 participant</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                          <span>Room 3: Pronunciation</span>
                          <span className="text-sm text-gray-400">1 participant</span>
                        </div>
                      </div>

                      <Button onClick={closeBreakoutRooms} variant="destructive" className="w-full">
                        Close All Breakout Rooms
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Polls */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-full w-12 h-12"
                  title="Create Poll"
                  data-testid="button-create-poll"
                >
                  <BarChart3 className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 text-white">
                <DialogHeader>
                  <DialogTitle>Create Live Poll</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="poll-question">Question</Label>
                    <Input 
                      id="poll-question"
                      placeholder="What's your question?"
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  
                  <div>
                    <Label>Options</Label>
                    <div className="space-y-2">
                      <Input placeholder="Option 1" className="bg-gray-700 border-gray-600" />
                      <Input placeholder="Option 2" className="bg-gray-700 border-gray-600" />
                      <Input placeholder="Option 3" className="bg-gray-700 border-gray-600" />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="anonymous-poll" />
                    <Label htmlFor="anonymous-poll">Anonymous responses</Label>
                  </div>

                  <Button onClick={createPoll} className="w-full">
                    Start Poll
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Q&A */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-full w-12 h-12"
                  title="Q&A"
                  data-testid="button-qa"
                >
                  <MessageSquare className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 text-white">
                <DialogHeader>
                  <DialogTitle>Q&A Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="question">Ask a Question</Label>
                    <Textarea 
                      id="question"
                      placeholder="Type your question here..."
                      className="bg-gray-700 border-gray-600"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch id="public-question" defaultChecked />
                    <Label htmlFor="public-question">Ask publicly</Label>
                  </div>

                  <Button 
                    onClick={() => askQuestion("Sample question from Q&A")} 
                    className="w-full"
                  >
                    Submit Question
                  </Button>

                  <div className="border-t border-gray-600 pt-4">
                    <h4 className="font-semibold mb-2">Recent Questions</h4>
                    <div className="space-y-2 text-sm">
                      <div className="bg-gray-700 p-3 rounded">
                        <div className="font-medium">Can you explain the pronunciation rules?</div>
                        <div className="text-gray-400 text-xs">Asked by Sarah • 2 upvotes</div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Right Controls - Recording & Settings */}
          <div className="flex items-center space-x-2">
            {/* Recording */}
            <Button
              variant={isRecording ? "destructive" : "ghost"}
              size="lg"
              onClick={toggleRecording}
              className="rounded-full w-12 h-12"
              title="Record Meeting"
              data-testid="button-record"
            >
              {isRecording ? <Square className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </Button>

            {/* Live Streaming */}
            <Button
              variant={isLiveStreaming ? "default" : "ghost"}
              size="lg"
              onClick={() => setIsLiveStreaming(!isLiveStreaming)}
              className="rounded-full w-12 h-12"
              title="Live Stream"
              data-testid="button-live-stream"
            >
              <Radio className="w-5 h-5" />
            </Button>

            {/* Participants */}
            <Button
              variant={showParticipants ? "default" : "ghost"}
              size="lg"
              onClick={() => {
                setShowParticipants(!showParticipants);
                if (showChat) setShowChat(false);
              }}
              className="rounded-full w-12 h-12"
              title="Participants"
              data-testid="button-show-participants"
            >
              <Users className="w-5 h-5" />
            </Button>

            {/* Chat */}
            <Button
              variant={showChat ? "default" : "ghost"}
              size="lg"
              onClick={() => {
                setShowChat(!showChat);
                if (showParticipants) setShowParticipants(false);
              }}
              className="rounded-full w-12 h-12"
              title="Chat"
              data-testid="button-show-chat"
            >
              <MessageSquare className="w-5 h-5" />
            </Button>

            {/* Settings */}
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-full w-12 h-12"
                  title="Settings"
                  data-testid="button-settings"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Enterprise Meeting Settings</DialogTitle>
                </DialogHeader>
                
                <Tabs defaultValue="audio-video" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 bg-gray-700">
                    <TabsTrigger value="audio-video">Audio/Video</TabsTrigger>
                    <TabsTrigger value="ai-features">AI Features</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="recording">Recording</TabsTrigger>
                  </TabsList>

                  <TabsContent value="audio-video" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3">Virtual Background</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {['none', 'blur', 'office', 'nature'].map((bg) => (
                          <Button
                            key={bg}
                            variant={virtualBackground === bg ? "default" : "outline"}
                            size="sm"
                            onClick={() => setVirtualBackground(bg)}
                            className="capitalize"
                          >
                            {bg === 'none' ? 'Original' : bg}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Audio Quality</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>AI Noise Suppression</Label>
                          <Switch checked={audioEnhancement} onCheckedChange={setAudioEnhancement} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Echo Cancellation</Label>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Auto Gain Control</Label>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Video Quality</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Adaptive Bitrate</Label>
                          <Switch checked={adaptiveQuality} onCheckedChange={setAdaptiveQuality} />
                        </div>
                        <div>
                          <Label>Resolution</Label>
                          <Select defaultValue="1080p">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="4k">4K (3840x2160)</SelectItem>
                              <SelectItem value="1080p">Full HD (1920x1080)</SelectItem>
                              <SelectItem value="720p">HD (1280x720)</SelectItem>
                              <SelectItem value="480p">SD (854x480)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="ai-features" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3">AI-Powered Features</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Smart Framing</Label>
                            <p className="text-sm text-gray-400">AI keeps you centered in frame</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Live Translation</Label>
                            <p className="text-sm text-gray-400">Real-time Arabic translation</p>
                          </div>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Meeting Transcription</Label>
                            <p className="text-sm text-gray-400">Auto-generate meeting notes</p>
                          </div>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Gesture Recognition</Label>
                            <p className="text-sm text-gray-400">Detect hand gestures</p>
                          </div>
                          <Switch />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="security" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3">Meeting Security</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Waiting Room</Label>
                            <p className="text-sm text-gray-400">Screen participants before entry</p>
                          </div>
                          <Switch checked={waitingRoomEnabled} onCheckedChange={setWaitingRoomEnabled} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Meeting Lock</Label>
                            <p className="text-sm text-gray-400">Prevent new participants from joining</p>
                          </div>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>End-to-End Encryption</Label>
                            <p className="text-sm text-gray-400">Maximum security protection</p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="recording" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3">Recording Settings</h4>
                      <div className="space-y-3">
                        <div>
                          <Label>Recording Quality</Label>
                          <Select defaultValue="1080p">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="4k">4K Ultra HD</SelectItem>
                              <SelectItem value="1080p">Full HD</SelectItem>
                              <SelectItem value="720p">HD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Auto-Record</Label>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Include Chat Messages</Label>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Separate Audio Tracks</Label>
                          <Switch />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}