/**
 * Authentication utilities and functions
 * Handles user authentication, role management, and session management
 */

import { supabase } from './supabase';
import { User, SignUpData, SignInData, UserRole, ClearCauseError, ApiResponse } from './types';
import { logAuditEvent } from '../services/adminService';
import { reportAuthError, handleAuthError } from '../utils/authErrorHandler';
import { config } from './config';

/**
 * Sign up a new user with role assignment
 */
export const signUp = async (userData: SignUpData): Promise<ApiResponse<User>> => {
  try {
    console.debug('Starting signup process for:', userData.email);
    const { email, password, fullName, role } = userData;

    // Create auth user with retry logic for timeouts
    let authData, authError;
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;
      try {
        console.debug(`Signup attempt ${attempt}/${maxRetries} for:`, email);

        const result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
            emailRedirectTo: import.meta.env.VITE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
          },
        });

        authData = result.data;
        authError = result.error;
        break; // Success, exit retry loop

      } catch (error: any) {
        console.warn(`Signup attempt ${attempt} failed:`, error);

        // If it's a timeout and we have retries left, continue
        if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('signal timed out')) {
          if (attempt < maxRetries) {
            console.debug(`Retrying signup after timeout (attempt ${attempt}/${maxRetries})`);
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }

          // Out of retries, throw timeout error
          throw new ClearCauseError(
            'NETWORK_TIMEOUT',
            'The signup request timed out. Please check your internet connection and try again.',
            408,
            error
          );
        }

        // Non-timeout error, throw immediately
        throw error;
      }
    }

    if (authError) {
      reportAuthError(authError, { context: 'auth_signup', email });

      // Handle timeout specifically
      if (authError.message?.includes('timeout') || authError.message?.includes('signal timed out')) {
        throw new ClearCauseError(
          'NETWORK_TIMEOUT',
          'The signup request timed out. Please check your internet connection and try again.',
          408,
          authError
        );
      }

      // Provide more specific error message for database errors
      if (authError.message?.includes('Database error')) {
        throw new ClearCauseError(
          'DATABASE_ERROR',
          'There was a problem setting up your account. This is likely a temporary issue. Please try again in a few minutes, or contact support if the problem persists.',
          500,
          authError
        );
      }

      throw new ClearCauseError('SIGNUP_FAILED', authError.message, 400);
    }

    if (!authData.user) {
      reportAuthError(new Error('No user data returned from signup'), { context: 'auth_signup_no_user', email });
      throw new ClearCauseError('SIGNUP_FAILED', 'User creation failed', 400);
    }

    console.debug('Auth user created successfully');

    // Try to create profile using the database function first
    try {
      const { data: profileResult, error: profileFunctionError } = await supabase
        .rpc('ensure_user_profile', {
          p_user_id: authData.user.id,
          p_email: email,
          p_full_name: fullName,
          p_role: role
        });

      if (profileFunctionError) {
        console.debug('Profile function failed, trying manual creation...', profileFunctionError);

        // Fallback to manual profile creation
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: email,
            full_name: fullName,
            role: role,
            is_verified: !!authData.user.email_confirmed_at,
            is_active: true
          })
          .select()
          .single();

        if (createError) {
          reportAuthError(createError, { context: 'manual_profile_creation', userId: authData.user.id });

          // Try to clean up auth user if profile creation fails
          try {
            await supabase.auth.signOut();
          } catch (cleanupError) {
            reportAuthError(cleanupError, { context: 'auth_cleanup_after_profile_failure', userId: authData.user.id });
          }

          throw new ClearCauseError(
            'DATABASE_ERROR',
            'Failed to create user profile. Please try again or contact support if the issue persists.',
            500,
            createError
          );
        }

        console.debug('Profile created manually successfully');
      } else {
        console.debug('Profile created via function successfully:', profileResult);
      }
    } catch (error) {
      if (error instanceof ClearCauseError) {
        throw error;
      }

      reportAuthError(error, { context: 'profile_creation_error', userId: authData.user.id });

      // Final fallback - try direct insert
      try {
        const { data: fallbackProfile, error: fallbackError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: email,
            full_name: fullName,
            role: role,
            is_verified: false,
            is_active: true
          })
          .select()
          .single();

        if (fallbackError) {
          throw new ClearCauseError(
            'DATABASE_ERROR',
            'Unable to create user profile. Please contact support.',
            500,
            fallbackError
          );
        }

        console.debug('Profile created via fallback successfully');
      } catch (fallbackError) {
        reportAuthError(fallbackError, { context: 'fallback_profile_creation_error', userId: authData.user.id });
        throw new ClearCauseError(
          'DATABASE_ERROR',
          'Critical error: Unable to create user profile. Please contact support immediately.',
          500,
          fallbackError
        );
      }
    }

    // Log audit event (don't fail signup if this fails)
    logAuditEvent(authData.user.id, 'USER_SIGNUP', 'user', authData.user.id, {
      email,
      role,
    }).catch(auditError => {
      if (import.meta.env.DEV) console.warn('Failed to log audit event for signup:', auditError);
    });

    console.debug('Signup completed successfully for:', email);

    // Return success with auth user data (profile will be available after email verification)
    return {
      success: true,
      data: {
        id: authData.user.id,
        email: authData.user.email || email,
        fullName: fullName,
        avatarUrl: null,
        role: role,
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      message: 'User created successfully. Please check your email for verification.',
    };
  } catch (error) {
    reportAuthError(error, { context: 'signup_general_error', email });
    
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
    console.debug('Attempting sign in for:', credentials.email);
    const { email, password, rememberMe } = credentials;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      reportAuthError(authError, { context: 'auth_signin', email });
      throw new ClearCauseError('SIGNIN_FAILED', authError.message, 401);
    }

    if (!authData.user) {
      reportAuthError(new Error('No user data returned from auth'), { context: 'signin_no_user', email });
      throw new ClearCauseError('SIGNIN_FAILED', 'Authentication failed', 401);
    }

    console.debug('Auth successful, fetching profile for user:', authData.user.id);

    // Get user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      reportAuthError(profileError, { context: 'profile_fetch_signin', userId: authData.user.id });
      throw new ClearCauseError('PROFILE_NOT_FOUND', `User profile not found: ${profileError.message}`, 404);
    }

    if (!profileData) {
      reportAuthError(new Error('No profile data found'), { context: 'profile_not_found_signin', userId: authData.user.id });
      throw new ClearCauseError('PROFILE_NOT_FOUND', 'User profile not found', 404);
    }

    // Update session persistence based on rememberMe
    if (rememberMe === false) {
      try {
        // Set session to expire when browser closes
        await supabase.auth.updateUser({
          data: { session_timeout: 'session' }
        });
      } catch (updateError) {
        if (import.meta.env.DEV) console.warn('Failed to update session persistence:', updateError);
      }
    }

    // Log audit event (don't fail login if this fails)
    try {
      await logAuditEvent(authData.user.id, 'USER_SIGNIN', 'user', authData.user.id, {
        email,
        remember_me: rememberMe,
      });
    } catch (auditError) {
      if (import.meta.env.DEV) console.warn('Failed to log audit event:', auditError);
    }

    console.debug('Sign in successful for user:', profileData.email);

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
    reportAuthError(error, { context: 'signin_general_error', email });
    
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
    console.debug('Starting signOut process...');

    // Skip audit logging during logout to avoid getCurrentUser calls
    console.debug('Calling supabase.auth.signOut with global scope...');
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    
    if (error) {
      reportAuthError(error, { context: 'supabase_signout' });
      // Don't throw error for common logout scenarios - still consider it successful
      if (error.message?.includes('session_not_found') || 
          error.message?.includes('invalid_session')) {
        console.debug('Session already invalid, treating as successful logout');
        return {
          success: true,
          message: 'Signed out successfully (session already invalid)',
        };
      }
      throw new ClearCauseError('SIGNOUT_FAILED', error.message, 400);
    }

    console.debug('SignOut completed successfully');
    return {
      success: true,
      message: 'Signed out successfully',
    };
  } catch (error) {
    reportAuthError(error, { context: 'signout_general_error' });
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    // For any other error, still consider logout successful from UX perspective
    // The auth state will be cleared by the calling code
    if (import.meta.env.DEV) console.warn('Treating logout as successful despite error');
    return { 
      success: true, 
      message: 'Signed out successfully (with warnings)',
      error: 'Logout completed but with some issues' 
    };
  }
};

/**
 * Get current authenticated user with timeout and retries
 */
export const getCurrentUserWithTimeout = async (timeoutMs: number = 10000): Promise<User | null> => {
  const maxRetries = 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error(`getCurrentUser timeout after ${timeoutMs}ms (attempt ${attempt})`)), timeoutMs)
      );

      const result = await Promise.race([getCurrentUser(), timeoutPromise]);
      if (result) {
        return result;
      }
    } catch (error) {
      console.warn(`getCurrentUserWithTimeout attempt ${attempt} failed:`, error);

      if (attempt === maxRetries) {
        throw new Error(`Profile loading failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  return null;
};

/**
 * Get current authenticated user (simplified and reliable version)
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    console.log('[getCurrentUser] Step 1: Getting auth user...');

    // Get authenticated user from Supabase
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.log('[getCurrentUser] Step 1 failed: No auth user found');
      return null;
    }

    console.log('[getCurrentUser] Step 1 success: Auth user found:', user.id);

    // Try simple profile query first
    try {
      console.log('[getCurrentUser] Step 2: Simple profile query...');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileError && profileData) {
        console.log('[getCurrentUser] Step 2 success: Profile found in database');
        return {
          id: profileData.id,
          email: profileData.email,
          fullName: profileData.full_name,
          avatarUrl: profileData.avatar_url,
          phone: profileData.phone,
          role: profileData.role,
          isVerified: profileData.is_verified,
          isActive: profileData.is_active,
          createdAt: profileData.created_at,
          updatedAt: profileData.updated_at,
        };
      }

      console.warn('[getCurrentUser] Step 2 failed or no profile found:', profileError);
    } catch (queryError) {
      console.warn('[getCurrentUser] Profile query exception:', queryError);
    }

    // If database query fails or returns no profile, use auth data as fallback
    console.log('[getCurrentUser] Using auth metadata as fallback profile');

    return {
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      avatarUrl: user.user_metadata?.avatar_url || null,
      phone: user.user_metadata?.phone || null,
      role: (user.user_metadata?.role || 'donor') as 'donor' | 'charity' | 'admin',
      isVerified: !!user.email_confirmed_at,
      isActive: true,
      createdAt: user.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('[getCurrentUser] General error:', error);
    return null;
  }
};

/**
 * Get current user with simplified fallback (for emergency cases)
 */
export const getCurrentUserSimple = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Return basic user info from auth data
    return {
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      avatarUrl: user.user_metadata?.avatar_url || null,
      role: (user.user_metadata?.role || 'donor') as 'donor' | 'charity' | 'admin',
      isVerified: !!user.email_confirmed_at,
      createdAt: user.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('getCurrentUserSimple error:', error);
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
        redirectTo: import.meta.env.VITE_REDIRECT_URL || `${window.location.origin}/auth/callback`,
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
