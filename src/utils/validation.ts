/**
 * Input validation utilities using Zod
 * Provides comprehensive validation schemas for all data types
 */

import { z } from 'zod';
import { UserRole, CampaignStatus, DonationStatus, VerificationStatus, MilestoneStatus } from '../lib/types';
import { createValidationError } from './errors';

// ===== COMMON VALIDATIONS =====

export const emailSchema = z
  .string()
  .email('Please enter a valid email address')
  .min(1, 'Email is required');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const phoneSchema = z
  .string()
  .regex(/^[+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
  .optional();

export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .optional()
  .or(z.literal(''));

export const positiveNumberSchema = z
  .number()
  .positive('Amount must be greater than 0');

export const nonNegativeNumberSchema = z
  .number()
  .min(0, 'Amount cannot be negative');

// ===== ENUM VALIDATIONS =====

export const userRoleSchema = z.enum(['admin', 'charity', 'donor'] as const);
export const campaignStatusSchema = z.enum(['draft', 'active', 'paused', 'completed', 'cancelled'] as const);
export const donationStatusSchema = z.enum(['pending', 'completed', 'failed', 'refunded'] as const);
export const verificationStatusSchema = z.enum(['pending', 'under_review', 'approved', 'rejected', 'resubmission_required'] as const);
export const milestoneStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'verified'] as const);

// ===== AUTHENTICATION SCHEMAS =====

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long'),
  role: userRoleSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long').optional(),
  avatarUrl: urlSchema,
});

export const donorProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long'),
  email: emailSchema,
  phone: phoneSchema,
  isAnonymous: z.boolean().optional(),
});

export const charityProfileSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(200, 'Organization name is too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description is too long'),
  websiteUrl: urlSchema,
  contactEmail: emailSchema,
  contactPhone: phoneSchema,
  address: z.string().min(10, 'Address must be at least 10 characters').max(500, 'Address is too long'),
  registrationNumber: z.string().min(1, 'Registration number is required').max(50, 'Registration number is too long'),
  contactPersonName: z.string().min(2, 'Contact person name must be at least 2 characters').max(100, 'Contact person name is too long'),
  contactPersonEmail: emailSchema,
  contactPersonPhone: phoneSchema,
});

export const adminProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name is too long'),
  email: emailSchema,
  phone: phoneSchema,
  department: z.string().min(2, 'Department must be at least 2 characters').max(100, 'Department is too long').optional(),
  position: z.string().min(2, 'Position must be at least 2 characters').max(100, 'Position is too long').optional(),
});

// ===== CHARITY SCHEMAS =====

export const charityRegistrationSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(200, 'Organization name is too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description is too long'),
  websiteUrl: urlSchema,
  phone: phoneSchema,
  address: z.string().min(10, 'Address must be at least 10 characters').max(500, 'Address is too long').optional(),
  registrationNumber: z.string().min(1, 'Registration number is required').max(50, 'Registration number is too long').optional(),
});

export const charityUpdateSchema = charityRegistrationSchema.partial();

export const charityVerificationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization ID'),
  status: verificationStatusSchema,
  notes: z.string().max(1000, 'Notes are too long').optional(),
});

// ===== CAMPAIGN SCHEMAS =====

export const campaignCreateSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title is too long'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000, 'Description is too long'),
  goalAmount: positiveNumberSchema.max(10000000, 'Goal amount is too large'),
  category: z.string().min(1, 'Category is required').max(50, 'Category is too long').optional(),
  location: z.string().min(2, 'Location must be at least 2 characters').max(100, 'Location is too long').optional(),
  startDate: z.string().datetime('Invalid start date').optional(),
  endDate: z.string().datetime('Invalid end date').optional(),
  milestones: z.array(z.object({
    title: z.string().min(3, 'Milestone title must be at least 3 characters').max(200, 'Milestone title is too long'),
    description: z.string().min(10, 'Milestone description must be at least 10 characters').max(1000, 'Milestone description is too long'),
    targetAmount: positiveNumberSchema,
    evidenceDescription: z.string().max(500, 'Evidence description is too long').optional(),
  })).min(1, 'At least one milestone is required').optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const campaignUpdateSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title is too long').optional(),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000, 'Description is too long').optional(),
  goalAmount: positiveNumberSchema.max(10000000, 'Goal amount is too large').optional(),
  category: z.string().min(1, 'Category is required').max(50, 'Category is too long').optional(),
  location: z.string().min(2, 'Location must be at least 2 characters').max(100, 'Location is too long').optional(),
  startDate: z.string().datetime('Invalid start date').optional(),
  endDate: z.string().datetime('Invalid end date').optional(),
  status: campaignStatusSchema.optional(),
  currentAmount: nonNegativeNumberSchema.optional(),
});

export const campaignFilterSchema = z.object({
  status: z.array(campaignStatusSchema).optional(),
  category: z.array(z.string()).optional(),
  location: z.array(z.string()).optional(),
  minGoal: nonNegativeNumberSchema.optional(),
  maxGoal: positiveNumberSchema.optional(),
  search: z.string().max(100, 'Search term is too long').optional(),
});

// ===== DONATION SCHEMAS =====

export const donationCreateSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  amount: positiveNumberSchema.max(1000000, 'Donation amount is too large'),
  paymentMethod: z.string().min(1, 'Payment method is required').max(50, 'Payment method name is too long'),
  message: z.string().max(500, 'Message is too long').optional(),
  isAnonymous: z.boolean().default(false),
});

export const donationUpdateSchema = z.object({
  status: donationStatusSchema,
  transactionId: z.string().max(100, 'Transaction ID is too long').optional(),
});

export const donationFilterSchema = z.object({
  status: z.array(donationStatusSchema).optional(),
  campaignId: z.string().uuid('Invalid campaign ID').optional(),
  minAmount: nonNegativeNumberSchema.optional(),
  maxAmount: positiveNumberSchema.optional(),
  dateFrom: z.string().datetime('Invalid from date').optional(),
  dateTo: z.string().datetime('Invalid to date').optional(),
});

// ===== MILESTONE SCHEMAS =====

export const milestoneCreateSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000, 'Description is too long'),
  targetAmount: positiveNumberSchema,
  evidenceDescription: z.string().max(500, 'Evidence description is too long').optional(),
});

export const milestoneUpdateSchema = milestoneCreateSchema.partial().extend({
  status: milestoneStatusSchema.optional(),
  verificationNotes: z.string().max(1000, 'Verification notes are too long').optional(),
});

export const milestoneVerificationSchema = z.object({
  status: z.enum(['approved', 'rejected'] as const),
  notes: z.string().min(1, 'Verification notes are required').max(1000, 'Verification notes are too long'),
});

// ===== PAGINATION SCHEMA =====

export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.string().max(50, 'Sort field name is too long').optional(),
  sortOrder: z.enum(['asc', 'desc'] as const).default('desc'),
});

// ===== FILE UPLOAD SCHEMAS =====

export const fileUploadSchema = z.object({
  file: z.instanceof(File, 'Invalid file'),
  maxSize: z.number().positive().default(5 * 1024 * 1024), // 5MB default
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp']),
});

export const documentUploadSchema = fileUploadSchema.extend({
  allowedTypes: z.array(z.string()).default(['application/pdf', 'image/jpeg', 'image/png']),
  maxSize: z.number().positive().default(10 * 1024 * 1024), // 10MB for documents
});

// ===== VALIDATION UTILITIES =====

/**
 * Validate data against a schema and throw formatted error if invalid
 */
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw createValidationError(
        firstError.path.join('.'),
        firstError.message,
        data
      );
    }
    throw error;
  }
};

/**
 * Validate data and return result with success/error info
 */
export const safeValidateData = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
};

/**
 * Validate file upload
 */
export const validateFile = (
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } => {
  const maxSize = options.maxSize || 5 * 1024 * 1024; // 5MB default
  const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/webp'];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type "${file.type}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[<>]/g, ''); // Remove potential HTML tags
};

/**
 * Validate and sanitize email
 */
export const validateAndSanitizeEmail = (email: string): string => {
  const sanitized = sanitizeString(email.toLowerCase());
  validateData(emailSchema, sanitized);
  return sanitized;
};

/**
 * Validate UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate date string
 */
export const isValidDateString = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString();
};

/**
 * Custom validation for business rules
 */
export const validateCampaignDates = (startDate?: string, endDate?: string): boolean => {
  if (!startDate || !endDate) return true;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  // Start date should not be in the past (with 1 hour grace period)
  if (start.getTime() < now.getTime() - 60 * 60 * 1000) {
    throw createValidationError('startDate', 'Start date cannot be in the past');
  }
  
  // End date should be after start date
  if (end.getTime() <= start.getTime()) {
    throw createValidationError('endDate', 'End date must be after start date');
  }
  
  // Campaign should not be longer than 2 years
  const maxDuration = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years in milliseconds
  if (end.getTime() - start.getTime() > maxDuration) {
    throw createValidationError('endDate', 'Campaign duration cannot exceed 2 years');
  }
  
  return true;
};

/**
 * Validate milestone amounts against campaign goal
 */
export const validateMilestoneAmounts = (
  milestones: Array<{ targetAmount: number }>,
  goalAmount: number
): boolean => {
  if (!milestones.length) return true;
  
  const totalMilestoneAmount = milestones.reduce((sum, milestone) => sum + milestone.targetAmount, 0);
  
  if (totalMilestoneAmount > goalAmount) {
    throw createValidationError(
      'milestones',
      'Total milestone amounts cannot exceed campaign goal'
    );
  }
  
  return true;
};
