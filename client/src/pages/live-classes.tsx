/**
 * Live Classes Page - Production Ready Multi-User Video Conferencing
 * Complete live class management system with role-based access
 */

import React from 'react';
import { Header } from '@/components/Header';
import { LiveClassManager } from '@/components/LiveClassManager';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

export default function LiveClassesPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to auth if not logged in
  if (!loading && !user) {
    setLocation('/');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <LiveClassManager />
    </div>
  );
}