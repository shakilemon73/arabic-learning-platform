import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function TestLogin() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleTestLogin = () => {
    if (!email || !password) {
      toast({
        title: "ত্রুটি",
        description: "ইমেইল এবং পাসওয়ার্ড প্রয়োজন",
        variant: "destructive",
      });
      return;
    }

    // Set a fake user session in localStorage
    const fakeUser = {
      id: "test-user-123",
      email: email,
      user_metadata: {
        first_name: "টেস্ট ব্যবহারকারী"
      }
    };

    localStorage.setItem("fake-user", JSON.stringify(fakeUser));
    
    toast({
      title: "সফল!",
      description: "টেস্ট লগইন সফল হয়েছে",
    });

    // Navigate to test dashboard immediately
    window.location.href = "/test-dashboard";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle className="text-center text-islamic-green">দ্রুত টেস্ট লগইন</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">ইমেইল</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="123456"
            />
          </div>
          <Button 
            onClick={handleTestLogin}
            className="w-full bg-islamic-green hover:bg-islamic-green/90"
          >
            টেস্ট লগইন (যেকোনো ইমেইল/পাস দিন)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}