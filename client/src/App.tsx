import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import CourseRegistration from "@/pages/course-registration";
import LiveClass from "@/pages/live-class";

function Router() {
  const { user, loading } = useSupabaseAuth();
  const isAuthenticated = !!user;
  const isLoading = loading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-mint">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-islamic-green to-sage-green rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">আ</span>
          </div>
          <div className="animate-spin w-8 h-8 border-4 border-islamic-green border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/live-class" component={LiveClass} />
        </>
      )}
      
      {/* Public routes */}
      <Route path="/course-registration" component={CourseRegistration} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
