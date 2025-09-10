/**
 * Error handling utilities
 * Provides standardized error handling and response formatting
 */

import { ClearCauseError, ApiResponse } from '../lib/types';

/**
 * Error codes enum for consistent error handling
 */
export enum ErrorCode {
  // Authentication errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  FOREIGN_KEY_VIOLATION = 'FOREIGN_KEY_VIOLATION',
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',
  
  // File upload errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  
  // Business logic errors
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  CAMPAIGN_INACTIVE = 'CAMPAIGN_INACTIVE',
  MILESTONE_NOT_READY = 'MILESTONE_NOT_READY',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Generic errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Error message mappings
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ErrorCode.UNAUTHORIZED]: 'You must be logged in to perform this action',
  [ErrorCode.FORBIDDEN]: 'You do not have permission to perform this action',
  [ErrorCode.TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  
  [ErrorCode.VALIDATION_ERROR]: 'The provided data is invalid',
  [ErrorCode.INVALID_INPUT]: 'Invalid input provided',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  
  [ErrorCode.NOT_FOUND]: 'The requested resource was not found',
  [ErrorCode.ALREADY_EXISTS]: 'A resource with this information already exists',
  [ErrorCode.RESOURCE_CONFLICT]: 'This action conflicts with the current state',
  
  [ErrorCode.DATABASE_ERROR]: 'A database error occurred',
  [ErrorCode.FOREIGN_KEY_VIOLATION]: 'Referenced resource does not exist',
  [ErrorCode.UNIQUE_CONSTRAINT_VIOLATION]: 'This value must be unique',
  
  [ErrorCode.FILE_TOO_LARGE]: 'File size exceeds the maximum limit',
  [ErrorCode.INVALID_FILE_TYPE]: 'File type is not supported',
  [ErrorCode.UPLOAD_FAILED]: 'File upload failed',
  
  [ErrorCode.INSUFFICIENT_FUNDS]: 'Insufficient funds for this operation',
  [ErrorCode.CAMPAIGN_INACTIVE]: 'Campaign is not currently active',
  [ErrorCode.MILESTONE_NOT_READY]: 'Milestone is not ready for this action',
  
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later',
  
  [ErrorCode.INTERNAL_ERROR]: 'An internal server error occurred',
  [ErrorCode.NETWORK_ERROR]: 'Network error occurred',
  [ErrorCode.TIMEOUT]: 'Request timed out',
};

/**
 * Create a standardized error response
 */
export const createErrorResponse = <T = any>(
  code: ErrorCode,
  message?: string,
  details?: any
): ApiResponse<T> => {
  return {
    success: false,
    error: message || ErrorMessages[code],
    data: undefined,
  };
};

/**
 * Create a standardized success response
 */
export const createSuccessResponse = <T = any>(
  data?: T,
  message?: string
): ApiResponse<T> => {
  return {
    success: true,
    data,
    message,
  };
};

/**
 * Handle Supabase errors and convert to standardized format
 */
export const handleSupabaseError = (error: any): ClearCauseError => {
  console.error('Supabase error:', error);
  
  // Handle specific Supabase error codes
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique constraint violation
        return new ClearCauseError(
          ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
          'This value already exists',
          409,
          error
        );
      
      case '23503': // Foreign key violation
        return new ClearCauseError(
          ErrorCode.FOREIGN_KEY_VIOLATION,
          'Referenced resource does not exist',
          400,
          error
        );
      
      case 'PGRST116': // Not found
        return new ClearCauseError(
          ErrorCode.NOT_FOUND,
          'Resource not found',
          404,
          error
        );
      
      default:
        return new ClearCauseError(
          ErrorCode.DATABASE_ERROR,
          error.message || 'Database error occurred',
          500,
          error
        );
    }
  }
  
  // Handle auth errors
  if (error.message?.includes('Invalid login credentials')) {
    return new ClearCauseError(
      ErrorCode.INVALID_CREDENTIALS,
      'Invalid email or password',
      401,
      error
    );
  }
  
  if (error.message?.includes('Email not confirmed')) {
    return new ClearCauseError(
      ErrorCode.UNAUTHORIZED,
      'Please verify your email address before signing in',
      401,
      error
    );
  }
  
  // Generic error
  return new ClearCauseError(
    ErrorCode.INTERNAL_ERROR,
    error.message || 'An unexpected error occurred',
    500,
    error
  );
};

/**
 * Async error wrapper for service functions
 */
export const withErrorHandling = <T extends any[], R>(
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ClearCauseError) {
        throw error;
      }
      
      throw handleSupabaseError(error);
    }
  };
};

/**
 * Validation error helper
 */
export const createValidationError = (
  field: string,
  message: string,
  value?: any
): ClearCauseError => {
  return new ClearCauseError(
    ErrorCode.VALIDATION_ERROR,
    `${field}: ${message}`,
    400,
    { field, value, message }
  );
};

/**
 * Rate limiting error
 */
export const createRateLimitError = (
  resetTime?: number
): ClearCauseError => {
  return new ClearCauseError(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    'Too many requests. Please try again later.',
    429,
    { resetTime }
  );
};

/**
 * File upload error helpers
 */
export const createFileUploadError = (
  reason: 'size' | 'type' | 'upload',
  details?: any
): ClearCauseError => {
  switch (reason) {
    case 'size':
      return new ClearCauseError(
        ErrorCode.FILE_TOO_LARGE,
        'File size exceeds the maximum limit',
        413,
        details
      );
    
    case 'type':
      return new ClearCauseError(
        ErrorCode.INVALID_FILE_TYPE,
        'File type is not supported',
        400,
        details
      );
    
    case 'upload':
      return new ClearCauseError(
        ErrorCode.UPLOAD_FAILED,
        'File upload failed',
        500,
        details
      );
    
    default:
      return new ClearCauseError(
        ErrorCode.UPLOAD_FAILED,
        'File upload failed',
        500,
        details
      );
  }
};

/**
 * Business logic error helpers
 */
export const createBusinessLogicError = (
  type: 'insufficient_funds' | 'campaign_inactive' | 'milestone_not_ready',
  details?: any
): ClearCauseError => {
  switch (type) {
    case 'insufficient_funds':
      return new ClearCauseError(
        ErrorCode.INSUFFICIENT_FUNDS,
        'Insufficient funds for this operation',
        400,
        details
      );
    
    case 'campaign_inactive':
      return new ClearCauseError(
        ErrorCode.CAMPAIGN_INACTIVE,
        'Campaign is not currently active',
        400,
        details
      );
    
    case 'milestone_not_ready':
      return new ClearCauseError(
        ErrorCode.MILESTONE_NOT_READY,
        'Milestone is not ready for this action',
        400,
        details
      );
    
    default:
      return new ClearCauseError(
        ErrorCode.INTERNAL_ERROR,
        'Business logic error',
        400,
        details
      );
  }
};

/**
 * Log error for monitoring/debugging
 */
export const logError = (error: Error | ClearCauseError, context?: any): void => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  };
  
  if (error instanceof ClearCauseError) {
    errorInfo['code'] = error.code;
    errorInfo['statusCode'] = error.statusCode;
    errorInfo['details'] = error.details;
  }
  
  // In production, this would be sent to a logging service
  console.error('Error logged:', errorInfo);
  
  // Could integrate with services like Sentry, LogRocket, etc.
  // Sentry.captureException(error, { extra: errorInfo });
};

/**
 * Error boundary helper for React components
 */
export const getErrorBoundaryFallback = (error: Error) => {
  return {
    title: 'Something went wrong',
    message: error instanceof ClearCauseError 
      ? error.message 
      : 'An unexpected error occurred. Please try again.',
    code: error instanceof ClearCauseError ? error.code : ErrorCode.INTERNAL_ERROR,
  };
};
