/**
 * File Upload Service
 * Handles file uploads to Supabase Storage with validation and optimization
 */

import { supabase } from '../lib/supabase';
import { ApiResponse, ClearCauseError } from '../lib/types';
import { withErrorHandling, handleSupabaseError, createSuccessResponse } from '../utils/errors';

// Storage bucket names
export const STORAGE_BUCKETS = {
  CAMPAIGN_IMAGES: 'campaign-images',
  MILESTONE_PROOFS: 'milestone-proofs',
  CHARITY_DOCUMENTS: 'charity-documents',
  PROFILE_AVATARS: 'profile-avatars',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

// File validation rules
interface FileValidationRules {
  maxSize: number; // in bytes
  allowedTypes: string[];
  allowedExtensions?: string[];
}

const VALIDATION_RULES: Record<StorageBucket, FileValidationRules> = {
  [STORAGE_BUCKETS.CAMPAIGN_IMAGES]: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  [STORAGE_BUCKETS.MILESTONE_PROOFS]: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
  },
  [STORAGE_BUCKETS.CHARITY_DOCUMENTS]: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
  },
  [STORAGE_BUCKETS.PROFILE_AVATARS]: {
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
};

/**
 * Validate file before upload
 */
export const validateFile = (
  file: File,
  bucket: StorageBucket
): { valid: boolean; error?: string } => {
  const rules = VALIDATION_RULES[bucket];

  // Check file size
  if (file.size > rules.maxSize) {
    const maxSizeMB = (rules.maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  // Check file type
  if (!rules.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${rules.allowedExtensions?.join(', ')}`,
    };
  }

  // Check file extension
  if (rules.allowedExtensions) {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!rules.allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `File extension ${extension} is not allowed. Allowed: ${rules.allowedExtensions.join(', ')}`,
      };
    }
  }

  return { valid: true };
};

/**
 * Generate unique file path
 */
export const generateFilePath = (
  userId: string,
  fileName: string,
  folder?: string
): string => {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const extension = sanitizedFileName.split('.').pop();
  const nameWithoutExt = sanitizedFileName.substring(0, sanitizedFileName.lastIndexOf('.')) || sanitizedFileName;

  const uniqueFileName = `${userId}-${timestamp}-${nameWithoutExt}.${extension}`;

  return folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
};

/**
 * Upload file to storage
 */
export const uploadFile = withErrorHandling(async (
  bucket: StorageBucket,
  file: File,
  options: {
    folder?: string;
    userId?: string;
    customPath?: string;
  } = {}
): Promise<ApiResponse<{ path: string; publicUrl: string }>> => {
  // Validate file
  const validation = validateFile(file, bucket);
  if (!validation.valid) {
    throw new ClearCauseError('VALIDATION_ERROR', validation.error || 'File validation failed', 400);
  }

  // Get current user ID if not provided
  let userId = options.userId;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new ClearCauseError('UNAUTHORIZED', 'User not authenticated', 401);
    }
    userId = user.id;
  }

  // Generate file path
  const filePath = options.customPath || generateFilePath(userId, file.name, options.folder);

  // Upload file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw handleSupabaseError(error);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return createSuccessResponse({
    path: data.path,
    publicUrl: urlData.publicUrl,
  });
});

/**
 * Upload image with optional resizing/optimization
 */
export const uploadImage = withErrorHandling(async (
  bucket: StorageBucket,
  file: File,
  options: {
    folder?: string;
    userId?: string;
    customPath?: string;
    maxWidth?: number;
    maxHeight?: number;
  } = {}
): Promise<ApiResponse<{ path: string; publicUrl: string }>> => {
  // For now, just validate it's an image and upload
  // Future enhancement: add image resizing using canvas API

  if (!file.type.startsWith('image/')) {
    throw new ClearCauseError('VALIDATION_ERROR', 'File must be an image', 400);
  }

  return uploadFile(bucket, file, options);
});

/**
 * Delete file from storage
 */
export const deleteFile = withErrorHandling(async (
  bucket: StorageBucket,
  path: string
): Promise<ApiResponse<void>> => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(undefined);
});

/**
 * Get public URL for a file
 */
export const getPublicUrl = (
  bucket: StorageBucket,
  path: string
): string => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

/**
 * Get signed URL for private files (expires after duration)
 */
export const getSignedUrl = withErrorHandling(async (
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600 // 1 hour default
): Promise<ApiResponse<string>> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data?.signedUrl) {
    throw new ClearCauseError('NOT_FOUND', 'Failed to create signed URL', 404);
  }

  return createSuccessResponse(data.signedUrl);
});

/**
 * List files in a bucket folder
 */
export const listFiles = withErrorHandling(async (
  bucket: StorageBucket,
  folder?: string,
  options: {
    limit?: number;
    offset?: number;
    sortBy?: { column: string; order: 'asc' | 'desc' };
  } = {}
): Promise<ApiResponse<any[]>> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit: options.limit,
      offset: options.offset,
      sortBy: options.sortBy,
    });

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(data || []);
});

/**
 * Upload campaign image
 * Convenience wrapper for campaign image uploads
 */
export const uploadCampaignImage = (
  file: File,
  campaignId?: string
): Promise<ApiResponse<{ path: string; publicUrl: string }>> => {
  return uploadImage(STORAGE_BUCKETS.CAMPAIGN_IMAGES, file, {
    folder: campaignId ? `campaigns/${campaignId}` : 'campaigns',
  });
};

/**
 * Upload milestone proof document
 * Convenience wrapper for milestone proof uploads
 */
export const uploadMilestoneProof = (
  file: File,
  milestoneId: string
): Promise<ApiResponse<{ path: string; publicUrl: string }>> => {
  return uploadFile(STORAGE_BUCKETS.MILESTONE_PROOFS, file, {
    folder: `milestones/${milestoneId}`,
  });
};

/**
 * Upload charity verification document
 * Convenience wrapper for charity document uploads
 */
export const uploadCharityDocument = (
  file: File,
  charityId: string,
  documentType: string
): Promise<ApiResponse<{ path: string; publicUrl: string }>> => {
  return uploadFile(STORAGE_BUCKETS.CHARITY_DOCUMENTS, file, {
    folder: `charities/${charityId}/${documentType}`,
  });
};

/**
 * Upload profile avatar
 * Convenience wrapper for avatar uploads
 */
export const uploadProfileAvatar = (
  file: File
): Promise<ApiResponse<{ path: string; publicUrl: string }>> => {
  return uploadImage(STORAGE_BUCKETS.PROFILE_AVATARS, file, {
    folder: 'avatars',
  });
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Check if file is a PDF
 */
export const isPDFFile = (file: File): boolean => {
  return file.type === 'application/pdf';
};
