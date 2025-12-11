/**
 * Charity Feedback Service
 * Handles charity organization feedback and rating functionality
 */

import { supabase } from '../lib/supabase';
import {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  ClearCauseError,
  CharityFeedback,
  CharityFeedbackStats,
} from '../lib/types';
import {
  withErrorHandling,
  handleSupabaseError,
  createSuccessResponse,
} from '../utils/errors';
import { createPaginatedResponse } from '../utils/helpers';
import { logAuditEvent } from './adminService';
import { getUserProfile } from './userService';

// Service-specific types
export interface FeedbackCreateData {
  charityId: string;
  rating: number;
  comment?: string;
}

export interface FeedbackUpdateData {
  rating?: number;
  comment?: string;
}

export interface FeedbackFilters {
  charityId?: string;
  donorId?: string;
  minRating?: number;
  maxRating?: number;
}

/**
 * Create charity feedback
 * Validates: (1) rating range, (2) donor has donated to charity, (3) no duplicate feedback
 */
export const createFeedback = withErrorHandling(async (
  feedbackData: FeedbackCreateData,
  userId: string
): Promise<ApiResponse<CharityFeedback>> => {
  // Step 1: Validate rating
  if (feedbackData.rating < 1 || feedbackData.rating > 5) {
    throw new ClearCauseError('VALIDATION_ERROR', 'Rating must be between 1 and 5', 400);
  }

  // Step 2: Check if user has donated to ANY campaign of this charity
  // Join donations -> campaigns -> charity
  const { data: donations, error: donationCheckError } = await supabase
    .from('donations')
    .select(`
      id,
      campaign_id,
      campaigns!inner(
        charity_id
      )
    `)
    .eq('user_id', userId)
    .eq('campaigns.charity_id', feedbackData.charityId)
    .eq('status', 'completed')
    .limit(1);

  if (donationCheckError) {
    throw handleSupabaseError(donationCheckError);
  }

  if (!donations || donations.length === 0) {
    throw new ClearCauseError(
      'FORBIDDEN',
      'You must donate to this charity organization before leaving feedback',
      403
    );
  }

  // Step 3: Check for duplicate feedback
  const { data: existingFeedback, error: existingError } = await supabase
    .from('charity_feedback')
    .select('id')
    .eq('donor_id', userId)
    .eq('charity_id', feedbackData.charityId)
    .limit(1);

  if (existingError) {
    throw handleSupabaseError(existingError);
  }

  if (existingFeedback && existingFeedback.length > 0) {
    throw new ClearCauseError(
      'DUPLICATE_FEEDBACK',
      'You have already submitted feedback for this charity',
      400
    );
  }

  // Step 4: Create feedback (immediately published - no moderation)
  const { data: feedback, error: createError } = await supabase
    .from('charity_feedback')
    .insert({
      charity_id: feedbackData.charityId,
      donor_id: userId,
      rating: feedbackData.rating,
      comment: feedbackData.comment || null,
    })
    .select(`
      *,
      profiles:donor_id (
        id,
        full_name,
        avatar_url
      ),
      charities:charity_id (
        id,
        organization_name,
        logo_url
      )
    `)
    .single();

  if (createError) {
    throw handleSupabaseError(createError);
  }

  // Step 5: Log audit event
  await logAuditEvent(userId, 'CHARITY_FEEDBACK_CREATED', 'charity_feedback', feedback.id, {
    charityId: feedbackData.charityId,
    rating: feedbackData.rating,
  });

  return createSuccessResponse(
    formatFeedback(feedback),
    'Feedback submitted successfully!'
  );
});

/**
 * Update charity feedback
 * Donors can update their own feedback at any time
 */
export const updateFeedback = withErrorHandling(async (
  feedbackId: string,
  updateData: FeedbackUpdateData,
  userId: string
): Promise<ApiResponse<CharityFeedback>> => {
  // Validate rating if provided
  if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
    throw new ClearCauseError('VALIDATION_ERROR', 'Rating must be between 1 and 5', 400);
  }

  // Get existing feedback
  const { data: existingFeedback, error: fetchError } = await supabase
    .from('charity_feedback')
    .select('*')
    .eq('id', feedbackId)
    .eq('donor_id', userId)
    .single();

  if (fetchError) {
    throw handleSupabaseError(fetchError);
  }

  if (!existingFeedback) {
    throw new ClearCauseError('NOT_FOUND', 'Feedback not found', 404);
  }

  // Update feedback
  const { data: feedback, error: updateError } = await supabase
    .from('charity_feedback')
    .update({
      rating: updateData.rating ?? existingFeedback.rating,
      comment: updateData.comment !== undefined ? updateData.comment : existingFeedback.comment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', feedbackId)
    .select(`
      *,
      profiles:donor_id (
        id,
        full_name,
        avatar_url
      ),
      charities:charity_id (
        id,
        organization_name,
        logo_url
      )
    `)
    .single();

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  // Log audit event
  await logAuditEvent(userId, 'CHARITY_FEEDBACK_UPDATED', 'charity_feedback', feedbackId, updateData);

  return createSuccessResponse(formatFeedback(feedback), 'Feedback updated successfully');
});

/**
 * Delete charity feedback
 * Donors can delete their own feedback
 */
export const deleteFeedback = withErrorHandling(async (
  feedbackId: string,
  userId: string
): Promise<ApiResponse<void>> => {
  // Verify ownership
  const { data: existingFeedback, error: fetchError } = await supabase
    .from('charity_feedback')
    .select('donor_id, charity_id')
    .eq('id', feedbackId)
    .eq('donor_id', userId)
    .single();

  if (fetchError) {
    throw handleSupabaseError(fetchError);
  }

  if (!existingFeedback) {
    throw new ClearCauseError('NOT_FOUND', 'Feedback not found', 404);
  }

  // Delete feedback
  const { error: deleteError } = await supabase
    .from('charity_feedback')
    .delete()
    .eq('id', feedbackId);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  // Log audit event
  await logAuditEvent(userId, 'CHARITY_FEEDBACK_DELETED', 'charity_feedback', feedbackId, {
    charityId: existingFeedback.charity_id,
  });

  return createSuccessResponse(undefined, 'Feedback deleted successfully');
});

/**
 * Get feedback by ID
 */
export const getFeedbackById = withErrorHandling(async (
  feedbackId: string
): Promise<ApiResponse<CharityFeedback>> => {
  const { data: feedback, error } = await supabase
    .from('charity_feedback')
    .select(`
      *,
      profiles:donor_id (
        id,
        full_name,
        avatar_url
      ),
      charities:charity_id (
        id,
        organization_name,
        logo_url
      )
    `)
    .eq('id', feedbackId)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!feedback) {
    throw new ClearCauseError('NOT_FOUND', 'Feedback not found', 404);
  }

  return createSuccessResponse(formatFeedback(feedback));
});

/**
 * List feedback with filters and pagination
 */
export const listFeedback = withErrorHandling(async (
  filters: FeedbackFilters = {},
  params: PaginationParams
): Promise<PaginatedResponse<CharityFeedback>> => {
  const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = params;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('charity_feedback')
    .select(
      `
      *,
      profiles:donor_id (
        id,
        full_name,
        avatar_url
      ),
      charities:charity_id (
        id,
        organization_name,
        logo_url
      )
    `,
      { count: 'exact' }
    );

  // Apply filters
  if (filters.charityId) {
    query = query.eq('charity_id', filters.charityId);
  }

  if (filters.donorId) {
    query = query.eq('donor_id', filters.donorId);
  }

  if (filters.minRating) {
    query = query.gte('rating', filters.minRating);
  }

  if (filters.maxRating) {
    query = query.lte('rating', filters.maxRating);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  const feedbackList = data.map(formatFeedback);

  return createPaginatedResponse(feedbackList, count || 0, params);
});

/**
 * Get feedback for a specific charity
 */
export const getCharityFeedback = withErrorHandling(async (
  charityId: string,
  params: PaginationParams
): Promise<PaginatedResponse<CharityFeedback>> => {
  return listFeedback({ charityId }, params);
});

/**
 * Get feedback submitted by a specific donor
 */
export const getDonorFeedback = withErrorHandling(async (
  donorId: string,
  params: PaginationParams
): Promise<PaginatedResponse<CharityFeedback>> => {
  return listFeedback({ donorId }, params);
});

/**
 * Get charity feedback statistics
 */
export const getCharityFeedbackStats = withErrorHandling(async (
  charityId: string
): Promise<ApiResponse<CharityFeedbackStats>> => {
  // Query all feedback for the charity
  const { data: feedbackList, error } = await supabase
    .from('charity_feedback')
    .select('rating, comment')
    .eq('charity_id', charityId);

  if (error) {
    throw handleSupabaseError(error);
  }

  const totalFeedback = feedbackList.length;
  const ratings = feedbackList.map((f) => f.rating);
  const averageRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

  const ratingDistribution = {
    1: feedbackList.filter((f) => f.rating === 1).length,
    2: feedbackList.filter((f) => f.rating === 2).length,
    3: feedbackList.filter((f) => f.rating === 3).length,
    4: feedbackList.filter((f) => f.rating === 4).length,
    5: feedbackList.filter((f) => f.rating === 5).length,
  };

  const feedbackWithComments = feedbackList.filter(
    (f) => f.comment && f.comment.trim().length > 0
  ).length;

  return createSuccessResponse({
    totalFeedback,
    averageRating: Math.round(averageRating * 100) / 100,
    ratingDistribution,
    feedbackWithComments,
  });
});

/**
 * Check if donor can leave feedback for charity and get eligible charities
 */
export const getEligibleCharitiesForFeedback = withErrorHandling(async (
  userId: string
): Promise<ApiResponse<Array<{ id: string; organizationName: string; logoUrl: string | null }>>> => {
  // Get all charities user has donated to
  const { data: donations, error: donationError } = await supabase
    .from('donations')
    .select(`
      campaign_id,
      campaigns!inner(
        charity_id,
        charities!inner(
          id,
          organization_name,
          logo_url
        )
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (donationError) {
    throw handleSupabaseError(donationError);
  }

  // Extract unique charities
  const charitiesMap = new Map<string, { id: string; organizationName: string; logoUrl: string | null }>();

  donations.forEach((donation: any) => {
    if (donation.campaigns && donation.campaigns.charities) {
      const charity = donation.campaigns.charities;
      charitiesMap.set(charity.id, {
        id: charity.id,
        organizationName: charity.organization_name,
        logoUrl: charity.logo_url,
      });
    }
  });

  // Get charities user has already reviewed
  const { data: existingFeedback, error: feedbackError } = await supabase
    .from('charity_feedback')
    .select('charity_id')
    .eq('donor_id', userId);

  if (feedbackError) {
    throw handleSupabaseError(feedbackError);
  }

  const reviewedCharityIds = new Set(existingFeedback.map((f) => f.charity_id));

  // Filter out charities already reviewed
  const eligibleCharities = Array.from(charitiesMap.values()).filter(
    (charity) => !reviewedCharityIds.has(charity.id)
  );

  return createSuccessResponse(eligibleCharities);
});

/**
 * Admin-only: Delete feedback (emergency use)
 */
export const adminDeleteFeedback = withErrorHandling(async (
  feedbackId: string,
  adminId: string,
  reason?: string
): Promise<ApiResponse<void>> => {
  // Check if user is admin
  const currentUser = await getUserProfile(adminId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can delete feedback', 403);
  }

  // Get feedback details for audit log
  const { data: feedback, error: fetchError } = await supabase
    .from('charity_feedback')
    .select('*')
    .eq('id', feedbackId)
    .single();

  if (fetchError) {
    throw handleSupabaseError(fetchError);
  }

  if (!feedback) {
    throw new ClearCauseError('NOT_FOUND', 'Feedback not found', 404);
  }

  // Delete feedback
  const { error: deleteError } = await supabase
    .from('charity_feedback')
    .delete()
    .eq('id', feedbackId);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  // Log audit event with reason
  await logAuditEvent(adminId, 'CHARITY_FEEDBACK_ADMIN_DELETED', 'charity_feedback', feedbackId, {
    charityId: feedback.charity_id,
    donorId: feedback.donor_id,
    rating: feedback.rating,
    reason: reason || 'No reason provided',
  });

  return createSuccessResponse(undefined, 'Feedback deleted by administrator');
});

/**
 * Helper function to format feedback data from database to application format
 */
function formatFeedback(feedback: any): CharityFeedback {
  return {
    id: feedback.id,
    charityId: feedback.charity_id,
    donorId: feedback.donor_id,
    rating: feedback.rating,
    comment: feedback.comment,
    createdAt: feedback.created_at,
    updatedAt: feedback.updated_at,
    donor: feedback.profiles
      ? {
          id: feedback.profiles.id,
          fullName: feedback.profiles.full_name,
          avatarUrl: feedback.profiles.avatar_url,
        }
      : undefined,
    charity: feedback.charities
      ? {
          id: feedback.charities.id,
          organizationName: feedback.charities.organization_name,
          logoUrl: feedback.charities.logo_url,
        }
      : undefined,
  };
}
