import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function AuthGuard({ children, requireAuth = false }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  console.log("🛡️ AuthGuard check:", { user: !!user, loading, requireAuth });

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      console.log("🔒 Redirecting to login - no authenticated user");
      setLocation('/login');
    }
  }, [loading, requireAuth, user, setLocation]);

  if (loading) {
    console.log("⏳ AuthGuard: Still loading authentication...");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-96" />
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    console.log("🚫 AuthGuard: No user, blocking access");
    return null; // Will redirect to login
  }

  console.log("✅ AuthGuard: Access granted");
  return <>{children}</>;
}