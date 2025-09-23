/**
 * User Utility Functions
 * Helper functions for user validation and safe operations
 */

import { User } from '../lib/types';

/**
 * Check if user object is properly loaded and valid
 */
export const isUserLoaded = (user: User | null | undefined): user is User => {
  return !!(user && user.id && user.email);
};

/**
 * Get safe user ID - returns null if user is not properly loaded
 */
export const getSafeUserId = (user: User | null | undefined): string | null => {
  return isUserLoaded(user) ? user.id : null;
};

/**
 * Wait for user to be properly loaded (for use in components)
 */
export const waitForUser = (user: User | null | undefined): boolean => {
  if (user === null) {
    // User is explicitly null (not logged in)
    return false;
  }

  if (user === undefined) {
    // User is still loading
    return false;
  }

  // User exists but check if it's properly loaded
  return isUserLoaded(user);
};

/**
 * Validate user for dashboard operations
 */
export const validateUserForDashboard = (user: User | null | undefined): {
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
} => {
  if (user === undefined) {
    return {
      isValid: false,
      isLoading: true,
      error: null
    };
  }

  if (user === null) {
    return {
      isValid: false,
      isLoading: false,
      error: 'Please log in to access your dashboard'
    };
  }

  if (!isUserLoaded(user)) {
    return {
      isValid: false,
      isLoading: true,
      error: 'User profile is still loading...'
    };
  }

  return {
    isValid: true,
    isLoading: false,
    error: null
  };
};