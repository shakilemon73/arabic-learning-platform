import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'wouter';
import Header from '@/components/Header';

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { signIn, resetPassword, loading } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'ইমেইল প্রয়োজন';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'বৈধ ইমেইল প্রবেশ করান';
    }
    
    if (!formData.password) {
      newErrors.password = 'পাসওয়ার্ড প্রয়োজন';
    } else if (formData.password.length < 6) {
      newErrors.password = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting || loading) return;
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (!error) {
        // Clear form data and reset state
        setFormData({ email: '', password: '' });
        setErrors({});
        // Successful login - redirect to dashboard
        setLocation('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail.trim()) {
      setErrors({ resetEmail: 'ইমেইল প্রয়োজন' });
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(resetEmail)) {
      setErrors({ resetEmail: 'বৈধ ইমেইল প্রবেশ করান' });
      return;
    }
    
    setIsResettingPassword(true);
    setErrors({});
    
    try {
      const { error } = await resetPassword(resetEmail);
      
      if (!error) {
        setShowResetForm(false);
        setResetEmail('');
      }
    } catch (error) {
      console.error('Password reset error:', error);
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-green via-sage-green to-dark-green">
      <Header />
      
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          
          {/* Back to home link */}
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" className="text-white hover:text-islamic-gold">
                <ArrowLeft className="w-4 h-4 mr-2" />
                হোম পেজে ফিরে যান
              </Button>
            </Link>
          </div>

          <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center space-y-4">
              <CardTitle className="text-2xl font-bold text-islamic-green">
                {showResetForm ? 'পাসওয়ার্ড রিসেট' : 'লগইন করুন'}
              </CardTitle>
              <CardDescription className="text-base">
                {showResetForm 
                  ? 'আপনার ইমেইল দিন, আমরা পাসওয়ার্ড রিসেট লিঙ্ক পাঠাবো'
                  : 'আপনার আরবি শেখার যাত্রা অব্যাহত রাখুন'
                }
              </CardDescription>
              
              {/* Islamic greeting */}
              <div className="pt-2">
                <p className="text-islamic-gold font-medium">بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ</p>
                <p className="text-sm text-muted-foreground mt-1">
                  আল্লাহর নামে শুরু করছি
                </p>
              </div>
            </CardHeader>

            <CardContent>
              {showResetForm ? (
                // Password Reset Form
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-right">ইমেইল</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="আপনার ইমেইল প্রবেশ করান"
                        value={resetEmail}
                        onChange={(e) => {
                          setResetEmail(e.target.value);
                          if (errors.resetEmail) {
                            setErrors(prev => ({ ...prev, resetEmail: '' }));
                          }
                        }}
                        className={`pl-10 ${errors.resetEmail ? 'border-destructive' : ''}`}
                        disabled={isResettingPassword}
                      />
                    </div>
                    {errors.resetEmail && (
                      <p className="text-sm text-destructive">{errors.resetEmail}</p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <Button 
                      type="submit" 
                      className="w-full bg-islamic-green hover:bg-dark-green"
                      disabled={isResettingPassword}
                    >
                      {isResettingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      রিসেট লিঙ্ক পাঠান
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setShowResetForm(false);
                        setResetEmail('');
                        setErrors({});
                      }}
                      disabled={isResettingPassword}
                    >
                      বাতিল করুন
                    </Button>
                  </div>
                </form>
              ) : (
                // Login Form
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-right">ইমেইল</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="আপনার ইমেইল প্রবেশ করান"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                        disabled={isSubmitting || loading}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-right">পাসওয়ার্ড</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="আপনার পাসওয়ার্ড প্রবেশ করান"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                        disabled={isSubmitting || loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isSubmitting || loading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-islamic-green hover:text-dark-green"
                      onClick={() => {
                        setShowResetForm(true);
                        setErrors({});
                      }}
                      disabled={isSubmitting || loading}
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-islamic-green hover:bg-dark-green"
                    disabled={isSubmitting || loading}
                  >
                    {(isSubmitting || loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    লগইন করুন
                  </Button>
                </form>
              )}
            </CardContent>

            {!showResetForm && (
              <CardFooter className="flex flex-col space-y-4">
                <Separator />
                <p className="text-center text-sm text-muted-foreground">
                  কোন একাউন্ট নেই?{' '}
                  <Link href="/register">
                    <Button variant="link" className="p-0 h-auto text-islamic-green hover:text-dark-green">
                      নিবন্ধন করুন
                    </Button>
                  </Link>
                </p>
              </CardFooter>
            )}
          </Card>

          {/* Additional info */}
          <div className="mt-6 text-center">
            <p className="text-white/80 text-sm">
              নিরাপদ ও সুরক্ষিত লগইন সিস্টেম
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}