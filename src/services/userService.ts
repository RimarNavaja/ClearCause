/**
 * User Service
 * Handles user profile management and user-related operations
 */

import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { config } from '../lib/config';
import { User, ApiResponse, PaginatedResponse, PaginationParams, UserRole, ClearCauseError } from '../lib/types';
import { validateData, updateProfileSchema, paginationSchema } from '../utils/validation';
import { withErrorHandling, handleSupabaseError, createSuccessResponse } from '../utils/errors';
import { calculatePagination, createPaginatedResponse } from '../utils/helpers';
import { logAuditEvent } from './adminService';
import { uploadProfileAvatar } from './fileUploadService';

/**
 * Get user profile by ID
 */
export const getUserProfile = withErrorHandling(async (userId: string): Promise<ApiResponse<User>> => {
  // Add timeout to prevent hanging - increased timeout for better reliability
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('getUserProfile timeout - using fallback')), 5000);
  });

  const profilePromise = (async () => {
  if (!userId || userId === 'undefined' || userId === 'null' || userId === undefined || userId === null || typeof userId !== 'string' || userId.trim() === '') {
    throw new ClearCauseError('INVALID_USER_ID', 'Invalid user ID provided', 400);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new ClearCauseError('USER_NOT_FOUND', 'User not found', 404);
  }

  return createSuccessResponse({
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    role: data.role,
    phone: data.phone,
    isVerified: data.is_verified,
    isActive: data.is_active,
    donorCategory: data.donor_category,
    donorOrganizationName: data.donor_organization_name,
    donorOrganizationType: data.donor_organization_type,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  });
  })();

  // Race between the actual function and timeout
  return await Promise.race([profilePromise, timeoutPromise]);
});

/**
 * Update user profile
 */
export const updateUserProfile = withErrorHandling(async (
  userId: string,
  updates: {
    fullName?: string;
    avatarUrl?: string;
    phone?: string;
    donorCategory?: 'individual' | 'organization';
    donorOrganizationName?: string;
    donorOrganizationType?: string;
  },
  currentUserId: string
): Promise<ApiResponse<User>> => {
  console.log('[updateUserProfile] Starting update for user:', userId, 'with updates:', updates);

  // Validate input
  const validatedUpdates = validateData(updateProfileSchema, updates);
  console.log('[updateUserProfile] Validation passed:', validatedUpdates);

  // Simplified permission check - avoid recursive calls
  if (userId !== currentUserId) {
    console.log('[updateUserProfile] User trying to update another user\'s profile, checking permissions');
    throw new ClearCauseError('FORBIDDEN', 'You can only update your own profile', 403);
  }

  console.log('[updateUserProfile] Updating database...');

  // Simplified database update without Promise.race timeout (which can cause issues)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: validatedUpdates.fullName,
        avatar_url: validatedUpdates.avatarUrl,
        phone: validatedUpdates.phone,
        donor_category: validatedUpdates.donorCategory,
        donor_organization_name: validatedUpdates.donorOrganizationName,
        donor_organization_type: validatedUpdates.donorOrganizationType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[updateUserProfile] Database update failed:', error);
      throw handleSupabaseError(error);
    }

    if (!data) {
      console.error('[updateUserProfile] No data returned from update');
      throw new ClearCauseError('UPDATE_FAILED', 'Profile update returned no data', 500);
    }

    console.log('[updateUserProfile] Database update successful');

    // Sync with Auth metadata
    try {
      const authUpdates: any = {};
      if (validatedUpdates.fullName) authUpdates.full_name = validatedUpdates.fullName;
      if (validatedUpdates.avatarUrl) authUpdates.avatar_url = validatedUpdates.avatarUrl;
      if (validatedUpdates.phone) authUpdates.phone = validatedUpdates.phone;
      if (validatedUpdates.donorCategory) authUpdates.donor_category = validatedUpdates.donorCategory;
      if (validatedUpdates.donorOrganizationName) authUpdates.donor_organization_name = validatedUpdates.donorOrganizationName;
      if (validatedUpdates.donorOrganizationType) authUpdates.donor_organization_type = validatedUpdates.donorOrganizationType;

      if (Object.keys(authUpdates).length > 0) {
        const { error: authUpdateError } = await supabase.auth.updateUser({
          data: authUpdates
        });
        if (authUpdateError) {
          console.warn('[updateUserProfile] Failed to sync auth metadata:', authUpdateError);
        } else {
          console.log('[updateUserProfile] Synced auth metadata successfully');
        }
      }
    } catch (syncError) {
      console.warn('[updateUserProfile] Exception syncing auth metadata:', syncError);
    }

    return createSuccessResponse({
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      phone: data.phone,
      role: data.role,
      isVerified: data.is_verified,
      isActive: data.is_active,
      donorCategory: data.donor_category,
      donorOrganizationName: data.donor_organization_name,
      donorOrganizationType: data.donor_organization_type,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }, 'Profile updated successfully');

  } catch (updateError) {
    console.error('[updateUserProfile] Database update exception:', updateError);
    throw updateError instanceof ClearCauseError ? updateError : handleSupabaseError(updateError);
  }

});

/**
 * Upload user avatar
 */
export const uploadUserAvatar = withErrorHandling(async (
  userId: string,
  avatarFile: File,
  currentUserId: string
): Promise<ApiResponse<{ avatarUrl: string }>> => {
  console.log('[uploadUserAvatar] Starting avatar upload for user:', userId);

  // Simplified permission check to avoid recursive calls
  if (userId !== currentUserId) {
    console.log('[uploadUserAvatar] User trying to update another user\'s avatar');
    throw new ClearCauseError('FORBIDDEN', 'You can only update your own avatar', 403);
  }

  console.log('[uploadUserAvatar] Uploading to storage using fileUploadService...');

  try {
    // Upload file using the new fileUploadService
    const uploadResult = await uploadProfileAvatar(avatarFile);

    if (!uploadResult.success || !uploadResult.data) {
      console.error('[uploadUserAvatar] File upload failed:', uploadResult.error);
      throw new ClearCauseError('UPLOAD_FAILED', uploadResult.error || 'Avatar upload failed', 500);
    }

    const avatarUrl = uploadResult.data.publicUrl;
    console.log('[uploadUserAvatar] File uploaded successfully, updating profile...');

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[uploadUserAvatar] Profile update failed:', updateError);
      throw handleSupabaseError(updateError);
    }

    console.log('[uploadUserAvatar] Avatar upload completed successfully');

    // Sync with Auth metadata
    try {
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      });
      if (authUpdateError) {
        console.warn('[uploadUserAvatar] Failed to sync auth metadata:', authUpdateError);
      } else {
        console.log('[uploadUserAvatar] Synced auth metadata successfully');
      }
    } catch (syncError) {
      console.warn('[uploadUserAvatar] Exception syncing auth metadata:', syncError);
    }

    // Update localStorage cache with new avatar URL
    try {
      const cacheKey = `profile_cache_${userId}`;
      const existingCache = localStorage.getItem(cacheKey);
      let cacheData: any = { avatarUrl: avatarUrl };

      if (existingCache) {
        const parsed = JSON.parse(existingCache);
        cacheData = { ...parsed, avatarUrl: avatarUrl, timestamp: Date.now() };
      }

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('[uploadUserAvatar] Updated cache with new avatar URL');
    } catch (cacheError) {
      console.warn('[uploadUserAvatar] Failed to update cache:', cacheError);
    }

    // Non-blocking audit log
    logAuditEvent(currentUserId, 'USER_AVATAR_UPDATE', 'user', userId, { avatarUrl })
      .then(() => console.log('[uploadUserAvatar] Audit log successful'))
      .catch(auditError => console.warn('[uploadUserAvatar] Audit log failed:', auditError));

    return createSuccessResponse({ avatarUrl }, 'Avatar updated successfully');
  } catch (error) {
    console.error('[uploadUserAvatar] Avatar upload exception:', error);
    throw error instanceof ClearCauseError ? error : new ClearCauseError('UPLOAD_FAILED', 'Avatar upload failed', 500, error);
  }
});

/**
 * Get user statistics
 */
export const getUserStatistics = withErrorHandling(async (
  userId: string,
  currentUserId: string
): Promise<ApiResponse<{
  totalDonations: number;
  totalDonated: number;
  campaignsSupported: number;
  activeDonations: number;
}>> => {
  // Check if user can view these statistics
  if (userId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only view your own statistics', 403);
    }
  }

  // Get donation statistics
  const { data: donationStats, error: donationError } = await supabase
    .from('donations')
    .select('amount, status, campaign_id')
    .eq('user_id', userId);

  if (donationError) {
    throw handleSupabaseError(donationError);
  }

  const totalDonations = donationStats.length;
  const totalDonated = donationStats
    .filter(d => d.status === 'completed')
    .reduce((sum, d) => sum + d.amount, 0);
  const campaignsSupported = new Set(donationStats.map(d => d.campaign_id)).size;
  const activeDonations = donationStats.filter(d => d.status === 'pending').length;

  return createSuccessResponse({
    totalDonations,
    totalDonated,
    campaignsSupported,
    activeDonations,
  });
});

/**
 * Get user donation history
 */
export const getUserDonationHistory = withErrorHandling(async (
  userId: string,
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<any>> => {
  // Validate pagination parameters
  const validatedParams = validateData(paginationSchema, params);

  // Check if user can view this history
  if (userId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only view your own donation history', 403);
    }
  }

  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  // Get total count
  const { count, error: countError } = await supabase
    .from('donations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (countError) {
    throw handleSupabaseError(countError);
  }

  // Get donations with campaign details
  const { data: donations, error: donationsError } = await supabase
    .from('donations')
    .select(`
      *,
      campaigns:campaign_id (
        id,
        title,
        charity_id,
        charity_organizations:charity_id (
          organization_name
        )
      )
    `)
    .eq('donor_id', userId)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  if (donationsError) {
    throw handleSupabaseError(donationsError);
  }

  const formattedDonations = donations.map(donation => ({
    id: donation.id,
    amount: donation.amount,
    status: donation.status,
    paymentMethod: donation.payment_method,
    message: donation.message,
    isAnonymous: donation.is_anonymous,
    createdAt: donation.created_at,
    campaign: {
      id: donation.campaigns?.id,
      title: donation.campaigns?.title,
      charityName: donation.campaigns?.charity_organizations?.organization_name,
    },
  }));

  return createPaginatedResponse(formattedDonations, count || 0, validatedParams);
});

/**
 * Update user role (admin only)
 */
export const updateUserRole = withErrorHandling(async (
  userId: string,
  newRole: UserRole,
  currentUserId: string
): Promise<ApiResponse<User>> => {
  // Check if current user is admin
  const currentUser = await getUserProfile(currentUserId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can update user roles', 403);
  }

  // Prevent admin from changing their own role
  if (userId === currentUserId) {
    throw new ClearCauseError('FORBIDDEN', 'You cannot change your own role', 403);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(currentUserId, 'USER_ROLE_UPDATE', 'user', userId, { 
    oldRole: currentUser.data?.role, 
    newRole 
  });

  return createSuccessResponse({
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    role: data.role,
    isVerified: data.is_verified,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }, 'User role updated successfully');
});

/**
 * Verify user (admin only)
 */
export const verifyUser = withErrorHandling(async (
  userId: string,
  isVerified: boolean,
  currentUserId: string
): Promise<ApiResponse<User>> => {
  // Check if current user is admin
  const currentUser = await getUserProfile(currentUserId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can verify users', 403);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_verified: isVerified,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(currentUserId, 'USER_VERIFICATION_UPDATE', 'user', userId, { isVerified });

  return createSuccessResponse({
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    role: data.role,
    isVerified: data.is_verified,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }, `User ${isVerified ? 'verified' : 'unverified'} successfully`);
});

/**
 * Delete user account
 */
export const deleteUserAccount = withErrorHandling(async (
  userId: string,
  currentUserId: string
): Promise<ApiResponse<void>> => {
  // Check if user can delete this account
  if (userId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only delete your own account', 403);
    }
  }

  // Check for active campaigns or donations that would prevent deletion
  const { data: activeCampaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('charity_id', userId)
    .in('status', ['active', 'paused']);

  if (campaignError) {
    throw handleSupabaseError(campaignError);
  }

  if (activeCampaigns && activeCampaigns.length > 0) {
    throw new ClearCauseError(
      'ACCOUNT_DELETION_BLOCKED',
      'Cannot delete account with active campaigns. Please complete or cancel all campaigns first.',
      400
    );
  }

  const { data: pendingDonations, error: donationError } = await supabase
    .from('donations')
    .select('id')
    .eq('donor_id', userId)
    .eq('status', 'pending');

  if (donationError) {
    throw handleSupabaseError(donationError);
  }

  if (pendingDonations && pendingDonations.length > 0) {
    throw new ClearCauseError(
      'ACCOUNT_DELETION_BLOCKED',
      'Cannot delete account with pending donations. Please wait for donations to complete.',
      400
    );
  }

  // Log audit event before deletion
  await logAuditEvent(currentUserId, 'USER_ACCOUNT_DELETE', 'user', userId);

  // Delete user profile (this will cascade to related records based on DB constraints)
  const { error: deleteError } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  // Delete auth user
  const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);
  
  if (authDeleteError) {
    console.error('Failed to delete auth user:', authDeleteError);
    // Continue even if auth deletion fails - profile is already deleted
  }

  return createSuccessResponse(undefined, 'Account deleted successfully');
});

/**
 * Search users (admin only)
 */
export const searchUsers = withErrorHandling(async (
  searchQuery: string,
  filters: {
    role?: UserRole;
    isVerified?: boolean;
  } = {},
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<User>> => {
  // Check if current user is admin - simplified to avoid timeout
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can search users', 403);
  }

  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' });

  // Apply search filter
  if (searchQuery) {
    query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
  }

  // Apply role filter
  if (filters.role) {
    query = query.eq('role', filters.role);
  }

  // Apply verification filter
  if (filters.isVerified !== undefined) {
    query = query.eq('is_verified', filters.isVerified);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  const users = data.map(user => ({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
    phone: user.phone,
    role: user.role,
    isVerified: user.is_verified,
    isActive: user.is_active,
    onboardingCompleted: user.onboarding_completed,
    donorCategory: user.donor_category,
    donorOrganizationName: user.donor_organization_name,
    donorOrganizationType: user.donor_organization_type,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }));

  return createPaginatedResponse(users, count || 0, validatedParams);
});

/**
 * Ban or unban a user (admin only)
 */
export const toggleUserStatus = withErrorHandling(async (
  userId: string,
  isActive: boolean,
  currentUserId: string,
  reason?: string
): Promise<ApiResponse<User>> => {
  // Check if current user is admin
  const currentUser = await getUserProfile(currentUserId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can ban/unban users', 403);
  }

  // Prevent admin from banning themselves
  if (userId === currentUserId) {
    throw new ClearCauseError('FORBIDDEN', 'You cannot ban your own account', 403);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  const action = isActive ? 'USER_UNBANNED' : 'USER_BANNED';
  await logAuditEvent(currentUserId, action, 'user', userId, {
    reason,
    previousStatus: !isActive
  });

  return createSuccessResponse({
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    role: data.role,
    isVerified: data.is_verified,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }, `User ${isActive ? 'activated' : 'banned'} successfully`);
});
