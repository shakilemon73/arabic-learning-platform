import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";

export default function SupabaseLogin() {
  const { signIn, signUp } = useSupabaseAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Determine default tab based on current route
  const defaultTab = location === '/register' ? 'signup' : 'signin';
  
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
    
    if (!signInData.email || !signInData.password) {
      toast({
        title: "ত্রুটি",
        description: "ইমেইল এবং পাসওয়ার্ড প্রয়োজন",
        variant: "destructive",
      });
      return;
    }

    const result = await signIn(signInData.email, signInData.password);
    
    if (result.success) {
      toast({
        title: "সফল!",
        description: "আপনি সফলভাবে লগইন করেছেন",
      });
      // Redirect to dashboard immediately after successful login
      window.location.href = "/dashboard";
    } else {
      toast({
        title: "লগইন ব্যর্থ",
        description: result.error || "অজানা ত্রুটি হয়েছে",
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signUpData.email || !signUpData.password || !signUpData.firstName) {
      toast({
        title: "ত্রুটি",
        description: "সব ক্ষেত্র পূরণ করুন",
        variant: "destructive",
      });
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast({
        title: "ত্রুটি",
        description: "পাসওয়ার্ড মিলছে না",
        variant: "destructive",
      });
      return;
    }

    if (signUpData.password.length < 6) {
      toast({
        title: "ত্রুটি",
        description: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে",
        variant: "destructive",
      });
      return;
    }

    const result = await signUp(signUpData.email, signUpData.password, {
      first_name: signUpData.firstName,
      last_name: signUpData.lastName
    });
    
    if (result.success) {
      toast({
        title: "সফল!",
        description: "আপনার ইমেইল চেক করুন এবং একাউন্ট যাচাই করুন",
      });
    } else {
      toast({
        title: "রেজিস্ট্রেশন ব্যর্থ",
        description: result.error || "অজানা ত্রুটি হয়েছে",
        variant: "destructive",
      });
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
                  >
                    লগইন
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
                  >
                    নিবন্ধন করুন
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