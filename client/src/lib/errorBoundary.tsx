// Enterprise Error Boundary for Arabic Learning Platform
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { securityManager } from './security';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Application Error Boundary Caught:', error, errorInfo);
    
    // Security: Log error without exposing sensitive information
    securityManager.logSecurityEvent('application_error', {
      error: error.message,
      componentStack: errorInfo.componentStack?.split('\n').slice(0, 5).join('\n'), // Limit stack trace
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    // Clear error state and reload
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Attempt to clear any corrupt state
    try {
      localStorage.removeItem('sb-auth-token');
    } catch (e) {
      console.warn('Could not clear auth token:', e);
    }
    
    window.location.reload();
  };

  handleGoHome = () => {
    // Clear error state and navigate home
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl text-red-700 font-bengali">
                কিছু ভুল হয়েছে
              </CardTitle>
              <p className="text-gray-600 font-bengali mt-2">
                আমাদের সিস্টেমে একটি অপ্রত্যাশিত ত্রুটি ঘটেছে
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error Details (only in development) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="bg-red-100 border border-red-300 rounded p-3">
                  <p className="text-sm text-red-700 font-mono">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="text-center space-y-3">
                <p className="text-sm text-gray-600 font-bengali">
                  এই সমস্যাটি স্বয়ংক্রিয়ভাবে রিপোর্ট করা হয়েছে। আপনি এই বিকল্পগুলি চেষ্টা করতে পারেন:
                </p>

                <div className="space-y-2">
                  <Button 
                    onClick={this.handleReload}
                    className="w-full font-bengali"
                    variant="default"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    পৃষ্ঠা পুনরায় লোড করুন
                  </Button>

                  <Button 
                    onClick={this.handleGoHome}
                    className="w-full font-bengali"
                    variant="outline"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    হোম পেজে যান
                  </Button>
                </div>

                <p className="text-xs text-gray-500 font-bengali mt-4">
                  যদি সমস্যা অব্যাহত থাকে, দয়া করে সহায়তার জন্য যোগাযোগ করুন।
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;