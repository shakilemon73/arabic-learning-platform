import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SupabaseLogin from "@/components/SupabaseLogin";
import { Star, BookOpen, Video, Award, Users, Clock, Shield, CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Landing() {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return <SupabaseLogin />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-islamic-green via-sage-green to-dark-green text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><pattern id='islamic-pattern' x='0' y='0' width='20' height='20' patternUnits='userSpaceOnUse'><circle cx='10' cy='10' r='2' fill='white'/></pattern></defs><rect fill='url(%23islamic-pattern)' width='100' height='100'/></svg>")`
        }}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Islamic Greeting */}
            <div className="mb-6">
              <p className="text-islamic-gold font-medium text-lg">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p>
              <p className="text-sm mt-2 opacity-90">আল্লাহর নামে শুরু করছি, যিনি পরম করুণাময়, অসীম দয়ালু</p>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              <span className="text-islamic-gold">আরবি ভাষা</span> শিখুন<br/>
              <span className="text-2xl md:text-4xl lg:text-5xl">ঘরে বসে অনলাইনে</span>
            </h1>

            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-95 leading-relaxed">
              কুরআন ও হাদিস বুঝার জন্য আরবি ভাষা শিখুন। অভিজ্ঞ উস্তাদগণের সাথে লাইভ ক্লাসে অংশগ্রহণ করুন এবং সহজ পদ্ধতিতে আরবি ভাষায় দক্ষতা অর্জন করুন।
            </p>

            {/* Key Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 max-w-3xl mx-auto">
              <div className="flex items-center justify-center space-x-3 bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                <BookOpen className="w-6 h-6 text-islamic-gold" />
                <span className="font-medium">কুরআন ভিত্তিক</span>
              </div>
              <div className="flex items-center justify-center space-x-3 bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                <Video className="w-6 h-6 text-islamic-gold" />
                <span className="font-medium">লাইভ ক্লাস</span>
              </div>
              <div className="flex items-center justify-center space-x-3 bg-white bg-opacity-10 rounded-xl p-4 backdrop-blur-sm">
                <Award className="w-6 h-6 text-islamic-gold" />
                <span className="font-medium">সার্টিফিকেট</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="w-full sm:w-auto px-8 py-4 bg-islamic-gold text-dark-green font-bold rounded-xl hover:bg-yellow-400 transform hover:scale-105 transition-all duration-300 shadow-lg"
                onClick={() => setShowLogin(true)}
              >
                <span className="text-lg">লগইন করুন</span>
                <span className="block text-sm opacity-80">Live Class Experience</span>
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="w-full sm:w-auto px-8 py-4 border-2 border-white text-white font-medium rounded-xl hover:bg-white hover:text-islamic-green transition-all duration-300"
                onClick={() => setShowLogin(true)}
              >
                নিবন্ধন করুন
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-sm opacity-90">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-islamic-gold fill-current" />
                <span>৫০০+ সন্তুষ্ট শিক্ষার্থী</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-islamic-gold" />
                <span>২৪/৭ সাপোর্ট</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-islamic-gold" />
                <span>১০০% নিরাপদ পেমেন্ট</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Features */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">কেন আমাদের কোর্স বেছে নেবেন?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">আমাদের আধুনিক ও ইসলামী পদ্ধতিতে আরবি ভাষা শিখুন</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <BookOpen className="w-7 h-7 text-white" />,
                title: "কুরআন ভিত্তিক শিক্ষা",
                description: "পবিত্র কুরআনের আয়াত ও হাদিসের মাধ্যমে আরবি ভাষার ব্যাকরণ ও শব্দভান্ডার শিখুন।"
              },
              {
                icon: <Video className="w-7 h-7 text-white" />,
                title: "লাইভ ইন্টারেক্টিভ ক্লাস",
                description: "রিয়েল টাইমে উস্তাদের সাথে কথা বলুন এবং তৎক্ষণাত আপনার সন্দেহ দূর করুন।"
              },
              {
                icon: <Users className="w-7 h-7 text-white" />,
                title: "সাশ্রয়ী মূল্য",
                description: "মাত্র ৬০০ টাকায় সম্পূর্ণ কোর্সে অ্যাক্সেস পান। কোনো লুকানো খরচ নেই।"
              },
              {
                icon: <Clock className="w-7 h-7 text-white" />,
                title: "মোবাইল ফ্রেন্ডলি",
                description: "যেকোনো স্মার্টফোন থেকে সহজেই ক্লাসে অংশগ্রহণ করুন। ইন্টারনেট থাকলেই হবে।"
              },
              {
                icon: <Award className="w-7 h-7 text-white" />,
                title: "যোগ্য উস্তাদগণ",
                description: "আল-আজহার বিশ্ববিদ্যালয় এবং মদীনা বিশ্ববিদ্যালয়ের গ্র্যাজুয়েট উস্তাদগণ।"
              },
              {
                icon: <CheckCircle className="w-7 h-7 text-white" />,
                title: "সার্টিফিকেট",
                description: "কোর্স সম্পন্ন করলে পাবেন সার্টিফিকেট যা আপনার জীবনবৃত্তান্তে যুক্ত করতে পারবেন।"
              }
            ].map((feature, index) => (
              <Card key={index} className="group bg-soft-mint rounded-2xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-100">
                <CardContent className="p-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-islamic-green to-sage-green rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Course Curriculum */}
      <section className="py-16 md:py-20 bg-soft-mint">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">কোর্স কারিকুলাম</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">ধাপে ধাপে আরবি ভাষা শিখুন</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Level */}
            <Card className="bg-white rounded-2xl p-6 md:p-8 shadow-lg">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Badge variant="secondary" className="w-8 h-8 bg-islamic-green text-white rounded-full flex items-center justify-center text-sm mr-3">১</Badge>
                  প্রাথমিক স্তর
                </h3>
                
                <div className="space-y-4">
                  {[
                    { title: "আরবি বর্ণমালা পরিচিতি", desc: "২৮টি আরবি বর্ণ এবং তাদের উচ্চারণ" },
                    { title: "হরকত ও তানভীন", desc: "ফাতহা, কাসরা, দাম্মা এবং তানভীনের নিয়ম" },
                    { title: "শব্দ গঠন", desc: "সহজ শব্দ পড়া এবং লেখা" },
                    { title: "দৈনন্দিন শব্দভান্ডার", desc: "১০০টি মৌলিক আরবি শব্দ" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 bg-soft-mint rounded-xl">
                      <div className="w-2 h-2 bg-islamic-green rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Intermediate Level */}
            <Card className="bg-white rounded-2xl p-6 md:p-8 shadow-lg">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <Badge variant="secondary" className="w-8 h-8 bg-sage-green text-white rounded-full flex items-center justify-center text-sm mr-3">২</Badge>
                  মধ্যম স্তর
                </h3>
                
                <div className="space-y-4">
                  {[
                    { title: "ব্যাকরণের মূলনীতি", desc: "নাহু ও ছরফের প্রাথমিক ধারণা" },
                    { title: "কুরআনের সহজ আয়াত", desc: "ছোট সূরা এবং দোয়া পড়া ও বোঝা" },
                    { title: "কথোপকথন অনুশীলন", desc: "সহজ আরবি কথোপকথনের অনুশীলন" },
                    { title: "হাদিসের বুনিয়াদী শব্দ", desc: "হাদিস বোঝার জন্য গুরুত্বপূর্ণ শব্দসমূহ" }
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-3 p-4 bg-soft-mint rounded-xl">
                      <div className="w-2 h-2 bg-sage-green rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-medium text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Course Statistics */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "৬ মাস", label: "কোর্সের মেয়াদ" },
              { value: "৪৮টি", label: "লাইভ ক্লাস" },
              { value: "৫০০+", label: "শিক্ষার্থী" },
              { value: "৬০০৳", label: "কোর্স ফী" }
            ].map((stat, index) => (
              <Card key={index} className="bg-white rounded-xl p-6 text-center shadow-lg">
                <CardContent className="p-0">
                  <div className="text-3xl font-bold text-islamic-green mb-2">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Registration CTA */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">আজই শুরু করুন আপনার আরবি ভাষার যাত্রা</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            মাত্র ৬০০ টাকায় সম্পূর্ণ কোর্সে অ্যাক্সেস পান এবং কুরআন ও হাদিস বুঝার দক্ষতা অর্জন করুন।
          </p>
          <Button 
            size="lg" 
            className="px-8 py-4 bg-islamic-green text-white font-semibold text-lg rounded-xl hover:bg-dark-green transition-all duration-300 shadow-lg"
            onClick={() => setShowLogin(true)}
          >
            এখনই নিবন্ধন করুন
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
