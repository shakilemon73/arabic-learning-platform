import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Award, 
  BookOpen, 
  TrendingUp,
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Header from '@/components/Header';
import { format } from 'date-fns';

export default function ProfilePage() {
  const { user, profile, updateProfile, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
  });

  // Handle form submission
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    try {
      const { error } = await updateProfile(editData);
      if (!error) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Profile update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-islamic-green" />
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              প্রোফাইল লোড করতে সমস্যা হচ্ছে। পুনরায় লগইন করুন।
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'ব্যবহারকারী';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Profile Header */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    {profile.avatar_url && (
                      <AvatarImage src={profile.avatar_url} alt={fullName} />
                    )}
                    <AvatarFallback className="bg-islamic-green text-white text-2xl">
                      {profile.first_name?.charAt(0).toUpperCase() || 'ব'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full p-0"
                    variant="secondary"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground">{fullName}</h1>
                  <p className="text-muted-foreground">{user.email}</p>
                  
                  <div className="flex items-center space-x-2 mt-3">
                    <Badge variant={profile.enrollment_status === 'active' ? 'default' : 'secondary'}>
                      {profile.enrollment_status === 'active' ? 'সক্রিয়' : 
                       profile.enrollment_status === 'pending' ? 'অপেক্ষমাণ' : 
                       profile.enrollment_status === 'completed' ? 'সম্পন্ন' : 'স্থগিত'}
                    </Badge>
                    <Badge variant="outline">
                      {profile.role === 'student' ? 'শিক্ষার্থী' : 
                       profile.role === 'instructor' ? 'প্রশিক্ষক' : 'প্রশাসক'}
                    </Badge>
                    <Badge variant={profile.payment_status === 'paid' ? 'default' : 'destructive'}>
                      {profile.payment_status === 'paid' ? 'পেমেন্ট সম্পন্ন' : 
                       profile.payment_status === 'pending' ? 'পেমেন্ট অপেক্ষমাণ' : 
                       'পেমেন্ট বকেয়া'}
                    </Badge>
                  </div>
                </div>
                
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  variant={isEditing ? 'outline' : 'default'}
                  disabled={isUpdating}
                >
                  {isEditing ? 'বাতিল' : 'প্রোফাইল সম্পাদনা'}
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">ব্যক্তিগত তথ্য</TabsTrigger>
              <TabsTrigger value="progress">অগ্রগতি</TabsTrigger>
              <TabsTrigger value="settings">সেটিংস</TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <CardTitle>ব্যক্তিগত তথ্য</CardTitle>
                  <CardDescription>
                    আপনার ব্যক্তিগত তথ্য দেখুন ও সম্পাদনা করুন
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">নাম *</Label>
                          <Input
                            id="firstName"
                            value={editData.first_name}
                            onChange={(e) => handleInputChange('first_name', e.target.value)}
                            placeholder="আপনার নাম"
                            disabled={isUpdating}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="lastName">পদবি</Label>
                          <Input
                            id="lastName"
                            value={editData.last_name}
                            onChange={(e) => handleInputChange('last_name', e.target.value)}
                            placeholder="আপনার পদবি"
                            disabled={isUpdating}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">মোবাইল নম্বর</Label>
                        <Input
                          id="phone"
                          value={editData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="01XXXXXXXXX"
                          disabled={isUpdating}
                        />
                      </div>

                      <div className="flex space-x-3">
                        <Button type="submit" disabled={isUpdating} className="bg-islamic-green hover:bg-dark-green">
                          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          সংরক্ষণ করুন
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsEditing(false)}
                          disabled={isUpdating}
                        >
                          বাতিল
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center space-x-3">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">পূর্ণ নাম</p>
                            <p className="text-sm text-muted-foreground">{fullName}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">ইমেইল</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Phone className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">মোবাইল নম্বর</p>
                            <p className="text-sm text-muted-foreground">
                              {profile.phone || 'যুক্ত করা হয়নি'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">যোগদানের তারিখ</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(profile.created_at), 'dd MMMM yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="h-5 w-5" />
                      <span>কোর্সের অগ্রগতি</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>সম্পূর্ণতা</span>
                          <span>{profile.course_progress}%</span>
                        </div>
                        <Progress value={profile.course_progress} className="h-2" />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm">ক্লাসে উপস্থিতি</span>
                          <span className="text-sm font-medium">{profile.classes_attended} টি</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm">সার্টিফিকেট স্কোর</span>
                          <span className="text-sm font-medium">{profile.certificate_score}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="h-5 w-5" />
                      <span>অর্জনসমূহ</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {profile.certificate_score >= 80 ? (
                        <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800 dark:text-green-200">উৎকর্ষতার সার্টিফিকেট</p>
                            <p className="text-sm text-green-600 dark:text-green-400">80% এর বেশি স্কোর</p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">এখনো কোন অর্জন নেই</p>
                          <p className="text-sm text-muted-foreground">পড়াশোনা চালিয়ে যান!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>একাউন্ট সেটিংস</CardTitle>
                  <CardDescription>
                    আপনার একাউন্টের নিরাপত্তা ও প্রাইভেসি সেটিংস
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        পাসওয়ার্ড পরিবর্তন ও অন্যান্য নিরাপত্তা সেটিংস শীঘ্রই যুক্ত হবে।
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-4">
                      <h4 className="font-medium">একাউন্ট তথ্য</h4>
                      <div className="space-y-2">
                        <p className="text-sm">একাউন্ট ID: {profile.id}</p>
                        <p className="text-sm">শেষ আপডেট: {format(new Date(profile.updated_at), 'dd MMMM yyyy, HH:mm')}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}