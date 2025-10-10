/**
 * Auth Helper Utilities
 * Provides helper functions for authentication and session management
 */

import { supabase } from '../lib/supabase';

/**
 * Wait for Supabase auth to be fully ready before making RLS-dependent queries
 * This ensures the server-side auth context is synchronized
 *
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 5000ms)
 * @param pollIntervalMs - How often to check in milliseconds (default: 100ms)
 * @returns Promise that resolves when auth is ready or rejects on timeout
 */
export const waitForAuthReady = async (
  maxWaitMs: number = 5000,
  pollIntervalMs: number = 100
): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Check if we have a valid session with a user
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('[authHelper] Auth check error:', error.message);
        // Wait a bit before trying again
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      // If we have a session with a user and access token, auth is ready
      if (session?.user?.id && session?.access_token) {
        console.log('[authHelper] Auth is ready for user:', session.user.id);
        return true;
      }

      // If no session, return false immediately (not logged in)
      if (!session) {
        console.log('[authHelper] No session found, user not authenticated');
        return false;
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    } catch (error) {
      console.error('[authHelper] Error checking auth readiness:', error);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
  }

  // Timeout reached
  console.warn('[authHelper] Auth readiness check timed out after', maxWaitMs, 'ms');
  return false;
};

/**
 * Retry a function with exponential backoff
 * Useful for handling transient errors during auth state transitions
 *
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelayMs - Initial delay in milliseconds (default: 500)
 * @param maxDelayMs - Maximum delay between retries (default: 4000)
 * @returns Promise with the result of the function
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 500,
  maxDelayMs: number = 4000
): Promise<T> => {
  let lastError: Error | null = null;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[authHelper] Retry attempt ${attempt}/${maxRetries}`);
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[authHelper] Attempt ${attempt} failed:`, error);

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Wait before retrying (exponential backoff)
      console.log(`[authHelper] Waiting ${delayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));

      // Increase delay for next attempt (exponential backoff)
      delayMs = Math.min(delayMs * 2, maxDelayMs);
    }
  }

  // This should never be reached, but just in case
  throw lastError || new Error('Retry failed');
};

/**
 * Combine auth readiness check with retry logic
 * First waits for auth to be ready, then retries the function with backoff
 *
 * @param fn - The async function to execute
 * @param options - Configuration options
 * @returns Promise with the result of the function
 */
export const executeWithAuthRetry = async <T>(
  fn: () => Promise<T>,
  options: {
    waitForAuth?: boolean;
    maxAuthWaitMs?: number;
    maxRetries?: number;
    initialDelayMs?: number;
  } = {}
): Promise<T> => {
  const {
    waitForAuth = true,
    maxAuthWaitMs = 5000,
    maxRetries = 3,
    initialDelayMs = 500,
  } = options;

  // First, wait for auth to be ready (if enabled)
  if (waitForAuth) {
    console.log('[authHelper] Waiting for auth to be ready...');
    const authReady = await waitForAuthReady(maxAuthWaitMs);
    if (!authReady) {
      throw new Error('Authentication not ready - please ensure you are logged in');
    }
  }

  // Then execute the function with retry logic
  return await retryWithBackoff(fn, maxRetries, initialDelayMs);
};
