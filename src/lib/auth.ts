/**
 * Authentication utilities and functions
 * Handles user authentication, role management, and session management
 */

import { supabase } from './supabase';
import { User, SignUpData, SignInData, UserRole, ClearCauseError, ApiResponse } from './types';
import { logAuditEvent } from '../services/adminService';

/**
 * Sign up a new user with role assignment
 */
export const signUp = async (userData: SignUpData): Promise<ApiResponse<User>> => {
  try {
    const { email, password, fullName, role } = userData;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (authError) {
      throw new ClearCauseError('SIGNUP_FAILED', authError.message, 400);
    }

    if (!authData.user) {
      throw new ClearCauseError('SIGNUP_FAILED', 'User creation failed', 400);
    }

    // Create profile in database
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
        is_verified: false,
      })
      .select()
      .single();

    if (profileError) {
      // Cleanup auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new ClearCauseError('PROFILE_CREATION_FAILED', profileError.message, 400);
    }

    // Log audit event
    await logAuditEvent(authData.user.id, 'USER_SIGNUP', 'user', authData.user.id, {
      email,
      role,
    });

    return {
      success: true,
      data: {
        id: profileData.id,
        email: profileData.email,
        fullName: profileData.full_name,
        avatarUrl: profileData.avatar_url,
        role: profileData.role,
        isVerified: profileData.is_verified,
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
      },
      message: 'User created successfully. Please check your email for verification.',
    };
  } catch (error) {
    console.error('Sign up error:', error);
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'An unexpected error occurred during sign up' };
  }
};

/**
 * Sign in user with email and password
 */
export const signIn = async (credentials: SignInData): Promise<ApiResponse<User>> => {
  try {
    const { email, password, rememberMe } = credentials;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw new ClearCauseError('SIGNIN_FAILED', authError.message, 401);
    }

    if (!authData.user) {
      throw new ClearCauseError('SIGNIN_FAILED', 'Authentication failed', 401);
    }

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      throw new ClearCauseError('PROFILE_NOT_FOUND', 'User profile not found', 404);
    }

    // Update session persistence based on rememberMe
    if (rememberMe === false) {
      // Set session to expire when browser closes
      await supabase.auth.updateUser({
        data: { session_timeout: 'session' }
      });
    }

    // Log audit event
    await logAuditEvent(authData.user.id, 'USER_SIGNIN', 'user', authData.user.id, {
      email,
      remember_me: rememberMe,
    });

    return {
      success: true,
      data: {
        id: profileData.id,
        email: profileData.email,
        fullName: profileData.full_name,
        avatarUrl: profileData.avatar_url,
        role: profileData.role,
        isVerified: profileData.is_verified,
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
      },
      message: 'Signed in successfully',
    };
  } catch (error) {
    console.error('Sign in error:', error);
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'An unexpected error occurred during sign in' };
  }
};

/**
 * Sign out current user
 */
export const signOut = async (): Promise<ApiResponse<void>> => {
  try {
    const currentUser = await getCurrentUser();
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw new ClearCauseError('SIGNOUT_FAILED', error.message, 400);
    }

    // Log audit event if user was found
    if (currentUser) {
      await logAuditEvent(currentUser.id, 'USER_SIGNOUT', 'user', currentUser.id);
    }

    return {
      success: true,
      message: 'Signed out successfully',
    };
  } catch (error) {
    console.error('Sign out error:', error);
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'An unexpected error occurred during sign out' };
  }
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      return null;
    }

    return {
      id: profileData.id,
      email: profileData.email,
      fullName: profileData.full_name,
      avatarUrl: profileData.avatar_url,
      role: profileData.role,
      isVerified: profileData.is_verified,
      createdAt: profileData.created_at,
      updatedAt: profileData.updated_at,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
};

/**
 * Reset password
 */
export const resetPassword = async (email: string): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new ClearCauseError('PASSWORD_RESET_FAILED', error.message, 400);
    }

    return {
      success: true,
      message: 'Password reset email sent successfully',
    };
  } catch (error) {
    console.error('Password reset error:', error);
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Update password
 */
export const updatePassword = async (newPassword: string): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new ClearCauseError('PASSWORD_UPDATE_FAILED', error.message, 400);
    }

    const currentUser = await getCurrentUser();
    if (currentUser) {
      await logAuditEvent(currentUser.id, 'PASSWORD_UPDATE', 'user', currentUser.id);
    }

    return {
      success: true,
      message: 'Password updated successfully',
    };
  } catch (error) {
    console.error('Password update error:', error);
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Verify email
 */
export const verifyEmail = async (): Promise<ApiResponse<void>> => {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      throw new ClearCauseError('USER_NOT_FOUND', 'User not authenticated', 401);
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: currentUser.email,
    });

    if (error) {
      throw new ClearCauseError('EMAIL_VERIFICATION_FAILED', error.message, 400);
    }

    return {
      success: true,
      message: 'Verification email sent successfully',
    };
  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (updates: {
  fullName?: string;
  avatarUrl?: string;
}): Promise<ApiResponse<User>> => {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      throw new ClearCauseError('USER_NOT_FOUND', 'User not authenticated', 401);
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.fullName,
        avatar_url: updates.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentUser.id)
      .select()
      .single();

    if (error) {
      throw new ClearCauseError('PROFILE_UPDATE_FAILED', error.message, 400);
    }

    // Log audit event
    await logAuditEvent(currentUser.id, 'PROFILE_UPDATE', 'user', currentUser.id, updates);

    return {
      success: true,
      data: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        role: data.role,
        isVerified: data.is_verified,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      message: 'Profile updated successfully',
    };
  } catch (error) {
    console.error('Profile update error:', error);
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Check if user has required role
 */
export const hasRole = (user: User | null, requiredRole: UserRole): boolean => {
  if (!user) return false;
  
  // Admin has access to everything
  if (user.role === 'admin') return true;
  
  return user.role === requiredRole;
};

/**
 * Check if user has any of the required roles
 */
export const hasAnyRole = (user: User | null, requiredRoles: UserRole[]): boolean => {
  if (!user) return false;
  
  // Admin has access to everything
  if (user.role === 'admin') return true;
  
  return requiredRoles.includes(user.role);
};

/**
 * Check if user is verified
 */
export const isUserVerified = (user: User | null): boolean => {
  return user?.isVerified ?? false;
};

/**
 * Get user role display name
 */
export const getRoleDisplayName = (role: UserRole): string => {
  const roleNames = {
    admin: 'Administrator',
    charity: 'Charity Organization',
    donor: 'Donor',
  };
  
  return roleNames[role] || role;
};

/**
 * Social login with Google
 */
export const signInWithGoogle = async (): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw new ClearCauseError('SOCIAL_LOGIN_FAILED', error.message, 400);
    }

    return {
      success: true,
      message: 'Redirecting to Google...',
    };
  } catch (error) {
    console.error('Google sign in error:', error);
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Handle OAuth callback and create profile if needed
 */
export const handleOAuthCallback = async (): Promise<ApiResponse<User>> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new ClearCauseError('OAUTH_CALLBACK_FAILED', 'Authentication failed', 401);
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      return {
        success: true,
        data: {
          id: existingProfile.id,
          email: existingProfile.email,
          fullName: existingProfile.full_name,
          avatarUrl: existingProfile.avatar_url,
          role: existingProfile.role,
          isVerified: existingProfile.is_verified,
          createdAt: existingProfile.created_at,
          updatedAt: existingProfile.updated_at,
        },
        message: 'Signed in successfully',
      };
    }

    // Create new profile for OAuth user
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: 'donor', // Default role for OAuth users
        is_verified: user.email_confirmed_at ? true : false,
      })
      .select()
      .single();

    if (profileError) {
      throw new ClearCauseError('PROFILE_CREATION_FAILED', profileError.message, 400);
    }

    // Log audit event
    await logAuditEvent(user.id, 'OAUTH_SIGNUP', 'user', user.id, {
      provider: user.app_metadata?.provider,
      email: user.email,
    });

    return {
      success: true,
      data: {
        id: newProfile.id,
        email: newProfile.email,
        fullName: newProfile.full_name,
        avatarUrl: newProfile.avatar_url,
        role: newProfile.role,
        isVerified: newProfile.is_verified,
        createdAt: newProfile.created_at,
        updatedAt: newProfile.updated_at,
      },
      message: 'Account created and signed in successfully',
    };
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'An unexpected error occurred' };
  }
};
