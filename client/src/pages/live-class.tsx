import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Clock, Users, Video, Mic, MicOff, VideoOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getLiveClasses, getLiveClassById } from '@/lib/api';
import { VideoSDKProvider } from '@/components/video-sdk/VideoSDKProvider';
import { VideoConference } from '@/components/video-sdk/VideoConference';
import { useSecureVideoSDK } from '@/hooks/useSecureVideoSDK';
import { 
  SFUManagementAPI,
  ParticipantManagementAPI,
  NetworkQualityAPI,
  RecordingManagementAPI,
  RealTimeSubscriptions 
} from '@/lib/enterpriseVideoAPI';
import SupabaseLiveChat from '@/components/SupabaseLiveChat';
import HomeworkSubmissions from '@/components/HomeworkSubmissions';

// Enterprise Video SDK Configuration
const VIDEO_SDK_CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  enableAI: true,
  enableRecording: true,
  enableWhiteboard: true,
  maxParticipants: 100,
  bitrate: {
    video: 2500,
    audio: 128
  }
};

export default function LiveClassPage() {
  return (
    <VideoSDKProvider>
      <LiveClassContent />
    </VideoSDKProvider>
  );
}

function LiveClassContent() {
  const [, navigate] = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  const [isClassActive, setIsClassActive] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('video');
  
  const {
    sdk,
    isInitialized,
    isConnected,
    participants,
    initializeSDK,
    joinRoom,
    leaveRoom,
    error,
    connectionStats
  } = useSecureVideoSDK();

  // Get class ID from URL params
  const classId = new URLSearchParams(window.location.search).get('id');
  
  // Fetch specific class data
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['/api/live-class', classId],
    queryFn: () => classId ? getLiveClassById(classId) : Promise.resolve(null),
    enabled: !!classId,
  });

  // Fetch all classes as fallback
  const { data: allClasses, isLoading: allClassesLoading } = useQuery({
    queryKey: ['/api/live-classes'],
    queryFn: getLiveClasses,
    enabled: !classId,
  });

  // Determine selected class
  const selectedClass = classData || (allClasses && allClasses[0]) || null;
  const isInstructor = selectedClass?.instructor_id === user?.id;
  const userDisplayName = (profile as any)?.display_name || (profile as any)?.first_name || user?.email?.split('@')[0] || 'অংশগ্রহণকারী';

  // Network quality monitoring
  useEffect(() => {
    if (!isClassActive || !roomId || !user?.id) return;

    const interval = setInterval(async () => {
      try {
        // Submit network quality metrics
        await NetworkQualityAPI.submitNetworkMetric({
          room_id: roomId,
          participant_id: user.id,
          latency_ms: (connectionStats as any)?.latency || 0,
          bandwidth_kbps: (connectionStats as any)?.bandwidth || 0,
          packet_loss_percentage: (connectionStats as any)?.packetLoss || 0,
          jitter_ms: (connectionStats as any)?.jitter || 0,
          connection_type: 'wifi',
          quality_score: (connectionStats as any)?.quality || 'unknown',
          network_path: 'direct'
        });
      } catch (err) {
        console.warn('Failed to submit network metrics:', err);
      }
    }, 10000); // Submit every 10 seconds

    return () => clearInterval(interval);
  }, [isClassActive, roomId, user?.id, connectionStats]);

  // Real-time subscriptions
  useEffect(() => {
    if (!roomId) return;

    const subscriptions: any[] = [];

    // Subscribe to participant changes
    const participantsSub = RealTimeSubscriptions.subscribeParticipants(
      roomId,
      (payload) => {
        console.log('Participant update:', payload);
        // Handle participant join/leave updates
      }
    );
    subscriptions.push(participantsSub);

    // Subscribe to network quality updates
    const networkSub = RealTimeSubscriptions.subscribeNetworkQuality(
      roomId,
      (payload) => {
        console.log('Network quality update:', payload);
        // Handle network quality updates
      }
    );
    subscriptions.push(networkSub);

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [roomId]);

  const handleJoinClass = async () => {
    if (!user || !selectedClass) {
      alert('দয়া করে লগইন করুন এবং একটি ক্লাস নির্বাচন করুন');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🚀 Starting enterprise video class join process...');

      // Generate enterprise room ID
      const enterpriseRoomId = `arabic-class-${selectedClass.id}`;
      
      // Create or get SFU instance
      try {
        let sfuInstance = await SFUManagementAPI.getSFUForRoom(enterpriseRoomId);
        if (!sfuInstance) {
          console.log('Creating new SFU instance...');
          sfuInstance = await SFUManagementAPI.createSFUInstance({
            room_id: enterpriseRoomId,
            region: 'us-east',
            max_participants: selectedClass.max_participants || 50
          });
          console.log('SFU instance created:', sfuInstance.id);
        }
      } catch (sfuError) {
        console.warn('SFU creation warning:', sfuError);
      }

      // Initialize SDK if needed
      if (!isInitialized) {
        console.log('Initializing Video SDK...');
        await initializeSDK(VIDEO_SDK_CONFIG);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Join video room
      console.log('Joining video room:', enterpriseRoomId);
      console.log(`🎬 DEBUG: live-class.tsx calling joinRoom() with userId: "${user.id}", displayName: "${userDisplayName}"`);
      await joinRoom({
        roomId: enterpriseRoomId,
        userId: user.id,
        userRole: isInstructor ? 'host' : 'participant',
        displayName: userDisplayName,
        avatar: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userDisplayName)}&background=0D8ABC&color=fff`
      });

      // Register participant in enterprise database
      try {
        console.log('Registering participant in enterprise database...');
        await ParticipantManagementAPI.joinRoom({
          room_id: enterpriseRoomId,
          user_id: user.id,
          display_name: userDisplayName,
          role: isInstructor ? 'host' : 'participant',
          has_video: true,
          has_audio: true,
          is_screen_sharing: false,
          device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          browser_name: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Unknown',
          browser_version: navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'unknown',
          connection_quality: (connectionStats as any)?.quality || 'unknown',
          sfu_instance_id: sfuInstance?.id || 'unknown',
          bandwidth_kbps: (connectionStats as any)?.bandwidth || 0,
          avg_latency_ms: (connectionStats as any)?.latency || 0,
          total_packets_lost: (connectionStats as any)?.packetsLost || 0,
          adaptive_bitrate_enabled: true,
          audio_processing_enabled: true,
          network_resilience_enabled: true
        });
        console.log('Participant registered successfully');
      } catch (dbError) {
        console.warn('Database registration failed:', dbError);
      }

      console.log('Enterprise video class joined successfully!');
      setRoomId(enterpriseRoomId);
      setIsClassActive(true);
    } catch (err) {
      console.error('Failed to join class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`ক্লাসে যোগদানে ব্যর্থ: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveClass = async () => {
    try {
      console.log('Leaving enterprise video class...');
      
      // Leave video room
      await leaveRoom();
      
      // Update participant status in database
      if (roomId && user?.id) {
        try {
          await ParticipantManagementAPI.leaveRoom(roomId, user.id);
          console.log('Participant status updated in database');
        } catch (dbError) {
          console.warn('Database leave update failed:', dbError);
        }
      }
      
      setIsClassActive(false);
      setRoomId(null);
      console.log('Left enterprise video class successfully');
    } catch (err) {
      console.error('Failed to leave class:', err);
    }
  };

  // Show enterprise video conference if connected
  if (isClassActive && isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-islamic-green to-islamic-gold p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-white/20 rounded-lg">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold font-bengali">
                  {selectedClass?.title_bn || selectedClass?.title || 'লাইভ ক্লাস'}
                </h1>
                <p className="text-sm opacity-75 font-bengali">
                  {isInstructor ? 'শিক্ষক' : 'শিক্ষার্থী'} • {participants.length + 1} জন অংশগ্রহণকারী
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Clock className="w-4 h-4 mr-1" />
                লাইভ ক্লাস
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLeaveClass}
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 font-bengali"
              >
                ক্লাস ছেড়ে দিন
              </Button>
            </div>
          </div>
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-b border-gray-700">
            <TabsTrigger value="video" className="font-bengali text-white data-[state=active]:bg-islamic-green data-[state=active]:text-white">
              📹 ভিডিও কনফারেন্স
            </TabsTrigger>
            <TabsTrigger value="chat" className="font-bengali text-white data-[state=active]:bg-islamic-green data-[state=active]:text-white">
              💬 চ্যাট
            </TabsTrigger>
            <TabsTrigger value="whiteboard" className="font-bengali text-white data-[state=active]:bg-islamic-green data-[state=active]:text-white">
              🖊️ হোয়াইটবোর্ড
            </TabsTrigger>
            <TabsTrigger value="resources" className="font-bengali text-white data-[state=active]:bg-islamic-green data-[state=active]:text-white">
              📚 রিসোর্স
            </TabsTrigger>
          </TabsList>

          <TabsContent value="video" className="flex-1 m-0">
            <VideoConference showChat={false} onChatToggle={() => setActiveTab('chat')} />
          </TabsContent>

          <TabsContent value="chat" className="flex-1 m-0 p-4 bg-gray-800">
            <div className="h-full">
              {classId ? (
                <SupabaseLiveChat 
                  classId={classId} 
                  isActive={activeTab === 'chat' && isClassActive}
                />
              ) : (
                <div className="h-full bg-gray-900 rounded-lg p-4 flex items-center justify-center">
                  <p className="text-gray-400 font-bengali text-center">
                    চ্যাট ব্যবহার করতে একটি নির্দিষ্ট ক্লাস নির্বাচন করুন
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="whiteboard" className="flex-1 m-0 p-4 bg-gray-800">
            <div className="h-full bg-gray-900 rounded-lg p-4">
              <h3 className="font-bengali text-white text-lg mb-4">ইন্টারেক্টিভ হোয়াইটবোর্ড</h3>
              <div className="flex-1 bg-white rounded-lg min-h-96 border-2 border-gray-600 flex items-center justify-center">
                <p className="text-gray-600 font-bengali text-center">হোয়াইটবোর্ড ফিচার শীঘ্রই আসছে</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="flex-1 m-0 p-4 bg-gray-800">
            <div className="h-full bg-gray-900 rounded-lg p-4">
              <h3 className="font-bengali text-white text-lg mb-4">ক্লাসের রিসোর্স ও হোমওয়ার্ক</h3>
              
              {/* Homework Submissions Section */}
              <div className="mb-6">
                <HomeworkSubmissions 
                  classId={classId || undefined} 
                  showSubmitForm={isClassActive}
                />
              </div>
              
              {/* Class Resources Section */}
              <div className="space-y-4">
                {selectedClass?.lesson_content && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="font-bengali text-white font-medium mb-2">আজকের পাঠ্য</h4>
                    <div className="space-y-2 font-bengali text-gray-300">
                      {selectedClass.lesson_content.split('\n').map((item: string, index: number) => (
                        <div key={index}>• {item}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Class selection and join interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-mint via-white to-cream">
      {/* Header */}
      <Header />

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Class Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bento-card-featured animate-fade-in-up">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-headline font-bengali text-white">
                    {selectedClass?.title_bn || selectedClass?.title || 'ক্লাস'}
                  </CardTitle>
                  <Badge variant="secondary" className="text-sm">
                    লাইভ ক্লাস
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-white">
                {selectedClass?.description_bn && (
                  <p className="text-lg font-bengali mb-6 opacity-90">
                    {selectedClass.description_bn}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-6 h-6 opacity-75" />
                    <div>
                      <p className="font-bengali font-medium">তারিখ ও সময়</p>
                      <p className="font-bengali opacity-75">
                        {selectedClass?.scheduled_at ? new Date(selectedClass.scheduled_at).toLocaleDateString('bn-BD') : 'আজ'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="w-6 h-6 opacity-75" />
                    <div>
                      <p className="font-bengali font-medium">সময়কাল</p>
                      <p className="font-bengali opacity-75">{selectedClass?.duration || 90} মিনিট</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 opacity-75" />
                    <div>
                      <p className="font-bengali font-medium">অংশগ্রহণকারী</p>
                      <p className="font-bengali opacity-75">
                        {selectedClass?.max_participants || 50} জন পর্যন্ত
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Video className="w-6 h-6 opacity-75" />
                    <div>
                      <p className="font-bengali font-medium">শিক্ষক</p>
                      <p className="font-bengali opacity-75">
                        {selectedClass?.instructors?.name_bn || selectedClass?.instructors?.name || 'শিক্ষক'}
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleJoinClass}
                  disabled={isLoading || !selectedClass}
                  className="w-full bg-white text-islamic-green hover:bg-gray-100 font-bengali text-lg py-6"
                >
                  {isLoading ? 'যোগদান করা হচ্ছে...' : '🎥 ক্লাসে যোগদান করুন'}
                </Button>
              </CardContent>
            </Card>

            {/* Connection Status */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <p className="text-red-800 font-bengali">
                    ❌ সংযোগে সমস্যা: {error}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Available Classes */}
            <Card>
              <CardHeader>
                <CardTitle className="font-bengali">আজকের ক্লাসসমূহ</CardTitle>
              </CardHeader>
              <CardContent>
                {classLoading || allClassesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(allClasses || []).slice(0, 3).map((cls: any) => (
                      <div 
                        key={cls.id} 
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedClass?.id === cls.id 
                            ? 'border-islamic-green bg-islamic-green/10' 
                            : 'border-gray-200 hover:border-islamic-green/50'
                        }`}
                        onClick={() => navigate(`/live-class?id=${cls.id}`)}
                      >
                        <h4 className="font-bengali font-medium">{cls.title_bn || cls.title}</h4>
                        <p className="text-sm text-gray-600 font-bengali">
                          {new Date(cls.scheduled_at).toLocaleTimeString('bn-BD', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="font-bengali">সিস্টেম স্ট্যাটাস</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bengali">SDK স্ট্যাটাস</span>
                    <Badge variant={isInitialized ? "default" : "secondary"}>
                      {isInitialized ? 'প্রস্তুত' : 'লোডিং'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bengali">সংযোগ</span>
                    <Badge variant={isConnected ? "default" : "secondary"}>
                      {isConnected ? 'সংযুক্ত' : 'বিচ্ছিন্ন'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bengali">ডাটাবেস</span>
                    <Badge variant="default">সুপাবেস</Badge>
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