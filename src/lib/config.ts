/**
 * Application Configuration
 * Centralizes environment variables and app settings
 */

// Environment Variables - NO FALLBACKS FOR PRODUCTION SAFETY
const requiredEnvVars = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
} as const;

// Check for missing environment variables and warn (don't throw)
const missingEnvVars = Object.entries({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
})
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0 && !import.meta.env.VITE_ALLOW_DEMO_MODE) {
  throw new Error(
    `❌ Missing required environment variables: ${missingEnvVars.join(', ')}\n` +
    '📝 Create a .env.local file with your Supabase credentials.\n' +
    '🔒 For development testing, set VITE_ALLOW_DEMO_MODE=true'
  );
}

if (missingEnvVars.length > 0 && import.meta.env.VITE_ALLOW_DEMO_MODE === 'true') {
  console.warn(
    `⚠️  Running in DEMO MODE - Missing: ${missingEnvVars.join(', ')}\n` +
    '🚨 DO NOT USE IN PRODUCTION'
  );
}

// Application Configuration
export const config = {
  // Supabase
  supabase: {
    url: requiredEnvVars.VITE_SUPABASE_URL || (import.meta.env.VITE_ALLOW_DEMO_MODE === 'true' ? 'https://demo.supabase.co' : ''),
    anonKey: requiredEnvVars.VITE_SUPABASE_ANON_KEY || (import.meta.env.VITE_ALLOW_DEMO_MODE === 'true' ? 'demo-key' : ''),
  },

  // App Settings
  app: {
    name: import.meta.env.VITE_APP_NAME || 'ClearCause',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    environment: import.meta.env.VITE_APP_ENV || 'development',
  },

  // Feature Flags
  features: {
    socialLogin: import.meta.env.VITE_ENABLE_SOCIAL_LOGIN === 'true',
    emailVerification: import.meta.env.VITE_ENABLE_EMAIL_VERIFICATION !== 'false',
    realTime: import.meta.env.VITE_ENABLE_REAL_TIME !== 'false',
    debugMode: import.meta.env.VITE_DEBUG_MODE === 'true',
    demoMode: import.meta.env.VITE_ALLOW_DEMO_MODE === 'true' && import.meta.env.DEV,
  },

  // File Upload Limits
  upload: {
    maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760'), // 10MB
    maxImageSize: parseInt(import.meta.env.VITE_MAX_IMAGE_SIZE || '5242880'), // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedDocumentTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },

  // API Configuration
  api: {
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3'),
  },

  // Pagination Defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // Routes
  routes: {
    home: '/',
    login: '/login',
    signup: '/signup',
    admin: {
      dashboard: '/admin/dashboard',
    },
    charity: {
      dashboard: '/charity/dashboard',
      application: '/signup/charity-application',
    },
    donor: {
      dashboard: '/donor/dashboard',
    },
  },
} as const;

// Development Helpers
export const isDevelopment = config.app.environment === 'development';
export const isProduction = config.app.environment === 'production';

// Debug Logger
export const debugLog = (...args: any[]) => {
  if (config.features.debugMode && isDevelopment) {
    // Debug logging for development only
    console.debug('[DEBUG]', ...args);
  }
};

// Configuration Validation
export const validateConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check Supabase URL format
  try {
    new URL(config.supabase.url);
  } catch {
    errors.push('Invalid VITE_SUPABASE_URL format');
  }

  // Check file size limits
  if (config.upload.maxFileSize <= 0) {
    errors.push('Invalid VITE_MAX_FILE_SIZE - must be greater than 0');
  }

  if (config.upload.maxImageSize <= 0) {
    errors.push('Invalid VITE_MAX_IMAGE_SIZE - must be greater than 0');
  }

  // Check API timeout
  if (config.api.timeout <= 0) {
    errors.push('Invalid VITE_API_TIMEOUT - must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Initialize configuration validation in development
if (isDevelopment) {
  const validation = validateConfig();
  if (!validation.valid) {
    console.warn('Configuration validation warnings:', validation.errors);
  }
  
  debugLog('Configuration loaded:', config);
}
