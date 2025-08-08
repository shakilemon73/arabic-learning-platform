// Direct Supabase Authentication
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sgyanvjlwlrzcrpjwlsd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNneWFudmpsd2xyemNycGp3bHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTg1MjAsImV4cCI6MjA3MDEzNDUyMH0.5xjMdSUdeHGln68tfuw626q4xDZkuR8Xg_e_w6g9iJk';

console.log('🔑 Using Supabase credentials:', { url: supabaseUrl, hasKey: !!supabaseAnonKey });

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple auth state
let currentUser: any = null;
let authListeners: Array<(user: any) => void> = [];

// Initialize auth state
supabase.auth.getSession().then(({ data: { session } }) => {
  currentUser = session?.user || null;
  console.log('🔐 Initial auth state:', currentUser ? 'Authenticated' : 'Not authenticated');
  notifyListeners();
});

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('🔄 Auth state changed:', event, session?.user ? 'User present' : 'No user');
  currentUser = session?.user || null;
  notifyListeners();
});

function notifyListeners() {
  authListeners.forEach(listener => listener(currentUser));
}

export function onAuthChange(callback: (user: any) => void) {
  authListeners.push(callback);
  // Immediately call with current user
  callback(currentUser);
  
  // Return unsubscribe function
  return () => {
    authListeners = authListeners.filter(listener => listener !== callback);
  };
}

export function getCurrentUser() {
  return currentUser;
}

export async function signIn(email: string, password: string) {
  console.log('🔐 Direct authentication attempt for:', email);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Sign in failed:', error.message);
    return { success: false, error: error.message };
  }

  if (data.user && data.session) {
    console.log('✅ Sign in successful!');
    currentUser = data.user;
    notifyListeners();
    return { success: true, user: data.user };
  }

  return { success: false, error: 'Authentication failed' };
}

export async function signUp(email: string, password: string, metadata?: any) {
  console.log('📝 Direct Supabase sign up attempt...');
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata || {}
    }
  });

  if (error) {
    console.error('❌ Sign up failed:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user };
}

export async function signOut() {
  console.log('👋 Signing out...');
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('❌ Sign out failed:', error.message);
    return { success: false, error: error.message };
  }

  currentUser = null;
  notifyListeners();
  return { success: true };
}