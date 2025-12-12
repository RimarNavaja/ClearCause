/**
 * Review Service
 * Handles campaign review and rating functionality
 */

import { supabase } from '../lib/supabase';
import {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  ClearCauseError,
} from '../lib/types';
import {
  withErrorHandling,
  handleSupabaseError,
  createSuccessResponse,
} from '../utils/errors';
import { createPaginatedResponse } from '../utils/helpers';
import { logAuditEvent } from './adminService';
import { getUserProfile } from './userService';

// Review types
export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CampaignReview {
  id: string;
  campaignId: string;
  userId: string;
  rating: number; // 1-5
  comment: string | null;
  status: ReviewStatus;
  adminNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  user?: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  campaign?: {
    id: string;
    title: string;
  };
}

export interface ReviewCreateData {
  campaignId: string;
  rating: number;
  comment?: string;
}

export interface ReviewUpdateData {
  rating?: number;
  comment?: string;
}

export interface ReviewModerationData {
  status: ReviewStatus;
  adminNotes?: string;
}

export interface ReviewFilters {
  campaignId?: string;
  userId?: string;
  charityId?: string;
  status?: ReviewStatus[];
  minRating?: number;
  maxRating?: number;
}

/**
 * Create a campaign review
 * Only donors who have donated to the campaign can leave reviews
 */
export const createReview = withErrorHandling(async (
  reviewData: ReviewCreateData,
  userId: string
): Promise<ApiResponse<CampaignReview>> => {
  // Validate rating
  if (reviewData.rating < 1 || reviewData.rating > 5) {
    throw new ClearCauseError('VALIDATION_ERROR', 'Rating must be between 1 and 5', 400);
  }

  // Check if user has donated to this campaign
  const { data: donations, error: donationCheckError } = await supabase
    .from('donations')
    .select('id')
    .eq('user_id', userId)
    .eq('campaign_id', reviewData.campaignId)
    .eq('status', 'completed')
    .limit(1);

  if (donationCheckError) {
    throw handleSupabaseError(donationCheckError);
  }

  if (!donations || donations.length === 0) {
    throw new ClearCauseError(
      'FORBIDDEN',
      'You must donate to this campaign before leaving a review',
      403
    );
  }

  // Check if user has already reviewed this campaign
  const { data: existingReview, error: existingError } = await supabase
    .from('campaign_reviews')
    .select('id')
    .eq('user_id', userId)
    .eq('campaign_id', reviewData.campaignId)
    .limit(1);

  if (existingError) {
    throw handleSupabaseError(existingError);
  }

  if (existingReview && existingReview.length > 0) {
    throw new ClearCauseError(
      'DUPLICATE_REVIEW',
      'You have already reviewed this campaign',
      400
    );
  }

  // Create review
  const { data: review, error: createError } = await supabase
    .from('campaign_reviews')
    .insert({
      campaign_id: reviewData.campaignId,
      user_id: userId,
      rating: reviewData.rating,
      comment: reviewData.comment || null,
      status: 'approved', // Reviews publish immediately without moderation
    })
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        avatar_url
      ),
      campaigns:campaign_id (
        id,
        title
      )
    `)
    .single();

  if (createError) {
    throw handleSupabaseError(createError);
  }

  // Log audit event
  await logAuditEvent(userId, 'REVIEW_CREATED', 'campaign_review', review.id, {
    campaignId: reviewData.campaignId,
    rating: reviewData.rating,
  });

  return createSuccessResponse(
    formatReview(review),
    'Review submitted successfully. It will be visible after admin approval.'
  );
});

/**
 * Update a review (only if it's still pending)
 */
export const updateReview = withErrorHandling(async (
  reviewId: string,
  updateData: ReviewUpdateData,
  userId: string
): Promise<ApiResponse<CampaignReview>> => {
  // Get existing review
  const { data: existingReview, error: fetchError } = await supabase
    .from('campaign_reviews')
    .select('*')
    .eq('id', reviewId)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    throw handleSupabaseError(fetchError);
  }

  if (!existingReview) {
    throw new ClearCauseError('NOT_FOUND', 'Review not found', 404);
  }

  // Only allow updating pending reviews
  if (existingReview.status !== 'pending') {
    throw new ClearCauseError(
      'FORBIDDEN',
      'Cannot update a review that has already been moderated',
      403
    );
  }

  // Validate rating if provided
  if (updateData.rating && (updateData.rating < 1 || updateData.rating > 5)) {
    throw new ClearCauseError('VALIDATION_ERROR', 'Rating must be between 1 and 5', 400);
  }

  // Update review
  const { data: review, error: updateError } = await supabase
    .from('campaign_reviews')
    .update({
      rating: updateData.rating ?? existingReview.rating,
      comment: updateData.comment !== undefined ? updateData.comment : existingReview.comment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        avatar_url
      ),
      campaigns:campaign_id (
        id,
        title
      )
    `)
    .single();

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  // Log audit event
  await logAuditEvent(userId, 'REVIEW_UPDATED', 'campaign_review', reviewId, updateData);

  return createSuccessResponse(formatReview(review), 'Review updated successfully');
});

/**
 * Delete a review (only if it's pending)
 */
export const deleteReview = withErrorHandling(async (
  reviewId: string,
  userId: string
): Promise<ApiResponse<void>> => {
  // Get existing review
  const { data: existingReview, error: fetchError } = await supabase
    .from('campaign_reviews')
    .select('status')
    .eq('id', reviewId)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    throw handleSupabaseError(fetchError);
  }

  if (!existingReview) {
    throw new ClearCauseError('NOT_FOUND', 'Review not found', 404);
  }

  // Only allow deleting pending reviews
  if (existingReview.status !== 'pending') {
    throw new ClearCauseError(
      'FORBIDDEN',
      'Cannot delete a review that has already been moderated',
      403
    );
  }

  // Delete review
  const { error: deleteError } = await supabase
    .from('campaign_reviews')
    .delete()
    .eq('id', reviewId);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  // Log audit event
  await logAuditEvent(userId, 'REVIEW_DELETED', 'campaign_review', reviewId, {});

  return createSuccessResponse(undefined, 'Review deleted successfully');
});

/**
 * Get review by ID
 */
export const getReviewById = withErrorHandling(async (
  reviewId: string
): Promise<ApiResponse<CampaignReview>> => {
  const { data: review, error } = await supabase
    .from('campaign_reviews')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        avatar_url
      ),
      campaigns:campaign_id (
        id,
        title
      )
    `)
    .eq('id', reviewId)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!review) {
    throw new ClearCauseError('NOT_FOUND', 'Review not found', 404);
  }

  return createSuccessResponse(formatReview(review));
});

/**
 * List reviews with filters and pagination
 */
export const listReviews = withErrorHandling(async (
  filters: ReviewFilters = {},
  params: PaginationParams,
  currentUserId?: string
): Promise<PaginatedResponse<CampaignReview>> => {
  const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc' } = params;
  const offset = (page - 1) * limit;

  // Check if user is admin
  let isAdmin = false;
  if (currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    isAdmin = currentUser.success && currentUser.data?.role === 'admin';
  }

  // Build query
  let query = supabase
    .from('campaign_reviews')
    .select(
      `
      *,
      profiles:user_id (
        id,
        full_name,
        avatar_url
      ),
      campaigns:campaign_id (
        id,
        title,
        charity_id
      )
    `,
      { count: 'exact' }
    );

  // Non-admins can only see approved reviews (unless viewing their own)
  if (!isAdmin) {
    if (currentUserId && filters.userId === currentUserId) {
      // User viewing their own reviews - show all statuses
      query = query.eq('user_id', currentUserId);
    } else {
      // Public view - only approved reviews
      query = query.eq('status', 'approved');
    }
  }

  // Apply filters
  if (filters.campaignId) {
    query = query.eq('campaign_id', filters.campaignId);
  }

  if (filters.charityId) {
    query = query.eq('campaigns.charity_id', filters.charityId);
  }

  if (filters.userId && (!currentUserId || isAdmin)) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.status && filters.status.length > 0 && isAdmin) {
    query = query.in('status', filters.status);
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

  const reviews = data.map(formatReview);

  return createPaginatedResponse(reviews, count || 0, params);
});

/**
 * Get reviews for a campaign
 */
export const getCampaignReviews = withErrorHandling(async (
  campaignId: string,
  params: PaginationParams,
  currentUserId?: string
): Promise<PaginatedResponse<CampaignReview>> => {
  return listReviews({ campaignId }, params, currentUserId);
});

/**
 * Get user's reviews
 */
export const getUserReviews = withErrorHandling(async (
  userId: string,
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<CampaignReview>> => {
  // Check permissions
  if (userId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only view your own reviews', 403);
    }
  }

  return listReviews({ userId }, params, currentUserId);
});

/**
 * Moderate a review (admin only)
 */
export const moderateReview = withErrorHandling(async (
  reviewId: string,
  moderationData: ReviewModerationData,
  adminId: string
): Promise<ApiResponse<CampaignReview>> => {
  // Check if user is admin
  const currentUser = await getUserProfile(adminId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can moderate reviews', 403);
  }

  // Update review
  const { data: review, error: updateError } = await supabase
    .from('campaign_reviews')
    .update({
      status: moderationData.status,
      admin_notes: moderationData.adminNotes || null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId)
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        avatar_url
      ),
      campaigns:campaign_id (
        id,
        title
      )
    `)
    .single();

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  // Log audit event
  await logAuditEvent(adminId, 'REVIEW_MODERATED', 'campaign_review', reviewId, {
    status: moderationData.status,
    adminNotes: moderationData.adminNotes,
  });

  return createSuccessResponse(
    formatReview(review),
    `Review ${moderationData.status === 'approved' ? 'approved' : 'rejected'} successfully`
  );
});

/**
 * Get campaign review statistics
 */
export const getCampaignReviewStats = withErrorHandling(async (
  campaignId: string
): Promise<ApiResponse<{
  totalReviews: number;
  approvedReviews: number;
  pendingReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}>> => {
  // Use the database view if available, otherwise query directly
  const { data: stats, error } = await supabase
    .from('campaign_review_stats')
    .select('*')
    .eq('campaign_id', campaignId)
    .single();

  if (error) {
    // Fallback to direct query if view doesn't exist
    const { data: reviews, error: reviewsError } = await supabase
      .from('campaign_reviews')
      .select('rating, status')
      .eq('campaign_id', campaignId);

    if (reviewsError) {
      throw handleSupabaseError(reviewsError);
    }

    const totalReviews = reviews.length;
    const approvedReviews = reviews.filter((r) => r.status === 'approved').length;
    const pendingReviews = reviews.filter((r) => r.status === 'pending').length;
    const approvedRatings = reviews.filter((r) => r.status === 'approved').map((r) => r.rating);
    const averageRating =
      approvedRatings.length > 0
        ? approvedRatings.reduce((sum, r) => sum + r, 0) / approvedRatings.length
        : 0;

    const ratingDistribution = {
      1: reviews.filter((r) => r.rating === 1).length,
      2: reviews.filter((r) => r.rating === 2).length,
      3: reviews.filter((r) => r.rating === 3).length,
      4: reviews.filter((r) => r.rating === 4).length,
      5: reviews.filter((r) => r.rating === 5).length,
    };

    return createSuccessResponse({
      totalReviews,
      approvedReviews,
      pendingReviews,
      averageRating: Math.round(averageRating * 100) / 100,
      ratingDistribution,
    });
  }

  return createSuccessResponse({
    totalReviews: stats.total_reviews || 0,
    approvedReviews: stats.approved_reviews || 0,
    pendingReviews: stats.pending_reviews || 0,
    averageRating: Math.round((stats.average_rating || 0) * 100) / 100,
    ratingDistribution: {
      1: stats.one_star || 0,
      2: stats.two_stars || 0,
      3: stats.three_stars || 0,
      4: stats.four_stars || 0,
      5: stats.five_stars || 0,
    },
  });
});

/**
 * Get pending reviews for moderation (admin only)
 */
export const getPendingReviews = withErrorHandling(async (
  params: PaginationParams,
  adminId: string
): Promise<PaginatedResponse<CampaignReview>> => {
  // Check if user is admin
  const currentUser = await getUserProfile(adminId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can view pending reviews', 403);
  }

  return listReviews({ status: ['pending'] }, params, adminId);
});

/**
 * Helper function to format review data
 */
function formatReview(review: any): CampaignReview {
  return {
    id: review.id,
    campaignId: review.campaign_id,
    userId: review.user_id,
    rating: review.rating,
    comment: review.comment,
    status: review.status,
    adminNotes: review.admin_notes,
    reviewedBy: review.reviewed_by,
    reviewedAt: review.reviewed_at,
    createdAt: review.created_at,
    updatedAt: review.updated_at,
    user: review.profiles
      ? {
          id: review.profiles.id,
          fullName: review.profiles.full_name,
          avatarUrl: review.profiles.avatar_url,
        }
      : undefined,
    campaign: review.campaigns
      ? {
          id: review.campaigns.id,
          title: review.campaigns.title,
        }
      : undefined,
  };
}
