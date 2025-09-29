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
        avatar_url
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

  // In a real application, here you would:
  // 1. Process payment with payment gateway (Stripe, PayPal, etc.)
  // 2. Update donation status based on payment result
  // 3. Update campaign current amount if payment successful
  // 4. Send confirmation emails

  // For demo purposes, simulate payment processing
  setTimeout(() => {
    processDonationPayment(donation.id, 'completed');
  }, 2000);

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
    createdAt: donation.created_at,
    updatedAt: donation.updated_at,
    donor: donation.profiles ? {
      id: donation.profiles.id,
      email: donation.profiles.email,
      fullName: donation.profiles.full_name,
      avatarUrl: donation.profiles.avatar_url,
      role: 'donor',
      isVerified: false,
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
      .select('campaign_id, amount, user_id')
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
          campaign_id: updatedDonation.campaign_id,
          amount: updatedDonation.amount,
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
        { amount: updatedDonation.amount }
      );
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
        avatar_url
      ),
      campaigns:campaign_id (
        id,
        title,
        charity_id,
        charity_organizations:charity_id (
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
  const isCharityOwner = donation.campaigns?.charity_organizations?.user_id === currentUserId;

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
    createdAt: donation.created_at,
    updatedAt: donation.updated_at,
    donor: donation.profiles && !donation.is_anonymous ? {
      id: donation.profiles.id,
      email: donation.profiles.email,
      fullName: donation.profiles.full_name,
      avatarUrl: donation.profiles.avatar_url,
      role: 'donor',
      isVerified: false,
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
      charity: donation.campaigns.charity_organizations ? {
        id: '',
        userId: donation.campaigns.charity_organizations.user_id,
        organizationName: donation.campaigns.charity_organizations.organization_name,
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
  const validatedFilters = validateData(donationFilterSchema, filters);
  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  // Check user permissions
  const currentUser = await getUserProfile(currentUserId);
  const isAdmin = currentUser.success && currentUser.data?.role === 'admin';

  // Build query
  let query = supabase
    .from('donations')
    .select(`
      *,
      profiles:user_id (
        id,
        full_name,
        email,
        avatar_url
      ),
      campaigns:campaign_id (
        id,
        title,
        charity_id,
        charity_organizations:charity_id (
          organization_name,
          user_id
        )
      )
    `, { count: 'exact' });

  // Apply user-based filtering
  if (!isAdmin) {
    // Non-admin users can only see their own donations or donations to their campaigns
    query = query.or(`user_id.eq.${currentUserId},campaigns.charity_organizations.user_id.eq.${currentUserId}`);
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
    query = query.gte('created_at', validatedFilters.dateFrom);
  }

  if (validatedFilters.dateTo) {
    query = query.lte('created_at', validatedFilters.dateTo);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
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
    createdAt: donation.created_at,
    updatedAt: donation.updated_at,
    donor: donation.profiles && !donation.is_anonymous ? {
      id: donation.profiles.id,
      email: donation.profiles.email,
      fullName: donation.profiles.full_name,
      avatarUrl: donation.profiles.avatar_url,
      role: 'donor' as const,
      isVerified: false,
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
      charity: donation.campaigns.charity_organizations ? {
        id: '',
        userId: donation.campaigns.charity_organizations.user_id,
        organizationName: donation.campaigns.charity_organizations.organization_name,
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
  currentUserId: string
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
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  // Get donations
  const { data, count, error } = await supabase
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
    `, { count: 'exact' })
    .eq('user_id', donorId)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  if (error) {
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
    createdAt: donation.created_at,
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
      charity: donation.campaigns.charity_organizations ? {
        id: '',
        userId: '',
        organizationName: donation.campaigns.charity_organizations.organization_name,
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
        campaign_id: donation.campaign_id,
        amount: donation.amount,
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
    createdAt: donation.created_at,
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
    .select('amount, status, created_at, campaign_id, campaigns:campaign_id(charity_organizations:charity_id(user_id))');

  // Apply user-based filtering for non-admins
  if (!isAdmin) {
    query = query.or(`user_id.eq.${currentUserId},campaigns.charity_organizations.user_id.eq.${currentUserId}`);
  }

  // Apply filters
  if (filters.campaignId) {
    query = query.eq('campaign_id', filters.campaignId);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
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
    const month = new Date(donation.created_at).toISOString().slice(0, 7); // YYYY-MM
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
      campaign_id: donation.campaignId,
      amount: donation.amount,
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
    .eq('status', 'completed')
    .order('donated_at', { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  const totalDonations = donations.length;
  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
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