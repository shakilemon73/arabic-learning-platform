// Enterprise-grade security utilities for Arabic Learning Platform
import { supabase } from './supabase';

export class SecurityManager {
  private static instance: SecurityManager;
  private securityHeaders: Record<string, string> = {};

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  // Input sanitization for XSS prevention
  sanitizeInput(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/[<>'"&]/g, (char) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return entities[char] || char;
      })
      .trim()
      .slice(0, 1000); // Limit input length
  }

  // SQL injection prevention for search queries
  sanitizeSearchQuery(query: string): string {
    if (!query) return '';
    
    // Remove potentially dangerous SQL keywords and characters
    return query
      .replace(/[';\\]/g, '')
      .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b/gi, '')
      .trim()
      .slice(0, 100);
  }

  // Rate limiting implementation
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  checkRateLimit(key: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  // Environment validation
  validateEnvironment(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!import.meta.env.VITE_SUPABASE_URL) {
      errors.push('Missing VITE_SUPABASE_URL environment variable');
    }
    
    if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
      errors.push('Missing VITE_SUPABASE_ANON_KEY environment variable');
    }

    // Validate URL format
    try {
      if (import.meta.env.VITE_SUPABASE_URL) {
        new URL(import.meta.env.VITE_SUPABASE_URL);
      }
    } catch {
      errors.push('Invalid VITE_SUPABASE_URL format');
    }

    return { valid: errors.length === 0, errors };
  }

  // Session validation
  async validateSession(): Promise<{ valid: boolean; user: any | null }> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session validation error:', error);
        return { valid: false, user: null };
      }

      if (!session || !session.user) {
        return { valid: false, user: null };
      }

      // Check if session is expired
      if (session.expires_at && session.expires_at < Math.floor(Date.now() / 1000)) {
        return { valid: false, user: null };
      }

      return { valid: true, user: session.user };
    } catch (error) {
      console.error('Session validation exception:', error);
      return { valid: false, user: null };
    }
  }

  // Content Security Policy headers
  getSecurityHeaders(): Record<string, string> {
    return {
      'Content-Security-Policy': `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        img-src 'self' data: https: blob:;
        media-src 'self' blob:;
        connect-src 'self' https://*.supabase.co wss://*.supabase.co;
        frame-src 'none';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
      `.replace(/\s+/g, ' ').trim(),
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=self, microphone=self, geolocation=(), payment=()'
    };
  }

  // WebRTC security configuration
  getSecureRTCConfiguration(): RTCConfiguration {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: 'all'
    };
  }

  // Audit logging
  logSecurityEvent(event: string, details: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // In production, send to security monitoring service
    console.log('🔒 Security Event:', logEntry);
  }
}

export const securityManager = SecurityManager.getInstance();