import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SimpleLoginProps {
  onSuccess?: () => void;
}

export default function SimpleLogin({ onSuccess }: SimpleLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email || !password) {
      setError("ইমেইল এবং পাসওয়ার্ড দিন");
      setIsLoading(false);
      return;
    }

    console.log("🔐 Attempting login...");
    
    const result = await signIn(email, password);
    
    if (result.success) {
      console.log("✅ Login successful, redirecting...");
      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = "/dashboard";
      }
    } else {
      setError(result.error || "লগইন ব্যর্থ হয়েছে");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-soft-mint via-white to-cream flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center font-bengali">লগইন করুন</CardTitle>
          <CardDescription className="text-center font-bengali">
            আপনার একাউন্টে প্রবেশ করুন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="font-bengali">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bengali">ইমেইল</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="আপনার ইমেইল"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="font-bengali">পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="আপনার পাসওয়ার্ড"
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full font-bengali" 
              disabled={isLoading}
            >
              {isLoading ? "লগইন হচ্ছে..." : "লগইন করুন"}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm text-muted-foreground font-bengali">
            টেস্ট করার জন্য যেকোনো ইমেইল ও পাসওয়ার্ড দিন
          </div>
        </CardContent>
      </Card>
    </div>
  );
}