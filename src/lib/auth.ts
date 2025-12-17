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

    // First, check if an account with this email already exists
    // Use unauthenticated query to check profile existence (allowed by "Public profiles are viewable by everyone" RLS policy)
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, email, created_at')
      .eq('email', email)
      .maybeSingle();

    console.debug('Pre-signup profile check result:', { existingProfile, profileCheckError });

    // If we found a profile, this email is already registered
    if (existingProfile && !profileCheckError) {
      console.debug('Email already registered - throwing error');
      throw new ClearCauseError(
        'EMAIL_ALREADY_REGISTERED',
        'An account with this email already exists. Please sign in instead.',
        400
      );
    }

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
              onboarding_completed: true,
              ...(role === 'donor' && userData.donorCategory && {
                donor_category: userData.donorCategory,
                ...(userData.donorCategory === 'organization' && {
                  donor_organization_name: userData.donorOrganizationName,
                  donor_organization_type: userData.donorOrganizationType,
                }),
              }),
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

    // Profile is automatically created by database trigger (handle_new_user)
    // The trigger runs with SECURITY DEFINER privileges, bypassing RLS policies
    // We cannot verify the profile here because RLS blocks unauthenticated queries
    // Trust that the trigger has created the profile successfully
    console.debug('Profile creation handled by database trigger');

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
        isActive: true,
        onboardingCompleted: true,
        provider: 'email',
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
      const action = profileData.role === 'admin' ? 'VERIFIER_LOGIN' : 'USER_SIGNIN';
      await logAuditEvent(authData.user.id, action, 'user', authData.user.id, {
        email,
        remember_me: rememberMe,
        role: profileData.role
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
        isActive: profileData.is_active,
        onboardingCompleted: profileData.onboarding_completed,
        provider: 'email',
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
 * Get current authenticated user (simplified and reliable version with retry logic)
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

    // Try profile query with retry logic (3 attempts)
    const maxRetries = 3;
    const retryDelays = [0, 1000, 2000]; // 0ms, 1s, 2s delays

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[getCurrentUser] Step 2: Profile query attempt ${attempt + 1}/${maxRetries}...`);

        // Wait before retry (except first attempt)
        if (retryDelays[attempt] > 0) {
          console.log(`[getCurrentUser] Waiting ${retryDelays[attempt]}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
        }

        // Create AbortController to cancel the request if it times out
        const abortController = new AbortController();

        // Timeout for each attempt (5 seconds)
        const timeoutMs = 5000;

        // Set timeout to abort the request
        const timeoutId = setTimeout(() => {
          console.warn(`[getCurrentUser] Database query timeout on attempt ${attempt + 1} - aborting request`);
          abortController.abort();
        }, timeoutMs);

        try {
          // Make the query with abort signal
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .abortSignal(abortController.signal)
            .maybeSingle();

          // Clear timeout if query completes
          clearTimeout(timeoutId);

          if (!profileError && profileData) {
            console.log('[getCurrentUser] Step 2 success: Profile found in database');

            // Cache the profile data (especially avatar URL) for fallback on future page loads
            try {
              localStorage.setItem(`profile_cache_${profileData.id}`, JSON.stringify({
                avatarUrl: profileData.avatar_url,
                fullName: profileData.full_name,
                role: profileData.role,
                timestamp: Date.now()
              }));
              console.log('[getCurrentUser] Cached profile data to localStorage');
            } catch (cacheError) {
              console.warn('[getCurrentUser] Failed to cache profile data:', cacheError);
            }

            return {
              id: profileData.id,
              email: profileData.email,
              fullName: profileData.full_name,
              avatarUrl: profileData.avatar_url,
              phone: profileData.phone,
              role: profileData.role,
              isVerified: profileData.is_verified,
              isActive: profileData.is_active,
              onboardingCompleted: profileData.onboarding_completed,
              donorCategory: profileData.donor_category,
              donorOrganizationName: profileData.donor_organization_name,
              donorOrganizationType: profileData.donor_organization_type,
              provider: user.app_metadata?.provider || 'email',
              createdAt: profileData.created_at,
              updatedAt: profileData.updated_at,
            };
          }

          console.warn(`[getCurrentUser] Attempt ${attempt + 1} failed or no profile found:`, profileError);

          // If this is not the last attempt and we got an error, continue to retry
          if (attempt < maxRetries - 1 && profileError) {
            console.log(`[getCurrentUser] Will retry... (${maxRetries - attempt - 1} attempts remaining)`);
            continue;
          }
        } catch (abortError) {
          // Query was aborted due to timeout
          clearTimeout(timeoutId);
          console.warn(`[getCurrentUser] Database query aborted on attempt ${attempt + 1}:`, abortError);

          // If this is not the last attempt, retry
          if (attempt < maxRetries - 1) {
            console.log(`[getCurrentUser] Will retry after timeout... (${maxRetries - attempt - 1} attempts remaining)`);
            continue;
          }
        }
      } catch (queryError) {
        console.warn(`[getCurrentUser] Profile query failed on attempt ${attempt + 1}:`, queryError);

        // If this is not the last attempt, retry
        if (attempt < maxRetries - 1) {
          console.log(`[getCurrentUser] Will retry after error... (${maxRetries - attempt - 1} attempts remaining)`);
          continue;
        }
      }
    }

    console.warn('[getCurrentUser] All retry attempts exhausted');

    // If database query fails or returns no profile, use auth data as fallback
    console.log('[getCurrentUser] Using auth metadata and localStorage cache as fallback profile');

    // Try to get cached avatar URL from localStorage
    let cachedAvatarUrl = null;
    try {
      const cachedProfile = localStorage.getItem(`profile_cache_${user.id}`);
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        cachedAvatarUrl = parsed.avatarUrl || null;
        console.log('[getCurrentUser] Found cached avatar URL:', cachedAvatarUrl);
      }
    } catch (cacheError) {
      console.warn('[getCurrentUser] Failed to read from cache:', cacheError);
    }

    return {
      id: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      avatarUrl: cachedAvatarUrl || user.user_metadata?.avatar_url || null,
      phone: user.user_metadata?.phone || null,
      role: (user.user_metadata?.role || 'donor') as 'donor' | 'charity' | 'admin',
      isVerified: !!user.email_confirmed_at,
      isActive: true,
      onboardingCompleted: user.user_metadata?.onboarding_completed || false,
      donorCategory: user.user_metadata?.donor_category as any,
      donorOrganizationName: user.user_metadata?.donor_organization_name,
      donorOrganizationType: user.user_metadata?.donor_organization_type as any,
      provider: user.app_metadata?.provider || 'email',
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
      isActive: true,
      onboardingCompleted: user.user_metadata?.onboarding_completed || false,
      provider: user.app_metadata?.provider || 'email',
      createdAt: user.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('[getCurrentUser] General error:', error);
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
 * Update email address
 */
export const updateEmail = async (email: string): Promise<ApiResponse<void>> => {
  try {
    const { error } = await supabase.auth.updateUser({ email });
    
    if (error) {
      throw new ClearCauseError('EMAIL_UPDATE_FAILED', error.message, 400);
    }

    return {
      success: true,
      message: 'Confirmation email sent. Please check your new email address.',
    };
  } catch (error) {
    console.error('Email update error:', error);
    
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
        isActive: data.is_active,
        onboardingCompleted: data.onboarding_completed,
        provider: currentUser.provider,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      message: 'Profile updated successfully',
    };
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Complete user onboarding
 */
export const completeOnboarding = async (
  firstName: string,
  lastName: string,
  role: UserRole
): Promise<ApiResponse<User>> => {
  try {
    // Use low-level auth user fetch to avoid profile loading issues
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new ClearCauseError('USER_NOT_FOUND', 'User not authenticated', 401);
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // Use upsert instead of update to handle missing profile rows
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || '',
        full_name: fullName,
        role: role,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
        // Default values for new rows
        is_verified: !!user.email_confirmed_at,
        is_active: true
      }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw new ClearCauseError('ONBOARDING_FAILED', error.message, 400);
    }

    // Log audit event (fire and forget)
    logAuditEvent(user.id, 'USER_ONBOARDING', 'user', user.id, {
      role,
      fullName
    }).catch(err => console.warn('Audit log failed:', err));

    // Sync onboarding status to auth metadata for resilience
    // This ensures that even if profile fetch fails, the fallback mechanism works correctly
    try {
      await supabase.auth.updateUser({
        data: { onboarding_completed: true, role: role, full_name: fullName }
      });
    } catch (updateError) {
      console.warn('Failed to sync onboarding status to auth metadata:', updateError);
    }

    return {
      success: true,
      data: {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        role: data.role,
        isVerified: data.is_verified,
        isActive: data.is_active,
        onboardingCompleted: data.onboarding_completed,
        provider: user.app_metadata?.provider || 'email',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      message: 'Onboarding completed successfully',
    };
  } catch (error) {
    console.error('Onboarding error:', error);
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    return { success: false, error: 'An unexpected error occurred during onboarding' };
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
    // Construct robust redirect URL
    const origin = window.location.origin;
    const envUrl = import.meta.env.VITE_REDIRECT_URL;
    
    let redirectUrl = `${origin}/auth/callback`;
    if (envUrl) {
      // Ensure it ends with /auth/callback
      if (envUrl.includes('/auth/callback')) {
        redirectUrl = envUrl;
      } else {
        redirectUrl = `${envUrl.replace(/\/$/, '')}/auth/callback`;
      }
    }
    
    console.log('[Auth] Google Sign In redirecting to:', redirectUrl);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
                            queryParams: {
                              access_type: 'offline',
                              prompt: 'consent',
                            },      },
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
          isActive: existingProfile.is_active,
          onboardingCompleted: existingProfile.onboarding_completed,
          provider: user.app_metadata?.provider || 'email',
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
        isActive: newProfile.is_active,
        onboardingCompleted: newProfile.onboarding_completed,
        provider: user.app_metadata?.provider || 'email',
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
