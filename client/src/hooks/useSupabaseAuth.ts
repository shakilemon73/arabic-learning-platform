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
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      if (!mounted) return;
      
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (mounted) {
          setUser(currentUser);
          if (currentUser) {
            await loadUserProfile(currentUser.id);
          }
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user.id);
          setError(null);
        } else if (event === 'SIGNED_OUT') {
          setUserProfile(null);
          setError(null);
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