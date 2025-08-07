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

export default function Dashboard() {
  const { toast } = useToast();

  // Mock user data for demonstration
  const mockUser = {
    id: "demo-user-1",
    email: "user@example.com",
    first_name: "আহমেদ",
    last_name: "হাসান"
  };

  const mockUserProfile = {
    enrollment_status: "enrolled",
    payment_status: "paid",
    course_progress: 65,
    classes_attended: 12,
    certificate_score: 85
  };

  // Mock attendance data
  const attendance = [
    {
      id: "1",
      user_id: "demo-user-1",
      class_id: "class-1",
      duration: 45,
      attended_at: "2025-01-01T10:00:00Z",
      live_classes: {
        title: "Arabic Alphabet Basics",
        title_bn: "আরবি বর্ণমালার মৌলিক বিষয়",
        scheduled_at: "2025-01-01T10:00:00Z"
      }
    }
  ];

  // Mock course modules data
  const modules = [
    {
      id: "module-1",
      title: "Arabic Alphabet",
      title_bn: "আরবি বর্ণমালা",
      level: 1,
      order: 1,
      is_active: true
    },
    {
      id: "module-2", 
      title: "Basic Grammar",
      title_bn: "মৌলিক ব্যাকরণ",
      level: 2,
      order: 2,
      is_active: true
    }
  ];

  // Mock live classes data
  const liveClasses = [
    {
      id: "class-1",
      title: "Arabic Reading Practice",
      title_bn: "আরবি পড়ার অনুশীলন",
      scheduled_at: "2025-01-08T14:00:00Z",
      duration: 60,
      course_modules: {
        title: "Reading Skills",
        title_bn: "পড়ার দক্ষতা",
        level: 2
      },
      instructors: {
        name: "Dr. Ahmed",
        name_bn: "ড. আহমেদ",
        email: "ahmed@example.com"
      }
    }
  ];

  const enrollmentStatus = mockUserProfile?.enrollment_status;
  const paymentStatus = mockUserProfile?.payment_status;

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
                  {mockUser?.first_name ? mockUser.first_name.charAt(0) : "ম"}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {mockUser?.first_name || "শিক্ষার্থী"} {mockUser?.last_name || ""}
                </h1>
                <p className="opacity-90">শিক্ষার্থী আইডি: #{mockUser?.id?.slice(-5)}</p>
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
                {mockUserProfile?.course_progress || 0}%
              </div>
              <div className="text-sm text-gray-600 mb-3">কোর্স সম্পন্ন</div>
              <Progress 
                value={mockUserProfile?.course_progress || 0} 
                className="h-3"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-12 h-12 text-islamic-green mx-auto mb-4" />
              <div className="text-3xl font-bold text-islamic-green mb-2">
                {mockUserProfile?.classes_attended || 0}
              </div>
              <div className="text-sm text-gray-600">ক্লাসে উপস্থিতি</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Award className="w-12 h-12 text-islamic-green mx-auto mb-4" />
              <div className="text-3xl font-bold text-islamic-green mb-2">
                {mockUserProfile?.certificate_score || 0}%
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
                  
                  {(mockUserProfile?.course_progress || 0) >= 100 ? (
                    <Button className="bg-islamic-gold text-dark-green hover:bg-yellow-400">
                      <Download className="w-4 h-4 mr-2" />
                      সার্টিফিকেট ডাউনলোড
                    </Button>
                  ) : (
                    <div className="bg-soft-mint rounded-lg p-6">
                      <p className="text-gray-700 mb-4">
                        সার্টিফিকেটের জন্য আরও {100 - (mockUserProfile?.course_progress || 0)}% কোর্স সম্পন্ন করুন
                      </p>
                      <Progress value={mockUserProfile?.course_progress || 0} className="h-3" />
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
