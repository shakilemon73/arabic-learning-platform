import { useState, useEffect } from 'react';
import { supabase, getCurrentUser, signIn as supabaseSignIn, signUp as supabaseSignUp, signOut as supabaseSignOut, getUserProfile } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User as DBUser } from '@/lib/types';

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session and user profile
    const getInitialSession = async () => {
      try {
        const { user: currentUser } = await getCurrentUser();
        setUser(currentUser);
        
        if (currentUser) {
          const { data: profile } = await getUserProfile(currentUser.id);
          setUserProfile(profile);
        }
      } catch (err) {
        console.error('Error getting user:', err);
        setError('Failed to get user session');
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN' && session?.user) {
          // Create or update user profile when signing in
          await ensureUserProfile(session.user);
          const { data: profile } = await getUserProfile(session.user.id);
          setUserProfile(profile);
        } else if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const ensureUserProfile = async (authUser: SupabaseUser) => {
    try {
      const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // User doesn't exist, create profile
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            first_name: authUser.user_metadata?.first_name || '',
            last_name: authUser.user_metadata?.last_name || '',
            profile_image_url: authUser.user_metadata?.avatar_url || null,
            enrollment_status: 'pending',
            payment_status: 'unpaid',
            course_progress: 0,
            classes_attended: 0,
            certificate_score: 0
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        }
      }
    } catch (err) {
      console.error('Error ensuring user profile:', err);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: { first_name?: string; last_name?: string }) => {
    setLoading(true);
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
    } finally {
      setLoading(false);
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