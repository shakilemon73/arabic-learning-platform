import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import ErrorBoundary from "@/lib/errorBoundary";
import { securityManager } from "@/lib/security";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import CourseRegistration from "@/pages/course-registration";
import LiveClass from "@/pages/live-class";
import EnterpriseMeet from "@/pages/enterprise-meet";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Profile from "@/pages/profile";

import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected routes */}
      <Route path="/home">
        <AuthGuard>
          <Home />
        </AuthGuard>
      </Route>
      
      <Route path="/dashboard">
        <AuthGuard>
          <Dashboard />
        </AuthGuard>
      </Route>
      
      <Route path="/live-class">
        <AuthGuard>
          <LiveClass />
        </AuthGuard>
      </Route>
      
      <Route path="/enterprise-meet">
        <AuthGuard>
          <EnterpriseMeet />
        </AuthGuard>
      </Route>
      
      <Route path="/course-registration">
        <AuthGuard>
          <CourseRegistration />
        </AuthGuard>
      </Route>
      
      <Route path="/profile">
        <AuthGuard>
          <Profile />
        </AuthGuard>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Security: Validate environment and initialize monitoring
  useEffect(() => {
    const { valid, errors } = securityManager.validateEnvironment();
    if (!valid) {
      console.error('🚨 Environment validation failed:', errors);
      securityManager.logSecurityEvent('environment_validation_failed', { errors });
    } else {
      console.log('✅ Environment validation passed');
    }

    // Initialize performance monitoring
    import('./lib/performanceMonitor').then(({ performanceMonitor }) => {
      performanceMonitor.initialize();
    });

    return () => {
      // Cleanup on unmount
      import('./lib/performanceMonitor').then(({ performanceMonitor }) => {
        performanceMonitor.cleanup();
      });
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
