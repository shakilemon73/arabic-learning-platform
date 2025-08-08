import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User as DBUser } from '@/lib/types';

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<DBUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      setUserProfile(profile);
    } catch (err) {
      // Silently continue without profile
      console.log('Profile load failed:', err);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      if (!mounted) return;
      
      console.log('🔍 Initializing authentication...');
      
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        console.log('👤 Current user:', currentUser ? 'Found' : 'Not found');
        
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            console.log('📋 Loading user profile...');
            await loadUserProfile(currentUser.id);
          }
          console.log('✅ Auth initialization complete, setting loading to false');
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ Auth initialization error:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('⚠️ Auth initialization timeout, forcing loading to false');
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    initAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔄 Auth state change:', event, session?.user ? 'User present' : 'No user');
        
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('✅ User signed in');
          await loadUserProfile(session.user.id);
          setError(null);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setUserProfile(null);
          setError(null);
          setLoading(false);
        }
        
        // Ensure loading is false after any auth state change
        if (mounted) {
          console.log('🔄 Setting loading to false after auth state change');
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {}
        }
      });
      
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      
      // If signup is successful and user is confirmed, create user profile
      if (data.user && !error) {
        try {
          // Create user profile in the database
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              first_name: metadata?.first_name || '',
              last_name: metadata?.last_name || '',
              enrollment_status: 'pending',
              payment_status: 'pending',
              course_progress: 0,
              classes_attended: 0,
              certificate_score: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (profileError) {
            console.warn('Profile creation failed:', profileError);
            // Don't fail the signup just because profile creation failed
          }
        } catch (profileErr) {
          console.warn('Profile creation error:', profileErr);
        }
      }
      
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    setError(null);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  return {
    user,
    userProfile,
    error,
    loading,
    signIn,
    signUp,
    signOut,
  };
};