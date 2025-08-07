import { useEffect } from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Video, 
  Calendar, 
  Award, 
  TrendingUp,
  Clock,
  Users,
  Play
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Home() {
  const { user, loading } = useSupabaseAuth();
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

  // Get upcoming classes
  const { data: upcomingClasses, isLoading: classesLoading } = useQuery({
    queryKey: ["/api/upcoming-classes"],
    enabled: isAuthenticated,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "অননুমোদিত",
          description: "আপনি লগ আউট হয়ে গেছেন। আবার লগইন করুন...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-islamic-green border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-islamic-green to-sage-green rounded-2xl p-6 text-white">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {user?.firstName ? user.firstName.charAt(0) : "ম"}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  আসসালামু আলাইকুম, {user?.firstName || "ভাই/বোন"}!
                </h1>
                <p className="opacity-90">আপনার আরবি শিক্ষার যাত্রায় স্বাগতম</p>
              </div>
            </div>
            
            {user?.enrollmentStatus === "enrolled" ? (
              <Badge className="bg-islamic-gold text-dark-green">
                ✓ কোর্সে নিবন্ধিত
              </Badge>
            ) : (
              <Badge variant="outline" className="text-white border-white">
                নিবন্ধন সম্পূর্ণ করুন
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 text-islamic-green mx-auto mb-2" />
              <div className="text-2xl font-bold text-islamic-green">
                {user?.courseProgress || 0}%
              </div>
              <div className="text-sm text-gray-600">কোর্স সম্পন্ন</div>
              <Progress 
                value={user?.courseProgress || 0} 
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="w-8 h-8 text-islamic-green mx-auto mb-2" />
              <div className="text-2xl font-bold text-islamic-green">
                {user?.classesAttended || 0}
              </div>
              <div className="text-sm text-gray-600">ক্লাসে উপস্থিতি</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Award className="w-8 h-8 text-islamic-green mx-auto mb-2" />
              <div className="text-2xl font-bold text-islamic-green">
                {user?.certificateScore || 0}%
              </div>
              <div className="text-sm text-gray-600">সার্টিফিকেট স্কোর</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-islamic-green mx-auto mb-2" />
              <div className="text-2xl font-bold text-islamic-green">৫০০+</div>
              <div className="text-sm text-gray-600">সহপাঠী</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Classes */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Video className="w-5 h-5 mr-2 text-islamic-green" />
                আসন্ন ক্লাস সমূহ
              </h2>
              
              {classesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : upcomingClasses && upcomingClasses.length > 0 ? (
                <div className="space-y-4">
                  {upcomingClasses.slice(0, 3).map((classItem: any) => (
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
                            {new Date(classItem.scheduledAt).toLocaleDateString('bn-BD', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="bg-islamic-green hover:bg-dark-green"
                        onClick={() => window.open(classItem.meetingUrl, '_blank')}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        যোগ দিন
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>কোনো আসন্ন ক্লাস নেই</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-islamic-green" />
                সাম্প্রতিক কার্যক্রম
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-soft-mint rounded-lg">
                  <div className="w-12 h-12 bg-sage-green rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">আরবি ব্যাকরণ - পাঠ ৮</h3>
                    <p className="text-sm text-gray-600">২৮ নভেম্বর, ২০২৪</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 p-4 bg-soft-mint rounded-lg">
                  <div className="w-12 h-12 bg-islamic-green rounded-lg flex items-center justify-center">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">কুরআনের শব্দভান্ডার</h3>
                    <p className="text-sm text-gray-600">২৬ নভেম্বর, ২০২৪</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-soft-mint rounded-lg">
                  <div className="w-12 h-12 bg-islamic-gold rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">সাপ্তাহিক মূল্যায়ন</h3>
                    <p className="text-sm text-gray-600">২৪ নভেম্বর, ২০২৪</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Button 
            className="h-16 bg-islamic-green hover:bg-dark-green"
            onClick={() => window.location.href = "/dashboard"}
          >
            <BookOpen className="w-6 h-6 mr-2" />
            পূর্ণ ড্যাশবোর্ড
          </Button>

          <Button 
            variant="outline" 
            className="h-16 border-islamic-green text-islamic-green hover:bg-islamic-green hover:text-white"
            onClick={() => window.location.href = "/live-class"}
          >
            <Video className="w-6 h-6 mr-2" />
            লাইভ ক্লাসে যোগ দিন
          </Button>

          <Button 
            variant="outline" 
            className="h-16 border-sage-green text-sage-green hover:bg-sage-green hover:text-white"
          >
            <Award className="w-6 h-6 mr-2" />
            সার্টিফিকেট দেখুন
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
