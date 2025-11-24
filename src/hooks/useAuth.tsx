/**
 * Authentication Hook
 * Provides authentication state and functions for React components
 */

import { useState, useEffect, useContext, createContext, ReactNode, useRef } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, SignUpData, SignInData, UserRole, ApiResponse } from '../lib/types';
import { config } from '../lib/config';
import * as authService from '../lib/auth';
import { handleAuthError, shouldLogoutOnError, reportAuthError } from '../utils/authErrorHandler';
import { isSessionContaminated, forceCleanupIfContaminated, isFreshSession, debounceAuthCall } from '../utils/sessionManager';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signUp: (userData: SignUpData) => Promise<ApiResponse<User>>;
  signIn: (credentials: SignInData) => Promise<ApiResponse<User>>;
  signOut: () => Promise<ApiResponse<void>>;
  resetPassword: (email: string) => Promise<ApiResponse<void>>;
  updatePassword: (newPassword: string) => Promise<ApiResponse<void>>;
  updateProfile: (updates: { fullName?: string; avatarUrl?: string }) => Promise<ApiResponse<User>>;
  refreshUser: () => Promise<void>;
  hasRole: (requiredRole: UserRole) => boolean;
  hasAnyRole: (requiredRoles: UserRole[]) => boolean;
  isVerified: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [processingAuthChange, setProcessingAuthChange] = useState(false);
  const [lastProcessedUserId, setLastProcessedUserId] = useState<string | null>(null);
  const maxRetries = 3;

  console.log('[AuthProvider] 🔄 COMPONENT RENDERING', {
    hasUser: !!user,
    userEmail: user?.email,
    loading,
    processingAuthChange,
    authError
  });

  // Use ref to track current user ID to avoid closure issues in auth listener
  const currentUserIdRef = useRef<string | null>(null);

  // Keep ref in sync with user state
  useEffect(() => {
    currentUserIdRef.current = user?.id || null;
  }, [user]);

  // Debug: Monitor all state changes to track what's happening
  useEffect(() => {
    console.log('[AUTH] 📊 STATE CHANGED:', {
      hasUser: !!user,
      userEmail: user?.email,
      userRole: user?.role,
      userId: user?.id,
      loading,
      processingAuthChange,
      authError,
      hasSession: !!session,
      sessionUserId: session?.user?.id
    });
  }, [user, loading, processingAuthChange, authError, session]);

  // Emergency timeout to prevent infinite loading
  useEffect(() => {
    if (!loading) return;

    const emergencyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('[AUTH] Emergency timeout: forcing loading to false after 8 seconds');
        setLoading(false);
        setProcessingAuthChange(false); // Also clear processing flag
        setAuthError('Authentication timeout - please refresh the page');
      }
    }, 8000); // Reduced from 15s to 8s

    return () => clearTimeout(emergencyTimeout);
  }, [loading]); // Removed processingAuthChange dependency

  useEffect(() => {
    // Get initial session with comprehensive validation
    const getInitialSession = async () => {
      try {
        // Check for session contamination FIRST
        if (isSessionContaminated()) {
          console.warn('[AUTH] Session contamination detected during initialization');
          forceCleanupIfContaminated();
          return; // Exit early, cleanup will reload the page
        }

        // Circuit breaker - prevent infinite retries
        if (retryCount >= maxRetries) {
          console.warn('[AUTH] Max retries exceeded, stopping auth attempts');
          setAuthError('Authentication failed after multiple attempts');
          setLoading(false);
          return;
        }

        // Demo mode check - only in development with explicit flag
        if (config.features.demoMode) {
          console.warn('[AUTH] Running in DEMO MODE - not for production');
          setSession(null);
          setUser({
            id: 'demo-user-id',
            email: 'demo@clearcause.com',
            fullName: 'Demo User',
            avatarUrl: null,
            role: 'donor',
            phone: null,
            isVerified: true,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setLoading(false);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          await clearInvalidSession('Error getting session');
          return;
        }

        if (session?.user) {
          // Check if session is expired
          if (session.expires_at && session.expires_at * 1000 < Date.now()) {
            await clearInvalidSession('Session expired');
            return;
          }

          console.log('[AUTH] getInitialSession: Found valid session, setting session only');
          setSession(session);
          // Don't load profile here - let the auth listener handle it
          // This prevents race condition between getInitialSession and onAuthStateChange
        } else {
          // No session - clear everything
          await clearAllAuthStorage();
          setSession(null);
          setUser(null);
          setAuthError(null);
          setRetryCount(0);
        }
      } catch (error) {
        console.error('[AUTH] Initialization error:', error);
        const errorInfo = handleAuthError(error);
        reportAuthError(error, { context: 'getInitialSession' });
        setRetryCount(prev => prev + 1);

        if (retryCount < maxRetries - 1) {
          setTimeout(() => {
            getInitialSession();
          }, 3000);
          return;
        } else {
          await clearInvalidSession('Initialization error after retries');
        }
      } finally {
        setLoading(false);
      }
    };

    // Helper to clear invalid sessions
    const clearInvalidSession = async (reason: string) => {
      console.log('[AUTH] Clearing invalid session:', reason);
      try {
        await supabase.auth.signOut({ scope: 'global' });
        await clearAllAuthStorage();
      } catch (clearError) {
        reportAuthError(clearError, { context: 'clearInvalidSession' });
        // Force clear local storage anyway
        await clearAllAuthStorage();
      } finally {
        setSession(null);
        setUser(null);
        setAuthError(null);
        setRetryCount(0);
        setLoading(false); // Ensure loading is always set to false
      }
    };

    // Only run on component mount
    getInitialSession();

    // Listen for auth changes (skip in demo mode)
    if (!config.features.demoMode) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('[AUTH] Auth state change:', event, session?.user?.id);

          // Skip INITIAL_SESSION - it's handled by getInitialSession()
          // This prevents duplicate processing and race conditions
          if (event === 'INITIAL_SESSION') {
            console.log('[AUTH] Ignoring INITIAL_SESSION - handled by getInitialSession');
            return;
          }

          // Skip USER_UPDATED - prevents redundant profile reloads right after login
          // USER_UPDATED fires when user metadata changes, but we just loaded the profile
          if (event === 'USER_UPDATED' && session?.user?.id === currentUserIdRef.current) {
            console.log('[AUTH] Ignoring USER_UPDATED - user already loaded:', currentUserIdRef.current);
            return;
          }

          // Prevent processing the same user multiple times
          if (processingAuthChange) {
            console.log('[AUTH] Already processing auth change, skipping...');
            return;
          }

          // Deduplicate SIGNED_IN events for the same user
          if (event === 'SIGNED_IN' && session?.user?.id === lastProcessedUserId) {
            console.log('[AUTH] Duplicate SIGNED_IN event for same user, skipping...');
            return;
          }

          setProcessingAuthChange(true);

          try {
            // Handle sign out events immediately
            if (event === 'SIGNED_OUT' || !session) {
              console.log('[AUTH] Processing SIGNED_OUT - clearing all auth state');
              setSession(null);
              setUser(null);
              setAuthError(null);
              setRetryCount(0);
              setLastProcessedUserId(null);
              setProcessingAuthChange(false);
              setLoading(false);

              try {
                await clearAllAuthStorage();
              } catch (error) {
                reportAuthError(error, { context: 'storage_clear_during_signout' });
              }
              return;
            }

            // Handle sign in events
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              if (!session?.user) return;

              // Debug logging
              console.log('[AUTH] SIGNED_IN event - Current user ref:', currentUserIdRef.current, 'Session user:', session.user.id);
              console.log('[AUTH] User ID in ref?', !!currentUserIdRef.current, 'IDs match?', currentUserIdRef.current === session.user.id);

              // CRITICAL: Skip re-authentication if we already have valid user data
              // Use ref instead of state to avoid closure issues
              if (currentUserIdRef.current && currentUserIdRef.current === session.user.id) {
                console.log('[AUTH] ✅ User already authenticated (ref check), skipping redundant SIGNED_IN processing');
                // Just update session silently without triggering a reload
                setSession(session);
                setLoading(false);
                setProcessingAuthChange(false);
                return;
              }

              // Additional check: if lastProcessedUserId matches, also skip
              if (lastProcessedUserId && lastProcessedUserId === session.user.id) {
                console.log('[AUTH] ✅ User already processed (lastProcessedUserId match), skipping');
                setSession(session);
                setLoading(false);
                setProcessingAuthChange(false);
                return;
              }

              // Check for session contamination during sign in
              if (isSessionContaminated()) {
                console.warn('[AUTH] Session contamination detected during SIGNED_IN event');
                forceCleanupIfContaminated();
                return; // Exit early, cleanup will reload the page
              }

              // Check if session is expired
              if (session.expires_at && session.expires_at * 1000 < Date.now()) {
                await supabase.auth.signOut();
                return;
              }

              console.log('[AUTH] 🔄 Processing SIGNED_IN for user:', session.user.id);
              setLastProcessedUserId(session.user.id);
              setSession(session);

              setLoading(true);

              try {
                console.log('[AUTH] 🔍 Calling getCurrentUser with timeout protection...');

                // Create timeout promise that rejects after 5 seconds
                let timeoutId: NodeJS.Timeout;
                const timeoutPromise = new Promise<never>((_, reject) => {
                  timeoutId = setTimeout(() => {
                    console.log('[AUTH] ⏱️ 5-second timeout fired, rejecting promise...');
                    reject(new Error('getCurrentUser timeout after 5 seconds'));
                  }, 5000);
                });

                console.log('[AUTH] 🔍 Starting Promise.race for getCurrentUser...');

                // Race between getCurrentUser and timeout
                const currentUser = await Promise.race([
                  authService.getCurrentUser(),
                  timeoutPromise
                ]).finally(() => {
                  // Always clear the timeout
                  console.log('[AUTH] 🔍 Promise.race finally block executing...');
                  clearTimeout(timeoutId);
                  console.log('[AUTH] ✅ Timeout cleared');
                });

                console.log('[AUTH] 🔍 Promise.race completed, result:', currentUser ? `User: ${currentUser.email}` : 'null/undefined');

                if (currentUser) {
                  console.log('[AUTH] ✅ Profile loaded successfully:', currentUser.email);
                  console.log('[AUTH] 🔍 Profile object:', currentUser);
                  console.log('[AUTH] 🔍 About to call setUser()...');
                  setUser(currentUser);
                  console.log('[AUTH] ✅ setUser() completed');
                  console.log('[AUTH] 🔍 About to call setAuthError(null)...');
                  setAuthError(null);
                  console.log('[AUTH] ✅ setAuthError(null) completed');
                  console.log('[AUTH] 🔍 About to call setRetryCount(0)...');
                  setRetryCount(0);
                  console.log('[AUTH] ✅ setRetryCount(0) completed');
                  console.log('[AUTH] ✅ All state updates completed successfully');
                } else {
                  console.warn('[AUTH] ⚠️ No profile found for authenticated user - creating fallback from session');
                  // Create fallback profile from session (will be handled in catch block if needed)
                  throw new Error('No profile found in database');
                }
              } catch (error) {
                console.error('[AUTH] ❌ Profile loading failed:', error);
                console.log('[AUTH] 🔍 Error type:', error?.constructor?.name);
                console.log('[AUTH] 🔍 Error message:', error?.message);

                // ALWAYS create fallback from session on any error (timeout or database failure)
                if (session?.user) {
                  console.log('[AUTH] 🔄 Creating fallback profile from session after error...');

                  // Try to get cached avatar URL from localStorage
                  let cachedAvatarUrl = null;
                  let cachedFullName = null;
                  let cachedRole = null;
                  try {
                    const cachedProfile = localStorage.getItem(`profile_cache_${session.user.id}`);
                    if (cachedProfile) {
                      const parsed = JSON.parse(cachedProfile);
                      cachedAvatarUrl = parsed.avatarUrl || null;
                      cachedFullName = parsed.fullName || null;
                      cachedRole = parsed.role || null;
                      console.log('[AUTH] Found cached profile data:', { cachedAvatarUrl, cachedFullName, cachedRole });
                    }
                  } catch (cacheError) {
                    console.warn('[AUTH] Failed to read from cache:', cacheError);
                  }

                  // Determine role from cache, email pattern, or metadata
                  let userRole = cachedRole || session.user.user_metadata?.role || 'donor';

                  // Special handling for admin emails
                  if (session.user.email?.includes('admin@') ||
                      session.user.email === 'admin@clearcause.com') {
                    userRole = 'admin';
                  }

                  const fallbackUser = {
                    id: session.user.id,
                    email: session.user.email || '',
                    fullName: cachedFullName || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                    avatarUrl: cachedAvatarUrl || session.user.user_metadata?.avatar_url || null,
                    phone: session.user.user_metadata?.phone || null,
                    role: userRole as 'donor' | 'charity' | 'admin',
                    isVerified: !!session.user.email_confirmed_at,
                    isActive: true,
                    createdAt: session.user.created_at || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  };

                  console.log('[AUTH] ✅ Using fallback profile:', fallbackUser.email, 'Role:', fallbackUser.role, 'Avatar:', fallbackUser.avatarUrl);
                  setUser(fallbackUser);
                  setAuthError(null); // Clear error since we have a working fallback
                  setRetryCount(0);
                } else {
                  console.error('[AUTH] ❌ No session available for fallback, clearing user state');
                  setUser(null);
                  setAuthError('Failed to load user profile');
                }
              } finally {
                // ALWAYS set loading to false to prevent infinite loading
                console.log('[AUTH] 🔍 FINALLY BLOCK EXECUTING');
                console.log('[AUTH] 🔍 Current loading state before update:', loading);
                console.log('[AUTH] 🔍 Current processingAuthChange before update:', processingAuthChange);
                console.log('[AUTH] 🔍 About to call setLoading(false)...');
                setLoading(false);
                console.log('[AUTH] ✅ setLoading(false) completed');
                console.log('[AUTH] ✅ SIGNED_IN processing completed');
              }
              return;
            }

            // Handle other auth events
            if (session?.user) {
              setSession(session);
              try {
                const currentUser = await authService.getCurrentUser();
                setUser(currentUser);
              } catch (error) {
                console.error('[AUTH] Profile loading failed for other event:', error);
                setUser(null);
              }
            } else {
              setUser(null);
              setSession(null);
            }

            setLoading(false);
          } finally {
            setProcessingAuthChange(false);
          }
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []); // Empty dependency array to run only once

  // Profile loading with retry logic (simplified)
  const loadUserProfileWithRetry = async (userId: string, maxRetries: number = 2): Promise<void> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const currentUser = await authService.getCurrentUser();

        if (currentUser) {
          setUser(currentUser);
          return;
        } else {
          throw new Error('No profile found for authenticated user');
        }
      } catch (error) {
        lastError = error;

        // If this isn't the last attempt, wait briefly before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw new Error(`Profile loading failed after ${maxRetries} attempts: ${lastError?.message}`);
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      // If we got null, it means the profile doesn't exist in the database
      if (!currentUser) {
        // Clear the invalid session
        setUser(null);
        setSession(null);
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('Error signing out:', signOutError);
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);

      // In demo mode, create a mock user
      if (import.meta.env.DEV && !import.meta.env.VITE_SUPABASE_URL) {
        setUser({
          id: 'demo-user',
          email: 'demo@clearcause.org',
          fullName: 'Demo User',
          role: 'donor' as UserRole,
          isVerified: true,
          isActive: true,
          avatarUrl: null,
          phone: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        setUser(null);
        setSession(null);
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('Error signing out:', signOutError);
        }
      }
    }
  };

  const signUp = async (userData: SignUpData): Promise<ApiResponse<User>> => {
    setLoading(true);
    try {
      // Demo mode
      if (import.meta.env.DEV && (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_DEMO_MODE === 'true')) {
        const mockUser = {
          id: `demo-${Date.now()}`,
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role,
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(mockUser);
        return { success: true, data: mockUser };
      }

      const result = await authService.signUp(userData);
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Sign up failed' };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (credentials: SignInData): Promise<ApiResponse<User>> => {
    try {
      setLoading(true);
      
      // Clear any existing session and state before login
      try {
        setUser(null);
        setSession(null);
        await clearAllAuthStorage();
        
        const clearSessionPromise = supabase.auth.signOut({ scope: 'global' });
        const timeoutPromise = new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Session clear timeout')), 2000)
        );
        
        try {
          await Promise.race([clearSessionPromise, timeoutPromise]);
        } catch (clearError) {
          // Continue with login even if clearing fails
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (cleanupError) {
        // Continue with login even if cleanup fails
      }
      
      // Demo mode
      if (config.features.demoMode) {
        const mockUser = {
          id: 'demo-user',
          email: credentials.email,
          fullName: 'Demo User',
          avatarUrl: null,
          role: 'donor' as UserRole,
          phone: null,
          isVerified: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(mockUser);
        return { success: true, data: mockUser, message: 'Demo login successful' };
      }

      const result = await authService.signIn(credentials);
      
      if (!result.success) {
        setLoading(false);
      }
      
      return result;
    } catch (error) {
      const errorInfo = handleAuthError(error);
      reportAuthError(error, { context: 'signin', email: credentials.email });
      setLoading(false);
      return { success: false, error: errorInfo.userMessage };
    }
  };

  const signOut = async (): Promise<ApiResponse<void>> => {
    console.log('[AUTH] Starting signOut process...');

    try {
      // Immediately clear local state to ensure UI updates right away
      console.log('[AUTH] Clearing local auth state...');
      setUser(null);
      setSession(null);
      setAuthError(null);
      setRetryCount(0);
      setLastProcessedUserId(null);
      setProcessingAuthChange(false);
      setLoading(false); // Set to false immediately to prevent navbar loading

      // Clear all auth storage first
      await clearAllAuthStorage();

      // Clear browser storage more aggressively
      try {
        // Clear all supabase storage keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('session'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Clear sessionStorage as well
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth') || key.includes('session'))) {
            sessionKeysToRemove.push(key);
          }
        }
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

        // Clear any cached auth state
        localStorage.removeItem('clearcause-auth-cache');
        localStorage.removeItem('clearcause-user-cache');
        sessionStorage.removeItem('clearcause-auth-cache');
        sessionStorage.removeItem('clearcause-user-cache');

        console.log('[AUTH] Cleared browser storage keys:', keysToRemove.concat(sessionKeysToRemove));
      } catch (storageError) {
        console.warn('[AUTH] Storage clearing failed:', storageError);
      }

      // Attempt server-side signout with timeout protection
      try {
        console.log('[AUTH] Attempting server logout...');
        const serverLogoutPromise = authService.signOut();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Server logout timeout')), 2000)
        );

        const result = await Promise.race([serverLogoutPromise, timeoutPromise]);
        console.log('[AUTH] Server logout completed');
        return result;
      } catch (serverError) {
        console.warn('[AUTH] Server logout failed, trying direct Supabase logout:', serverError);

        // Try direct Supabase signout as fallback
        try {
          await supabase.auth.signOut({ scope: 'global' });
          console.log('[AUTH] Direct Supabase logout completed');
        } catch (directError) {
          console.error('[AUTH] Direct logout also failed:', directError);
        }

        // Clear cookies as well
        try {
          document.cookie.split(";").forEach((cookie) => {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            if (name.trim().includes('supabase') || name.trim().includes('auth')) {
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
              document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            }
          });
          console.log('[AUTH] Cleared auth cookies');
        } catch (cookieError) {
          console.warn('[AUTH] Cookie clearing failed:', cookieError);
        }

        return {
          success: true,
          message: 'Signed out successfully'
        };
      }
    } catch (error) {
      // Even if everything fails, ensure local state is cleared
      console.error('[AUTH] Critical error during logout:', error);
      setUser(null);
      setSession(null);
      setAuthError(null);
      setRetryCount(0);
      setLastProcessedUserId(null);
      setProcessingAuthChange(false);
      setLoading(false); // Ensure loading is false
      await clearAllAuthStorage();

      return { success: false, error: 'Logout error occurred' };
    }
  };
  // Storage clearing function
  const clearAllAuthStorage = async () => {
    try {
      // Get all localStorage keys to find Supabase auth keys
      const allKeys = Object.keys(localStorage);
      const supabaseKeys = allKeys.filter(key => {
        return key.includes('supabase') || 
               key.startsWith('sb-') ||
               key.includes('auth-token') ||
               key.includes('.auth.');
      });
      
      // Remove all Supabase-related keys
      supabaseKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear common Supabase storage patterns
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        const domain = supabaseUrl.split('://')[1]?.split('.')[0];
        if (domain) {
          const commonKeys = [
            `sb-${domain}-auth-token`,
            `sb-${domain}-auth-token.0`,
            `sb-${domain}-auth-token.1`,
            `supabase.auth.token`,
            `supabase.${domain}.auth.token`
          ];
          
          commonKeys.forEach(key => {
            localStorage.removeItem(key);
          });
        }
      }
      
      // Clear session storage completely
      sessionStorage.clear();
      
      // Clear app-specific data
      localStorage.removeItem('clearcause-user-preferences');
      localStorage.removeItem('clearcause-last-route');
    } catch (storageError) {
      console.error('Error clearing storage:', storageError);
    }
  };

  const resetPassword = async (email: string): Promise<ApiResponse<void>> => {
    return authService.resetPassword(email);
  };

  const updatePassword = async (newPassword: string): Promise<ApiResponse<void>> => {
    return authService.updatePassword(newPassword);
  };

  const updateProfile = async (updates: { fullName?: string; avatarUrl?: string }): Promise<ApiResponse<User>> => {
    const result = await authService.updateProfile(updates);
    if (result.success && result.data) {
      setUser(result.data);
    }
    return result;
  };

  const refreshUser = async (): Promise<void> => {
    if (session?.user) {
      await loadUserProfile(session.user.id);
    }
  };

  const hasRole = (requiredRole: UserRole): boolean => {
    return authService.hasRole(user, requiredRole);
  };

  const hasAnyRole = (requiredRoles: UserRole[]): boolean => {
    return authService.hasAnyRole(user, requiredRoles);
  };

  const isVerified = authService.isUserVerified(user);

  const value: AuthContextType = {
    user,
    session,
    loading,
    authError,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshUser,
    hasRole,
    hasAnyRole,
    isVerified,
  };

  console.log('[AuthProvider] 🔍 About to render children with context:', {
    hasUser: !!user,
    userEmail: user?.email,
    userRole: user?.role,
    loading,
    processingAuthChange
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Additional hooks for specific use cases

/**
 * Hook to require authentication
 */
export const useRequireAuth = (redirectTo?: string) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const redirect = redirectTo || '/login';
      window.location.href = redirect;
    }
  }, [user, loading, redirectTo]);

  return { user, loading };
};

/**
 * Hook to require specific role
 */
export const useRequireRole = (requiredRole: UserRole, redirectTo?: string) => {
  const { user, loading, hasRole } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !hasRole(requiredRole))) {
      const redirect = redirectTo || '/unauthorized';
      window.location.href = redirect;
    }
  }, [user, loading, requiredRole, hasRole, redirectTo]);

  return { user, loading, hasRole: hasRole(requiredRole) };
};

/**
 * Hook to require any of the specified roles
 */
export const useRequireAnyRole = (requiredRoles: UserRole[], redirectTo?: string) => {
  const { user, loading, hasAnyRole } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !hasAnyRole(requiredRoles))) {
      const redirect = redirectTo || '/unauthorized';
      window.location.href = redirect;
    }
  }, [user, loading, requiredRoles, hasAnyRole, redirectTo]);

  return { user, loading, hasAnyRole: hasAnyRole(requiredRoles) };
};

/**
 * Hook to check if user is verified
 */
export const useRequireVerification = (redirectTo?: string) => {
  const { user, loading, isVerified } = useAuth();

  useEffect(() => {
    if (!loading && user && !isVerified) {
      const redirect = redirectTo || '/verify-email';
      window.location.href = redirect;
    }
  }, [user, loading, isVerified, redirectTo]);

  return { user, loading, isVerified };
};
