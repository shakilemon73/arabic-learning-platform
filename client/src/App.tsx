import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import CourseRegistration from "@/pages/course-registration";
import LiveClass from "@/pages/live-class";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Profile from "@/pages/profile";

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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
