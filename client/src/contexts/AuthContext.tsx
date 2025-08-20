import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// Enhanced user profile interface
interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  enrollment_status: 'pending' | 'active' | 'suspended' | 'completed';
  payment_status: 'pending' | 'paid' | 'overdue' | 'refunded';
  course_progress: number;
  classes_attended: number;
  certificate_score: number;
  role: 'student' | 'instructor' | 'admin';
  created_at: string;
  updated_at: string;
}

// Authentication state interface
interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

// Authentication actions interface
interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
}

// Complete auth context interface
interface AuthContextType extends AuthState, AuthActions {}

// Create context with undefined default
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Main AuthProvider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  });
  
  const { toast } = useToast();

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('🔍 Fetching user profile for:', userId);
      
      // Try user_profiles table first
      let { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // If user_profiles table doesn't exist, try users table
      if (error && error.code === '42P01') {
        console.log('🔄 Trying users table instead...');
        const result = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('⚠️ Error fetching user profile:', error);
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116') {
          return await createUserProfile(userId);
        }
        // Return default profile to allow user to continue
        return await createDefaultProfile(userId);
      }

      console.log('✅ User profile fetched successfully');
      return data as UserProfile;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      // Return default profile to allow user to continue
      return await createDefaultProfile(userId);
    }
  };

  // Create default user profile in memory (fallback)
  const createDefaultProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      
      if (!user) return null;

      console.log('📋 Creating default profile for user to continue...');
      
      // Return in-memory profile that allows user to continue
      const defaultProfile: UserProfile = {
        id: userId,
        email: user.email!,
        first_name: user.user_metadata?.first_name || user.email?.split('@')[0] || 'User',
        last_name: user.user_metadata?.last_name || '',
        phone: user.phone || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        enrollment_status: 'pending' as const,
        payment_status: 'pending' as const,
        course_progress: 0,
        classes_attended: 0,
        certificate_score: 0,
        role: 'student' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return defaultProfile;
    } catch (error) {
      console.error('❌ Error creating default profile:', error);
      return null;
    }
  };
  
  // Create user profile in database
  const createUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      
      if (!user) return null;

      const newProfile = {
        id: userId,
        email: user.email!,
        first_name: user.user_metadata?.first_name || null,
        last_name: user.user_metadata?.last_name || null,
        phone: user.phone || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        enrollment_status: 'pending' as const,
        payment_status: 'pending' as const,
        course_progress: 0,
        classes_attended: 0,
        certificate_score: 0,
        role: 'student' as const,
      };

      // Try user_profiles table first
      let { data, error } = await supabase
        .from('user_profiles')
        .insert([newProfile])
        .select()
        .single();
        
      // If table doesn't exist, try users table
      if (error && error.code === '42P01') {
        const result = await supabase
          .from('users')
          .insert([newProfile])
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('⚠️ Error creating user profile in database:', error);
        // Return default profile to allow user to continue
        return await createDefaultProfile(userId);
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
  };

  // Update auth state
  const updateAuthState = async (user: User | null, session: Session | null) => {
    try {
      if (user) {
        console.log('🔄 Auth state changed:', 'SIGNED_IN', 'User present');
        const profile = await fetchUserProfile(user.id);
        setState(prev => ({
          ...prev,
          user,
          profile,
          session,
          loading: false,
          error: null,
        }));
      } else {
        console.log('🔄 Auth state changed:', 'SIGNED_OUT', 'No user');
        // Ensure complete cleanup on sign out
        setState(prev => ({
          ...prev,
          user: null,
          profile: null,
          session: null,
          loading: false,
          error: null,
        }));
      }
    } catch (error) {
      console.error('Error updating auth state:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as AuthError,
      }));
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setState(prev => ({ ...prev, loading: false, error }));
        toast({
          title: "সাইন ইন ত্রুটি",
          description: error.message === 'Invalid login credentials' 
            ? "ভুল ইমেইল বা পাসওয়ার্ড" 
            : error.message,
          variant: "destructive",
        });
        return { error };
      }

      // Auth state will be updated by the listener
      toast({
        title: "সফলভাবে লগইন হয়েছে",
        description: "আপনার ড্যাশবোর্ডে স্বাগতম",
      });

      return { error: null };
    } catch (err) {
      const authError = err as AuthError;
      setState(prev => ({ ...prev, loading: false, error: authError }));
      return { error: authError };
    }
  };

  // Sign up function
  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: metadata || {},
      },
    });

    if (error) {
      setState(prev => ({ ...prev, loading: false, error }));
      toast({
        title: "সাইন আপ ত্রুটি",
        description: error.message === 'User already registered' 
          ? "এই ইমেইল দিয়ে ইতিমধ্যে একাউন্ট রয়েছে" 
          : error.message,
        variant: "destructive",
      });
      return { error };
    }

    setState(prev => ({ ...prev, loading: false }));
    
    if (data.user && !data.session) {
      toast({
        title: "ইমেইল যাচাই করুন",
        description: "আপনার ইমেইলে একটি যাচাইকরণ লিঙ্ক পাঠানো হয়েছে",
      });
    } else {
      toast({
        title: "সফলভাবে নিবন্ধন হয়েছে",
        description: "আপনার আরবি শেখার যাত্রা শুরু করুন",
      });
    }

    return { error: null };
  };

  // Sign out function
  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        setState(prev => ({ ...prev, loading: false, error }));
        toast({
          title: "লগআউট ত্রুটি",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      // Force complete state cleanup after successful signOut
      setState({
        user: null,
        profile: null,
        session: null,
        loading: false,
        error: null
      });
      
      // Also clear localStorage to prevent stale auth data
      try {
        localStorage.removeItem('sb-auth-token');
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.warn('Error clearing auth storage:', storageError);
      }
      
      toast({
        title: "সফলভাবে লগআউট হয়েছে",
        description: "আবার দেখা হবে!",
      });

      return { error: null };
    } catch (err) {
      const authError = err as AuthError;
      setState(prev => ({ ...prev, loading: false, error: authError }));
      return { error: authError };
    }
  };

  // Reset password function
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) {
      toast({
        title: "পাসওয়ার্ড রিসেট ত্রুটি",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "পাসওয়ার্ড রিসেট ইমেইল পাঠানো হয়েছে",
      description: "আপনার ইমেইল চেক করুন",
    });

    return { error: null };
  };

  // Update profile function
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!state.user) {
      return { error: new Error('No authenticated user') as AuthError };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', state.user.id);

      if (error) {
        toast({
          title: "প্রোফাইল আপডেট ত্রুটি",
          description: error.message,
          variant: "destructive",
        });
        return { error: error as unknown as AuthError };
      }

      // Refresh profile data
      await refreshProfile();
      
      toast({
        title: "প্রোফাইল আপডেট হয়েছে",
        description: "আপনার তথ্য সফলভাবে সংরক্ষিত হয়েছে",
      });

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  // Refresh profile function
  const refreshProfile = async () => {
    if (state.user) {
      const profile = await fetchUserProfile(state.user.id);
      setState(prev => ({ ...prev, profile }));
    }
  };

  // Initialize auth state and set up listener
  useEffect(() => {
    console.log('🔐 Initializing authentication system...');
    
    let retryCount = 0;
    const maxRetries = 3;
    
    // Get initial session with retry mechanism for SPA reliability
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          
          // Retry session recovery for SPA
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 Retrying session recovery (${retryCount}/${maxRetries})...`);
            setTimeout(initializeAuth, 1000 * retryCount);
            return;
          }
          
          setState(prev => ({ ...prev, loading: false, error }));
          return;
        }

        if (session?.user) {
          console.log('🔐 Initial auth state:', 'Authenticated');
          await updateAuthState(session.user, session);
        } else {
          console.log('🔐 Initial auth state:', 'Not authenticated');
          setState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        
        // Retry on network/connection issues common in SPAs
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`🔄 Retrying due to network error (${retryCount}/${maxRetries})...`);
          setTimeout(initializeAuth, 1000 * retryCount);
          return;
        }
        
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error as AuthError 
        }));
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth hook received user change:', session?.user ? 'User present' : 'No user');
        console.log('🔄 Auth event:', event);
        
        // Handle different auth events with proper cleanup
        if (event === 'SIGNED_OUT') {
          console.log('🚪 User signed out - clearing all state');
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
          });
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await updateAuthState(session?.user || null, session);
        } else if (event === 'INITIAL_SESSION') {
          // Handle initial session without causing loading state issues
          if (session?.user) {
            await updateAuthState(session.user, session);
          } else {
            setState(prev => ({
              ...prev,
              user: null,
              profile: null,
              session: null,
              loading: false,
              error: null,
            }));
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Context value with all state and actions
  const contextValue: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export type { UserProfile, AuthState, AuthActions };