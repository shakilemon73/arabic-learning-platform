import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  Mic, 
  MicOff, 
  VideoOff, 
  Users, 
  MessageCircle,
  Settings,
  Phone,
  PhoneOff,
  Clock,
  AlertCircle
} from "lucide-react";
import Header from "@/components/Header";
import { useQuery, useMutation } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function LiveClass() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [selectedClass, setSelectedClass] = useState<any>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "অননুমোদিত প্রবেশ",
        description: "আপনি লগ আউট হয়ে গেছেন। আবার লগইন করুন...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  // Record attendance mutation
  const attendanceMutation = useMutation({
    mutationFn: async ({ classId, duration }: { classId: string; duration: number }) => {
      const response = await apiRequest("POST", "/api/attendance", { classId, duration });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-attendance"] });
      toast({
        title: "উপস্থিতি রেকর্ড হয়েছে",
        description: "আপনার ক্লাসে উপস্থিতি সফলভাবে রেকর্ড হয়েছে।",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "অননুমোদিত",
          description: "আপনি লগ আউট হয়ে গেছেন। আবার লগইন করুন...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "উপস্থিতি রেকর্ড ব্যর্থ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const joinClass = (classItem: any) => {
    if (user?.enrollmentStatus !== "enrolled") {
      toast({
        title: "নিবন্ধন প্রয়োজন",
        description: "লাইভ ক্লাসে যোগ দিতে প্রথমে কোর্সে নিবন্ধন করুন।",
        variant: "destructive",
      });
      return;
    }

    setSelectedClass(classItem);
    setIsInCall(true);
    
    // Record attendance (assuming 90 minutes class duration)
    attendanceMutation.mutate({
      classId: classItem.id,
      duration: 90
    });

    // In a real implementation, you would integrate with a video calling service
    // For now, we'll simulate the call interface
    toast({
      title: "ক্লাসে যোগ দিয়েছেন",
      description: `${classItem.titleBn || classItem.title} ক্লাসে আপনাকে স্বাগতম!`,
    });
  };

  const leaveClass = () => {
    setIsInCall(false);
    setSelectedClass(null);
    setIsMuted(false);
    setIsVideoOff(false);
    
    toast({
      title: "ক্লাস ছেড়েছেন",
      description: "আপনি সফলভাবে ক্লাস ছেড়েছেন।",
    });
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isInCall ? (
          // Class List View
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">লাইভ ক্লাস</h1>
              <p className="text-lg text-gray-600">আসন্ন এবং চলমান ক্লাস সমূহে যোগ দিন</p>
            </div>

            {user?.enrollmentStatus !== "enrolled" && (
              <Card className="mb-8 border-orange-200 bg-orange-50">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                    <div>
                      <h3 className="font-semibold text-orange-800">নিবন্ধন প্রয়োজন</h3>
                      <p className="text-orange-700">লাইভ ক্লাসে যোগ দিতে প্রথমে কোর্সে নিবন্ধন করুন।</p>
                    </div>
                  </div>
                  <Button 
                    className="mt-4 bg-orange-600 hover:bg-orange-700"
                    onClick={() => window.location.href = "/course-registration"}
                  >
                    এখনই নিবন্ধন করুন
                  </Button>
                </CardContent>
              </Card>
            )}

            {classesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : upcomingClasses && upcomingClasses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingClasses.map((classItem: any) => {
                  const classDate = new Date(classItem.scheduledAt);
                  const isLive = Math.abs(Date.now() - classDate.getTime()) < 30 * 60 * 1000; // Within 30 minutes
                  
                  return (
                    <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            {classItem.titleBn || classItem.title}
                          </CardTitle>
                          {isLive && (
                            <Badge className="bg-red-500 text-white animate-pulse">
                              ● লাইভ
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 mb-4">
                          {classItem.descriptionBn || classItem.description}
                        </p>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="w-4 h-4 mr-2" />
                            {classDate.toLocaleDateString('bn-BD', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Users className="w-4 h-4 mr-2" />
                            ৯০ মিনিট
                          </div>
                        </div>

                        <Button 
                          className="w-full bg-islamic-green hover:bg-dark-green"
                          disabled={user?.enrollmentStatus !== "enrolled"}
                          onClick={() => joinClass(classItem)}
                        >
                          <Video className="w-4 h-4 mr-2" />
                          ক্লাসে যোগ দিন
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">কোনো আসন্ন ক্লাস নেই</h3>
                  <p className="text-gray-500">শীঘ্রই নতুন ক্লাসের সময়সূচী ঘোষণা করা হবে।</p>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          // Video Call Interface
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedClass?.titleBn || selectedClass?.title}
              </h1>
              <Badge className="bg-green-500 text-white">
                ● লাইভ ক্লাসে যুক্ত
              </Badge>
            </div>

            {/* Video Area */}
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center text-white relative">
                  <div className="text-center">
                    <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">ভিডিও কল সংযুক্ত</p>
                    <p className="text-sm opacity-75">প্রকৃত বাস্তবায়নে এখানে ভিডিও স্ট্রিম থাকবে</p>
                  </div>
                  
                  {/* User controls overlay */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center space-x-4 bg-black bg-opacity-50 rounded-full px-6 py-3">
                      <Button
                        size="sm"
                        variant={isMuted ? "destructive" : "secondary"}
                        className="rounded-full w-10 h-10 p-0"
                        onClick={() => setIsMuted(!isMuted)}
                      >
                        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={isVideoOff ? "destructive" : "secondary"}
                        className="rounded-full w-10 h-10 p-0"
                        onClick={() => setIsVideoOff(!isVideoOff)}
                      >
                        {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full w-10 h-10 p-0"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full w-10 h-10 p-0"
                        onClick={leaveClass}
                      >
                        <PhoneOff className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Class Info and Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>ক্লাসের তথ্য</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-gray-900">আজকের পাঠ</h4>
                        <p className="text-gray-600">
                          {selectedClass?.descriptionBn || selectedClass?.description || "আরবি ব্যাকরণের মূলনীতি এবং কুরআনের শব্দভান্ডার"}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center text-sm text-gray-500 mb-1">
                            <Clock className="w-4 h-4 mr-2" />
                            সময়কাল
                          </div>
                          <p className="font-medium">৯০ মিনিট</p>
                        </div>
                        <div>
                          <div className="flex items-center text-sm text-gray-500 mb-1">
                            <Users className="w-4 h-4 mr-2" />
                            অংশগ্রহণকারী
                          </div>
                          <p className="font-medium">২৫ জন</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageCircle className="w-5 h-5 mr-2" />
                      চ্যাট
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 bg-gray-50 rounded-lg p-4 mb-4 overflow-y-auto">
                      <div className="text-center text-gray-500 text-sm">
                        চ্যাট বৈশিষ্ট্য শীঘ্রই আসছে...
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        placeholder="বার্তা লিখুন..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        disabled
                      />
                      <Button size="sm" disabled>
                        পাঠান
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
