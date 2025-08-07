import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { User, BookOpen, GraduationCap } from 'lucide-react';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DemoLoginProps {
  onLoginSuccess: (user: DemoUser) => void;
}

export function DemoLogin({ onLoginSuccess }: DemoLoginProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const demoUsers = [
    { 
      value: 'teacher', 
      label: 'Sarah Ahmed (Teacher)', 
      icon: GraduationCap,
      description: 'Access teacher features like creating sessions and managing students' 
    },
    { 
      value: 'student1', 
      label: 'Ahmad Hassan (Student)', 
      icon: User,
      description: 'Join live classes and submit homework assignments' 
    },
    { 
      value: 'student2', 
      label: 'Fatima Khan (Student)', 
      icon: BookOpen,
      description: 'Participate in Arabic learning sessions' 
    },
  ];

  const handleLogin = async () => {
    if (!selectedUser) {
      toast({
        title: "Selection Required",
        description: "Please select a demo user to continue",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/demo/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userType: selectedUser }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Login Successful",
          description: data.message,
        });
        onLoginSuccess(data.user);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Arabic Learning Platform
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Choose a demo user to explore the live class features
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select Demo User
            </label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a demo user..." />
              </SelectTrigger>
              <SelectContent>
                {demoUsers.map((user) => {
                  const IconComponent = user.icon;
                  return (
                    <SelectItem key={user.value} value={user.value}>
                      <div className="flex items-center space-x-3">
                        <IconComponent className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="font-medium">{user.label}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {user.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleLogin}
            disabled={isLoading || !selectedUser}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3"
          >
            {isLoading ? 'Signing In...' : 'Sign In as Demo User'}
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This is a demo environment for testing the live class platform
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}