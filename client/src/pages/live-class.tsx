import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Clock, Users, Play, Pause } from 'lucide-react';
import LiveClassroom from '@/components/LiveClassroom';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getLiveClasses, getLiveClassById } from '@/lib/api';

export default function LiveClassPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isClassActive, setIsClassActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

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

  const isLoading = classLoading || allClassesLoading;

  // Use specific class or first available class
  const selectedClass = classData || (allClasses && allClasses[0]) || {
    id: 'demo-class',
    title: 'আরবি ভাষা শিক্ষা',
    title_bn: 'আরবি ভাষা শিক্ষা - ডেমো ক্লাস',
    description: 'আরবি ভাষা শিক্ষার মৌলিক বিষয়সমূহ',
    description_bn: 'আরবি ভাষা শিক্ষার মৌলিক বিষয়সমূহ',
    scheduled_at: new Date().toISOString(),
    duration: 90,
    max_participants: 30,
    current_participants: 5,
    instructors: { name: 'উস্তাদ', name_bn: 'উস্তাদ আহমেদ', email: 'instructor@example.com' }
  };

  const isInstructor = user?.email === 'instructor@example.com'; // Check if current user is instructor

  const handleJoinClass = () => {
    // Generate a unique session ID based on class and timestamp
    const generatedSessionId = `${selectedClass.id}_${Date.now()}`;
    setSessionId(generatedSessionId);
    setIsClassActive(true);
  };

  // Remove authentication check - all users can access

  if (isClassActive && sessionId) {
    return (
      <LiveClassroom
        sessionId={sessionId}
        isInstructor={isInstructor}
        classTitle={selectedClass.title_bn}
        userId={user?.id || 'demo-user'}
      />
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

                <div className="flex space-x-4">
                  {isInstructor ? (
                    <Button
                      onClick={handleJoinClass}
                      className="flex-1 bg-white text-islamic-green hover:bg-gray-100 btn-kinetic"
                      size="lg"
                      data-testid="start-class"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      ক্লাস শুরু করুন
                    </Button>
                  ) : (
                    <Button
                      onClick={handleJoinClass}
                      className="flex-1 bg-white text-islamic-green hover:bg-gray-100 btn-kinetic"
                      size="lg"
                      data-testid="join-class"
                    >
                      <Users className="w-5 h-5 mr-2" />
                      ক্লাসে যোগ দিন
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
                    <p className="font-medium mb-1">ক্যামেরা ও মাইক্রোফোন</p>
                    <p className="text-sm text-muted-foreground">
                      ক্লাসে সক্রিয় অংশগ্রহণের জন্য ক্যামেরা ও মাইক্রোফোন চালু রাখুন
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