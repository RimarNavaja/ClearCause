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
    // Get initial session
    const getInitialSession = async () => {
      try {
        // Check if we're in demo mode or if we have schema mismatch
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
          console.error('Error getting session:', error);
          return;
        }

        setSession(session);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Failed to get initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes (skip in demo mode)
    if (!import.meta.env.DEV || import.meta.env.VITE_SUPABASE_URL) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setSession(session);
          
          if (session?.user) {
            await loadUserProfile(session.user.id);
          } else {
            setUser(null);
          }
          
          setLoading(false);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Failed to load user profile:', error);
      // In demo mode, create a mock user
      if (import.meta.env.DEV && !import.meta.env.VITE_SUPABASE_URL) {
        setUser({
          id: 'demo-user',
          email: 'demo@clearcause.org',
          fullName: 'Demo User',
          role: 'donor' as any,
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        setUser(null);
      }
    }
  };

  const signUp = async (userData: SignUpData): Promise<ApiResponse<User>> => {
    setLoading(true);
    try {
      // Demo mode - includes schema mismatch scenarios
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
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (credentials: SignInData): Promise<ApiResponse<User>> => {
    setLoading(true);
    try {
      // Demo mode - includes schema mismatch scenarios
      if (import.meta.env.DEV && (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_DEMO_MODE === 'true')) {
        const mockUser = {
          id: 'demo-user',
          email: credentials.email,
          fullName: 'Demo User',
          role: 'donor' as any,
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUser(mockUser);
        return { success: true, data: mockUser };
      }

      const result = await authService.signIn(credentials);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<ApiResponse<void>> => {
    setLoading(true);
    try {
      const result = await authService.signOut();
      if (result.success) {
        setUser(null);
        setSession(null);
      }
      return result;
    } finally {
      setLoading(false);
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
