import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Clock, Users, Play, Pause, MessageSquare, Video } from 'lucide-react';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { getLiveClasses, getLiveClassById } from '@/lib/api';
import { VideoSDKProvider, useVideoSDK } from '@/components/video-sdk/VideoSDKProvider';
import { VideoConference } from '@/components/video-sdk/VideoConference';
import { createVideoRoom, joinVideoRoom } from '@/lib/video-sdk/database/videoSDKDatabase';


// Video SDK Configuration
const VIDEO_SDK_CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://sgyanvjlwlrzcrpjwlsd.supabase.co',
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneWFudmpsd2xyemNycGp3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTg1MjAsImV4cCI6MjA3MDEzNDUyMH0.5xjMdSUdeHGln68tfuw626q4xDZkuR8Xg_e_w6g9iJk',
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
  const [showChat, setShowChat] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    sdk,
    isInitialized,
    isConnected,
    participants,
    initializeSDK,
    joinRoom,
    leaveRoom,
    error
  } = useVideoSDK();

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
    queryFn: () => getLiveClasses(),
  });

  const dataLoading = classLoading || allClassesLoading;

  // Use specific class data or first available class
  const selectedClass = classData || (allClasses && allClasses[0]);
  
  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-islamic-green mx-auto"></div>
              <p className="text-muted-foreground font-bengali">লাইভ ক্লাস লোড হচ্ছে...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check authentication - this should now work correctly with AuthGuard
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="font-bengali">লগইন প্রয়োজন</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4 font-bengali">
                লাইভ ক্লাসে অংশগ্রহণ করতে দয়া করে লগইন করুন।
              </p>
              <Button onClick={() => navigate('/login')} className="font-bengali">
                লগইন করুন
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If no real class data available, show appropriate message
  if (!selectedClass && !dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="font-bengali">কোন লাইভ ক্লাস পাওয়া যায়নি</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4 font-bengali">
              এই মুহূর্তে কোন লাইভ ক্লাস উপলব্ধ নেই।
            </p>
            <Button onClick={() => navigate('/dashboard')} className="font-bengali">
              ড্যাশবোর্ডে ফিরে যান
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Real instructor detection based on user profile
  const isInstructor = profile?.role === 'instructor' || profile?.role === 'admin';

  // Initialize SDK on mount
  useEffect(() => {
    initializeVideoSDK();
  }, []);

  const initializeVideoSDK = async () => {
    try {
      await initializeSDK(VIDEO_SDK_CONFIG);
    } catch (err) {
      console.error('Failed to initialize VideoSDK:', err);
    }
  };

  const handleJoinClass = async () => {
    if (!user || !profile) {
      console.error('User authentication required');
      return;
    }

    setIsLoading(true);
    try {
      // Ensure selectedClass exists
      if (!selectedClass) {
        throw new Error('No class data available - please select a class first');
      }
      
      // Create or get video room - REAL FUNCTIONALITY
      const generatedRoomId = `arabic-class-${selectedClass.id}`;
      
      console.log('Creating real video room with ID:', generatedRoomId);
      
      // Create room in database - REAL DATABASE OPERATIONS
      try {
        await createVideoRoom({
          name: selectedClass.title_bn || selectedClass.title || 'Live Class',
          description: selectedClass.description_bn || selectedClass.description || 'Arabic Learning Session',
          host_user_id: user.id!,
          max_participants: selectedClass.max_participants || 100,
          is_public: true,
          scheduled_start_time: selectedClass.scheduled_at ? new Date(selectedClass.scheduled_at) : new Date(),
          scheduled_end_time: selectedClass.scheduled_at && selectedClass.duration ? 
            new Date(new Date(selectedClass.scheduled_at).getTime() + (selectedClass.duration * 60 * 1000)) :
            new Date(Date.now() + 90 * 60 * 1000)
        });
        console.log('Successfully created room in database');
      } catch (dbError) {
        console.log('Room may already exist, proceeding to join:', dbError);
      }

      // Join the room via VideoSDK - REAL VIDEO CONNECTION
      console.log('Joining real video room with WebRTC...');
      await joinRoom({
        roomId: generatedRoomId,
        userId: user.id ?? 'anonymous',
        userRole: isInstructor ? 'host' : 'participant',
        displayName: profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user.email?.split('@')[0] || 'User',
        avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.first_name || 'User')}&background=0D8ABC&color=fff`
      });

      console.log('Successfully joined real video room!');
      setRoomId(generatedRoomId);
      setIsClassActive(true);
    } catch (err) {
      console.error('Failed to join class:', err);
      
      // Show detailed error message for debugging
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      
      alert(`ক্লাসে যোগদানে ব্যর্থ / Failed to join class: ${errorMessage}. Please check your internet connection and camera/microphone permissions.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveClass = async () => {
    try {
      await leaveRoom();
      setIsClassActive(false);
      setRoomId(null);
    } catch (err) {
      console.error('Failed to leave class:', err);
    }
  };

  // Show real VideoSDK conference with tabs if connected
  if (isClassActive && isConnected) {
    return <LiveClassWithTabs 
      selectedClass={selectedClass}
      isInstructor={isInstructor}
      participants={participants}
      showChat={showChat}
      setShowChat={setShowChat}
      onLeaveClass={handleLeaveClass}
    />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-mint via-white to-cream">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="flex items-center space-x-2"
                data-testid="back-button"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-bengali">ড্যাশবোর্ডে ফিরুন</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Class Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bento-card-featured animate-fade-in-up">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-headline font-bengali text-white">
                    {selectedClass?.title_bn || 'আরবি ক্লাস'}
                  </CardTitle>
                  <Badge variant="secondary" className="text-sm">
                    লাইভ ক্লাস
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-white">
                <p className="text-lg font-bengali mb-6 opacity-90">
                  {selectedClass?.description_bn || 'আরবি ভাষা শিক্ষার ক্লাস'}
                </p>
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-6 h-6 opacity-75" />
                    <div>
                      <p className="font-bengali font-medium">তারিখ ও সময়</p>
                      <p className="font-bengali opacity-75">
                        {selectedClass?.scheduled_at ? new Date(selectedClass.scheduled_at).toLocaleDateString('bn-BD') : 'আজ'}
                      </p>
                      <p className="font-bengali opacity-75">
                        {selectedClass?.scheduled_at ? new Date(selectedClass.scheduled_at).toLocaleTimeString('bn-BD', {
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'এখন'}
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
                        {selectedClass?.current_participants || 12}/{selectedClass?.max_participants || 50} জন
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">শি</span>
                    </div>
                    <div>
                      <p className="font-bengali font-medium">শিক্ষক</p>
                      <p className="font-bengali opacity-75">শিক্ষক</p>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 font-bengali">
                    <strong>ত্রুটি:</strong> {error}
                  </div>
                )}

                <div className="space-y-3">
                  {/* SDK Status */}
                  <div className="flex items-center justify-center">
                    <Badge variant={isInitialized ? "default" : "secondary"} className="px-3 py-1">
                      <div className={`w-2 h-2 rounded-full mr-2 ${isInitialized ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      VideoSDK: {isInitialized ? 'প্রস্তুত' : 'লোড হচ্ছে...'}
                    </Badge>
                  </div>

                  {isInstructor ? (
                    <Button
                      onClick={handleJoinClass}
                      disabled={isLoading || !isInitialized}
                      className="flex-1 bg-white text-islamic-green hover:bg-gray-100 btn-kinetic"
                      size="lg"
                      data-testid="start-class"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-islamic-green border-t-transparent rounded-full mr-2" />
                          ক্লাস তৈরি হচ্ছে...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 mr-2" />
                          ক্লাস শুরু করুন
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleJoinClass}
                      disabled={isLoading || !isInitialized}
                      className="flex-1 bg-white text-islamic-green hover:bg-gray-100 btn-kinetic"
                      size="lg"
                      data-testid="join-class"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-islamic-green border-t-transparent rounded-full mr-2" />
                          যোগ দিচ্ছেন...
                        </>
                      ) : (
                        <>
                          <Users className="w-5 h-5 mr-2" />
                          ক্লাসে যোগ দিন
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pre-class Information */}
            <Card className="bento-card animate-fade-in-up animation-delay-200">
              <CardHeader>
                <CardTitle className="font-bengali">ক্লাসের আগে জানুন</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 font-bengali">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-islamic-green/20 rounded-full flex items-center justify-center mt-0.5">
                    <span className="w-2 h-2 bg-islamic-green rounded-full"></span>
                  </div>
                  <div>
                    <p className="font-medium mb-1">আমাদের কাস্টম ভিডিও সিস্টেম</p>
                    <p className="text-sm text-muted-foreground">
                      উচ্চ মানের ভিডিও কল, রিয়েল-টাইম চ্যাট ও ইন্টারেক্টিভ হোয়াইটবোর্ড সহ
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-islamic-green/20 rounded-full flex items-center justify-center mt-0.5">
                    <span className="w-2 h-2 bg-islamic-green rounded-full"></span>
                  </div>
                  <div>
                    <p className="font-medium mb-1">ইন্টারনেট সংযোগ</p>
                    <p className="text-sm text-muted-foreground">
                      ভালো মানের ভিডিও কলের জন্য স্থিতিশীল ইন্টারনেট সংযোগ প্রয়োজন
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-islamic-green/20 rounded-full flex items-center justify-center mt-0.5">
                    <span className="w-2 h-2 bg-islamic-green rounded-full"></span>
                  </div>
                  <div>
                    <p className="font-medium mb-1">নোটবুক প্রস্তুত রাখুন</p>
                    <p className="text-sm text-muted-foreground">
                      গুরুত্বপূর্ণ পয়েন্টগুলো লিখে রাখার জন্য কলম-খাতা প্রস্তুত রাখুন
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="bento-card animate-fade-in-up animation-delay-400">
              <CardHeader>
                <CardTitle className="font-bengali">দ্রুত তথ্য</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-islamic-green/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-8 h-8 text-islamic-green" />
                  </div>
                  <p className="font-bengali text-sm text-muted-foreground">
                    ক্লাস শুরু হবে
                  </p>
                  <p className="font-bengali font-semibold text-lg">
                    5 মিনিট পরে
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bento-card animate-fade-in-up animation-delay-600">
              <CardHeader>
                <CardTitle className="font-bengali">ক্লাসের বিষয়বস্তু</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-bengali text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-islamic-green rounded-full"></div>
                  <span>আরবি হরফের পরিচয়</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-islamic-green rounded-full"></div>
                  <span>হরফের উচ্চারণ</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-islamic-green rounded-full"></div>
                  <span>সাধারণ শব্দগঠন</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-islamic-green rounded-full"></div>
                  <span>অনুশীলনী ও প্রশ্নোত্তর</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Live Class with Tabs Component
function LiveClassWithTabs({ 
  selectedClass, 
  isInstructor, 
  participants, 
  showChat, 
  setShowChat, 
  onLeaveClass 
}: {
  selectedClass: any;
  isInstructor: boolean;
  participants: any[];
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  onLeaveClass: () => void;
}) {
  const [activeTab, setActiveTab] = useState('video');

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Arabic Learning Class Header */}
      <div className="bg-islamic-green text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="p-2 bg-white/20 rounded-lg mr-4">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold font-bengali">{selectedClass?.title_bn || selectedClass?.title || 'লাইভ ক্লাস'}</h1>
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
            onClick={onLeaveClass}
            className="bg-white/10 text-white border-white/30 hover:bg-white/20 font-bengali"
          >
            ক্লাস ছেড়ে দিন
          </Button>
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
          <div className="h-full bg-gray-900 rounded-lg p-4">
            <h3 className="font-bengali text-white text-lg mb-4">লাইভ চ্যাট</h3>
            <div className="flex-1 bg-gray-800 rounded-lg p-4 mb-4 min-h-96 overflow-y-auto">
              <p className="text-gray-400 font-bengali text-center">চ্যাট বার্তা এখানে দেখা যাবে...</p>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="আপনার বার্তা লিখুন..."
                className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 font-bengali"
              />
              <Button className="bg-islamic-green hover:bg-islamic-green/80 text-white px-6">
                পাঠান
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="whiteboard" className="flex-1 m-0 p-4 bg-gray-800">
          <div className="h-full bg-gray-900 rounded-lg p-4">
            <h3 className="font-bengali text-white text-lg mb-4">ইন্টারেক্টিভ হোয়াইটবোর্ড</h3>
            <div className="flex-1 bg-white rounded-lg min-h-96 border-2 border-gray-600">
              <p className="text-gray-600 font-bengali text-center p-8">হোয়াইটবোর্ড এখানে লোড হবে...</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="flex-1 m-0 p-4 bg-gray-800">
          <div className="h-full bg-gray-900 rounded-lg p-4">
            <h3 className="font-bengali text-white text-lg mb-4">ক্লাসের রিসোর্স</h3>
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-bengali text-white font-medium mb-2">আজকের পাঠ্য</h4>
                <ul className="space-y-2 font-bengali text-gray-300">
                  <li>• আরবি হরফের পরিচয়</li>
                  <li>• হরফের উচ্চারণ অনুশীলন</li>
                  <li>• সাধারণ শব্দগঠন</li>
                </ul>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="font-bengali text-white font-medium mb-2">ডাউনলোড</h4>
                <ul className="space-y-2">
                  <li>
                    <Button variant="outline" size="sm" className="text-white border-gray-600 hover:bg-gray-700 font-bengali">
                      📄 আরবি হরফের চার্ট
                    </Button>
                  </li>
                  <li>
                    <Button variant="outline" size="sm" className="text-white border-gray-600 hover:bg-gray-700 font-bengali">
                      🎵 উচ্চারণ গাইড অডিও
                    </Button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Class-specific bottom bar */}
      <div className="bg-islamic-green/90 text-white px-4 py-2 text-sm text-center font-bengali">
        আজকের বিষয়: আরবি হরফের পরিচয় ও উচ্চারণ • সময়কাল: {selectedClass?.duration || 90} মিনিট
      </div>
    </div>
  );
}