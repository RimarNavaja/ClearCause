/**
 * Supabase client configuration and utilities
 * This file provides the main Supabase client instance and connection utilities
 */

import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { Database } from './types';
import { config } from './config';

const { supabase: supabaseConfig } = config;

// Create typed Supabase client
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'clearcause-web',
      },
    },
  }
);

/**
 * Connection status checker
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
};

/**
 * Get current session
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Session retrieval failed:', error);
    return null;
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('User retrieval failed:', error);
    return null;
  }
};

/**
 * Sign out user and clear session
 */
export const signOutUser = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Sign out failed:', error);
    return false;
  }
};

/**
 * Upload file to Supabase storage
 */
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File,
  options?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  }
): Promise<{ url: string | null; error: string | null }> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: options?.cacheControl || '3600',
        upsert: options?.upsert || false,
        contentType: options?.contentType || file.type,
      });

    if (error) {
      console.error('File upload error:', error);
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('File upload failed:', error);
    return { url: null, error: 'File upload failed' };
  }
};

/**
 * Delete file from Supabase storage
 */
export const deleteFile = async (
  bucket: string,
  path: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('File deletion error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('File deletion failed:', error);
    return { success: false, error: 'File deletion failed' };
  }
};

/**
 * Get public URL for a file
 */
export const getPublicUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Create a signed URL for private files
 */
export const createSignedUrl = async (
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<{ url: string | null; error: string | null }> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Signed URL creation error:', error);
      return { url: null, error: error.message };
    }

    return { url: data.signedUrl, error: null };
  } catch (error) {
    console.error('Signed URL creation failed:', error);
    return { url: null, error: 'Signed URL creation failed' };
  }
};

/**
 * Health check for Supabase services
 */
export const healthCheck = async (): Promise<{
  database: boolean;
  auth: boolean;
  storage: boolean;
  realtime: boolean;
}> => {
  const results = {
    database: false,
    auth: false,
    storage: false,
    realtime: false,
  };

  // Test database connection
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    results.database = !error;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Test auth service
  try {
    const { error } = await supabase.auth.getSession();
    results.auth = !error;
  } catch (error) {
    console.error('Auth health check failed:', error);
  }

  // Test storage service
  try {
    const { error } = await supabase.storage.listBuckets();
    results.storage = !error;
  } catch (error) {
    console.error('Storage health check failed:', error);
  }

  // Test realtime (basic connection test)
  try {
    results.realtime = supabase.realtime.isConnected();
  } catch (error) {
    console.error('Realtime health check failed:', error);
  }

  return results;
};

/**
 * Batch operation utility
 */
export const batchOperation = async <T>(
  operations: (() => Promise<T>)[],
  batchSize: number = 10
): Promise<T[]> => {
  const results: T[] = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    const batch = operations.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(op => op()));
    results.push(...batchResults);
  }
  
  return results;
};

/**
 * Retry utility for failed operations
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError!;
};

export default supabase;
