import { useEffect, useState } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Video, 
  Calendar, 
  Award, 
  TrendingUp,
  Clock,
  Users,
  Play,
  Download,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import Header from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function Dashboard() {
  const { user, userProfile, loading } = useSupabaseAuth();
  const isAuthenticated = !!user;
  const isLoading = loading;
  const { toast } = useToast();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "অননুমোদিত প্রবেশ",
        description: "আপনি লগ আউট হয়ে গেছেন। আবার লগইন করুন...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Get user's attendance using direct Supabase call
  const { data: attendance = [] } = useQuery({
    queryKey: ["user-attendance", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('class_attendance')
        .select(`
          *,
          live_classes!inner (
            title,
            title_bn,
            scheduled_at
          )
        `)
        .eq('user_id', user.id)
        .order('attended_at', { ascending: false });
      return data || [];
    },
    enabled: isAuthenticated && !!user,
  });

  // Get course modules using direct Supabase call
  const { data: modules = [] } = useQuery({
    queryKey: ["course-modules"],
    queryFn: async () => {
      const { data } = await supabase
        .from('course_modules')
        .select('*')
        .eq('is_active', true)
        .order('level', { ascending: true })
        .order('order', { ascending: true });
      return data || [];
    },
    enabled: isAuthenticated,
  });

  // Get live classes using direct Supabase call
  const { data: liveClasses = [] } = useQuery({
    queryKey: ["live-classes"],
    queryFn: async () => {
      const { data } = await supabase
        .from('live_classes')
        .select(`
          *,
          course_modules!inner (
            title,
            title_bn,
            level
          ),
          instructors!inner (
            name,
            name_bn,
            email
          )
        `)
        .eq('is_active', true)
        .order('scheduled_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-islamic-green border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const enrollmentStatus = userProfile?.enrollmentStatus;
  const paymentStatus = userProfile?.paymentStatus;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="bg-gradient-to-r from-islamic-green to-sage-green rounded-2xl p-6 text-white mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {userProfile?.firstName ? userProfile.firstName.charAt(0) : "ম"}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {userProfile?.firstName || "শিক্ষার্থী"} {userProfile?.lastName || ""}
                </h1>
                <p className="opacity-90">শিক্ষার্থী আইডি: #{user?.id?.slice(-5)}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {enrollmentStatus === "enrolled" ? (
                <Badge className="bg-islamic-gold text-dark-green">
                  ✓ কোর্সে নিবন্ধিত
                </Badge>
              ) : (
                <Button 
                  className="bg-islamic-gold text-dark-green hover:bg-yellow-400"
                  onClick={() => window.location.href = "/course-registration"}
                >
                  নিবন্ধন সম্পূর্ণ করুন
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-12 h-12 text-islamic-green mx-auto mb-4" />
              <div className="text-3xl font-bold text-islamic-green mb-2">
                {userProfile?.courseProgress || 0}%
              </div>
              <div className="text-sm text-gray-600 mb-3">কোর্স সম্পন্ন</div>
              <Progress 
                value={userProfile?.courseProgress || 0} 
                className="h-3"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-islamic-green mx-auto mb-4" />
              <div className="text-3xl font-bold text-islamic-green mb-2">
                {userProfile?.classesAttended || 0}
              </div>
              <div className="text-sm text-gray-600">ক্লাসে উপস্থিতি</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Award className="w-12 h-12 text-islamic-green mx-auto mb-4" />
              <div className="text-3xl font-bold text-islamic-green mb-2">
                {userProfile?.certificateScore || 0}%
              </div>
              <div className="text-sm text-gray-600">সার্টিফিকেট স্কোর</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="classes" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="classes">ক্লাস সমূহ</TabsTrigger>
            <TabsTrigger value="modules">কোর্স মডিউল</TabsTrigger>
            <TabsTrigger value="attendance">উপস্থিতি</TabsTrigger>
            <TabsTrigger value="certificate">সার্টিফিকেট</TabsTrigger>
          </TabsList>

          {/* Classes Tab */}
          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Video className="w-5 h-5 mr-2 text-islamic-green" />
                  লাইভ ক্লাস সমূহ
                </CardTitle>
              </CardHeader>
              <CardContent>
                {liveClasses.length > 0 ? (
                  <div className="space-y-4">
                    {liveClasses.map((classItem: any) => (
                      <div key={classItem.id} className="flex items-center justify-between p-4 bg-soft-mint rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-islamic-green rounded-lg flex items-center justify-center">
                            <Video className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {classItem.titleBn || classItem.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {new Date(classItem.scheduledAt).toLocaleDateString('bn-BD')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {classItem.descriptionBn || classItem.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {enrollmentStatus === "enrolled" ? (
                            <Button 
                              size="sm" 
                              className="bg-islamic-green hover:bg-dark-green"
                              onClick={() => window.open(classItem.meetingUrl, '_blank')}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              যোগ দিন
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              disabled
                            >
                              <AlertCircle className="w-4 h-4 mr-1" />
                              নিবন্ধন প্রয়োজন
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>কোনো ক্লাস পাওয়া যায়নি</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modules.length > 0 ? (
                modules.map((module: any) => (
                  <Card key={module.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center">
                          <BookOpen className="w-5 h-5 mr-2 text-islamic-green" />
                          {module.titleBn || module.title}
                        </span>
                        <Badge variant={module.level === 1 ? "default" : "secondary"}>
                          স্তর {module.level}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">
                        {module.descriptionBn || module.description}
                      </p>
                      {enrollmentStatus === "enrolled" ? (
                        <Button className="w-full bg-islamic-green hover:bg-dark-green">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          মডিউল শুরু করুন
                        </Button>
                      ) : (
                        <Button variant="outline" className="w-full" disabled>
                          <AlertCircle className="w-4 h-4 mr-2" />
                          নিবন্ধন প্রয়োজন
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>কোনো মডিউল পাওয়া যায়নি</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-islamic-green" />
                  উপস্থিতির ইতিহাস
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length > 0 ? (
                  <div className="space-y-4">
                    {attendance.map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between p-4 bg-soft-mint rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-sage-green rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">ক্লাসে উপস্থিত</h3>
                            <p className="text-sm text-gray-600">
                              {new Date(record.attendedAt).toLocaleDateString('bn-BD')}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {record.duration} মিনিট
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>কোনো উপস্থিতির রেকর্ড নেই</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificate Tab */}
          <TabsContent value="certificate">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="w-5 h-5 mr-2 text-islamic-green" />
                  সার্টিফিকেট
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Award className="w-16 h-16 mx-auto mb-4 text-islamic-gold" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    আরবি ভাষা কোর্স সার্টিফিকেট
                  </h3>
                  <p className="text-gray-600 mb-6">
                    কোর্স সম্পন্ন করার পর আপনি সার্টিফিকেট ডাউনলোড করতে পারবেন
                  </p>
                  
                  {(userProfile?.courseProgress || 0) >= 100 ? (
                    <Button className="bg-islamic-gold text-dark-green hover:bg-yellow-400">
                      <Download className="w-4 h-4 mr-2" />
                      সার্টিফিকেট ডাউনলোড
                    </Button>
                  ) : (
                    <div className="bg-soft-mint rounded-lg p-6">
                      <p className="text-gray-700 mb-4">
                        সার্টিফিকেটের জন্য আরও {100 - (userProfile?.courseProgress || 0)}% কোর্স সম্পন্ন করুন
                      </p>
                      <Progress value={userProfile?.courseProgress || 0} className="h-3" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
