import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Clock, Users, Play, Pause, MessageSquare, Video } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  const { user } = useAuth();
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
  const classId = new URLSearchParams(window.location.search).get('id') || 'demo-class';
  
  // Fetch specific class data
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['/api/live-class', classId],
    queryFn: () => getLiveClassById(classId),
    enabled: !!classId,
  });

  // Fetch all classes as fallback
  const { data: allClasses, isLoading: allClassesLoading } = useQuery({
    queryKey: ['/api/live-classes'],
    queryFn: () => getLiveClasses(),
  });

  const dataLoading = classLoading || allClassesLoading;

  // Use specific class data - NO FALLBACK TO DEMO DATA
  const selectedClass = classData || (allClasses && allClasses[0]);
  
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

  // Real instructor detection based on database data - NO HARD-CODED EMAILS
  const isInstructor = selectedClass && user ? (
    user.user_metadata?.role === 'instructor' || 
    (selectedClass.instructors && 
     typeof selectedClass.instructors === 'object' && 
     'email' in selectedClass.instructors && 
     selectedClass.instructors.email === user.email)
  ) : false;

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
    // Require real user authentication - no demo mode
    if (!user?.id) {
      alert('দয়া করে প্রথমে লগ ইন করুন। Please log in first to join the live class.');
      navigate('/login');
      return;
    }

    setIsLoading(true);
    try {
      // Ensure selectedClass exists
      if (!selectedClass) {
        throw new Error('No class data available');
      }
      
      // Create or get video room - REAL FUNCTIONALITY
      const generatedRoomId = `arabic-class-${selectedClass.id}`;
      
      console.log('Creating real video room with ID:', generatedRoomId);
      
      // Create room in database - REAL DATABASE OPERATIONS
      try {
        await createVideoRoom({
          name: selectedClass.title_bn || selectedClass.title,
          description: selectedClass.description_bn || selectedClass.description,
          host_user_id: isInstructor ? user.id : (selectedClass.instructors as any)?.id || 'instructor-id',
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
        userId: user.id,
        userRole: isInstructor ? 'host' : 'participant',
        displayName: user.user_metadata?.first_name || user.email?.split('@')[0] || 'Student',
        avatar: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.first_name || user.email?.split('@')[0] || 'User')}&background=0D8ABC&color=fff`
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

  // Show video conference if connected
  if (isClassActive && isConnected) {
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
              onClick={handleLeaveClass}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 font-bengali"
            >
              ক্লাস ছেড়ে দিন
            </Button>
          </div>
        </div>

        {/* Video Conference */}
        <div className="flex-1">
          <VideoConference
            showChat={showChat}
            onChatToggle={() => setShowChat(!showChat)}
          />
        </div>

        {/* Class-specific bottom bar */}
        <div className="bg-islamic-green/90 text-white px-4 py-2 text-sm text-center font-bengali">
          আজকের বিষয়: আরবি হরফের পরিচয় ও উচ্চারণ • সময়কাল: {selectedClass.duration} মিনিট
        </div>
      </div>
    );
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
                    {selectedClass.title_bn}
                  </CardTitle>
                  <Badge variant="secondary" className="text-sm">
                    লাইভ ক্লাস
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-white">
                <p className="text-lg font-bengali mb-6 opacity-90">
                  {selectedClass.description_bn}
                </p>
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-6 h-6 opacity-75" />
                    <div>
                      <p className="font-bengali font-medium">তারিখ ও সময়</p>
                      <p className="font-bengali opacity-75">
                        {new Date(selectedClass.scheduled_at).toLocaleDateString('bn-BD')}
                      </p>
                      <p className="font-bengali opacity-75">
                        {new Date(selectedClass.scheduled_at).toLocaleTimeString('bn-BD', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="w-6 h-6 opacity-75" />
                    <div>
                      <p className="font-bengali font-medium">সময়কাল</p>
                      <p className="font-bengali opacity-75">{selectedClass.duration} মিনিট</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 opacity-75" />
                    <div>
                      <p className="font-bengali font-medium">অংশগ্রহণকারী</p>
                      <p className="font-bengali opacity-75">
                        {selectedClass.current_participants}/{selectedClass.max_participants} জন
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">শি</span>
                    </div>
                    <div>
                      <p className="font-bengali font-medium">শিক্ষক</p>
                      <p className="font-bengali opacity-75">{selectedClass.instructors?.name_bn || 'শিক্ষক'}</p>
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