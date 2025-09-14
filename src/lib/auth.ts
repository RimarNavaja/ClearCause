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
    console.debug('Starting signup process for:', userData.email);
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
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      
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
      console.error('No user data returned from signup');
      throw new ClearCauseError('SIGNUP_FAILED', 'User creation failed', 400);
    }

    console.debug('Auth user created successfully');

    // Wait a moment for the database trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify that the profile was created by the trigger
    let profileCreated = false;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single();
      
      profileCreated = !profileError && !!profileData;
      console.debug('Profile creation check:', profileCreated ? 'success' : 'failed');
    } catch (error) {
      console.warn('Could not verify profile creation:', error);
    }
    
    // If trigger didn't create profile, create it manually
    if (!profileCreated) {
      console.debug('Profile not found, creating manually...');
      try {
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
          console.error('Failed to create profile manually:', createError);
          
          // Try to delete the auth user since profile creation failed
          try {
            await supabase.auth.admin.deleteUser(authData.user.id);
          } catch (cleanupError) {
            console.error('Failed to cleanup auth user:', cleanupError);
          }
          
          throw new ClearCauseError(
            'DATABASE_ERROR', 
            'Database error saving user profile. Please try again or contact support if the issue persists.', 
            500,
            createError
          );
        }
        
        console.debug('Profile created manually successfully');
      } catch (error) {
        if (error instanceof ClearCauseError) {
          throw error;
        }
        
        console.error('Unexpected error during manual profile creation:', error);
        throw new ClearCauseError(
          'DATABASE_ERROR', 
          'Database error saving user. Please try again or contact support if the issue persists.', 
          500,
          error
        );
      }
    }

    // Log audit event (don't fail signup if this fails)
    logAuditEvent(authData.user.id, 'USER_SIGNUP', 'user', authData.user.id, {
      email,
      role,
    }).catch(auditError => {
      console.warn('Failed to log audit event for signup:', auditError);
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
    console.debug('Attempting sign in for:', credentials.email);
    const { email, password, rememberMe } = credentials;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('Auth error during sign in:', authError);
      throw new ClearCauseError('SIGNIN_FAILED', authError.message, 401);
    }

    if (!authData.user) {
      console.error('No user data returned from auth');
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
      console.error('Profile error during sign in:', profileError);
      throw new ClearCauseError('PROFILE_NOT_FOUND', `User profile not found: ${profileError.message}`, 404);
    }

    if (!profileData) {
      console.error('No profile data found for user:', authData.user.id);
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
        console.warn('Failed to update session persistence:', updateError);
      }
    }

    // Log audit event (don't fail login if this fails)
    try {
      await logAuditEvent(authData.user.id, 'USER_SIGNIN', 'user', authData.user.id, {
        email,
        remember_me: rememberMe,
      });
    } catch (auditError) {
      console.warn('Failed to log audit event:', auditError);
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
    console.debug('Starting signOut process...');
    
    // Try to log audit event, but don't let it block logout
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // Don't await this - let it run in background
        logAuditEvent(currentUser.id, 'USER_SIGNOUT', 'user', currentUser.id)
          .catch(auditError => {
            console.warn('Failed to log audit event for signout:', auditError);
          });
      }
    } catch (getUserError) {
      console.warn('Could not get current user for audit logging:', getUserError);
    }
    
    // Always attempt to sign out regardless of audit logging
    console.debug('Calling supabase.auth.signOut with global scope...');
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    
    if (error) {
      console.error('Supabase signOut error:', error);
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
    console.error('Sign out error:', error);
    
    if (error instanceof ClearCauseError) {
      return { success: false, error: error.message };
    }
    
    // For any other error, still consider logout successful from UX perspective
    // The auth state will be cleared by the calling code
    console.warn('Treating logout as successful despite error');
    return { 
      success: true, 
      message: 'Signed out successfully (with warnings)',
      error: 'Logout completed but with some issues' 
    };
  }
};

/**
 * Get current authenticated user with timeout
 */
export const getCurrentUserWithTimeout = async (timeoutMs: number = 3000): Promise<User | null> => {
  const timeoutPromise = new Promise<null>((_, reject) => 
    setTimeout(() => reject(new Error(`getCurrentUser timeout after ${timeoutMs}ms`)), timeoutMs)
  );
  
  return Promise.race([getCurrentUser(), timeoutPromise]);
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    console.debug('getCurrentUser: Starting profile fetch...');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.debug('No authenticated user found');
      return null;
    }

    console.debug('Found authenticated user, fetching profile:', user.id);

    // Use maybeSingle to avoid 406 errors
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile query error:', profileError);
      return null;
    }

    // If no profile found, try to create it
    if (!profileData) {
      console.log('Profile not found, attempting to create one...');
      
      try {
        const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || 'Unknown User',
              role: user.user_metadata?.role || 'donor',
              is_verified: !!user.email_confirmed_at,
              is_active: true,
            })
            .select()
            .single();

          if (createError) {
            // If profile creation fails due to duplicate key, try to fetch existing profile
            if (createError.code === '23505') { // duplicate key violation
              console.log('Profile already exists, fetching existing profile...');
              const { data: existingProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
              
              if (!fetchError && existingProfile) {
                console.log('Found existing profile:', existingProfile.email);
                return {
                  id: existingProfile.id,
                  email: existingProfile.email,
                  fullName: existingProfile.full_name,
                  avatarUrl: existingProfile.avatar_url,
                  role: existingProfile.role,
                  isVerified: existingProfile.is_verified,
                  createdAt: existingProfile.created_at,
                  updatedAt: existingProfile.updated_at,
                };
              }
            }
            console.error('Failed to create profile:', createError);
            return null;
          }

          console.log('Profile created successfully:', newProfile.email);
          return {
            id: newProfile.id,
            email: newProfile.email,
            fullName: newProfile.full_name,
            avatarUrl: newProfile.avatar_url,
            role: newProfile.role,
            isVerified: newProfile.is_verified,
            createdAt: newProfile.created_at,
            updatedAt: newProfile.updated_at,
          };
        } catch (createError) {
          console.error('Error creating profile:', createError);
          return null;
        }
      }

    if (!profileData) {
      console.error('No profile data returned');
      return null;
    }

    console.debug('Profile loaded successfully:', profileData.email);

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
    
    // Emergency fallback: If we have a session but profile loading failed,
    // try to get the user data from the session and create a basic profile
    try {
      console.warn('Profile loading failed, attempting emergency session-based profile creation...');
      const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser();
      
      if (!sessionError && sessionUser) {
        console.debug('Creating emergency profile from session data for user:', sessionUser.id);
        
        // Create a basic profile from session metadata
        const emergencyProfile = {
          id: sessionUser.id,
          email: sessionUser.email || 'unknown@email.com',
          fullName: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'User',
          role: (sessionUser.user_metadata?.role || 'donor') as 'donor' | 'charity' | 'admin',
          isVerified: !!sessionUser.email_confirmed_at,
          createdAt: sessionUser.created_at || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          avatarUrl: sessionUser.user_metadata?.avatar_url || null,
        };
        
        console.log('Emergency profile created from session:', emergencyProfile.email);
        return emergencyProfile;
      }
    } catch (emergencyError) {
      console.error('Emergency profile creation also failed:', emergencyError);
    }
    
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
