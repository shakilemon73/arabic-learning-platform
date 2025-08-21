/**
 * Production Video Authentication API - Enterprise authentication
 * Secure authentication and authorization for video conferencing
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'moderator' | 'user';
  permissions: {
    canCreateRooms: boolean;
    canJoinRooms: boolean;
    canRecord: boolean;
    canModerate: boolean;
    maxParticipants: number;
    maxRoomDuration: number; // in minutes
    allowedFeatures: string[];
  };
  subscription: {
    type: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'expired' | 'suspended';
    expiresAt?: Date;
  };
  preferences: {
    defaultVideoQuality: 'low' | 'medium' | 'high' | 'ultra';
    enableNotifications: boolean;
    theme: 'light' | 'dark';
    language: string;
  };
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  organization?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface PasswordResetRequest {
  email: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  preferences?: Partial<AuthUser['preferences']>;
}

export class VideoAuthAPI {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Login user with email and password
   */
  async login(request: LoginRequest): Promise<AuthSession> {
    try {
      console.log('🔐 Attempting login for:', request.email);

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: request.email,
        password: request.password
      });

      if (error) {
        throw new Error(`Login failed: ${error.message}`);
      }

      if (!data.user || !data.session) {
        throw new Error('Invalid login response');
      }

      // Get user profile and permissions
      const userProfile = await this.getUserProfile(data.user.id);
      
      // Update last login time
      await this.updateLastLogin(data.user.id);

      const authSession: AuthSession = {
        user: userProfile,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at! * 1000)
      };

      console.log('✅ Login successful for:', request.email);
      return authSession;

    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(request: RegisterRequest): Promise<AuthSession> {
    try {
      console.log('📝 Registering new user:', request.email);

      // Validate registration request
      this.validateRegistrationRequest(request);

      const { data, error } = await this.supabase.auth.signUp({
        email: request.email,
        password: request.password,
        options: {
          data: {
            display_name: request.displayName,
            organization: request.organization
          }
        }
      });

      if (error) {
        throw new Error(`Registration failed: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('Registration failed - no user created');
      }

      // Create user profile
      await this.createUserProfile(data.user.id, request);

      // If session is available (email confirmation not required)
      if (data.session) {
        const userProfile = await this.getUserProfile(data.user.id);
        
        const authSession: AuthSession = {
          user: userProfile,
          token: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: new Date(data.session.expires_at! * 1000)
        };

        console.log('✅ Registration successful for:', request.email);
        return authSession;
      }

      throw new Error('Please check your email for confirmation link');

    } catch (error) {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      }

      console.log('👋 User logged out successfully');

    } catch (error) {
      console.error('❌ Logout failed:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();

      if (error || !user) {
        return null;
      }

      return await this.getUserProfile(user.id);

    } catch (error) {
      console.error('❌ Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Refresh authentication session
   */
  async refreshSession(): Promise<AuthSession> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();

      if (error || !data.session || !data.user) {
        throw new Error('Session refresh failed');
      }

      const userProfile = await this.getUserProfile(data.user.id);

      return {
        user: userProfile,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at! * 1000)
      };

    } catch (error) {
      console.error('❌ Session refresh failed:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(request: PasswordResetRequest): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(request.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw new Error(`Password reset failed: ${error.message}`);
      }

      console.log('✅ Password reset email sent to:', request.email);

    } catch (error) {
      console.error('❌ Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw new Error(`Password update failed: ${error.message}`);
      }

      console.log('✅ Password updated successfully');

    } catch (error) {
      console.error('❌ Password update failed:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(request: UpdateProfileRequest): Promise<AuthUser> {
    try {
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (request.displayName) {
        updateData.display_name = request.displayName;
      }

      if (request.preferences) {
        const currentProfile = await this.getUserProfile(user.id);
        updateData.preferences = JSON.stringify({
          ...currentProfile.preferences,
          ...request.preferences
        });
      }

      const { error } = await this.supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Profile update failed: ${error.message}`);
      }

      console.log('✅ Profile updated successfully');
      return await this.getUserProfile(user.id);

    } catch (error) {
      console.error('❌ Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Check user permissions for specific action
   */
  async checkPermission(userId: string, permission: string): Promise<boolean> {
    try {
      const userProfile = await this.getUserProfile(userId);
      
      switch (permission) {
        case 'create_room':
          return userProfile.permissions.canCreateRooms;
        case 'join_room':
          return userProfile.permissions.canJoinRooms;
        case 'record':
          return userProfile.permissions.canRecord;
        case 'moderate':
          return userProfile.permissions.canModerate;
        default:
          return userProfile.permissions.allowedFeatures.includes(permission);
      }

    } catch (error) {
      console.error('❌ Permission check failed:', error);
      return false;
    }
  }

  /**
   * Get user subscription info
   */
  async getSubscriptionInfo(userId: string): Promise<AuthUser['subscription']> {
    try {
      const userProfile = await this.getUserProfile(userId);
      return userProfile.subscription;

    } catch (error) {
      console.error('❌ Failed to get subscription info:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getUserProfile(userId: string): Promise<AuthUser> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Create default profile if doesn't exist
      return await this.createDefaultProfile(userId);
    }

    return this.mapDatabaseToUser(data);
  }

  private async createUserProfile(userId: string, request: RegisterRequest): Promise<void> {
    const profileData = {
      user_id: userId,
      email: request.email,
      display_name: request.displayName,
      role: 'user',
      permissions: JSON.stringify(this.getDefaultPermissions()),
      subscription: JSON.stringify(this.getDefaultSubscription()),
      preferences: JSON.stringify(this.getDefaultPreferences()),
      organization: request.organization,
      created_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('user_profiles')
      .insert(profileData);

    if (error) {
      throw new Error(`Failed to create user profile: ${error.message}`);
    }
  }

  private async createDefaultProfile(userId: string): Promise<AuthUser> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Cannot create profile for unauthenticated user');
    }

    const profileData = {
      user_id: userId,
      email: user.email!,
      display_name: user.user_metadata?.display_name || user.email!.split('@')[0],
      role: 'user',
      permissions: JSON.stringify(this.getDefaultPermissions()),
      subscription: JSON.stringify(this.getDefaultSubscription()),
      preferences: JSON.stringify(this.getDefaultPreferences()),
      created_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create default profile: ${error.message}`);
    }

    return this.mapDatabaseToUser(data);
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await this.supabase
      .from('user_profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('user_id', userId);
  }

  private validateRegistrationRequest(request: RegisterRequest): void {
    if (!request.email || !request.email.includes('@')) {
      throw new Error('Valid email address is required');
    }

    if (!request.password || request.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!request.displayName || request.displayName.trim().length === 0) {
      throw new Error('Display name is required');
    }
  }

  private mapDatabaseToUser(data: any): AuthUser {
    return {
      id: data.user_id,
      email: data.email,
      displayName: data.display_name,
      role: data.role,
      permissions: data.permissions ? JSON.parse(data.permissions) : this.getDefaultPermissions(),
      subscription: data.subscription ? JSON.parse(data.subscription) : this.getDefaultSubscription(),
      preferences: data.preferences ? JSON.parse(data.preferences) : this.getDefaultPreferences(),
      createdAt: new Date(data.created_at),
      lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : undefined
    };
  }

  private getDefaultPermissions(): AuthUser['permissions'] {
    return {
      canCreateRooms: true,
      canJoinRooms: true,
      canRecord: false,
      canModerate: false,
      maxParticipants: 10,
      maxRoomDuration: 60, // 1 hour
      allowedFeatures: ['chat', 'reactions', 'screen_share']
    };
  }

  private getDefaultSubscription(): AuthUser['subscription'] {
    return {
      type: 'free',
      status: 'active'
    };
  }

  private getDefaultPreferences(): AuthUser['preferences'] {
    return {
      defaultVideoQuality: 'medium',
      enableNotifications: true,
      theme: 'light',
      language: 'en'
    };
  }
}