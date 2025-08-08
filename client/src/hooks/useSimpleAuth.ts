import { useState, useEffect } from 'react';
import { getCurrentUser, onAuthChange, signIn as authSignIn, signUp as authSignUp, signOut as authSignOut } from '../lib/auth';

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
    setLoading(true);
    const result = await authSignIn(email, password);
    setLoading(false);
    return result;
  };

  const signUp = async (email: string, password: string, metadata?: any) => {
    setLoading(true);
    const result = await authSignUp(email, password, metadata);
    setLoading(false);
    return result;
  };

  const signOut = async () => {
    setLoading(true);
    const result = await authSignOut();
    setLoading(false);
    return result;
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