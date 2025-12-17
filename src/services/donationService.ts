/**
 * Donation Service
 * Handles donation processing, history, and reporting
 */

import { supabase } from '../lib/supabase';
import {
  Donation,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  DonationCreateData,
  DonationFilters,
  DonationStatus,
  ClearCauseError
} from '../lib/types';
import {
  validateData,
  donationCreateSchema,
  donationUpdateSchema,
  donationFilterSchema,
  paginationSchema
} from '../utils/validation';
import { withErrorHandling, handleSupabaseError, createSuccessResponse } from '../utils/errors';
import { createPaginatedResponse } from '../utils/helpers';
import { logAuditEvent } from './adminService';
import { getUserProfile } from './userService';
import { getCampaignById } from './campaignService';
import { checkAndAwardAchievements } from './achievementService';

/**
 * Parse backend error response and extract user-friendly message
 * Handles errors from Edge Functions like create-gcash-payment
 */
function parseBackendError(error: any): string {
  // If error is already a string, check if it's a backend error code
  if (typeof error === 'string') {
    if (error.includes('INVALID_AMOUNT')) {
      // Try to extract minimum from error message
      const match = error.match(/Minimum donation is ₱(\d+)/);
      if (match) {
        const minimum = match[1];
        return `Your donation amount is below the minimum of ₱${parseInt(minimum).toLocaleString()}. Please enter a higher amount.`;
      }
      return 'Your donation amount is invalid. Please check the minimum donation amount and try again.';
    }

    if (error.includes('PAYMENT_ERROR')) {
      return 'There was a problem processing your payment. Please try again or contact support.';
    }

    return error;
  }

  // If error is an object with message/error fields
  if (error?.message) {
    return parseBackendError(error.message);
  }

  if (error?.error) {
    // Check if error object has details
    if (error.error === 'INVALID_AMOUNT' && error.details) {
      const { minimumRequired, provided } = error.details;
      if (minimumRequired && provided) {
        return `Your donation of ₱${provided.toLocaleString()} is below the minimum of ₱${minimumRequired.toLocaleString()}. Please enter at least ₱${minimumRequired.toLocaleString()}.`;
      }
    }

    return parseBackendError(error.error);
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Create donation
 */
export const createDonation = withErrorHandling(async (
  donationData: DonationCreateData,
  userId: string
): Promise<ApiResponse<Donation>> => {
  // Validate input
  const validatedData = validateData(donationCreateSchema, donationData);

  // Get campaign to validate it's active and exists
  const campaignResult = await getCampaignById(validatedData.campaignId, true);
  if (!campaignResult.success || !campaignResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  const campaign = campaignResult.data;

  // Check if campaign is active
  if (campaign.status !== 'active') {
    throw new ClearCauseError('CAMPAIGN_INACTIVE', 'Campaign is not currently accepting donations', 400);
  }

  // Check if campaign has ended
  if (campaign.endDate && new Date(campaign.endDate) < new Date()) {
    throw new ClearCauseError('CAMPAIGN_INACTIVE', 'Campaign has ended', 400);
  }

  // Check if goal is already reached
  if (campaign.currentAmount >= campaign.goalAmount) {
    throw new ClearCauseError('CAMPAIGN_INACTIVE', 'Campaign goal has already been reached', 400);
  }

  // Check if donation exceeds remaining goal
  const remainingAmount = campaign.goalAmount - campaign.currentAmount;
  if (validatedData.amount > remainingAmount) {
    throw new ClearCauseError(
      'INVALID_AMOUNT', 
      `Donation amount ₱${validatedData.amount.toLocaleString()} exceeds the remaining goal of ₱${remainingAmount.toLocaleString()}`, 
      400
    );
  }

  // Generate transaction ID (in real app, this would come from payment processor)
  const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create donation
  const { data: donation, error: donationError } = await supabase
    .from('donations')
    .insert({
      user_id: userId,
      campaign_id: validatedData.campaignId,
      amount: validatedData.amount,
      status: 'pending', // Will be updated after payment processing
      payment_method: validatedData.paymentMethod,
      transaction_id: transactionId,
      message: validatedData.message || null,
      is_anonymous: validatedData.isAnonymous || false,
    })
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        email,
        avatar_url,
        donor_category,
        donor_organization_name,
        donor_organization_type
      ),
      campaigns:campaign_id (
        id,
        title,
        charity_id,
        charities:charity_id (
          organization_name
        )
      )
    `)
    .single();

  if (donationError) {
    throw handleSupabaseError(donationError);
  }

  // Log audit event
  await logAuditEvent(userId, 'DONATION_CREATED', 'donation', donation.id, {
    campaignId: validatedData.campaignId,
    amount: validatedData.amount,
    paymentMethod: validatedData.paymentMethod,
  });

  // Note: Payment processing happens in the Edge Function after this returns
  // The donation starts as 'pending' and will be updated via webhook when payment completes

  return createSuccessResponse({
    id: donation.id,
    donorId: donation.user_id,
    campaignId: donation.campaign_id,
    amount: donation.amount,
    status: donation.status,
    paymentMethod: donation.payment_method,
    transactionId: donation.transaction_id,
    message: donation.message,
    isAnonymous: donation.is_anonymous,
    createdAt: donation.donated_at,
    updatedAt: donation.updated_at,
    donor: donation.profiles ? {
      id: donation.profiles.id,
      email: donation.profiles.email,
      fullName: donation.profiles.full_name,
      avatarUrl: donation.profiles.avatar_url,
      role: 'donor',
      isVerified: false,
      isActive: true,
      onboardingCompleted: true,
      donorCategory: donation.profiles.donor_category,
      donorOrganizationName: donation.profiles.donor_organization_name,
      donorOrganizationType: donation.profiles.donor_organization_type,
      createdAt: '',
      updatedAt: '',
    } : undefined,
    campaign: donation.campaigns ? {
      id: donation.campaigns.id,
      charityId: donation.campaigns.charity_id,
      title: donation.campaigns.title,
      description: '',
      goalAmount: 0,
      currentAmount: 0,
      imageUrl: null,
      status: 'active',
      startDate: null,
      endDate: null,
      category: null,
      location: null,
      createdAt: '',
      updatedAt: '',
      progress: 0,
      charity: donation.campaigns.charities ? {
        id: '',
        userId: '',
        organizationName: donation.campaigns.charities.organization_name,
        description: '',
        websiteUrl: null,
        phone: null,
        address: null,
        registrationNumber: null,
        verificationStatus: 'approved',
        verificationDocuments: null,
        createdAt: '',
        updatedAt: '',
      } : undefined,
    } : undefined,
  }, 'Donation created successfully. Processing payment...');
});

/**
 * Process donation payment (internal function)
 */
const processDonationPayment = async (
  donationId: string,
  status: DonationStatus
): Promise<void> => {
  try {
    // Update donation status
    const { data: updatedDonation, error: updateError } = await supabase
      .from('donations')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', donationId)
      .select('campaign_id, amount, user_id, is_anonymous')
      .single();

    if (updateError) {
      console.error('Failed to update donation status:', updateError);
      return;
    }

    // If payment successful, update campaign amount
    if (status === 'completed') {
      const { error: campaignUpdateError } = await supabase.rpc(
        'increment_campaign_amount',
        {
          p_campaign_id: updatedDonation.campaign_id,
          p_amount: updatedDonation.amount,
        }
      );

      if (campaignUpdateError) {
        console.error('Failed to update campaign amount:', campaignUpdateError);
      }

      // Log successful donation
      await logAuditEvent(
        updatedDonation.user_id,
        'DONATION_COMPLETED',
        'donation',
        donationId,
        { 
          amount: updatedDonation.amount,
          campaign_id: updatedDonation.campaign_id,
          is_anonymous: updatedDonation.is_anonymous
        }
      );

      // Check and award achievements
      try {
        // Get campaign details for achievement context
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', updatedDonation.campaign_id)
          .single();

        await checkAndAwardAchievements(
          updatedDonation.user_id,
          'donation',
          {
            donationId: donationId,
            amount: updatedDonation.amount,
            campaign_id: updatedDonation.campaign_id,
            campaign: campaign,
            donated_at: new Date().toISOString(),
            // TODO: Implement milestone detection
            triggered_milestone: false,
          }
        );
      } catch (error) {
        console.error('Error checking achievements:', error);
        // Don't fail the donation if achievement check fails
      }

      // NEW: Handle Fund Distribution (25% Seed / 75% Milestones)
      try {
        const { processDonationSeedRelease } = await import('./campaignService');
        const { allocateDonationToMilestones } = await import('./refundService');

        // Get campaign details for charity ID
        const { data: campaignData } = await supabase
          .from('campaigns')
          .select('charity_id')
          .eq('id', updatedDonation.campaign_id)
          .single();

        if (campaignData) {
          const seedAmount = updatedDonation.amount * 0.25;
          const milestoneAmount = updatedDonation.amount - seedAmount;

          // 1. Release 25% Seed Fund immediately
          await processDonationSeedRelease(
            updatedDonation.campaign_id,
            campaignData.charity_id,
            seedAmount,
            donationId
          );
          console.log(`[Donation] Released seed fund: ${seedAmount}`);

          // 2. Allocate remaining 75% to milestones
          await allocateDonationToMilestones(
            donationId,
            updatedDonation.campaign_id,
            milestoneAmount,
            updatedDonation.user_id
          );
          console.log(`[Donation] Allocated to milestones: ${milestoneAmount}`);
        }
      } catch (error) {
        console.error('Error allocating donation to milestones:', error);
        // Don't fail the donation if allocation fails
        // This can be retried later via admin panel
      }
    }
  } catch (error) {
    console.error('Payment processing error:', error);
  }
};

/**
 * Get donation by ID
 */
export const getDonationById = withErrorHandling(async (
  donationId: string,
  currentUserId: string
): Promise<ApiResponse<Donation>> => {
  const { data: donation, error } = await supabase
    .from('donations')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        email,
        avatar_url,
        donor_category,
        donor_organization_name,
        donor_organization_type
      ),
      campaigns:campaign_id (
        id,
        title,
        charity_id,
        charities:charity_id (
          organization_name,
          user_id
        )
      )
    `)
    .eq('id', donationId)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!donation) {
    throw new ClearCauseError('NOT_FOUND', 'Donation not found', 404);
  }

  // Check if user can view this donation
  const currentUser = await getUserProfile(currentUserId);
  const isAdmin = currentUser.success && currentUser.data?.role === 'admin';
  const isDonor = donation.user_id === currentUserId;
  const isCharityOwner = donation.campaigns?.charities?.user_id === currentUserId;

  if (!isAdmin && !isDonor && !isCharityOwner) {
    throw new ClearCauseError('FORBIDDEN', 'You do not have permission to view this donation', 403);
  }

  return createSuccessResponse({
    id: donation.id,
    donorId: donation.user_id,
    campaignId: donation.campaign_id,
    amount: donation.amount,
    status: donation.status,
    paymentMethod: donation.payment_method,
    transactionId: donation.transaction_id,
    message: donation.message,
    isAnonymous: donation.is_anonymous,
    createdAt: donation.donated_at,
    updatedAt: donation.updated_at,
    donor: donation.profiles && !donation.is_anonymous ? {
      id: donation.profiles.id,
      email: donation.profiles.email,
      fullName: donation.profiles.full_name,
      avatarUrl: donation.profiles.avatar_url,
      role: 'donor',
      isVerified: false,
      isActive: true,
      onboardingCompleted: true,
      donorCategory: donation.profiles.donor_category,
      donorOrganizationName: donation.profiles.donor_organization_name,
      donorOrganizationType: donation.profiles.donor_organization_type,
      createdAt: '',
      updatedAt: '',
    } : undefined,
    campaign: donation.campaigns ? {
      id: donation.campaigns.id,
      charityId: donation.campaigns.charity_id,
      title: donation.campaigns.title,
      description: '',
      goalAmount: 0,
      currentAmount: 0,
      imageUrl: null,
      status: 'active',
      startDate: null,
      endDate: null,
      category: null,
      location: null,
      createdAt: '',
      updatedAt: '',
      progress: 0,
      charity: donation.campaigns.charities ? {
        id: '',
        userId: donation.campaigns.charities.user_id,
        organizationName: donation.campaigns.charities.organization_name,
        description: '',
        websiteUrl: null,
        phone: null,
        address: null,
        registrationNumber: null,
        verificationStatus: 'approved',
        verificationDocuments: null,
        createdAt: '',
        updatedAt: '',
      } : undefined,
    } : undefined,
  });
});

/**
 * List donations with filters and pagination
 */
export const listDonations = withErrorHandling(async (
  filters: DonationFilters = {},
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<Donation>> => {
  console.log('[donationService.listDonations] Called with:', {
    filters,
    params,
    currentUserId
  });

  const validatedFilters = validateData(donationFilterSchema, filters);
  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'donated_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  console.log('[donationService.listDonations] Validated params:', {
    page,
    limit,
    offset,
    sortBy,
    sortOrder
  });

  // Check user permissions
  const currentUser = await getUserProfile(currentUserId);
  const isAdmin = currentUser.success && currentUser.data?.role === 'admin';

  console.log('[donationService.listDonations] Permission check:', {
    getUserProfileSuccess: currentUser.success,
    userRole: currentUser.data?.role,
    isAdmin,
    currentUser: currentUser.data
  });

  // Build query
  let query = supabase
    .from('donations')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        email,
        avatar_url,
        donor_category,
        donor_organization_name,
        donor_organization_type
      ),
      campaigns:campaign_id (
        id,
        title,
        charity_id,
        charities:charity_id (
          organization_name,
          user_id
        )
      )
    `, { count: 'exact' });

  // Apply user-based filtering (skip if campaignId is provided, as caller handles permissions)
  if (!isAdmin && !validatedFilters.campaignId) {
    // Non-admin users can only see their own donations
    console.log('[donationService.listDonations] Applying user filter (not admin)');
    query = query.eq('user_id', currentUserId);
  } else {
    console.log('[donationService.listDonations] No user filter applied (admin or campaign specified)');
  }

  // Apply filters
  if (validatedFilters.status && validatedFilters.status.length > 0) {
    query = query.in('status', validatedFilters.status);
  }

  if (validatedFilters.campaignId) {
    query = query.eq('campaign_id', validatedFilters.campaignId);
  }

  if (validatedFilters.minAmount) {
    query = query.gte('amount', validatedFilters.minAmount);
  }

  if (validatedFilters.maxAmount) {
    query = query.lte('amount', validatedFilters.maxAmount);
  }

  if (validatedFilters.dateFrom) {
    query = query.gte('donated_at', validatedFilters.dateFrom);
  }

  if (validatedFilters.dateTo) {
    query = query.lte('donated_at', validatedFilters.dateTo);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  console.log('[donationService.listDonations] Executing query...');
  const { data, count, error } = await query;

  console.log('[donationService.listDonations] Query result:', {
    dataLength: data?.length || 0,
    count,
    error: error?.message,
    firstItem: data?.[0]
  });

  if (error) {
    console.error('[donationService.listDonations] Supabase error:', error);
    throw handleSupabaseError(error);
  }

  const donations = data.map(donation => ({
    id: donation.id,
    donorId: donation.user_id,
    campaignId: donation.campaign_id,
    amount: donation.amount,
    status: donation.status,
    paymentMethod: donation.payment_method,
    transactionId: donation.transaction_id,
    message: donation.message,
    isAnonymous: donation.is_anonymous,
    createdAt: donation.donated_at,
    updatedAt: donation.updated_at,
    donor: donation.profiles && !donation.is_anonymous ? {
      id: donation.profiles.id,
      email: donation.profiles.email,
      fullName: donation.profiles.full_name,
      avatarUrl: donation.profiles.avatar_url,
      role: 'donor' as const,
      isVerified: false,
      isActive: true,
      onboardingCompleted: true,
      donorCategory: donation.profiles.donor_category,
      donorOrganizationName: donation.profiles.donor_organization_name,
      donorOrganizationType: donation.profiles.donor_organization_type,
      createdAt: '',
      updatedAt: '',
    } : undefined,
    campaign: donation.campaigns ? {
      id: donation.campaigns.id,
      charityId: donation.campaigns.charity_id,
      title: donation.campaigns.title,
      description: '',
      goalAmount: 0,
      currentAmount: 0,
      imageUrl: null,
      status: 'active' as const,
      startDate: null,
      endDate: null,
      category: null,
      location: null,
      createdAt: '',
      updatedAt: '',
      progress: 0,
      charity: donation.campaigns.charities ? {
        id: '',
        userId: donation.campaigns.charities.user_id,
        organizationName: donation.campaigns.charities.organization_name,
        description: '',
        websiteUrl: null,
        phone: null,
        address: null,
        registrationNumber: null,
        verificationStatus: 'approved' as const,
        verificationDocuments: null,
        createdAt: '',
        updatedAt: '',
      } : undefined,
    } : undefined,
  }));

  console.log('[donationService.listDonations] Mapped donations:', {
    count: donations.length,
    firstDonation: donations[0]
  });

  return createPaginatedResponse(donations, count || 0, validatedParams);
});

/**
 * Get donations by campaign
 */
export const getDonationsByCampaign = withErrorHandling(async (
  campaignId: string,
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<Donation>> => {
  const validatedParams = validateData(paginationSchema, params);

  // Check if user can view campaign donations
  const campaignResult = await getCampaignById(campaignId, true);
  if (!campaignResult.success || !campaignResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  const campaign = campaignResult.data;
  const currentUser = await getUserProfile(currentUserId);
  const isAdmin = currentUser.success && currentUser.data?.role === 'admin';
  const isCharityOwner = campaign.charity?.userId === currentUserId;

  if (!isAdmin && !isCharityOwner) {
    // Public view - only show non-anonymous donations
    return listDonations(
      { campaignId, status: ['completed'] },
      validatedParams,
      currentUserId
    );
  }

  // Full access for charity owner and admin
  return listDonations(
    { campaignId },
    validatedParams,
    currentUserId
  );
});

/**
 * Get donations by donor
 */
export const getDonationsByDonor = withErrorHandling(async (
  donorId: string,
  params: PaginationParams,
  currentUserId: string,
  filters: DonationFilters = {}
): Promise<PaginatedResponse<Donation>> => {
  // Validate user IDs
  if (!donorId || donorId === 'undefined' || donorId === 'null' || donorId === undefined || donorId === null || typeof donorId !== 'string' || donorId.trim() === '') {
    throw new ClearCauseError('INVALID_USER_ID', 'Invalid donor ID provided', 400);
  }
  if (!currentUserId || currentUserId === 'undefined' || currentUserId === 'null' || currentUserId === undefined || currentUserId === null || typeof currentUserId !== 'string' || currentUserId.trim() === '') {
    throw new ClearCauseError('INVALID_USER_ID', 'Invalid current user ID provided', 400);
  }

  // Check if user can view donor's donations
  if (donorId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only view your own donations', 403);
    }
  }

  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'donated_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  // Validate filters
  const validatedFilters = validateData(donationFilterSchema, filters);

  // Build query
  let query = supabase
    .from('donations')
    .select(`
      *,
      campaigns:campaign_id (
        id,
        title,
        charity_id,
        charities:charity_id (
          organization_name
        )
      )
    `, { count: 'exact' })
    .eq('user_id', donorId);

  // Apply status filter
  if (validatedFilters.status && validatedFilters.status.length > 0) {
    query = query.in('status', validatedFilters.status);
  }

  // Apply search filter (search campaign title via join)
  if (validatedFilters.search) {
    query = query.or(`campaigns.title.ilike.%${validatedFilters.search}%`);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  // Execute query
  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  const donations = data.map(donation => {
    // Extract fee breakdown from metadata
    const fees = donation.metadata?.fees || {};

    // Convert string values to numbers if needed
    const totalCharge = fees.totalCharge ? Number(fees.totalCharge) : donation.amount;
    const netAmount = fees.netAmount ? Number(fees.netAmount) : donation.amount;
    const platformFee = fees.platformFee ? Number(fees.platformFee) : 0;
    const tipAmount = fees.tipAmount ? Number(fees.tipAmount) : 0;
    const grossAmount = fees.grossAmount ? Number(fees.grossAmount) : donation.amount;

    // Debug log for recent donations
    if (fees.totalCharge) {
      console.log('Donation with fees:', {
        id: donation.id,
        amount: donation.amount,
        totalCharge,
        netAmount,
        coverFees: fees.donorCoversFees ?? false,  // Use stored value
        fees
      });
    }

    return {
      id: donation.id,
      donorId: donation.user_id,
      campaignId: donation.campaign_id,
      amount: donation.amount,
      status: donation.status,
      paymentMethod: donation.payment_method,
      transactionId: donation.transaction_id,
      message: donation.message,
      isAnonymous: donation.is_anonymous,
      createdAt: donation.donated_at,
      updatedAt: donation.updated_at,

      // Add fee breakdown fields from metadata
      totalCharge,
      netAmount,
      coverFees: fees.donorCoversFees ?? false, // Use stored value from metadata
      platformFee,
      tipAmount,
      grossAmount,

      campaign: donation.campaigns ? {
      id: donation.campaigns.id,
      charityId: donation.campaigns.charity_id,
      title: donation.campaigns.title,
      description: '',
      goalAmount: 0,
      currentAmount: 0,
      imageUrl: null,
      status: 'active' as const,
      startDate: null,
      endDate: null,
      category: null,
      location: null,
      createdAt: '',
      updatedAt: '',
      progress: 0,
      charity: donation.campaigns.charities ? {
        id: '',
        userId: '',
        organizationName: donation.campaigns.charities.organization_name,
        description: '',
        websiteUrl: null,
        phone: null,
        address: null,
        registrationNumber: null,
        verificationStatus: 'approved' as const,
        verificationDocuments: null,
        createdAt: '',
        updatedAt: '',
      } : undefined,
    } : undefined,
    };
  });

  return createPaginatedResponse(donations, count || 0, validatedParams);
});

/**
 * Update donation status (admin only)
 */
export const updateDonationStatus = withErrorHandling(async (
  donationId: string,
  status: DonationStatus,
  transactionId?: string,
  currentUserId?: string
): Promise<ApiResponse<Donation>> => {
  // Check if current user is admin (for manual status updates)
  if (currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'Only administrators can manually update donation status', 403);
    }
  }

  const { data: donation, error } = await supabase
    .from('donations')
    .update({
      status,
      transaction_id: transactionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', donationId)
    .select(`
      *,
      campaigns:campaign_id (
        id,
        title,
        charity_id
      )
    `)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Update campaign amount if donation completed
  if (status === 'completed') {
    const { error: campaignUpdateError } = await supabase.rpc(
      'increment_campaign_amount',
      {
        p_campaign_id: donation.campaign_id,
        p_amount: donation.amount,
      }
    );

    if (campaignUpdateError) {
      console.error('Failed to update campaign amount:', campaignUpdateError);
    }
  }

  // Log audit event
  if (currentUserId) {
    await logAuditEvent(currentUserId, 'DONATION_STATUS_UPDATE', 'donation', donationId, {
      status,
      transactionId,
    });
  }

  return createSuccessResponse({
    id: donation.id,
    donorId: donation.user_id,
    campaignId: donation.campaign_id,
    amount: donation.amount,
    status: donation.status,
    paymentMethod: donation.payment_method,
    transactionId: donation.transaction_id,
    message: donation.message,
    isAnonymous: donation.is_anonymous,
    createdAt: donation.donated_at,
    updatedAt: donation.updated_at,
    campaign: donation.campaigns ? {
      id: donation.campaigns.id,
      charityId: donation.campaigns.charity_id,
      title: donation.campaigns.title,
      description: '',
      goalAmount: 0,
      currentAmount: 0,
      imageUrl: null,
      status: 'active' as const,
      startDate: null,
      endDate: null,
      category: null,
      location: null,
      createdAt: '',
      updatedAt: '',
      progress: 0,
    } : undefined,
  }, 'Donation status updated successfully');
});

/**
 * Get donation statistics
 */
export const getDonationStatistics = withErrorHandling(async (
  currentUserId: string,
  filters: {
    campaignId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}
): Promise<ApiResponse<{
  totalDonations: number;
  totalAmount: number;
  averageDonation: number;
  donationsByStatus: Record<DonationStatus, number>;
  donationsByMonth: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
}>> => {
  // Check permissions
  const currentUser = await getUserProfile(currentUserId);
  const isAdmin = currentUser.success && currentUser.data?.role === 'admin';

  // Build query
  let query = supabase
    .from('donations')
    .select('amount, status, donated_at, campaign_id, campaigns:campaign_id(charities:charity_id(user_id))');

  // Apply user-based filtering for non-admins (skip if campaignId is provided)
  if (!isAdmin && !filters.campaignId) {
    query = query.eq('user_id', currentUserId);
  }

  // Apply filters
  if (filters.campaignId) {
    query = query.eq('campaign_id', filters.campaignId);
  }

  if (filters.dateFrom) {
    query = query.gte('donated_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('donated_at', filters.dateTo);
  }

  const { data: donations, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  // Calculate statistics
  const totalDonations = donations.length;
  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
  const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;

  // Group by status
  const donationsByStatus: Record<DonationStatus, number> = {
    pending: 0,
    completed: 0,
    failed: 0,
    refunded: 0,
  };

  donations.forEach(donation => {
    donationsByStatus[donation.status]++;
  });

  // Group by month
  const monthlyData: Record<string, { count: number; amount: number }> = {};
  donations.forEach(donation => {
    const month = new Date(donation.donated_at).toISOString().slice(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { count: 0, amount: 0 };
    }
    monthlyData[month].count++;
    monthlyData[month].amount += donation.amount;
  });

  const donationsByMonth = Object.entries(monthlyData)
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return createSuccessResponse({
    totalDonations,
    totalAmount,
    averageDonation: Math.round(averageDonation * 100) / 100,
    donationsByStatus,
    donationsByMonth,
  });
});

/**
 * Refund donation (admin only)
 */
export const refundDonation = withErrorHandling(async (
  donationId: string,
  reason: string,
  currentUserId: string
): Promise<ApiResponse<Donation>> => {
  // Check if current user is admin
  const currentUser = await getUserProfile(currentUserId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can process refunds', 403);
  }

  // Get donation
  const donationResult = await getDonationById(donationId, currentUserId);
  if (!donationResult.success || !donationResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Donation not found', 404);
  }

  const donation = donationResult.data;

  // Check if donation can be refunded
  if (donation.status !== 'completed') {
    throw new ClearCauseError('INVALID_STATUS', 'Only completed donations can be refunded', 400);
  }

  // Update donation status to refunded
  const { error: updateError } = await supabase
    .from('donations')
    .update({
      status: 'refunded',
      updated_at: new Date().toISOString(),
    })
    .eq('id', donationId);

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  // Decrease campaign amount
  const { error: campaignUpdateError } = await supabase.rpc(
    'decrement_campaign_amount',
    {
      p_campaign_id: donation.campaignId,
      p_amount: donation.amount,
    }
  );

  if (campaignUpdateError) {
    console.error('Failed to update campaign amount:', campaignUpdateError);
  }

  // Log audit event
  await logAuditEvent(currentUserId, 'DONATION_REFUNDED', 'donation', donationId, {
    reason,
    amount: donation.amount,
  });

  // In a real application, you would also:
  // 1. Process the actual refund with the payment processor
  // 2. Send notification emails to donor and charity
  // 3. Update financial records

  return updateDonationStatus(donationId, 'refunded', donation.transactionId);
});

// Create donor statistics function
export const getDonorStatistics = withErrorHandling(async (
  userId: string
): Promise<ApiResponse<{
  totalDonations: number;
  totalAmount: number;
  averageDonation: number;
  campaignsSupported: number;
  recentDonations: Array<{
    id: string;
    amount: number;
    campaignTitle: string;
    createdAt: string;
  }>;
}>> => {
  // Validate user ID
  if (!userId || userId === 'undefined' || userId === 'null' || userId === undefined || userId === null || typeof userId !== 'string' || userId.trim() === '') {
    throw new ClearCauseError('INVALID_USER_ID', 'Invalid user ID provided', 400);
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new ClearCauseError('INVALID_USER_ID', 'Invalid user ID format. Please ensure you are properly authenticated.', 400);
  }

  // Get user's donations with campaign info
  const { data: donations, error } = await supabase
    .from('donations')
    .select(`
      id,
      amount,
      status,
      donated_at,
      campaigns:campaign_id (
        id,
        title
      )
    `)
    .eq('user_id', userId)
    // Include all donation statuses, not just completed
    .order('donated_at', { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  const validDonations = donations.filter(d => d.payment_method !== 'redirected');
  
  const totalDonations = validDonations.length;
  const totalAmount = validDonations.reduce((sum, d) => sum + d.amount, 0);
  const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;
  const campaignsSupported = new Set(donations.map(d => d.campaigns?.id).filter(Boolean)).size;

  const recentDonations = donations.slice(0, 5).map(d => ({
    id: d.id,
    amount: d.amount,
    campaignTitle: d.campaigns?.title || 'Unknown Campaign',
    createdAt: d.donated_at,
  }));

  return createSuccessResponse({
    totalDonations,
    totalAmount,
    averageDonation: Math.round(averageDonation * 100) / 100,
    campaignsSupported,
    recentDonations,
  });
});

// Create donor impact updates function
export const getDonorImpactUpdates = withErrorHandling(async (
  userId: string,
  params: PaginationParams = { page: 1, limit: 10 }
): Promise<ApiResponse<Array<{
  id: string;
  type: 'milestone_completed' | 'campaign_completed' | 'impact_report';
  title: string;
  description: string;
  campaignTitle: string;
  createdAt: string;
}>>> => {
  // For now, return empty array as this would require more complex data
  // In the future, this would fetch milestone completions, campaign updates, etc.
  // for campaigns the user has donated to
  return createSuccessResponse([]);
});

// Alias for backward compatibility
export const getDonorDonations = getDonationsByDonor;

/**
 * Create GCash payment session
 */
export const createGCashPayment = withErrorHandling(async (
  donationId: string,
  amount: number,
  tipAmount: number = 0,
  coverFees: boolean = true,
  userId: string
): Promise<ApiResponse<{ checkoutUrl: string; sessionId: string }>> => {
  try {
    console.log('========== FRONTEND: CREATE GCASH PAYMENT ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request params:', {
      donationId,
      amount,
      tipAmount,
      coverFees,
      userId
    });

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('❌ No active session found');
      throw new ClearCauseError('UNAUTHORIZED', 'No active session', 401);
    }

    console.log('✅ Session validated');

    const apiUrl = `${import.meta.env.VITE_API_URL}/create-gcash-payment`;
    console.log('Calling Edge Function:', apiUrl);
    console.log('Request body:', { donationId, amount, tipAmount, coverFees, userId });

    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          donationId,
          amount,
          tipAmount,
          coverFees,
          userId,
        }),
      }
    );

    console.log('Edge Function response status:', response.status);

    const data = await response.json();
    console.log('Edge Function response data:', data);

    if (!response.ok) {
      console.error('❌ Payment creation failed:', data);
      const userFriendlyError = parseBackendError(data);
      throw new ClearCauseError('PAYMENT_ERROR', userFriendlyError, response.status);
    }

    console.log('✅ Payment session created:', {
      checkoutUrl: data.checkoutUrl,
      sessionId: data.sessionId
    });
    console.log('========== FRONTEND: PAYMENT CREATION COMPLETE ==========\n');

    return createSuccessResponse(data, 'Payment session created successfully');
  } catch (error) {
    console.error('❌ Create GCash payment error:', error);
    if (error instanceof ClearCauseError) {
      throw error;
    }
    throw new ClearCauseError('PAYMENT_ERROR', 'Failed to create payment session', 500);
  }
});

export const verifyPayment = withErrorHandling(async (
  donationId: string
): Promise<ApiResponse<{ status: string; message: string }>> => {
  try {
    console.log('========== FRONTEND: VERIFY PAYMENT ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Donation ID:', donationId);

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('❌ No active session found');
      throw new ClearCauseError('UNAUTHORIZED', 'No active session', 401);
    }

    const apiUrl = `${import.meta.env.VITE_API_URL}/verify-payment`;
    console.log('Calling Edge Function:', apiUrl);

    const response = await fetch(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          donationId,
        }),
      }
    );

    console.log('Edge Function response status:', response.status);

    const data = await response.json();
    console.log('Edge Function response data:', data);

    if (!response.ok && response.status !== 400) {
      console.error('❌ Payment verification failed:', data);
      throw new ClearCauseError('PAYMENT_ERROR', data.error || 'Failed to verify payment', response.status);
    }

    console.log('✅ Payment verification complete:', {
      status: data.status,
      message: data.message
    });

    if (data.status === 'completed') {
      try {
        console.log('Checking achievements for donation:', donationId);
        // Fetch full donation details for achievement checking
        const { data: donation, error: fetchError } = await supabase
          .from('donations')
          .select(`
            *,
            campaigns (*)
          `)
          .eq('id', donationId)
          .single();

        if (!fetchError && donation) {
             await checkAndAwardAchievements(
              donation.user_id,
              'donation',
              {
                donationId: donation.id,
                amount: donation.amount,
                campaign_id: donation.campaign_id,
                campaign: donation.campaigns,
                donated_at: donation.donated_at,
                triggered_milestone: false,
              }
            );
        }
      } catch (achievementError) {
        console.error('Error checking achievements after verification:', achievementError);
        // Don't fail the verification if achievement check fails
      }
    }

    console.log('========== FRONTEND: PAYMENT VERIFICATION COMPLETE ==========\n');

    return createSuccessResponse(data, data.message || 'Payment verified');
  } catch (error) {
    console.error('❌ Verify payment error:', error);
    if (error instanceof ClearCauseError) {
      throw error;
    }
    throw new ClearCauseError('PAYMENT_ERROR', 'Failed to verify payment', 500);
  }
});