import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, Users, Play, Pause } from 'lucide-react';
import LiveClassroom from '@/components/LiveClassroom';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export default function LiveClassPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [isClassActive, setIsClassActive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Mock data for demonstration - in real app, this would come from URL params or query
  const classData = {
    id: 'class-123',
    title: 'আরবি ব্যাকরণ - প্রাথমিক স্তর',
    description: 'আরবি ব্যাকরণের মৌলিক বিষয়গুলো নিয়ে আলোচনা',
    instructor: 'উস্তাদ আহমেদ হাসান',
    scheduledTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
    duration: 90,
    maxParticipants: 30,
    currentParticipants: 12,
  };

  const { data: upcomingClasses, isLoading } = useQuery({
    queryKey: ['/api/upcoming-classes'],
  });

  const isInstructor = user?.email === 'instructor@example.com'; // Mock check

  const handleJoinClass = async () => {
    try {
      // Create a live session
      const response = await fetch('/api/live-sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: classData.id,
        }),
      });

      if (response.ok) {
        const session = await response.json();
        setSessionId(session.id);
        setIsClassActive(true);
      } else {
        console.error('Failed to create session');
      }
    } catch (error) {
      console.error('Error joining class:', error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-soft-mint via-white to-cream">
        <div className="max-w-2xl mx-auto py-20">
          <Card className="bento-card text-center">
            <CardContent className="p-8">
              <h2 className="text-headline font-bengali mb-4">
                লগইন প্রয়োজন
              </h2>
              <p className="text-muted-foreground font-bengali mb-6">
                লাইভ ক্লাসে অংশগ্রহণের জন্য প্রথমে লগইন করুন
              </p>
              <Button onClick={() => navigate('/login')} className="btn-kinetic">
                লগইন করুন
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isClassActive && sessionId) {
    return (
      <LiveClassroom
        sessionId={sessionId}
        isInstructor={isInstructor}
        classTitle={classData.title}
        userId={user.id}
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
                    {classData.title}
                  </CardTitle>
                  <Badge variant="secondary" className="text-sm">
                    লাইভ ক্লাস
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-white">
                <p className="text-lg font-bengali mb-6 opacity-90">
                  {classData.description}
                </p>
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-6 h-6 opacity-75" />
                    <div>
                      <p className="font-bengali font-medium">তারিখ ও সময়</p>
                      <p className="font-bengali opacity-75">
                        {classData.scheduledTime.toLocaleDateString('bn-BD')}
                      </p>
                      <p className="font-bengali opacity-75">
                        {classData.scheduledTime.toLocaleTimeString('bn-BD', {
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
                      <p className="font-bengali opacity-75">{classData.duration} মিনিট</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 opacity-75" />
                    <div>
                      <p className="font-bengali font-medium">অংশগ্রহণকারী</p>
                      <p className="font-bengali opacity-75">
                        {classData.currentParticipants}/{classData.maxParticipants} জন
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold">শি</span>
                    </div>
                    <div>
                      <p className="font-bengali font-medium">শিক্ষক</p>
                      <p className="font-bengali opacity-75">{classData.instructor}</p>
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