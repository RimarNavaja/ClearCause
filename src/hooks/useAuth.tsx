/**
 * Authentication Hook
 * Provides authentication state and functions for React components
 */

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, SignUpData, SignInData, UserRole, ApiResponse } from '../lib/types';
import * as authService from '../lib/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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

  useEffect(() => {
    // Get initial session with comprehensive validation
    const getInitialSession = async () => {
      try {
        // Check if we're in demo mode
        if (import.meta.env.DEV && (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_DEMO_MODE === 'true')) {
          // Set a demo session for development
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
          
          setSession(session);
          
          // Try to load profile, if it fails, clear the session
          try {
            const currentUser = await authService.getCurrentUserWithTimeout(8000);
            if (currentUser) {
              setUser(currentUser);
            } else {
              await clearInvalidSession('No profile found');
            }
          } catch (profileError) {
            await clearInvalidSession('Profile verification failed');
          }
        } else {
          // Ensure we clear any leftover storage
          await clearAllAuthStorage();
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        await clearInvalidSession('Initialization error');
      } finally {
        setLoading(false);
      }
    };

    // Helper to clear invalid sessions
    const clearInvalidSession = async (reason: string) => {
      try {
        await supabase.auth.signOut({ scope: 'global' });
        await clearAllAuthStorage();
      } catch (clearError) {
        console.error('Error clearing session:', clearError);
        // Force clear local storage anyway
        await clearAllAuthStorage();
      } finally {
        setSession(null);
        setUser(null);
      }
    };

    getInitialSession();

    // Listen for auth changes (skip in demo mode)
    if (!import.meta.env.DEV || import.meta.env.VITE_SUPABASE_URL) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          // Handle sign out events immediately
          if (event === 'SIGNED_OUT' || !session) {
            // Only clear state if we're not already in a manual logout process
            if (!loading || event === 'SIGNED_OUT') {
              setSession(null);
              setUser(null);
              
              // Clear storage only if it wasn't already cleared by manual logout
              try {
                await clearAllAuthStorage();
              } catch (error) {
                console.error('Error clearing storage during signout:', error);
              }
            }
            
            // Always ensure loading is false after signout
            setLoading(false);
            return;
          }
          
          // Handle sign in events (including email verification)
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Validate session before processing
            if (!session || !session.user) {
              return;
            }
            
            // Check if session is expired
            if (session.expires_at && session.expires_at * 1000 < Date.now()) {
              await supabase.auth.signOut();
              return;
            }
            
            setSession(session);
            
            try {
              setLoading(true);
              
              // Try to load profile with retries
              await loadUserProfileWithRetry(session.user.id, 3);
              
            } catch (error) {
              console.error('Profile loading failed:', error);
              
              // Try to create a basic user from session data as fallback
              try {
                const basicUser = {
                  id: session.user.id,
                  email: session.user.email || 'unknown@email.com',
                  fullName: session.user.user_metadata?.full_name || 'User',
                  role: (session.user.user_metadata?.role || 'donor') as UserRole,
                  isVerified: !!session.user.email_confirmed_at,
                  createdAt: session.user.created_at || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                
                setUser(basicUser);
              } catch (fallbackError) {
                console.error('Failed to create fallback user:', fallbackError);
                setUser(null);
                setSession(null);
                try {
                  await supabase.auth.signOut();
                } catch (signOutError) {
                  console.error('Error signing out after profile failure:', signOutError);
                }
              }
            } finally {
              setLoading(false);
            }
            return;
          }
          
          // Handle other auth events
          if (session?.user && event !== 'SIGNED_OUT') {
            setSession(session);
            try {
              await loadUserProfile(session.user.id);
            } catch (error) {
              console.error('Profile loading failed:', error);
              setUser(null);
            }
          } else if (!session) {
            setUser(null);
            setSession(null);
          }
          
          setLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Profile loading with retry logic
  const loadUserProfileWithRetry = async (userId: string, maxRetries: number = 2): Promise<void> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const currentUser = await authService.getCurrentUserWithTimeout(2000);
        
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
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    throw new Error(`Profile loading failed after ${maxRetries} attempts: ${lastError?.message}`);
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const currentUser = await authService.getCurrentUserWithTimeout(4000);
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
      if (import.meta.env.DEV && (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_DEMO_MODE === 'true')) {
        const mockUser = {
          id: 'demo-user',
          email: credentials.email,
          fullName: 'Demo User',
          role: 'donor' as UserRole,
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(mockUser);
        return { success: true, data: mockUser };
      }

      const result = await authService.signIn(credentials);
      
      if (!result.success) {
        setLoading(false);
      }
      
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
      return { success: false, error: 'Sign in failed' };
    }
  };

  const signOut = async (): Promise<ApiResponse<void>> => {
    setLoading(true);
    try {
      // Always clear local state first to ensure UI updates immediately
      setUser(null);
      setSession(null);
      await clearAllAuthStorage();
      
      // Attempt server-side signout with timeout protection
      try {
        const serverLogoutPromise = authService.signOut();
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Server logout timeout')), 3000)
        );
        
        const result = await Promise.race([serverLogoutPromise, timeoutPromise]);
        return result;
      } catch (serverError) {
        // Try direct Supabase signout as fallback
        try {
          await supabase.auth.signOut({ scope: 'global' });
        } catch (directError) {
          console.error('Logout failed:', directError);
        }
        
        return { 
          success: true, 
          message: 'Signed out successfully'
        };
      }
    } catch (error) {
      // Even if everything fails, ensure local state is cleared
      console.error('Critical error during logout:', error);
      setUser(null);
      setSession(null);
      await clearAllAuthStorage();
      
      return { success: false, error: 'Logout error occurred' };
    } finally {
      setLoading(false);
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
