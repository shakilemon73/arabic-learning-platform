import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Loader2 } from "lucide-react";

export default function SupabaseLogin() {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Determine default tab based on current route
  const defaultTab = window.location.pathname === '/register' ? 'signup' : 'signin';
  
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  
  const [signInData, setSignInData] = useState({
    email: "",
    password: ""
  });
  
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: ""
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningIn(true);
    
    try {
      console.log("🔐 Starting login process...");
      
      if (!signInData.email || !signInData.password) {
        toast({
          title: "ত্রুটি",
          description: "ইমেইল এবং পাসওয়ার্ড প্রয়োজন",
          variant: "destructive",
        });
        setIsSigningIn(false);
        return;
      }


      
      console.log("📧 Attempting login with email:", signInData.email);
      const result = await signIn(signInData.email, signInData.password);
      console.log("🔐 Login result:", result.success ? "SUCCESS" : "FAILED", result.error || "");
      
      if (result.success) {
        console.log("🎯 Login successful, redirecting immediately...");
        window.location.href = "/dashboard";
      } else {
        const errorMsg = result.error || "অজানা ত্রুটি হয়েছে";
        console.error("❌ Login failed:", errorMsg);
        toast({
          title: "লগইন ব্যর্থ",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("💥 Login exception:", error);
      toast({
        title: "লগইন ত্রুটি",
        description: "সংযোগের সমস্যা। আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningUp(true);
    
    try {
      console.log("📝 Starting signup process...");
      
      if (!signUpData.email || !signUpData.password || !signUpData.firstName) {
        toast({
          title: "ত্রুটি",
          description: "সব ক্ষেত্র পূরণ করুন",
          variant: "destructive",
        });
        setIsSigningUp(false);
        return;
      }

      if (signUpData.password !== signUpData.confirmPassword) {
        toast({
          title: "ত্রুটি",
          description: "পাসওয়ার্ড মিলছে না",
          variant: "destructive",
        });
        setIsSigningUp(false);
        return;
      }

      if (signUpData.password.length < 6) {
        toast({
          title: "ত্রুটি",
          description: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে",
          variant: "destructive",
        });
        setIsSigningUp(false);
        return;
      }

      console.log("📧 Attempting signup with email:", signUpData.email);
      const result = await signUp(signUpData.email, signUpData.password, {
        first_name: signUpData.firstName,
        last_name: signUpData.lastName
      });
      
      console.log("📝 Signup result:", result.success ? "SUCCESS" : "FAILED", result.error || "");
      
      if (result.success) {
        toast({
          title: "সফল!",
          description: "একাউন্ট তৈরি হয়েছে। এখন লগইন করুন।",
        });
        // Clear form and switch to login tab
        setSignUpData({
          email: "",
          password: "",
          confirmPassword: "",
          firstName: "",
          lastName: ""
        });
      } else {
        const errorMsg = result.error || "অজানা ত্রুটি হয়েছে";
        console.error("❌ Signup failed:", errorMsg);
        toast({
          title: "রেজিস্ট্রেশন ব্যর্থ",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("💥 Signup exception:", error);
      toast({
        title: "রেজিস্ট্রেশন ত্রুটি",
        description: "সংযোগের সমস্যা। আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-soft-mint to-sage-green/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <div className="w-20 h-20 bg-gradient-to-br from-islamic-green to-sage-green rounded-2xl flex items-center justify-center mx-auto mb-4 hover:scale-105 transition-transform cursor-pointer">
              <span className="text-white text-3xl font-bold">আরবি</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-islamic-green mb-2">আরবি শিক্ষা</h1>
          <p className="text-gray-600">কুরআন ও হাদিস বোঝার জন্য আরবি শিখুন</p>
          <Link href="/" className="text-sm text-islamic-green hover:underline">
            ← হোমে ফিরে যান
          </Link>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-islamic-green">স্বাগতম</CardTitle>
            <CardDescription className="text-center">
              আপনার একাউন্টে প্রবেশ করুন বা নতুন একাউন্ট তৈরি করুন
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">লগইন</TabsTrigger>
                <TabsTrigger value="signup">নিবন্ধন</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">ইমেইল</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={signInData.email}
                      onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="আপনার ইমেইল"
                      data-testid="input-signin-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">পাসওয়ার্ড</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={signInData.password}
                      onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="আপনার পাসওয়ার্ড"
                      data-testid="input-signin-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-islamic-green hover:bg-islamic-green/90"
                    data-testid="button-signin"
                    disabled={isSigningIn}
                  >
                    {isSigningIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        লগইন করা হচ্ছে...
                      </>
                    ) : (
                      "লগইন"
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstName">নাম</Label>
                      <Input
                        id="signup-firstName"
                        value={signUpData.firstName}
                        onChange={(e) => setSignUpData(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="আপনার নাম"
                        data-testid="input-signup-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastName">পদবি</Label>
                      <Input
                        id="signup-lastName"
                        value={signUpData.lastName}
                        onChange={(e) => setSignUpData(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="পদবি"
                        data-testid="input-signup-lastname"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">ইমেইল</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="আপনার ইমেইল"
                      data-testid="input-signup-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">পাসওয়ার্ড</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)"
                      data-testid="input-signup-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirmPassword">পাসওয়ার্ড নিশ্চিত করুন</Label>
                    <Input
                      id="signup-confirmPassword"
                      type="password"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                      data-testid="input-signup-confirm-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-islamic-green hover:bg-islamic-green/90"
                    data-testid="button-signup"
                    disabled={isSigningUp}
                  >
                    {isSigningUp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        নিবন্ধন করা হচ্ছে...
                      </>
                    ) : (
                      "নিবন্ধন করুন"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            এই প্ল্যাটফর্মটি বাংলাভাষীদের জন্য আরবি শিক্ষার উদ্দেশ্যে তৈরি করা হয়েছে।
          </p>
        </div>
      </div>
    </div>
  );
}