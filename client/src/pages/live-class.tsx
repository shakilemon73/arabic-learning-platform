import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Clock, Users, Video, MessageSquare, BookOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getLiveClasses, getLiveClassById } from '@/lib/api';
import MultiUserVideoConference from '@/components/MultiUserVideoConference';
import SupabaseLiveChat from '@/components/SupabaseLiveChat';
import HomeworkSubmissions from '@/components/HomeworkSubmissions';

export default function LiveClassPage() {
  const [, navigate] = useLocation();
  const { user, profile, loading: authLoading } = useAuth();
  const [isClassActive, setIsClassActive] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('video');

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
  const isInstructor = selectedClass?.instructor_id === user?.id || (profile as any)?.role === 'admin';
  const userDisplayName = (profile as any)?.display_name || (profile as any)?.first_name || user?.email?.split('@')[0] || 'অংশগ্রহণকারী';

  // Generate room ID when starting class
  useEffect(() => {
    if (selectedClass && !roomId) {
      const generatedRoomId = `arabic-class-${selectedClass.id}-${Date.now()}`;
      setRoomId(generatedRoomId);
    }
  }, [selectedClass, roomId]);

  const handleStartClass = () => {
    if (!selectedClass) {
      alert('কোনো ক্লাস নির্বাচিত নয়');
      return;
    }
    setIsClassActive(true);
  };

  const handleLeaveClass = () => {
    setIsClassActive(false);
    setRoomId(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>অনুমতি প্রয়োজন</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">লাইভ ক্লাসে অংশগ্রহণের জন্য দয়া করে লগইন করুন।</p>
              <Button onClick={() => navigate('/login')} className="w-full">
                লগইন করুন
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Class Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                ড্যাশবোর্ডে ফিরুন
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              {isInstructor && (
                <Badge variant="default" className="bg-islamic-green">
                  প্রশিক্ষক
                </Badge>
              )}
              <Badge variant="outline">
                লাইভ ক্লাস
              </Badge>
            </div>
          </div>
          
          {selectedClass && (
            <div className="mt-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedClass.title_bn || selectedClass.title}
              </h1>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {new Date(selectedClass.scheduled_at).toLocaleDateString('bn-BD')}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {selectedClass.duration} মিনিট
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  সর্বোচ্চ {selectedClass.max_participants} জন
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        {!isClassActive ? (
          /* Pre-Class Screen */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Video className="w-5 h-5 mr-2" />
                    ক্লাস শুরু করুন
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedClass ? (
                    <div className="space-y-4">
                      <div className="bg-soft-mint p-4 rounded-lg">
                        <h3 className="font-medium text-dark-green mb-2">
                          {selectedClass.title_bn || selectedClass.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {selectedClass.description_bn || selectedClass.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <strong>ব্যবহারকারী:</strong> {userDisplayName}
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>ভূমিকা:</strong> {isInstructor ? 'প্রশিক্ষক' : 'শিক্ষার্থী'}
                        </div>
                      </div>

                      <Button
                        onClick={handleStartClass}
                        className="w-full bg-islamic-green hover:bg-dark-green"
                        size="lg"
                      >
                        <Video className="w-5 h-5 mr-2" />
                        {isInstructor ? 'ক্লাস শুরু করুন' : 'ক্লাসে যোগ দিন'}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Video className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 mb-4">কোনো ক্লাস খুঁজে পাওয়া যায়নি</p>
                      <Button onClick={() => navigate('/dashboard')}>
                        ড্যাশবোর্ডে ফিরুন
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Class Info */}
              {selectedClass && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ক্লাসের তথ্য</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">মডিউল:</span>
                      <p className="font-medium">
                        {(selectedClass as any).course_modules?.title_bn || 'আরবি ভাষা'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">প্রশিক্ষক:</span>
                      <p className="font-medium">
                        {(selectedClass as any).instructors?.name_bn || 'প্রশিক্ষক'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">সময়কাল:</span>
                      <p className="font-medium">{selectedClass.duration} মিনিট</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">নির্দেশনা</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                  <p>• আপনার ক্যামেরা এবং মাইক্রোফোন অনুমতি দিন</p>
                  <p>• একটি শান্ত পরিবেশে থাকুন</p>
                  <p>• ইন্টারনেট সংযোগ ভাল রাখুন</p>
                  <p>• প্রয়োজনে চ্যাট ব্যবহার করুন</p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          /* Live Class Screen */
          <div className="h-[calc(100vh-200px)]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="video" className="flex items-center">
                    <Video className="w-4 h-4 mr-2" />
                    ভিডিও কনফারেন্স
                  </TabsTrigger>
                  <TabsTrigger value="chat" className="flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    চ্যাট
                  </TabsTrigger>
                  <TabsTrigger value="homework" className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2" />
                    হোমওয়ার্ক
                  </TabsTrigger>
                </TabsList>

                <Button
                  onClick={handleLeaveClass}
                  variant="destructive"
                  size="sm"
                >
                  ক্লাস ছেড়ে দিন
                </Button>
              </div>

              <TabsContent value="video" className="h-full mt-0">
                {roomId && (
                  <MultiUserVideoConference
                    roomId={roomId}
                    classId={selectedClass?.id}
                    onLeave={handleLeaveClass}
                  />
                )}
              </TabsContent>

              <TabsContent value="chat" className="h-full mt-0">
                <div className="bg-white rounded-lg border h-full">
                  {selectedClass?.id && (
                    <SupabaseLiveChat
                      classId={selectedClass.id}
                      isActive={isClassActive}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="homework" className="h-full mt-0">
                <div className="bg-white rounded-lg border h-full p-6">
                  {selectedClass?.id && (
                    <HomeworkSubmissions classId={selectedClass.id} />
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}