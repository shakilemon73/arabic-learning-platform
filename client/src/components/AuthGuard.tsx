import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireRole?: 'student' | 'instructor' | 'admin';
  redirectTo?: string;
  fallback?: ReactNode;
}

// Loading skeleton for protected routes
function AuthLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-[200px] rounded-lg" />
            <Skeleton className="h-[200px] rounded-lg" />
            <Skeleton className="h-[200px] rounded-lg" />
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-8 w-[300px]" />
            <Skeleton className="h-[400px] rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Unauthorized access component
function UnauthorizedAccess({ requiredRole, userRole }: { requiredRole?: string; userRole?: string }) {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-destructive">অ্যাক্সেস অস্বীকৃত</h2>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {requiredRole 
              ? `এই পেজ অ্যাক্সেস করার জন্য ${requiredRole} রোল প্রয়োজন। আপনার রোল: ${userRole || 'অজানা'}`
              : 'এই পেজ অ্যাক্সেস করার জন্য আপনার অনুমতি নেই।'
            }
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setLocation('/dashboard')} variant="default">
              ড্যাশবোর্ডে ফিরে যান
            </Button>
            <Button onClick={() => setLocation('/')} variant="outline">
              হোম পেজে যান
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Login required component
function LoginRequired() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-islamic-green" />
          </div>
          <h2 className="text-2xl font-bold text-islamic-green">লগইন প্রয়োজন</h2>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            এই পেজ অ্যাক্সেস করার জন্য আপনাকে লগইন করতে হবে।
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setLocation('/login')} variant="default">
              লগইন করুন
            </Button>
            <Button onClick={() => setLocation('/register')} variant="outline">
              নিবন্ধন করুন
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main AuthGuard component
export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  requireRole,
  redirectTo,
  fallback 
}: AuthGuardProps) {
  const { user, profile, loading, error } = useAuth();
  const [, setLocation] = useLocation();
  const [forceNoLoading, setForceNoLoading] = useState(false);

  // Auto-redirect if specified
  useEffect(() => {
    if (!loading && requireAuth && !user && redirectTo) {
      setLocation(redirectTo);
    }
  }, [loading, requireAuth, user, redirectTo, setLocation]);

  // Force stop loading after timeout to prevent infinite loading loops
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (loading) {
      timeoutId = setTimeout(() => {
        console.log('⏰ AuthGuard: Loading timeout reached, forcing resolution');
        setForceNoLoading(true);
      }, 5000); // 5 second timeout
    } else {
      setForceNoLoading(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  console.log('🛡️ AuthGuard check:', {
    user: !!user,
    loading,
    forceNoLoading,
    requireAuth
  });

  // Show loading state (unless forced to stop)
  if (loading && !forceNoLoading) {
    return fallback || <AuthLoadingSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-destructive">অথেনটিকেশন ত্রুটি</h2>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              {error.message || 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।'}
            </p>
            <Button onClick={() => window.location.reload()} variant="default">
              পুনরায় চেষ্টা করুন
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    console.log('🛡️ AuthGuard: Access denied - Login required');
    return fallback || <LoginRequired />;
  }

  // Check role requirement
  if (requireRole && profile && profile.role !== requireRole) {
    console.log('🛡️ AuthGuard: Access denied - Insufficient role');
    return (
      <UnauthorizedAccess 
        requiredRole={requireRole} 
        userRole={profile.role} 
      />
    );
  }

  // Grant access
  console.log('✅ AuthGuard: Access granted');
  return <>{children}</>;
}

// Export types for TypeScript support
export type { AuthGuardProps };