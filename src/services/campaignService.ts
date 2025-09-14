/**
 * Campaign Service
 * Handles campaign creation, management, and operations
 */

import { supabase, uploadFile } from '../lib/supabase';
import { 
  Campaign, 
  ApiResponse, 
  PaginatedResponse, 
  PaginationParams, 
  CampaignCreateData,
  CampaignFilters,
  CampaignStatus,
  Milestone,
  ClearCauseError 
} from '../lib/types';
import { 
  validateData, 
  campaignCreateSchema, 
  campaignUpdateSchema, 
  campaignFilterSchema,
  paginationSchema,
  validateFile,
  validateCampaignDates,
  validateMilestoneAmounts
} from '../utils/validation';
import { withErrorHandling, handleSupabaseError, createSuccessResponse } from '../utils/errors';
import { createPaginatedResponse, calculatePercentage } from '../utils/helpers';
import { logAuditEvent } from './adminService';
import { getUserProfile } from './userService';
import { getCharityByUserId } from './charityService';

/**
 * Create new campaign
 */
export const createCampaign = withErrorHandling(async (
  campaignData: CampaignCreateData,
  userId: string
): Promise<ApiResponse<Campaign>> => {
  // Validate input
  const validatedData = validateData(campaignCreateSchema, campaignData);

  // Get user's charity organization
  const charityResult = await getCharityByUserId(userId);
  if (!charityResult.success || !charityResult.data) {
    throw new ClearCauseError('FORBIDDEN', 'You must have a verified charity organization to create campaigns', 403);
  }

  const charity = charityResult.data;
  if (charity.verificationStatus !== 'approved') {
    throw new ClearCauseError('FORBIDDEN', 'Your charity organization must be verified to create campaigns', 403);
  }

  // Validate campaign dates
  if (validatedData.startDate && validatedData.endDate) {
    validateCampaignDates(validatedData.startDate, validatedData.endDate);
  }

  // Validate milestone amounts
  if (validatedData.milestones) {
    validateMilestoneAmounts(validatedData.milestones, validatedData.goalAmount);
  }

  // Upload campaign image if provided
  let imageUrl: string | null = null;
  if (campaignData.imageFile) {
    const fileValidation = validateFile(campaignData.imageFile, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (!fileValidation.valid) {
      throw new ClearCauseError('INVALID_FILE_TYPE', fileValidation.error || 'Invalid image file', 400);
    }

    const filePath = `campaign-images/${charity.id}-${Date.now()}`;
    const { url, error: uploadError } = await uploadFile('campaigns', filePath, campaignData.imageFile);

    if (uploadError || !url) {
      throw new ClearCauseError('UPLOAD_FAILED', uploadError || 'Image upload failed', 500);
    }

    imageUrl = url;
  }

  // Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      charity_id: charity.id,
      title: validatedData.title,
      description: validatedData.description,
      goal_amount: validatedData.goalAmount,
      current_amount: 0,
      image_url: imageUrl,
      status: 'draft',
      start_date: validatedData.startDate || null,
      end_date: validatedData.endDate || null,
      category: validatedData.category || null,
      location: validatedData.location || null,
    })
    .select()
    .single();

  if (campaignError) {
    throw handleSupabaseError(campaignError);
  }

  // Create milestones if provided
  let milestones: Milestone[] = [];
  if (validatedData.milestones && validatedData.milestones.length > 0) {
    const milestoneInserts = validatedData.milestones.map(milestone => ({
      campaign_id: campaign.id,
      title: milestone.title,
      description: milestone.description,
      target_amount: milestone.targetAmount,
      evidence_description: milestone.evidenceDescription || null,
      status: 'pending' as const,
    }));

    const { data: createdMilestones, error: milestoneError } = await supabase
      .from('milestones')
      .insert(milestoneInserts)
      .select();

    if (milestoneError) {
      throw handleSupabaseError(milestoneError);
    }

    milestones = createdMilestones.map(m => ({
      id: m.id,
      campaignId: m.campaign_id,
      title: m.title,
      description: m.description,
      targetAmount: m.target_amount,
      evidenceDescription: m.evidence_description,
      status: m.status,
      proofDocuments: m.proof_documents,
      verificationNotes: m.verification_notes,
      verifiedAt: m.verified_at,
      verifiedBy: m.verified_by,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));
  }

  // Log audit event
  await logAuditEvent(userId, 'CAMPAIGN_CREATED', 'campaign', campaign.id, validatedData);

  return createSuccessResponse({
    id: campaign.id,
    charityId: campaign.charity_id,
    title: campaign.title,
    description: campaign.description,
    goalAmount: campaign.goal_amount,
    currentAmount: campaign.current_amount,
    imageUrl: campaign.image_url,
    status: campaign.status,
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    category: campaign.category,
    location: campaign.location,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
    charity,
    milestones,
    progress: calculatePercentage(campaign.current_amount, campaign.goal_amount),
  }, 'Campaign created successfully');
});

/**
 * Get campaign by ID
 */
export const getCampaignById = withErrorHandling(async (
  campaignId: string,
  includeRelations: boolean = true
): Promise<ApiResponse<Campaign>> => {
  let query = supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId);

  if (includeRelations) {
    query = supabase
      .from('campaigns')
      .select(`
        *,
        charities:charity_id (
          *,
          profiles:user_id (
            id,
            email,
            full_name,
            avatar_url,
            role,
            is_verified
          )
        )
      `)
      .eq('id', campaignId);
  }

  const { data: campaign, error } = await query.single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!campaign) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  // Get milestones if including relations
  let milestones: Milestone[] = [];
  if (includeRelations) {
    const { data: milestonesData, error: milestonesError } = await supabase
      .from('milestones')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('target_amount', { ascending: true });

    if (milestonesError) {
      throw handleSupabaseError(milestonesError);
    }

    milestones = milestonesData.map(m => ({
      id: m.id,
      campaignId: m.campaign_id,
      title: m.title,
      description: m.description,
      targetAmount: m.target_amount,
      evidenceDescription: m.evidence_description,
      status: m.status,
      proofDocuments: m.proof_documents,
      verificationNotes: m.verification_notes,
      verifiedAt: m.verified_at,
      verifiedBy: m.verified_by,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));
  }

  const result: Campaign = {
    id: campaign.id,
    charityId: campaign.charity_id,
    title: campaign.title,
    description: campaign.description,
    goalAmount: campaign.goal_amount,
    currentAmount: campaign.current_amount,
    imageUrl: campaign.image_url,
    status: campaign.status,
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    category: campaign.category,
    location: campaign.location,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
    progress: calculatePercentage(campaign.current_amount, campaign.goal_amount),
  };

  if (includeRelations && campaign.charities) {
    result.charity = {
      id: campaign.charities.id,
      userId: campaign.charities.user_id,
      organizationName: campaign.charities.organization_name,
      description: campaign.charities.description,
      websiteUrl: campaign.charities.website_url,
      contactPhone: campaign.charities.contact_phone,
      address: campaign.charities.address,
      verificationStatus: campaign.charities.verification_status,
      createdAt: campaign.charities.created_at,
      updatedAt: campaign.charities.updated_at,
      user: campaign.charities.profiles ? {
        id: campaign.charities.profiles.id,
        email: campaign.charities.profiles.email,
        fullName: campaign.charities.profiles.full_name,
        avatarUrl: campaign.charities.profiles.avatar_url,
        role: campaign.charities.profiles.role,
        isVerified: campaign.charities.profiles.is_verified,
        createdAt: '',
        updatedAt: '',
      } : undefined,
    };

    result.milestones = milestones;
  }

  return createSuccessResponse(result);
});

/**
 * Update campaign
 */
export const updateCampaign = withErrorHandling(async (
  campaignId: string,
  updates: Partial<CampaignCreateData & { status: CampaignStatus }>,
  currentUserId: string
): Promise<ApiResponse<Campaign>> => {
  // Validate input
  const validatedUpdates = validateData(campaignUpdateSchema, updates);

  // Get campaign to check ownership
  const campaignResult = await getCampaignById(campaignId, true);
  if (!campaignResult.success || !campaignResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  const campaign = campaignResult.data;

  // Check if user can update this campaign
  if (campaign.charity?.userId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only update your own campaigns', 403);
    }
  }

  // Validate campaign dates if provided
  if (validatedUpdates.startDate && validatedUpdates.endDate) {
    validateCampaignDates(validatedUpdates.startDate, validatedUpdates.endDate);
  }

  // Handle image upload if provided
  let imageUrl = campaign.imageUrl;
  if (updates.imageFile) {
    const fileValidation = validateFile(updates.imageFile, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (!fileValidation.valid) {
      throw new ClearCauseError('INVALID_FILE_TYPE', fileValidation.error || 'Invalid image file', 400);
    }

    const filePath = `campaign-images/${campaign.charityId}-${Date.now()}`;
    const { url, error: uploadError } = await uploadFile('campaigns', filePath, updates.imageFile);

    if (uploadError || !url) {
      throw new ClearCauseError('UPLOAD_FAILED', uploadError || 'Image upload failed', 500);
    }

    imageUrl = url;
  }

  // Update campaign
  const { data: updatedCampaign, error: updateError } = await supabase
    .from('campaigns')
    .update({
      title: validatedUpdates.title,
      description: validatedUpdates.description,
      goal_amount: validatedUpdates.goalAmount,
      image_url: imageUrl,
      status: validatedUpdates.status,
      start_date: validatedUpdates.startDate,
      end_date: validatedUpdates.endDate,
      category: validatedUpdates.category,
      location: validatedUpdates.location,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .select()
    .single();

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  // Log audit event
  await logAuditEvent(currentUserId, 'CAMPAIGN_UPDATED', 'campaign', campaignId, validatedUpdates);

  // Return updated campaign with relations
  return getCampaignById(campaignId, true);
});

/**
 * List campaigns with filters and pagination
 */
export const listCampaigns = withErrorHandling(async (
  filters: CampaignFilters = {},
  params: PaginationParams
): Promise<PaginatedResponse<Campaign>> => {
  const validatedFilters = validateData(campaignFilterSchema, filters);
  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('campaigns')
    .select(`
      *,
      charity_organizations:charity_id (
        id,
        organization_name,
        verification_status,
        profiles:user_id (
          full_name,
          avatar_url
        )
      )
    `, { count: 'exact' });

  // Apply filters
  if (validatedFilters.status && validatedFilters.status.length > 0) {
    query = query.in('status', validatedFilters.status);
  }

  if (validatedFilters.category && validatedFilters.category.length > 0) {
    query = query.in('category', validatedFilters.category);
  }

  if (validatedFilters.location && validatedFilters.location.length > 0) {
    query = query.in('location', validatedFilters.location);
  }

  if (validatedFilters.minGoal) {
    query = query.gte('goal_amount', validatedFilters.minGoal);
  }

  if (validatedFilters.maxGoal) {
    query = query.lte('goal_amount', validatedFilters.maxGoal);
  }

  if (validatedFilters.search) {
    query = query.or(`title.ilike.%${validatedFilters.search}%,description.ilike.%${validatedFilters.search}%`);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  const campaigns = data.map(campaign => ({
    id: campaign.id,
    charityId: campaign.charity_id,
    title: campaign.title,
    description: campaign.description,
    goalAmount: campaign.goal_amount,
    currentAmount: campaign.current_amount,
    imageUrl: campaign.image_url,
    status: campaign.status,
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    category: campaign.category,
    location: campaign.location,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
    progress: calculatePercentage(campaign.current_amount, campaign.goal_amount),
    charity: campaign.charity_organizations ? {
      id: campaign.charity_organizations.id,
      userId: '',
      organizationName: campaign.charity_organizations.organization_name,
      description: '',
      websiteUrl: null,
      phone: null,
      address: null,
      registrationNumber: null,
      verificationStatus: campaign.charity_organizations.verification_status,
      verificationDocuments: null,
      createdAt: '',
      updatedAt: '',
      user: campaign.charity_organizations.profiles ? {
        id: '',
        email: '',
        fullName: campaign.charity_organizations.profiles.full_name,
        avatarUrl: campaign.charity_organizations.profiles.avatar_url,
        role: 'charity',
        isVerified: false,
        createdAt: '',
        updatedAt: '',
      } : undefined,
    } : undefined,
  }));

  return createPaginatedResponse(campaigns, count || 0, validatedParams);
});

/**
 * Get campaigns by charity
 */
export const getCampaignsByCharity = withErrorHandling(async (
  charityId: string,
  params: PaginationParams,
  currentUserId?: string
): Promise<PaginatedResponse<Campaign>> => {
  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('campaigns')
    .select('*', { count: 'exact' })
    .eq('charity_id', charityId);

  // If not the charity owner or admin, only show active campaigns
  if (currentUserId) {
    const charityResult = await getCharityByUserId(currentUserId);
    const currentUser = await getUserProfile(currentUserId);
    
    if (!charityResult.success || 
        charityResult.data?.id !== charityId ||
        (currentUser.success && currentUser.data?.role !== 'admin')) {
      query = query.eq('status', 'active');
    }
  } else {
    query = query.eq('status', 'active');
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  const campaigns = data.map(campaign => ({
    id: campaign.id,
    charityId: campaign.charity_id,
    title: campaign.title,
    description: campaign.description,
    goalAmount: campaign.goal_amount,
    currentAmount: campaign.current_amount,
    imageUrl: campaign.image_url,
    status: campaign.status,
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    category: campaign.category,
    location: campaign.location,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
    progress: calculatePercentage(campaign.current_amount, campaign.goal_amount),
  }));

  return createPaginatedResponse(campaigns, count || 0, validatedParams);
});

/**
 * Update campaign status
 */
export const updateCampaignStatus = withErrorHandling(async (
  campaignId: string,
  status: CampaignStatus,
  currentUserId: string
): Promise<ApiResponse<Campaign>> => {
  // Get campaign to check ownership
  const campaignResult = await getCampaignById(campaignId, true);
  if (!campaignResult.success || !campaignResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  const campaign = campaignResult.data;

  // Check if user can update this campaign
  if (campaign.charity?.userId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only update your own campaigns', 403);
    }
  }

  // Validate status transition
  const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
    draft: ['active', 'cancelled'],
    active: ['paused', 'completed', 'cancelled'],
    paused: ['active', 'cancelled'],
    completed: [], // Cannot change from completed
    cancelled: [], // Cannot change from cancelled
  };

  if (!validTransitions[campaign.status].includes(status)) {
    throw new ClearCauseError(
      'INVALID_STATUS_TRANSITION', 
      `Cannot change campaign status from ${campaign.status} to ${status}`, 
      400
    );
  }

  // Update campaign status
  const { data: updatedCampaign, error: updateError } = await supabase
    .from('campaigns')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .select()
    .single();

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  // Log audit event
  await logAuditEvent(currentUserId, 'CAMPAIGN_STATUS_UPDATE', 'campaign', campaignId, { 
    oldStatus: campaign.status, 
    newStatus: status 
  });

  // Return updated campaign with relations
  return getCampaignById(campaignId, true);
});

/**
 * Delete campaign
 */
export const deleteCampaign = withErrorHandling(async (
  campaignId: string,
  currentUserId: string
): Promise<ApiResponse<void>> => {
  // Get campaign to check ownership
  const campaignResult = await getCampaignById(campaignId, true);
  if (!campaignResult.success || !campaignResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  const campaign = campaignResult.data;

  // Check if user can delete this campaign
  if (campaign.charity?.userId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only delete your own campaigns', 403);
    }
  }

  // Check if campaign can be deleted (no donations or only draft status)
  if (campaign.status !== 'draft' && campaign.currentAmount > 0) {
    throw new ClearCauseError(
      'DELETION_BLOCKED',
      'Cannot delete campaign that has received donations. You can cancel it instead.',
      400
    );
  }

  // Log audit event before deletion
  await logAuditEvent(currentUserId, 'CAMPAIGN_DELETE', 'campaign', campaignId);

  // Delete campaign (this will cascade to milestones based on DB constraints)
  const { error: deleteError } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  return createSuccessResponse(undefined, 'Campaign deleted successfully');
});

// Convenience aliases for backward compatibility
export const getAllCampaigns = listCampaigns;
export const getCharityCampaigns = getCampaignsByCharity;

// Create suggested campaigns function for donors
export const getSuggestedCampaigns = withErrorHandling(async (
  userId: string,
  params: PaginationParams = { page: 1, limit: 10 }
): Promise<PaginatedResponse<Campaign>> => {
  // For now, just return active campaigns sorted by recent donations
  // In the future, this could use ML/recommendation algorithms
  return listCampaigns(
    { status: ['active'] },
    { ...params, sortBy: 'current_amount', sortOrder: 'desc' }
  );
});

/**
 * Get campaign statistics
 */
export const getCampaignStatistics = withErrorHandling(async (
  campaignId: string
): Promise<ApiResponse<{
  totalDonations: number;
  uniqueDonors: number;
  averageDonation: number;
  recentDonations: Array<{
    amount: number;
    donorName: string | null;
    message: string | null;
    createdAt: string;
  }>;
}>> => {
  // Get campaign donations
  const { data: donations, error: donationError } = await supabase
    .from('donations')
    .select(`
      amount,
      message,
      is_anonymous,
      created_at,
      profiles:donor_id (
        full_name
      )
    `)
    .eq('campaign_id', campaignId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (donationError) {
    throw handleSupabaseError(donationError);
  }

  const totalDonations = donations.length;
  const uniqueDonors = new Set(donations.map(d => d.profiles?.full_name).filter(Boolean)).size;
  const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);
  const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;

  const recentDonations = donations.slice(0, 10).map(d => ({
    amount: d.amount,
    donorName: d.is_anonymous ? null : d.profiles?.full_name || null,
    message: d.message,
    createdAt: d.created_at,
  }));

  return createSuccessResponse({
    totalDonations,
    uniqueDonors,
    averageDonation: Math.round(averageDonation * 100) / 100,
    recentDonations,
  });
});
