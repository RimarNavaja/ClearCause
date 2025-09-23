/**
 * Session Manager - Complete session isolation utilities
 * Helps prevent cross-account contamination when switching between accounts
 * Enhanced version with Supabase client reset and hard navigation
 */

import { supabase } from '@/lib/supabase';

/**
 * Completely clears all browser storage and session data
 * Use this for complete session isolation when switching accounts
 */
export const clearAllBrowserData = (): void => {
  console.log('[SessionManager] Starting complete browser data clear...');

  try {
    // Clear localStorage
    const localStorageKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageKeys.push(key);
      }
    }
    localStorageKeys.forEach(key => localStorage.removeItem(key));
    console.log('[SessionManager] Cleared localStorage keys:', localStorageKeys.length);

    // Clear sessionStorage
    const sessionStorageKeys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        sessionStorageKeys.push(key);
      }
    }
    sessionStorageKeys.forEach(key => sessionStorage.removeItem(key));
    console.log('[SessionManager] Cleared sessionStorage keys:', sessionStorageKeys.length);

    // Clear all cookies
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      const cleanName = name.trim();

      // Clear for current path and domain
      document.cookie = `${cleanName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${cleanName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;

      // Clear for parent domains
      const parts = window.location.hostname.split('.');
      for (let i = 1; i < parts.length; i++) {
        const domain = '.' + parts.slice(i).join('.');
        document.cookie = `${cleanName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${domain}`;
      }
    });
    console.log('[SessionManager] Cleared all cookies');

    // Clear IndexedDB (if used)
    if ('indexedDB' in window) {
      try {
        // This is a basic clear - in a real app you might want to be more selective
        indexedDB.databases?.().then(databases => {
          databases.forEach(db => {
            if (db.name?.includes('supabase') || db.name?.includes('auth')) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
        console.log('[SessionManager] Cleared relevant IndexedDB databases');
      } catch (idbError) {
        console.warn('[SessionManager] IndexedDB clear failed:', idbError);
      }
    }

    console.log('[SessionManager] Complete browser data clear finished');
  } catch (error) {
    console.error('[SessionManager] Error during browser data clear:', error);
  }
};

/**
 * NUCLEAR session clearing - completely destroys all Supabase state
 * This is the most aggressive approach to prevent session contamination
 */
export const nuclearSupabaseReset = async (): Promise<void> => {
  console.log('[SessionManager] NUCLEAR: Starting complete Supabase reset...');

  try {
    // Step 1: Force global logout
    await supabase.auth.signOut({ scope: 'global' });

    // Step 2: Override Supabase's storage mechanism
    const originalStorage = (supabase.auth as any).storage;
    if (originalStorage) {
      try {
        // Clear all storage keys
        const keys = await originalStorage.getItem('supabase.auth.token');
        if (keys) {
          await originalStorage.removeItem('supabase.auth.token');
        }
        // Clear any other auth keys
        await originalStorage.removeItem('supabase.auth.refresh_token');
        await originalStorage.removeItem('supabase.auth.user');
        console.log('[SessionManager] NUCLEAR: Cleared Supabase storage');
      } catch (storageError) {
        console.warn('[SessionManager] NUCLEAR: Storage clear failed:', storageError);
      }
    }

    // Step 3: Reset internal auth client state
    if (supabase.auth && (supabase.auth as any)._removeSession) {
      await (supabase.auth as any)._removeSession();
    }

    // Step 4: Force reset auth state to null
    if (supabase.auth && (supabase.auth as any).currentSession) {
      (supabase.auth as any).currentSession = null;
    }
    if (supabase.auth && (supabase.auth as any).currentUser) {
      (supabase.auth as any).currentUser = null;
    }

    // Step 5: Clear any cached promises or callbacks
    if (supabase.auth && (supabase.auth as any)._authPromise) {
      (supabase.auth as any)._authPromise = null;
    }

    console.log('[SessionManager] NUCLEAR: Supabase reset completed');
  } catch (error) {
    console.error('[SessionManager] NUCLEAR: Reset failed:', error);
  }
};

/**
 * Completely resets the Supabase client internal state
 * This clears any cached authentication data in memory
 */
export const resetSupabaseClient = async (): Promise<void> => {
  console.log('[SessionManager] Resetting Supabase client state...');

  try {
    // Use nuclear approach for more thorough clearing
    await nuclearSupabaseReset();

    // Additional cleanup - force a fresh auth state check
    setTimeout(async () => {
      try {
        await supabase.auth.getSession();
      } catch (error) {
        console.warn('[SessionManager] Post-reset session check failed:', error);
      }
    }, 100);

    console.log('[SessionManager] Supabase client reset completed');
  } catch (error) {
    console.warn('[SessionManager] Supabase client reset failed:', error);
  }
};

/**
 * Forces a complete page reload with cache busting
 * This ensures no cached JavaScript state remains
 */
export const forcePageReload = (): void => {
  console.log('[SessionManager] Forcing page reload with cache bust...');

  // Add cache busting parameter
  const url = new URL(window.location.href);
  url.searchParams.set('_clear', Date.now().toString());

  // Force reload from server (not cache)
  window.location.href = url.toString();
};

/**
 * NUCLEAR logout - the most aggressive session clearing possible
 * Clears everything and forces a fresh start with hard navigation
 */
export const performCompleteLogout = async (redirectUrl: string = '/login'): Promise<void> => {
  console.log('[SessionManager] 🚀 NUCLEAR LOGOUT: Starting complete session destruction...');

  try {
    // Step 1: NUCLEAR Supabase reset (most aggressive)
    await nuclearSupabaseReset();

    // Step 2: Clear ALL browser data
    clearAllBrowserData();

    // Step 3: Additional aggressive clearing
    try {
      // Clear window variables that might hold auth state
      (window as any).supabase = null;
      (window as any).supabaseClient = null;

      // Clear any React state that might be cached
      if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = null;
      }

      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }

      console.log('[SessionManager] NUCLEAR: Additional cleanup completed');
    } catch (cleanupError) {
      console.warn('[SessionManager] NUCLEAR: Additional cleanup failed:', cleanupError);
    }

    // Step 4: Clear browser history to prevent back button issues
    try {
      // Clear browser history
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Clear any stored navigation state
      if (window.history.state) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      console.log('[SessionManager] NUCLEAR: Browser history cleared');
    } catch (historyError) {
      console.warn('[SessionManager] NUCLEAR: History clear failed:', historyError);
    }

    // Step 5: Add session isolation stamp
    const sessionStamp = Date.now().toString();

    // Step 6: Force HARD navigation with cache busting and no-cache headers
    const url = new URL(redirectUrl, window.location.origin);
    url.searchParams.set('_nuclear', sessionStamp);
    url.searchParams.set('_logout', sessionStamp);
    url.searchParams.set('_clear', sessionStamp);
    url.searchParams.set('_nocache', sessionStamp);

    console.log('[SessionManager] 🚀 NUCLEAR LOGOUT completed, navigating to:', url.toString());

    // Use multiple approaches to ensure navigation works
    try {
      // Method 1: Replace current history entry
      window.location.replace(url.toString());
    } catch (navError) {
      console.warn('[SessionManager] NUCLEAR: Replace failed, trying assign:', navError);
      // Method 2: Assign new location
      window.location.assign(url.toString());
    }

    // Method 3: Fallback hard reload after a delay
    setTimeout(() => {
      if (window.location.href.indexOf(redirectUrl) === -1) {
        console.warn('[SessionManager] NUCLEAR: Navigation failed, forcing reload');
        window.location.href = url.toString();
      }
    }, 1000);

  } catch (error) {
    console.error('[SessionManager] 🚀 NUCLEAR LOGOUT failed, attempting emergency fallback:', error);

    // EMERGENCY FALLBACK - most basic but reliable method
    try {
      clearAllBrowserData();
      const emergencyUrl = new URL(redirectUrl, window.location.origin);
      emergencyUrl.searchParams.set('_emergency', Date.now().toString());

      // Force immediate navigation
      window.location.href = emergencyUrl.toString();
    } catch (emergencyError) {
      console.error('[SessionManager] NUCLEAR: Even emergency fallback failed:', emergencyError);
      // Last resort - reload current page
      window.location.reload();
    }
  }
};

/**
 * Check if we're in a fresh session (no previous auth data)
 */
export const isFreshSession = (): boolean => {
  try {
    // Check for any auth-related data
    const hasLocalAuth = Object.keys(localStorage).some(key =>
      key.includes('supabase') || key.includes('auth') || key.includes('session')
    );

    const hasSessionAuth = Object.keys(sessionStorage).some(key =>
      key.includes('supabase') || key.includes('auth') || key.includes('session')
    );

    const hasAuthCookies = document.cookie.split(';').some(cookie =>
      cookie.trim().includes('supabase') || cookie.trim().includes('auth')
    );

    // Check for logout stamp from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hasLogoutStamp = urlParams.has('_logout') || urlParams.has('_clear');

    const isFresh = !hasLocalAuth && !hasSessionAuth && !hasAuthCookies;
    console.log('[SessionManager] Fresh session check:', {
      isFresh,
      hasLocalAuth,
      hasSessionAuth,
      hasAuthCookies,
      hasLogoutStamp
    });

    return isFresh;
  } catch (error) {
    console.warn('[SessionManager] Fresh session check failed:', error);
    return false;
  }
};

/**
 * Check if current session might be contaminated by previous account
 */
export const isSessionContaminated = (): boolean => {
  try {
    // Check for logout stamp that indicates we just completed a logout
    const urlParams = new URLSearchParams(window.location.search);
    const logoutStamp = urlParams.get('_logout');
    const clearStamp = urlParams.get('_clear');

    // If we have logout stamps but still have auth data, session is contaminated
    if ((logoutStamp || clearStamp) && !isFreshSession()) {
      console.warn('[SessionManager] Session contamination detected - auth data present after logout');
      return true;
    }

    // Check for mismatched timestamp stamps that suggest cached data
    const storedStamp = sessionStorage.getItem('_logout_stamp');
    if (storedStamp && logoutStamp && storedStamp !== logoutStamp) {
      console.warn('[SessionManager] Session contamination detected - timestamp mismatch');
      return true;
    }

    return false;
  } catch (error) {
    console.warn('[SessionManager] Session contamination check failed:', error);
    return false;
  }
};

/**
 * Force cleanup if session contamination is detected
 */
export const forceCleanupIfContaminated = (): void => {
  if (isSessionContaminated()) {
    console.warn('[SessionManager] Forcing cleanup due to session contamination');
    clearAllBrowserData();

    // Remove URL parameters and reload
    const url = new URL(window.location.href);
    url.searchParams.delete('_logout');
    url.searchParams.delete('_clear');
    url.searchParams.set('_force_clean', Date.now().toString());

    window.location.replace(url.toString());
  }
};

/**
 * Add session isolation parameter to URL for cache busting
 */
export const addSessionIsolationParam = (url: string): string => {
  const urlObj = new URL(url, window.location.origin);
  urlObj.searchParams.set('_session', Date.now().toString());
  return urlObj.toString();
};

/**
 * Force hard page reload after successful login to ensure fresh state
 */
export const performPostLoginReload = (targetUrl: string, userRole: string): void => {
  console.log('[SessionManager] 🎯 POST-LOGIN: Starting hard reload for fresh auth state...');

  try {
    // Clear any cached auth data that might interfere
    const keysToCheck = Object.keys(localStorage);
    keysToCheck.forEach(key => {
      if (key.includes('auth-cache') || key.includes('user-cache')) {
        localStorage.removeItem(key);
      }
    });

    // Add post-login parameters for verification
    const url = new URL(targetUrl, window.location.origin);
    url.searchParams.set('_login_success', Date.now().toString());
    url.searchParams.set('_role', userRole);
    url.searchParams.set('_fresh', 'true');

    console.log('[SessionManager] 🎯 POST-LOGIN: Navigating to fresh auth state:', url.toString());

    // Force complete page reload to ensure fresh React state
    window.location.href = url.toString();
  } catch (error) {
    console.error('[SessionManager] POST-LOGIN: Reload failed:', error);
    // Fallback to simple navigation
    window.location.href = targetUrl;
  }
};

/**
 * Debounce utility to prevent concurrent auth calls
 */
let authCallInProgress = false;
let authCallTimeout: NodeJS.Timeout | null = null;

export const debounceAuthCall = async <T>(
  authFunction: () => Promise<T>,
  delay: number = 500
): Promise<T | null> => {
  if (authCallInProgress) {
    console.warn('[SessionManager] Auth call already in progress, debouncing...');
    return null;
  }

  authCallInProgress = true;

  try {
    // Clear any existing timeout
    if (authCallTimeout) {
      clearTimeout(authCallTimeout);
    }

    // Set timeout to release the lock
    authCallTimeout = setTimeout(() => {
      authCallInProgress = false;
    }, delay);

    const result = await authFunction();

    // Clear timeout and release lock immediately on success
    if (authCallTimeout) {
      clearTimeout(authCallTimeout);
    }
    authCallInProgress = false;

    return result;
  } catch (error) {
    // Clear timeout and release lock on error
    if (authCallTimeout) {
      clearTimeout(authCallTimeout);
    }
    authCallInProgress = false;
    throw error;
  }
};