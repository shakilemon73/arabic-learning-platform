import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { createCourseLead } from '@/lib/supabase';
import { 
  CheckCircle, 
  Star, 
  Users, 
  Clock, 
  Award, 
  BookOpen, 
  Phone, 
  Mail, 
  User,
  Loader2,
  Heart,
  Target,
  Gift
} from 'lucide-react';

// Lead form validation schema
const leadFormSchema = z.object({
  firstName: z.string().min(2, "নাম কমপক্ষে ২টি অক্ষর হতে হবে"),
  lastName: z.string().optional(),
  email: z.string().email("বৈধ ইমেইল ঠিকানা প্রয়োজন"),
  phone: z.string().min(11, "বৈধ মোবাইল নম্বর প্রয়োজন").optional().or(z.literal("")),
  arabicExperience: z.string().min(1, "আরবি ভাষার অভিজ্ঞতা নির্বাচন করুন"),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

export default function CourseInterestPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [utmParams, setUtmParams] = useState<Record<string, string>>({});

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      arabicExperience: "",
    },
  });

  // Extract UTM parameters from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utmData: Record<string, string> = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(param => {
      const value = params.get(param);
      if (value) utmData[param] = value;
    });
    
    setUtmParams(utmData);
  }, []);

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    
    try {
      const leadData = {
        first_name: data.firstName,
        last_name: data.lastName || "",
        email: data.email,
        phone: data.phone || "",
        arabic_experience: data.arabicExperience,
        source: 'facebook',
        interest_level: 'high',
        utm_campaign: utmParams.utm_campaign,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
      };

      const { error } = await createCourseLead(leadData);
      
      if (error) {
        throw error;
      }

      setIsSubmitted(true);
      
      toast({
        title: "আগ্রহ নিবন্ধন সফল!",
        description: "আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।",
      });

    } catch (error) {
      console.error('Lead submission error:', error);
      toast({
        title: "একটি ত্রুটি ঘটেছে",
        description: "অনুগ্রহ করে পরে আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success page after form submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-islamic-green via-sage-green to-dark-green flex items-center justify-center px-4">
        <Card className="w-full max-w-2xl shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-6 pb-6">
            <div className="flex justify-center">
              <div className="relative">
                <CheckCircle className="h-20 w-20 text-islamic-green" />
                <Heart className="h-8 w-8 text-islamic-gold absolute -top-2 -right-2 animate-pulse" />
              </div>
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-islamic-green mb-3">
                ধন্যবাদ! আপনার আগ্রহ পেয়েছি
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                আমরা ২৪ ঘন্টার মধ্যে আপনার সাথে যোগাযোগ করব
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6 text-center">
            <div className="bg-islamic-green/10 p-6 rounded-lg">
              <h3 className="font-bold text-islamic-green mb-3">পরবর্তী ধাপ:</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>📞 আমাদের কোর্স কনসালট্যান্ট আপনাকে কল করবেন</li>
                <li>📋 কোর্সের বিস্তারিত তথ্য শেয়ার করব</li>
                <li>🎯 আপনার লক্ষ্য অনুযায়ী পরিকল্পনা তৈরি করব</li>
                <li>🎉 সবচেয়ে ভালো অফার দেওয়ার চেষ্টা করব</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-sage-green/20 p-4 rounded-lg">
                <Target className="h-8 w-8 text-islamic-green mx-auto mb-2" />
                <p className="text-sm font-medium">৯৮% সন্তুষ্ট শিক্ষার্থী</p>
              </div>
              <div className="bg-islamic-gold/20 p-4 rounded-lg">
                <Gift className="h-8 w-8 text-islamic-green mx-auto mb-2" />
                <p className="text-sm font-medium">বিশেষ ছাড় অপেক্ষা করছে</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-green via-sage-green to-dark-green">
      {/* Hero Section */}
      <div className="px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <Badge className="bg-islamic-gold text-dark-green font-bold px-4 py-2 text-sm">
                🔥 সীমিত সময়ের অফার
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              কুরআন ও হাদিস বুঝতে 
              <span className="text-islamic-gold block">আরবি শিখুন</span>
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              মাত্র ৬ মাসে কুরআন পড়তে ও মৌলিক আরবি বুঝতে পারবেন। 
              বাংলাদেশের <span className="font-bold text-islamic-gold">সেরা আরবি কোর্স</span>।
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Lead Form */}
            <div className="lg:order-2">
              <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-islamic-green">
                    ফ্রি কনসালটেশনের জন্য নিবন্ধন করুন
                  </CardTitle>
                  <CardDescription className="text-base">
                    কোর্স সম্পর্কে জানতে এবং বিশেষ ছাড় পেতে তথ্য দিন
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      
                      {/* Name Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>নাম *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="আপনার নাম" className="pl-10" {...field} />
                                </div>
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
                              <FormLabel>পদবি</FormLabel>
                              <FormControl>
                                <Input placeholder="পদবি (ঐচ্ছিক)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Email */}
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ইমেইল ঠিকানা *</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input type="email" placeholder="example@gmail.com" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Phone */}
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>মোবাইল নম্বর</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="০১৭xxxxxxxx (ঐচ্ছিক)" className="pl-10" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Arabic Experience */}
                      <FormField
                        control={form.control}
                        name="arabicExperience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>আরবি ভাষার অভিজ্ঞতা *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="নির্বাচন করুন" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="beginner">নতুন শিক্ষার্থী (কোনো অভিজ্ঞতা নেই)</SelectItem>
                                <SelectItem value="basic">প্রাথমিক জ্ঞান আছে (কুরআন পড়তে পারি)</SelectItem>
                                <SelectItem value="intermediate">মধ্যম জ্ঞান আছে (কিছু বুঝতে পারি)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-islamic-green hover:bg-dark-green text-white py-4 rounded-lg font-bold text-lg transition-all duration-300 transform hover:scale-105"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            নিবন্ধন হচ্ছে...
                          </>
                        ) : (
                          <>
                            <Gift className="mr-2 h-5 w-5" />
                            ফ্রি কনসালটেশন বুক করুন
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Benefits Section */}
            <div className="lg:order-1 space-y-6">
              
              {/* Course Package */}
              <Card className="bg-white/95 backdrop-blur-sm border-2 border-islamic-gold">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="flex justify-center items-center space-x-2 mb-3">
                      <span className="text-3xl font-bold text-islamic-green">৬০০ টাকা</span>
                      <span className="text-lg text-gray-500 line-through">১২০০ টাকা</span>
                    </div>
                    <Badge className="bg-red-500 text-white font-bold">৫০% ছাড়!</Badge>
                    <p className="text-sm text-gray-600 mt-2">সীমিত সময়ের অফার</p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { icon: <Clock className="w-5 h-5" />, text: "৬ মাসের সম্পূর্ণ কোর্স" },
                      { icon: <Users className="w-5 h-5" />, text: "সপ্তাহে ২টি লাইভ ক্লাস" },
                      { icon: <BookOpen className="w-5 h-5" />, text: "রেকর্ডেড ক্লাস অ্যাক্সেস" },
                      { icon: <Award className="w-5 h-5" />, text: "সার্টিফিকেট সহ" },
                      { icon: <CheckCircle className="w-5 h-5" />, text: "১০০% মানি ব্যাক গ্যারান্টি" }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="text-islamic-green flex-shrink-0">
                          {item.icon}
                        </div>
                        <span className="font-medium">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Student Success */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                    <Star className="w-5 h-5 text-islamic-gold mr-2" />
                    শিক্ষার্থীদের সফলতার গল্প
                  </h3>
                  <div className="space-y-4">
                    <div className="border-l-4 border-islamic-green pl-4">
                      <p className="text-sm text-gray-600 italic">
                        "আলহামদুলিল্লাহ! এই কোর্সের পর আমি কুরআনের অর্থ বুঝতে পারি। 
                        নামাযেও এখন মনোযোগ বেশি।"
                      </p>
                      <p className="text-xs text-gray-500 mt-2">- সাকিব হাসান, ঢাকা ⭐⭐⭐⭐⭐</p>
                    </div>
                    <div className="border-l-4 border-sage-green pl-4">
                      <p className="text-sm text-gray-600 italic">
                        "শিক্ষকরা খুবই ভালো। ক্লাসগুলো এত সহজভাবে করান যে কঠিন মনে হয় না।"
                      </p>
                      <p className="text-xs text-gray-500 mt-2">- আয়েশা খাতুন, চট্টগ্রাম ⭐⭐⭐⭐⭐</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Why Choose Us */}
              <Card className="bg-white/95 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4">কেন আমাদের কোর্স বেছে নেবেন?</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      "অভিজ্ঞ শিক্ষকমণ্ডলী",
                      "সাশ্রয়ী মূল্য",
                      "ব্যবহারিক পদ্ধতি",
                      "লাইভ সাপোর্ট",
                      "ধাপে ধাপে শেখা",
                      "ইসলামিক পরিবেশ"
                    ].map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-islamic-green flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}