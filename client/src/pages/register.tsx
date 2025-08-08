import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';
import Header from '@/components/Header';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { signUp, loading } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'নাম প্রয়োজন';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = 'নাম কমপক্ষে ২ অক্ষরের হতে হবে';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'ইমেইল প্রয়োজন';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'বৈধ ইমেইল প্রবেশ করান';
    }
    
    if (formData.phone && !/^(\+8801|01)[3-9]\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'বৈধ বাংলাদেশী মোবাইল নম্বর প্রবেশ করান';
    }
    
    if (!formData.password) {
      newErrors.password = 'পাসওয়ার্ড প্রয়োজন';
    } else if (formData.password.length < 8) {
      newErrors.password = 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'পাসওয়ার্ডে ছোট হাতের, বড় হাতের অক্ষর এবং সংখ্যা থাকতে হবে';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'পাসওয়ার্ড নিশ্চিতকরণ প্রয়োজন';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'পাসওয়ার্ড মিলছে না';
    }
    
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'নিয়ম ও শর্তাবলী মেনে নিতে হবে';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await signUp(
        formData.email,
        formData.password,
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
        }
      );
      
      if (!error) {
        setRegistrationSuccess(true);
        // Auto redirect to login after 3 seconds
        setTimeout(() => {
          setLocation('/login');
        }, 3000);
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success message
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-islamic-green via-sage-green to-dark-green flex items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-islamic-green" />
            </div>
            <CardTitle className="text-2xl font-bold text-islamic-green">
              সফলভাবে নিবন্ধন হয়েছে!
            </CardTitle>
            <CardDescription className="text-base">
              আপনার ইমেইল যাচাই করুন এবং লগইন করুন
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              আমরা আপনার ইমেইলে একটি যাচাইকরণ লিঙ্ক পাঠিয়েছি। 
              লিঙ্কে ক্লিক করে আপনার একাউন্ট সক্রিয় করুন।
            </p>
            <div className="bg-islamic-green/10 p-4 rounded-lg">
              <p className="text-sm text-islamic-green font-medium">
                ৩ সেকেন্ডে লগইন পেজে নিয়ে যাওয়া হবে...
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full bg-islamic-green hover:bg-dark-green">
                এখনি লগইন করুন
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-islamic-green via-sage-green to-dark-green">
      <Header />
      
      <div className="flex items-center justify-center px-4 py-8">
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
                নিবন্ধন করুন
              </CardTitle>
              <CardDescription className="text-base">
                আরবি ভাষা শেখার যাত্রা শুরু করুন
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
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">নাম *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="নাম"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className={`pl-10 ${errors.firstName ? 'border-destructive' : ''}`}
                        disabled={isSubmitting || loading}
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-xs text-destructive">{errors.firstName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">পদবি</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="পদবি (ঐচ্ছিক)"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      disabled={isSubmitting || loading}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">ইমেইল *</Label>
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

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">মোবাইল নম্বর</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="01XXXXXXXXX (ঐচ্ছিক)"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`pl-10 ${errors.phone ? 'border-destructive' : ''}`}
                      disabled={isSubmitting || loading}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">পাসওয়ার্ড *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="কমপক্ষে ৮ অক্ষর"
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

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="পাসওয়ার্ড পুনরায় প্রবেশ করান"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                      disabled={isSubmitting || loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isSubmitting || loading}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                {/* Terms checkbox */}
                <div className="space-y-2">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => handleInputChange('agreeToTerms', !!checked)}
                      disabled={isSubmitting || loading}
                    />
                    <Label 
                      htmlFor="agreeToTerms" 
                      className="text-sm leading-relaxed cursor-pointer"
                    >
                      আমি{' '}
                      <Link href="/terms" className="text-islamic-green hover:underline">
                        নিয়ম ও শর্তাবলী
                      </Link>
                      {' '}এবং{' '}
                      <Link href="/privacy" className="text-islamic-green hover:underline">
                        গোপনীয়তা নীতি
                      </Link>
                      {' '}মেনে নিই
                    </Label>
                  </div>
                  {errors.agreeToTerms && (
                    <p className="text-sm text-destructive">{errors.agreeToTerms}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-islamic-green hover:bg-dark-green"
                  disabled={isSubmitting || loading}
                >
                  {(isSubmitting || loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  নিবন্ধন করুন
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Separator />
              <p className="text-center text-sm text-muted-foreground">
                ইতিমধ্যে একাউন্ট আছে?{' '}
                <Link href="/login">
                  <Button variant="link" className="p-0 h-auto text-islamic-green hover:text-dark-green">
                    লগইন করুন
                  </Button>
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* Additional info */}
          <div className="mt-6 text-center">
            <p className="text-white/80 text-sm">
              নিরাপদ ও সুরক্ষিত নিবন্ধন সিস্টেম
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}