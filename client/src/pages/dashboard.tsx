import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertCircle,
  Plus,
  Edit,
  Settings,
  Shield
} from "lucide-react";
import Header from "@/components/Header";
import CreateClassForm from "@/components/admin/CreateClassForm";
import ManageClassesPanel from "@/components/admin/ManageClassesPanel";

import { useQuery } from "@tanstack/react-query";
import { getUserProfile, getUserAttendance } from "@/lib/api";
import { getLiveClasses } from "@/lib/supabase";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, profile: userProfile, loading: authLoading } = useAuth();
  
  // Admin panel state
  const [showCreateClassForm, setShowCreateClassForm] = useState(false);
  const [showManageClassesPanel, setShowManageClassesPanel] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Fetch real user data with proper error handling
  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID required');
      return await getUserProfile(user.id);
    },
    enabled: !!user?.id,
    initialData: null,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Disable to prevent constant refetching
    retry: 1,
  });

  const { data: attendance, isLoading: attendanceLoading, error: attendanceError } = useQuery({
    queryKey: ['user-attendance', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User ID required');
      return await getUserAttendance(user.id);
    },
    enabled: !!user?.id,
    initialData: [],
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false, // Disable to prevent constant refetching
    retry: 1,
  });

  const { data: upcomingClasses, isLoading: classesLoading, error: classesError } = useQuery({
    queryKey: ['live-classes'],
    queryFn: async () => {
      console.log('🔍 Dashboard: Calling getLiveClasses()...');
      const result = await getLiveClasses();
      console.log('🔍 Dashboard: getLiveClasses result:', result);
      
      if (result && result.error) {
        console.error('❌ Dashboard: Error fetching live classes:', result.error);
        throw result.error;
      }
      
      const classes = result && result.data ? result.data : (Array.isArray(result) ? result : []);
      console.log('🔍 Dashboard: Final classes array:', classes);
      return classes;
    },
    initialData: [],
    staleTime: 1000 * 60 * 5, // 5 minutes for better caching
    refetchOnWindowFocus: false, // Disable to prevent constant refetching
    retry: 1, // Reduce retries to prevent hanging
    refetchInterval: false, // Disable automatic refetching
  });
  
  // Debug: Show what classes are loaded from your Supabase
  console.log('🏠 Dashboard classes from Supabase:', upcomingClasses);

  // Show errors if any critical data failed to load
  if (profileError || attendanceError || classesError) {
    console.error('Dashboard data errors:', { profileError, attendanceError, classesError });
  }

  const isLoading = authLoading || (profileLoading && !profile) || (attendanceLoading && !attendance) || (classesLoading && !upcomingClasses);

  // Use real data with proper fallbacks
  const displayProfile = profile || userProfile || {
    enrollment_status: "pending" as const,
    payment_status: "pending" as const,
    course_progress: 0,
    classes_attended: 0,
    certificate_score: 0,
    first_name: "",
    last_name: "",
    role: "student" as const
  };

  const displayUser = user || { 
    email: "user@example.com",
    user_metadata: { first_name: "ব্যবহারকারী", last_name: "" }
  };

  // Handle loading states with timeout
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[125px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Get recent attendance with class details (with safety checks)
  const recentAttendance = Array.isArray(attendance) ? attendance.slice(0, 5) : [];
  const upcomingClassesList = Array.isArray(upcomingClasses) ? upcomingClasses.slice(0, 3) : [];

  const enrollmentStatus = displayProfile?.enrollment_status;
  const paymentStatus = displayProfile?.payment_status;

  // Remove authentication check since auth is disabled

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                আস্‌সালামু আলাইকুম, {displayProfile.first_name || displayUser.user_metadata?.first_name || displayUser.email?.split('@')[0]}
              </h1>
              <p className="text-gray-600">
                আজকের তারিখ: {new Date().toLocaleDateString('bn-BD')}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">নিবন্ধনের অবস্থা</p>
                <Badge variant={displayProfile.enrollment_status === "enrolled" ? "default" : "secondary"}>
                  {displayProfile.enrollment_status === "enrolled" ? "নিবন্ধিত" : "পেন্ডিং"}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">পেমেন্ট স্ট্যাটাস</p>
                <Badge variant={displayProfile.payment_status === "paid" ? "default" : "destructive"}>
                  {displayProfile.payment_status === "paid" ? "পরিশোধিত" : "অপরিশোধিত"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">কোর্স অগ্রগতি</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{displayProfile.course_progress || 0}%</div>
              <Progress value={displayProfile.course_progress || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">ক্লাসে উপস্থিতি</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{displayProfile.classes_attended || 0}</div>
              <p className="text-xs text-green-600 mt-1">মোট ক্লাস সংখ্যা</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">সার্টিফিকেট স্কোর</CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">{displayProfile.certificate_score || 0}%</div>
              <p className="text-xs text-purple-600 mt-1">মূল্যায়ন স্কোর</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">আগামী ক্লাস</CardTitle>
              <Calendar className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{upcomingClassesList.length}</div>
              <p className="text-xs text-orange-600 mt-1">আগামী সপ্তাহে</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Controls - Only visible for admin users */}
        {(displayProfile?.role === 'admin' || userProfile?.role === 'admin' || user?.id === '3b077064-343c-4938-9ae0-52a866156162') && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-islamic-green to-emerald-600 text-white border-0">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>অ্যাডমিন প্যানেল - ক্লাস ম্যানেজমেন্ট</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    size="lg"
                    className="bg-white text-islamic-green hover:bg-gray-100 h-14"
                    onClick={() => setShowCreateClassForm(true)}
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    নতুন ক্লাস তৈরি করুন
                  </Button>
                  
                  <Button
                    size="lg"
                    className="bg-white text-islamic-green hover:bg-gray-100 h-14"
                    onClick={() => setShowManageClassesPanel(true)}
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    সকল ক্লাস ম্যানেজ করুন
                  </Button>
                  
                  <Button
                    size="lg"
                    className="bg-white text-islamic-green hover:bg-gray-100 h-14"
                    onClick={() => setShowManageClassesPanel(true)}
                  >
                    <Edit className="h-5 w-5 mr-2" />
                    ক্লাস সম্পাদনা করুন
                  </Button>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/10 rounded-lg p-3">
                    <h4 className="font-medium mb-1">দ্রুত তথ্য</h4>
                    <p className="text-white/80">মোট ক্লাস: {upcomingClassesList.length}</p>
                    <p className="text-white/80">সক্রিয় শিক্ষার্থী: {attendance?.length || 0}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <h4 className="font-medium mb-1">অ্যাডমিন সুবিধা</h4>
                    <p className="text-white/80">• ক্লাস তৈরি ও সম্পাদনা</p>
                    <p className="text-white/80">• শিক্ষার্থী ম্যানেজমেন্ট</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">সংক্ষিপ্ত বিবরণ</TabsTrigger>
            <TabsTrigger value="classes">ক্লাসের তালিকা</TabsTrigger>
            <TabsTrigger value="attendance">উপস্থিতি</TabsTrigger>
            <TabsTrigger value="progress">অগ্রগতি</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Classes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Video className="h-5 w-5 mr-2" />
                    আগামী ক্লাসের সময়সূচী
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingClassesList.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingClassesList.map((class_item) => (
                        <div key={class_item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">{class_item.title_bn}</h4>
                              <p className="text-sm text-gray-600">{class_item.title}</p>
                            </div>
                            <Badge variant="outline">
                              {class_item.course_modules?.level} স্তর
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-1" />
                              {new Date(class_item.scheduled_at).toLocaleString('bn-BD')}
                            </div>
                            <Link href="/live-class">
                              <Button size="sm" variant="outline">
                                <Play className="h-4 w-4 mr-1" />
                                যোগ দিন
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>কোনো আগামী ক্লাস নেই</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    সাম্প্রতিক কার্যক্রম
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentAttendance.length > 0 ? (
                    <div className="space-y-4">
                      {recentAttendance.map((item) => (
                        <div key={item.id} className="flex items-center space-x-3 py-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.live_classes.title_bn}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(item.attended_at).toLocaleDateString('bn-BD')} • {item.duration} মিনিট
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>কোনো কার্যক্রম নেই</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle>সকল লাইভ ক্লাস</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingClasses && upcomingClasses.length > 0 ? (
                  <div className="grid gap-4">
                    {upcomingClasses.map((class_item) => (
                      <div key={class_item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{class_item.title_bn}</h3>
                            <p className="text-gray-600">{class_item.title}</p>
                            <p className="text-sm text-gray-500 mt-1">{class_item.description_bn}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">স্তর {class_item.course_modules?.level}</Badge>
                            <p className="text-sm text-gray-500 mt-1">
                              শিক্ষক: {class_item.instructors?.name_bn}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              {new Date(class_item.scheduled_at).toLocaleDateString('bn-BD')}
                            </span>
                            <span className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {class_item.duration} মিনিট
                            </span>
                            <span className="flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              {class_item.current_participants}/{class_item.max_participants}
                            </span>
                          </div>
                          <Link href="/live-class">
                            <Button>
                              <Video className="h-4 w-4 mr-2" />
                              ক্লাসে যোগ দিন
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Video className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">কোনো লাইভ ক্লাস উপলব্ধ নেই</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance">
            <Card>
              <CardHeader>
                <CardTitle>উপস্থিতির রেকর্ড</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance && attendance.length > 0 ? (
                  <div className="space-y-4">
                    {attendance.map((record) => (
                      <div key={record.id} className="flex items-center justify-between border rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-6 w-6 text-green-500" />
                          <div>
                            <p className="font-medium">{record.live_classes.title_bn}</p>
                            <p className="text-sm text-gray-600">{record.live_classes.title}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{new Date(record.attended_at).toLocaleDateString('bn-BD')}</p>
                          <p className="text-xs text-gray-500">{record.duration} মিনিট উপস্থিত</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">কোনো উপস্থিতির রেকর্ড নেই</p>
                    <p className="text-sm text-gray-400 mt-2">ক্লাসে অংশগ্রহণ করুন উপস্থিতি রেকর্ড করতে</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>কোর্স অগ্রগতি</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">সম্পূর্ণ অগ্রগতি</span>
                      <span className="text-sm text-gray-600">{displayProfile.course_progress || 0}%</span>
                    </div>
                    <Progress value={displayProfile.course_progress || 0} className="h-3" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-600">{displayProfile.classes_attended || 0}</h3>
                      <p className="text-sm text-gray-600">উপস্থিত ক্লাস</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <h3 className="text-lg font-semibold text-green-600">{displayProfile.certificate_score || 0}%</h3>
                      <p className="text-sm text-gray-600">সার্টিফিকেট স্কোর</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <h3 className="text-lg font-semibold text-purple-600">{upcomingClassesList.length}</h3>
                      <p className="text-sm text-gray-600">আগামী ক্লাস</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {displayProfile.enrollment_status === "pending" && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-orange-800">কোর্সে নিবন্ধন সম্পন্ন করুন</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-orange-700 mb-4">
                      সম্পূর্ণ কোর্সে প্রবেশের জন্য আপনার নিবন্ধন এবং পেমেন্ট সম্পন্ন করুন।
                    </p>
                    <Link href="/course-registration">
                      <Button className="bg-orange-600 hover:bg-orange-700">
                        এখনই নিবন্ধন করুন
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Admin Forms */}
      {showCreateClassForm && (
        <CreateClassForm
          onClose={() => setShowCreateClassForm(false)}
          onSuccess={() => {
            // Refresh class data
            window.location.reload();
          }}
        />
      )}

      {showManageClassesPanel && (
        <ManageClassesPanel
          onClose={() => setShowManageClassesPanel(false)}
          onEditClass={(classId) => {
            setEditingClassId(classId);
            setShowManageClassesPanel(false);
            setShowCreateClassForm(true); // Reuse form for editing
          }}
        />
      )}
    </div>
  );
}