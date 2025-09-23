/**
 * Centralized Authentication Error Handler
 * Provides standardized error handling for authentication operations
 */

import { ClearCauseError } from '../lib/types';

export interface AuthErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  shouldLogout?: boolean;
  shouldRetry?: boolean;
}

/**
 * Authentication error mapping
 */
const AUTH_ERROR_MAP: Record<string, AuthErrorInfo> = {
  // Supabase Auth Errors
  'invalid_credentials': {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password',
    userMessage: 'Invalid email or password. Please check your credentials and try again.',
    severity: 'low',
    shouldRetry: true,
  },
  'email_not_confirmed': {
    code: 'EMAIL_NOT_CONFIRMED',
    message: 'Email not confirmed',
    userMessage: 'Please verify your email address before signing in.',
    severity: 'medium',
  },
  'signup_disabled': {
    code: 'SIGNUP_DISABLED',
    message: 'Sign up is disabled',
    userMessage: 'Account registration is currently disabled. Please contact support.',
    severity: 'high',
  },
  'weak_password': {
    code: 'WEAK_PASSWORD',
    message: 'Password is too weak',
    userMessage: 'Please choose a stronger password with at least 8 characters.',
    severity: 'low',
    shouldRetry: true,
  },
  'email_already_registered': {
    code: 'EMAIL_ALREADY_REGISTERED',
    message: 'Email already registered',
    userMessage: 'An account with this email already exists. Try signing in instead.',
    severity: 'low',
  },
  'session_not_found': {
    code: 'SESSION_NOT_FOUND',
    message: 'Session not found',
    userMessage: 'Your session has expired. Please sign in again.',
    severity: 'medium',
    shouldLogout: true,
  },
  'invalid_session': {
    code: 'INVALID_SESSION',
    message: 'Invalid session',
    userMessage: 'Your session is invalid. Please sign in again.',
    severity: 'medium',
    shouldLogout: true,
  },
  'refresh_token_not_found': {
    code: 'REFRESH_TOKEN_NOT_FOUND',
    message: 'Refresh token not found',
    userMessage: 'Your session has expired. Please sign in again.',
    severity: 'medium',
    shouldLogout: true,
  },
  'network_error': {
    code: 'NETWORK_ERROR',
    message: 'Network connection error',
    userMessage: 'Connection error. Please check your internet connection and try again.',
    severity: 'medium',
    shouldRetry: true,
  },
  'server_error': {
    code: 'SERVER_ERROR',
    message: 'Server error',
    userMessage: 'A server error occurred. Please try again later.',
    severity: 'high',
    shouldRetry: true,
  },
  'rate_limit_exceeded': {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests',
    userMessage: 'Too many attempts. Please wait a moment before trying again.',
    severity: 'medium',
  },
  'database_error': {
    code: 'DATABASE_ERROR',
    message: 'Database error',
    userMessage: 'A database error occurred. Please try again or contact support.',
    severity: 'high',
  },
  'profile_not_found': {
    code: 'PROFILE_NOT_FOUND',
    message: 'User profile not found',
    userMessage: 'Your user profile could not be found. Please contact support.',
    severity: 'critical',
    shouldLogout: true,
  },
  'profile_creation_failed': {
    code: 'PROFILE_CREATION_FAILED',
    message: 'Failed to create user profile',
    userMessage: 'Failed to create your profile. Please try again or contact support.',
    severity: 'high',
  },
};

/**
 * Default error for unknown cases
 */
const DEFAULT_AUTH_ERROR: AuthErrorInfo = {
  code: 'UNKNOWN_AUTH_ERROR',
  message: 'Unknown authentication error',
  userMessage: 'An unexpected error occurred. Please try again or contact support.',
  severity: 'high',
  shouldRetry: true,
};

/**
 * Parse and handle authentication errors
 */
export function handleAuthError(error: any): AuthErrorInfo {
  let errorKey = 'unknown';

  if (error instanceof ClearCauseError) {
    errorKey = error.code.toLowerCase();
  } else if (error?.message) {
    // Map common Supabase error messages
    const message = error.message.toLowerCase();

    if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
      errorKey = 'invalid_credentials';
    } else if (message.includes('email not confirmed')) {
      errorKey = 'email_not_confirmed';
    } else if (message.includes('signup disabled')) {
      errorKey = 'signup_disabled';
    } else if (message.includes('weak password') || message.includes('password is too weak')) {
      errorKey = 'weak_password';
    } else if (message.includes('user already registered') || message.includes('email already registered')) {
      errorKey = 'email_already_registered';
    } else if (message.includes('session_not_found') || message.includes('session not found')) {
      errorKey = 'session_not_found';
    } else if (message.includes('invalid_session') || message.includes('session invalid')) {
      errorKey = 'invalid_session';
    } else if (message.includes('refresh_token_not_found') || message.includes('refresh token')) {
      errorKey = 'refresh_token_not_found';
    } else if (message.includes('network') || message.includes('fetch')) {
      errorKey = 'network_error';
    } else if (message.includes('server error') || message.includes('internal error')) {
      errorKey = 'server_error';
    } else if (message.includes('too many requests') || message.includes('rate limit')) {
      errorKey = 'rate_limit_exceeded';
    } else if (message.includes('database') || message.includes('connection')) {
      errorKey = 'database_error';
    } else if (message.includes('profile not found')) {
      errorKey = 'profile_not_found';
    }
  }

  const errorInfo = AUTH_ERROR_MAP[errorKey] || DEFAULT_AUTH_ERROR;

  // Log error for monitoring (only in development or with proper logging service)
  if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_ERROR_LOGGING === 'true') {
    console.error('[AuthError]', {
      originalError: error,
      mappedError: errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }

  return errorInfo;
}

/**
 * Create user-friendly error message
 */
export function getAuthErrorMessage(error: any): string {
  const errorInfo = handleAuthError(error);
  return errorInfo.userMessage;
}

/**
 * Check if error should trigger logout
 */
export function shouldLogoutOnError(error: any): boolean {
  const errorInfo = handleAuthError(error);
  return errorInfo.shouldLogout || false;
}

/**
 * Check if error suggests retry
 */
export function shouldRetryOnError(error: any): boolean {
  const errorInfo = handleAuthError(error);
  return errorInfo.shouldRetry || false;
}

/**
 * Get error severity
 */
export function getAuthErrorSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
  const errorInfo = handleAuthError(error);
  return errorInfo.severity;
}

/**
 * Send error to external monitoring service (placeholder)
 */
export function reportAuthError(error: any, context?: Record<string, any>): void {
  const errorInfo = handleAuthError(error);

  // Only report high and critical errors to avoid noise
  if (errorInfo.severity === 'high' || errorInfo.severity === 'critical') {
    // In a real application, send to your error monitoring service
    // Examples: Sentry, LogRocket, Bugsnag, etc.

    if (import.meta.env.DEV) {
      console.warn('[AuthErrorReporter] Would report error:', {
        error: errorInfo,
        context,
        timestamp: new Date().toISOString(),
      });
    }

    // TODO: Integrate with your error monitoring service
    // Example:
    // Sentry.captureException(error, {
    //   tags: { errorCode: errorInfo.code },
    //   extra: { ...context, errorInfo },
    // });
  }
}