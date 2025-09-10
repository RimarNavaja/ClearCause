/**
 * Authentication Middleware
 * Provides route protection and role-based access control
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../lib/types';

// Loading component
const AuthLoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clearcause-primary mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Unauthorized access component
const UnauthorizedAccess = ({ message }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="text-6xl text-red-500 mb-4">🚫</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-600 mb-4">
        {message || 'You do not have permission to access this page.'}
      </p>
      <button
        onClick={() => window.history.back()}
        className="bg-clearcause-primary text-white px-4 py-2 rounded-md hover:bg-clearcause-secondary transition-colors"
      >
        Go Back
      </button>
    </div>
  </div>
);

// Email verification required component
const EmailVerificationRequired = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-4xl text-yellow-500 mb-4">📧</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Email Verification Required</h1>
          <p className="text-gray-600 mb-4">
            Please verify your email address to continue. We've sent a verification link to{' '}
            <span className="font-medium">{user?.email}</span>.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Check your inbox and click the verification link to activate your account.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-clearcause-primary text-white px-4 py-2 rounded-md hover:bg-clearcause-secondary transition-colors"
          >
            I've Verified My Email
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRoles?: UserRole[];
  requireVerification?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Protected Route Component
 * Wraps components that require authentication or specific roles
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  requireRoles = [],
  requireVerification = false,
  fallback,
  redirectTo,
}) => {
  const { user, loading, hasAnyRole, isVerified } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return fallback || <AuthLoadingSpinner />;
  }

  // Redirect to login if authentication is required but user is not logged in
  if (requireAuth && !user) {
    const loginPath = redirectTo || '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requireRoles.length > 0 && !hasAnyRole(requireRoles)) {
    return (
      <UnauthorizedAccess 
        message={`This page requires ${requireRoles.join(' or ')} access.`} 
      />
    );
  }

  // Check email verification requirement
  if (requireVerification && !isVerified) {
    return <EmailVerificationRequired />;
  }

  return <>{children}</>;
};

/**
 * Admin Route Component
 * Shorthand for admin-only routes
 */
export const AdminRoute: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <ProtectedRoute
    requireAuth={true}
    requireRoles={['admin']}
    requireVerification={true}
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

/**
 * Charity Route Component
 * Shorthand for charity-only routes
 */
export const CharityRoute: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <ProtectedRoute
    requireAuth={true}
    requireRoles={['charity']}
    requireVerification={true}
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

/**
 * Donor Route Component
 * Shorthand for donor-only routes
 */
export const DonorRoute: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <ProtectedRoute
    requireAuth={true}
    requireRoles={['donor']}
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

/**
 * Charity or Admin Route Component
 * For routes accessible by both charity and admin users
 */
export const CharityOrAdminRoute: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <ProtectedRoute
    requireAuth={true}
    requireRoles={['charity', 'admin']}
    requireVerification={true}
    fallback={fallback}
  >
    {children}
  </ProtectedRoute>
);

/**
 * Guest Route Component
 * For routes that should only be accessible to non-authenticated users
 */
export const GuestRoute: React.FC<{ 
  children: React.ReactNode; 
  redirectTo?: string;
}> = ({
  children,
  redirectTo = '/',
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingSpinner />;
  }

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

/**
 * Role-based Component Renderer
 * Conditionally renders components based on user roles
 */
interface RoleBasedProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export const RoleBased: React.FC<RoleBasedProps> = ({
  allowedRoles,
  children,
  fallback = null,
  requireAuth = true,
}) => {
  const { user, hasAnyRole } = useAuth();

  if (requireAuth && !user) {
    return <>{fallback}</>;
  }

  if (!hasAnyRole(allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Permission Check Hook
 * Custom hook for checking permissions in components
 */
export const usePermissions = () => {
  const { user, hasRole, hasAnyRole, isVerified } = useAuth();

  const canAccessAdmin = hasRole('admin');
  const canAccessCharity = hasRole('charity') && isVerified;
  const canAccessDonor = hasRole('donor');
  
  const canCreateCampaign = hasRole('charity') && isVerified;
  const canManageUsers = hasRole('admin');
  const canVerifyCharities = hasRole('admin');
  const canViewAuditLogs = hasRole('admin');
  const canProcessRefunds = hasRole('admin');

  const canEditCampaign = (campaignCharityUserId: string) => {
    return hasRole('admin') || (hasRole('charity') && user?.id === campaignCharityUserId);
  };

  const canViewDonation = (donationUserId: string, campaignCharityUserId: string) => {
    return (
      hasRole('admin') ||
      user?.id === donationUserId ||
      (hasRole('charity') && user?.id === campaignCharityUserId)
    );
  };

  const canEditProfile = (profileUserId: string) => {
    return hasRole('admin') || user?.id === profileUserId;
  };

  return {
    user,
    canAccessAdmin,
    canAccessCharity,
    canAccessDonor,
    canCreateCampaign,
    canManageUsers,
    canVerifyCharities,
    canViewAuditLogs,
    canProcessRefunds,
    canEditCampaign,
    canViewDonation,
    canEditProfile,
    isVerified,
  };
};

/**
 * Rate Limiting Hook
 * Simple client-side rate limiting for API calls
 */
export const useRateLimit = (maxRequests: number = 5, windowMs: number = 60000) => {
  const [requests, setRequests] = useState<number[]>([]);

  const isRateLimited = () => {
    const now = Date.now();
    const windowStart = now - windowMs;
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    return recentRequests.length >= maxRequests;
  };

  const addRequest = () => {
    const now = Date.now();
    const windowStart = now - windowMs;
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    setRequests([...recentRequests, now]);
  };

  const getRemainingRequests = () => {
    const now = Date.now();
    const windowStart = now - windowMs;
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    return Math.max(0, maxRequests - recentRequests.length);
  };

  const getResetTime = () => {
    if (requests.length === 0) return null;
    const oldestRequest = Math.min(...requests);
    return oldestRequest + windowMs;
  };

  return {
    isRateLimited: isRateLimited(),
    remainingRequests: getRemainingRequests(),
    resetTime: getResetTime(),
    addRequest,
  };
};

/**
 * Security Context for CSRF protection and other security measures
 */
interface SecurityContextType {
  csrfToken: string | null;
  generateCSRFToken: () => string;
  validateCSRFToken: (token: string) => boolean;
}

const SecurityContext = React.createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);

  const generateCSRFToken = () => {
    const token = Math.random().toString(36).substr(2) + Date.now().toString(36);
    setCSRFToken(token);
    return token;
  };

  const validateCSRFToken = (token: string) => {
    return token === csrfToken;
  };

  useEffect(() => {
    generateCSRFToken();
  }, []);

  const value: SecurityContextType = {
    csrfToken,
    generateCSRFToken,
    validateCSRFToken,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const context = React.useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

/**
 * Input Sanitization Hook
 */
export const useSanitization = () => {
  const sanitizeHtml = (input: string): string => {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  const sanitizeInput = (input: string): string => {
    return input
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[<>]/g, '');
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return {
    sanitizeHtml,
    sanitizeInput,
    validateEmail,
    validateUrl,
  };
};
