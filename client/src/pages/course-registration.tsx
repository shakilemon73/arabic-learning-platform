import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  CheckCircle, 
  CreditCard,
  Users,
  Video,
  Award,
  Clock,
  BookOpen,
  Star
} from "lucide-react";
import Header from "@/components/Header";
import BangladeshiPayment from "@/components/BangladeshiPayment";

const registrationSchema = z.object({
  firstName: z.string().min(2, "নাম কমপক্ষে ২টি অক্ষর হতে হবে"),
  lastName: z.string().min(2, "পদবি কমপক্ষে ২টি অক্ষর হতে হবে"),
  email: z.string().email("বৈধ ইমেইল ঠিকানা প্রয়োজন"),
  phone: z.string().min(11, "বৈধ মোবাইল নম্বর প্রয়োজন"),
  arabicExperience: z.string().min(1, "আরবি ভাষার অভিজ্ঞতা নির্বাচন করুন"),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;



export default function CourseRegistration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'registration' | 'payment'>('registration');
  const [registeredUserId, setRegisteredUserId] = useState("");

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: "",
      arabicExperience: "",
    },
  });

  // Registration mutation
  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const response = await apiRequest("POST", "/api/register", data);
      return response.json();
    },
    onSuccess: (newUser) => {
      setRegisteredUserId(newUser.id);
      setStep('payment');
      
      toast({
        title: "নিবন্ধন সফল!",
        description: "এখন পেমেন্ট সম্পন্ন করুন।",
      });
    },
    onError: (error: any) => {
      toast({
        title: "নিবন্ধন ব্যর্থ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePaymentSuccess = () => {
    toast({
      title: "পেমেন্ট সফল!",
      description: "আপনার নিবন্ধন সম্পন্ন হয়েছে। স্বাগতম!",
    });

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = "/";
    }, 2000);
  };

  const onSubmit = (data: RegistrationFormData) => {
    registrationMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">আজই নিবন্ধন করুন</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">সহজ পেমেন্ট প্রক্রিয়ার মাধ্যমে কোর্সে যুক্ত হন</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Registration/Payment Form */}
          <div className="bg-soft-mint rounded-2xl p-6 md:p-8">
            {step === 'registration' ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">নিবন্ধন ফর্ম</h2>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>প্রথম নাম *</FormLabel>
                            <FormControl>
                              <Input placeholder="আপনার প্রথম নাম" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>পদবি *</FormLabel>
                            <FormControl>
                              <Input placeholder="আপনার পদবি" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ইমেইল ঠিকানা *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="example@gmail.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>মোবাইল নম্বর *</FormLabel>
                          <FormControl>
                            <Input placeholder="০১৭xxxxxxxx" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="arabicExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>আরবি ভাষার অভিজ্ঞতা</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="নির্বাচন করুন" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">নতুন শিক্ষার্থী</SelectItem>
                              <SelectItem value="basic">প্রাথমিক জ্ঞান আছে</SelectItem>
                              <SelectItem value="intermediate">মধ্যম জ্ঞান আছে</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={registrationMutation.isPending}
                      className="w-full bg-islamic-green text-white py-4 rounded-lg font-semibold text-lg hover:bg-dark-green transition-colors duration-300"
                    >
                      {registrationMutation.isPending ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          নিবন্ধন হচ্ছে...
                        </>
                      ) : (
                        "পরবর্তী ধাপ - পেমেন্ট"
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">পেমেন্ট</h2>
                <BangladeshiPayment
                  userId={registeredUserId}
                  onPaymentSuccess={handlePaymentSuccess}
                />
              </>
            )}
          </div>

          {/* Course Package Info */}
          <div className="space-y-8">
            {/* Package Details */}
            <Card className="bg-gradient-to-br from-islamic-green to-sage-green text-white">
              <CardContent className="p-6 md:p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">আরবি ভাষা শিক্ষা কোর্স</h3>
                  <div className="text-4xl font-bold text-islamic-gold">৬০০ টাকা</div>
                  <p className="text-sm opacity-90 mt-2">একবার পেমেন্ট, সম্পূর্ণ কোর্স</p>
                </div>

                <div className="space-y-4">
                  {[
                    { icon: <Clock className="w-5 h-5" />, text: "৬ মাসের সম্পূর্ণ কোর্স" },
                    { icon: <Video className="w-5 h-5" />, text: "সপ্তাহে ২টি লাইভ ক্লাস" },
                    { icon: <BookOpen className="w-5 h-5" />, text: "রেকর্ডেড ক্লাস অ্যাক্সেস" },
                    { icon: <Users className="w-5 h-5" />, text: "পিডিএফ নোট ও অনুশীলনী" },
                    { icon: <Award className="w-5 h-5" />, text: "কোর্স সমাপনী সার্টিফিকেট" },
                    { icon: <CheckCircle className="w-5 h-5" />, text: "২৪/৭ সাপোর্ট" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="text-islamic-gold flex-shrink-0">
                        {item.icon}
                      </div>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Security Assurance */}
            <Card className="bg-white shadow-lg border border-gray-100">
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Shield className="w-5 h-5 text-islamic-green mr-2" />
                  নিরাপদ পেমেন্ট গ্যারান্টি
                </h4>
                <ul className="text-sm text-gray-600 space-y-2">
                  {[
                    "SSL এনক্রিপ্শন সুরক্ষিত",
                    "১০০% রিফান্ড গ্যারান্টি",
                    "কোনো লুকানো খরচ নেই"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-islamic-green rounded-full"></div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Student Testimonials */}
            <Card className="bg-white shadow-lg">
              <CardContent className="p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Star className="w-5 h-5 text-islamic-gold mr-2" />
                  শিক্ষার্থীদের মতামত
                </h4>
                <div className="space-y-4">
                  <div className="border-l-4 border-islamic-green pl-4">
                    <p className="text-sm text-gray-600 italic">
                      "আলহামদুলিল্লাহ, এই কোর্সের মাধ্যমে আমি কুরআন পড়তে এবং মৌলিক আরবি বুঝতে পারি।"
                    </p>
                    <p className="text-xs text-gray-500 mt-2">- ফাতিমা খাতুন, ঢাকা</p>
                  </div>
                  <div className="border-l-4 border-sage-green pl-4">
                    <p className="text-sm text-gray-600 italic">
                      "মাত্র ৬০০ টাকায় এত ভালো কোর্স পেয়ে আমি অবাক!"
                    </p>
                    <p className="text-xs text-gray-500 mt-2">- আব্দুর রহমান, চট্টগ্রাম</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
