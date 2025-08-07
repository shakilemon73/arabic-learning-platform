import { useState, useEffect } from 'react';
import { supabase, getCurrentUser, signIn as supabaseSignIn, signUp as supabaseSignUp, signOut as supabaseSignOut, getUserProfile } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User as DBUser } from '@/lib/types';

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session and user profile
    const getInitialSession = async () => {
      console.log('🔍 Starting authentication check...');
      
      try {
        console.log('📡 Calling getCurrentUser...');
        const { user: currentUser, error: userError } = await getCurrentUser();
        console.log('👤 User result:', currentUser ? 'User found' : 'No user', userError);
        
        if (userError) {
          console.error('❌ User fetch error:', userError);
        }
        
        setUser(currentUser);
        
        if (currentUser) {
          console.log('👤 User found, fetching profile for ID:', currentUser.id);
          try {
            const { data: profile, error: profileError } = await getUserProfile(currentUser.id);
            console.log('📋 Profile result:', profile ? 'Profile found' : 'No profile', profileError);
            
            if (profileError) {
              console.error('❌ Profile fetch error:', profileError);
              // Don't fail the whole auth flow just because profile fetch failed
            }
            
            setUserProfile(profile);
          } catch (profileErr) {
            console.error('💥 Profile fetch exception:', profileErr);
            // Continue without profile data
          }
        } else {
          console.log('👤 No user found - showing public content');
        }
      } catch (err) {
        console.error('💥 Critical error during auth check:', err);
        setError('Failed to get user session');
      } finally {
        console.log('✅ Auth check complete');
      }
    };

    getInitialSession();

    // Listen for auth changes
    console.log('🔄 Setting up auth state listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user ? 'User present' : 'No user');
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in, ensuring profile...');
          // Create or update user profile when signing in
          await ensureUserProfile(session.user);
          const { data: profile } = await getUserProfile(session.user.id);
          setUserProfile(profile);
          
          // Clear any existing error when user successfully signs in
          setError(null);
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setUserProfile(null);
          setError(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const ensureUserProfile = async (authUser: SupabaseUser) => {
    console.log('🔧 Ensuring user profile for:', authUser.id);
    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      console.log('👤 Profile check result:', existingProfile ? 'Profile exists' : 'No profile', fetchError);
      console.log('🔍 Full error details:', fetchError);
      
      if (existingProfile) {
        console.log('🎓 User enrollment status:', existingProfile.enrollment_status);
        console.log('💳 User payment status:', existingProfile.payment_status);
        setUserProfile(existingProfile);
        return;
      }

      if (fetchError && (fetchError.code === 'PGRST116' || fetchError.code === 'PGRST205' || fetchError.code === 'PGRST301')) {
        console.log('🆕 Creating new user profile...');
        // User doesn't exist, create profile
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email || '',
            first_name: authUser.user_metadata?.first_name || authUser.user_metadata?.name || '',
            last_name: authUser.user_metadata?.last_name || '',
            profile_image_url: authUser.user_metadata?.avatar_url || null,
            enrollment_status: 'pending',
            payment_status: 'unpaid',
            course_progress: 0,
            classes_attended: 0,
            certificate_score: 0
          });

        if (insertError) {
          console.error('❌ Error creating user profile:', insertError);
          console.error('🔍 Full insert error details:', insertError);
          // If table doesn't exist, just continue without profile
          if (insertError.code === 'PGRST205' || insertError.message?.includes('relation') || insertError.message?.includes('does not exist')) {
            console.log('📋 Database tables not found - please run database setup');
            setError('Database not properly configured. Please contact support.');
            return;
          }
        } else {
          console.log('✅ User profile created successfully');
        }
      } else if (fetchError) {
        console.error('❌ Error fetching user profile:', fetchError);
        console.error('🔍 Full fetch error details:', fetchError);
        // If table doesn't exist or RLS prevents access, just continue without profile  
        if (fetchError.code === 'PGRST205' || fetchError.code === 'PGRST301' || fetchError.message?.includes('relation') || fetchError.message?.includes('does not exist') || fetchError.message?.includes('RLS')) {
          console.log('📋 Database access issue - continuing without profile for now');
          // Don't set error here, just continue
          return;
        }
      }
    } catch (err) {
      console.error('💥 Exception in ensureUserProfile:', err);
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    
    try {
      const { data, error } = await supabaseSignIn(email, password);
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const signUp = async (email: string, password: string, metadata?: { first_name?: string; last_name?: string }) => {
    setError(null);
    
    try {
      const { data, error } = await supabaseSignUp(email, password, metadata);
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabaseSignOut();
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    userProfile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  };
};