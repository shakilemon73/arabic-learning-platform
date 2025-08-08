import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

let currentUser: any = null;
let authListeners: Array<(user: any) => void> = [];

// Initialize auth state once
const initializeAuth = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    console.log('🔐 Initial auth state:', currentUser ? 'Authenticated' : 'Not authenticated');
    notifyListeners();
  } catch (error) {
    console.error('❌ Auth initialization error:', error);
    notifyListeners();
  }
};

// Listen for auth changes once
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔄 Auth state changed:', event, session?.user ? 'User present' : 'No user');
  currentUser = session?.user || null;
  notifyListeners();
});

function notifyListeners() {
  authListeners.forEach(listener => listener(currentUser));
}

function onAuthChange(callback: (user: any) => void) {
  authListeners.push(callback);
  // Immediately call with current user
  callback(currentUser);
  
  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter(listener => listener !== callback);
  };
}

function getCurrentUser() {
  return currentUser;
}

// Initialize once
if (typeof window !== 'undefined') {
  initializeAuth();
}

export function useSimpleAuth() {
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(!getCurrentUser());

  useEffect(() => {
    const unsubscribe = onAuthChange((newUser) => {
      console.log('🔄 Auth hook received user change:', newUser ? 'User present' : 'No user');
      setUser(newUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('🔐 Attempting login...');
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in failed:', error.message);
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        console.log('✅ Sign in successful!');
        // Don't set loading to false here - let the auth state change handle it
        return { success: true, user: data.user };
      }

      setLoading(false);
      return { success: false, error: 'Unknown error occurred' };
    } catch (err) {
      console.error('💥 Sign in exception:', err);
      setLoading(false);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    console.log('📝 Attempting signup...');
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });

      if (error) {
        console.error('❌ Sign up failed:', error.message);
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('✅ Sign up successful!');
        setLoading(false);
        return { success: true, user: data.user };
      }

      setLoading(false);
      return { success: false, error: 'Unknown error occurred' };
    } catch (err) {
      console.error('💥 Sign up exception:', err);
      setLoading(false);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const signOut = async () => {
    console.log('🚪 Attempting signout...');
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ Sign out failed:', error.message);
        setLoading(false);
        return { success: false, error: error.message };
      }

      console.log('✅ Sign out successful!');
      // Don't set loading to false here - let the auth state change handle it
      return { success: true };
    } catch (err) {
      console.error('💥 Sign out exception:', err);
      setLoading(false);
      return { success: false, error: 'Network error occurred' };
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user
  };
}