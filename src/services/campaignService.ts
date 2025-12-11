
//  * Campaign Service
//  * Handles campaign creation, management, and operations


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
import * as milestoneService from './milestoneService';
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

  // Handle campaign image - either pre-uploaded URL or file to upload
  let imageUrl: string | null = null;

  // Check if image URL is already provided (pre-uploaded by form)
  if (campaignData.imageUrl) {
    imageUrl = campaignData.imageUrl;
  }
  // Otherwise, check if image file provided for upload
  else if (campaignData.imageFile) {
    const fileValidation = validateFile(campaignData.imageFile, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    if (!fileValidation.valid) {
      throw new ClearCauseError('INVALID_FILE_TYPE', fileValidation.error || 'Invalid image file', 400);
    }

    const filePath = `campaign-images/${charity.id}-${Date.now()}`;
    const { url, error: uploadError } = await uploadFile('Campaigns', filePath, campaignData.imageFile);

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
      status: validatedData.status || 'pending',
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

  // Create milestones if provided using milestone service
  let milestones: Milestone[] = [];
  if (validatedData.milestones && validatedData.milestones.length > 0) {
    const milestonesResult = await milestoneService.createMilestones(
      campaign.id,
      validatedData.milestones
    );
    milestones = milestonesResult.data;
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
    donorsCount: campaign.donors_count || 0,
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
      status: m.status,
      dueDate: m.due_date,
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
    donorsCount: campaign.donors_count || 0,
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
      logoUrl: campaign.charities.logo_url,
      contactPhone: campaign.charities.contact_phone,
      contactEmail: campaign.charities.contact_email,
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

  // Validate deadline extension
  if (validatedUpdates.endDate) {
    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      throw new ClearCauseError(
        'ACTION_NOT_ALLOWED', 
        'Cannot extend the deadline of a completed or cancelled campaign. Please contact support if this is an error.', 
        400
      );
    }
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
    const { url, error: uploadError } = await uploadFile('Campaigns', filePath, updates.imageFile);

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

  // Release seed funding if campaign is being activated
  if (validatedUpdates.status === 'active' && campaign.status !== 'active') {
    try {
      await releaseSeedFunds(campaignId, currentUserId);
      console.log(`[Campaign] Seed funds released for campaign ${campaignId}`);
    } catch (seedError) {
      console.error(`[Campaign] Failed to release seed funds for campaign ${campaignId}:`, seedError);
      // Don't fail the campaign update if seed release fails
      // Admin can manually release funds later
    }
  }

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
      logoUrl: campaign.charity_organizations.logo_url || null,
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
  currentUserId?: string,
  filters?: CampaignFilters
): Promise<PaginatedResponse<Campaign>> => {
  const validatedParams = validateData(paginationSchema, params);
  const validatedFilters = filters ? validateData(campaignFilterSchema, filters) : {};
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

    // Check if user is charity owner
    const isCharityOwner = charityResult.success && charityResult.data?.id === charityId;
    // Check if user is admin
    const isAdmin = currentUser.success && currentUser.data?.role === 'admin';

    // Only filter to active campaigns if user is neither charity owner nor admin
    if (!isCharityOwner && !isAdmin) {
      query = query.eq('status', 'active');
    }
  } else {
    query = query.eq('status', 'active');
  }

  // Apply additional filters if provided
  if (validatedFilters.status && validatedFilters.status.length > 0) {
    query = query.in('status', validatedFilters.status);
  }

  if (validatedFilters.search) {
    query = query.or(`title.ilike.%${validatedFilters.search}%,description.ilike.%${validatedFilters.search}%`);
  }

  if (validatedFilters.category && validatedFilters.category.length > 0) {
    query = query.in('category', validatedFilters.category);
  }

  if (validatedFilters.location && validatedFilters.location.length > 0) {
    query = query.in('location', validatedFilters.location);
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
    donorsCount: campaign.donors_count || 0,
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
    draft: ['pending', 'cancelled'],
    pending: ['active', 'cancelled', 'draft'],
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

/**
 * Campaign Approval Workflow Functions
 */

/**
 * Get campaigns pending approval
 */
export const getCampaignsPendingApproval = withErrorHandling(async (
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<Campaign>> => {
  // Check if current user is admin
  const currentUser = await getUserProfile(currentUserId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access pending campaigns', 403);
  }

  return listCampaigns(
    { status: ['draft'] },
    { ...params, sortBy: 'created_at', sortOrder: 'asc' }
  );
});

/**
 * Approve campaign with admin feedback
 */
export const approveCampaign = withErrorHandling(async (
  campaignId: string,
  adminId: string,
  approvalData: {
    reason?: string;
    sendNotification?: boolean;
    autoActivate?: boolean;
  }
): Promise<ApiResponse<Campaign>> => {
  // Check if current user is admin
  const currentUser = await getUserProfile(adminId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can approve campaigns', 403);
  }

  // Get campaign
  const campaignResult = await getCampaignById(campaignId, true);
  if (!campaignResult.success || !campaignResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  const campaign = campaignResult.data;

  // Validate current status - allow draft or pending
  if (campaign.status !== 'pending' && campaign.status !== 'draft') {
    throw new ClearCauseError('INVALID_STATUS', 'Only draft or pending campaigns can be approved', 400);
  }

  // Update campaign status to active (or draft if not auto-activating)
  const newStatus: CampaignStatus = approvalData.autoActivate !== false ? 'active' : 'draft';

  const result = await updateCampaignStatus(campaignId, newStatus, adminId);

  // Create approval record
  const { error: approvalError } = await supabase
    .from('campaign_approvals')
    .insert({
      campaign_id: campaignId,
      admin_id: adminId,
      action: 'approved',
      reason: approvalData.reason || 'Campaign approved by administrator',
      approved_at: new Date().toISOString(),
    });

  // Log detailed audit event
  await logAuditEvent(adminId, 'CAMPAIGN_APPROVED', 'campaign', campaignId, {
    reason: approvalData.reason,
    newStatus,
    charityId: campaign.charityId,
    campaignTitle: campaign.title,
  });

  // TODO: Send email notification to charity if enabled
  if (approvalData.sendNotification !== false && campaign.charity?.user?.email) {
    // Email notification implementation would go here
    console.log(`Would send approval notification to ${campaign.charity.user.email}`);
  }

  return result;
});

/**
 * Reject campaign with admin feedback
 */
export const rejectCampaign = withErrorHandling(async (
  campaignId: string,
  adminId: string,
  rejectionData: {
    reason: string;
    allowResubmission?: boolean;
    sendNotification?: boolean;
  }
): Promise<ApiResponse<Campaign>> => {
  // Check if current user is admin
  const currentUser = await getUserProfile(adminId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can reject campaigns', 403);
  }

  // Get campaign
  const campaignResult = await getCampaignById(campaignId, true);
  if (!campaignResult.success || !campaignResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  const campaign = campaignResult.data;

  // Validate current status - allow draft or pending
  if (campaign.status !== 'pending' && campaign.status !== 'draft') {
    throw new ClearCauseError('INVALID_STATUS', 'Only draft or pending campaigns can be rejected', 400);
  }

  // Update campaign status
  const newStatus: CampaignStatus = rejectionData.allowResubmission !== false ? 'draft' : 'cancelled';

  const result = await updateCampaignStatus(campaignId, newStatus, adminId);

  // Create rejection record
  const { error: rejectionError } = await supabase
    .from('campaign_approvals')
    .insert({
      campaign_id: campaignId,
      admin_id: adminId,
      action: 'rejected',
      reason: rejectionData.reason,
      rejected_at: new Date().toISOString(),
    });

  // Log detailed audit event
  await logAuditEvent(adminId, 'CAMPAIGN_REJECTED', 'campaign', campaignId, {
    reason: rejectionData.reason,
    newStatus,
    allowResubmission: rejectionData.allowResubmission,
    charityId: campaign.charityId,
    campaignTitle: campaign.title,
  });

  // TODO: Send email notification to charity if enabled
  if (rejectionData.sendNotification !== false && campaign.charity?.user?.email) {
    // Email notification implementation would go here
    console.log(`Would send rejection notification to ${campaign.charity.user.email}`);
  }

  return result;
});

/**
 * Request campaign revision with admin feedback
 */
export const requestCampaignRevision = withErrorHandling(async (
  campaignId: string,
  adminId: string,
  revisionData: {
    reason: string;
    suggestions?: string;
    sendNotification?: boolean;
  }
): Promise<ApiResponse<Campaign>> => {
  // Check if current user is admin
  const currentUser = await getUserProfile(adminId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can request revisions', 403);
  }

  // Get campaign
  const campaignResult = await getCampaignById(campaignId, true);
  if (!campaignResult.success || !campaignResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  const campaign = campaignResult.data;

  // Validate current status - allow draft or pending
  if (campaign.status !== 'pending' && campaign.status !== 'draft') {
    throw new ClearCauseError('INVALID_STATUS', 'Only draft or pending campaigns can be sent for revision', 400);
  }

  // Update campaign status back to draft (only if not already draft)
  let result;
  if (campaign.status !== 'draft') {
    result = await updateCampaignStatus(campaignId, 'draft', adminId);
  } else {
    // Campaign is already in draft, just return it
    result = campaignResult;
  }

  // Create revision record
  const { error: revisionError } = await supabase
    .from('campaign_approvals')
    .insert({
      campaign_id: campaignId,
      admin_id: adminId,
      action: 'revision_requested',
      reason: revisionData.reason,
      suggestions: revisionData.suggestions,
      requested_at: new Date().toISOString(),
    });

  // Log detailed audit event
  await logAuditEvent(adminId, 'CAMPAIGN_REVISION_REQUESTED', 'campaign', campaignId, {
    reason: revisionData.reason,
    suggestions: revisionData.suggestions,
    charityId: campaign.charityId,
    campaignTitle: campaign.title,
  });

  // TODO: Send email notification to charity if enabled
  if (revisionData.sendNotification !== false && campaign.charity?.user?.email) {
    // Email notification implementation would go here
    console.log(`Would send revision request notification to ${campaign.charity.user.email}`);
  }

  return result;
});

/**
 * Get campaign approval history
 */
export const getCampaignApprovalHistory = withErrorHandling(async (
  campaignId: string,
  currentUserId: string
): Promise<ApiResponse<any[]>> => {
  // Get campaign to check ownership or admin access
  const campaignResult = await getCampaignById(campaignId, true);
  if (!campaignResult.success || !campaignResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  const campaign = campaignResult.data;
  const currentUser = await getUserProfile(currentUserId);

  // Check access permissions
  const isOwner = campaign.charity?.userId === currentUserId;
  const isAdmin = currentUser.success && currentUser.data?.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ClearCauseError('FORBIDDEN', 'You can only view approval history for your own campaigns', 403);
  }

  // Get approval history
  const { data: approvals, error } = await supabase
    .from('campaign_approvals')
    .select(`
      *,
      admin:admin_id (
        full_name,
        email
      )
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  const history = (approvals || []).map(approval => ({
    id: approval.id,
    action: approval.action,
    reason: approval.reason,
    suggestions: approval.suggestions,
    adminName: approval.admin?.full_name || 'Unknown Admin',
    adminEmail: isAdmin ? approval.admin?.email : null, // Only show email to admins
    createdAt: approval.created_at,
    approvedAt: approval.approved_at,
    rejectedAt: approval.rejected_at,
    requestedAt: approval.requested_at,
  }));

  return createSuccessResponse(history);
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
      profiles:user_id (
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

/**
 * Release seed funding (25% of goal) when campaign becomes active
 */
export const releaseSeedFunds = withErrorHandling(async (
  campaignId: string,
  adminUserId: string
): Promise<ApiResponse<{ amount: number; disbursementId: string }>> => {
  // Get campaign details
  const campaignResult = await getCampaignById(campaignId, true);
  if (!campaignResult.success || !campaignResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  const campaign = campaignResult.data;

  // Check if seed was already released
  if (campaign.seedAmountReleased && campaign.seedAmountReleased > 0) {
    throw new ClearCauseError('BAD_REQUEST', 'Seed funding already released for this campaign', 400);
  }

  // Calculate seed amount (25% of goal)
  const seedAmount = campaign.goalAmount * 0.25;

  // Create disbursement record
  const { data: disbursement, error: disbursementError } = await supabase
    .from('fund_disbursements')
    .insert({
      campaign_id: campaignId,
      charity_id: campaign.charityId,
      amount: seedAmount,
      disbursement_type: 'seed',
      status: 'completed',
      approved_by: adminUserId,
      approved_at: new Date().toISOString(),
      notes: 'Initial seed funding (25% of campaign goal) released upon campaign activation',
    })
    .select()
    .single();

  if (disbursementError) {
    throw handleSupabaseError(disbursementError);
  }

  // Update campaign with seed amount
  const { error: campaignUpdateError } = await supabase
    .from('campaigns')
    .update({
      seed_amount_released: seedAmount,
      seed_released_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (campaignUpdateError) {
    throw handleSupabaseError(campaignUpdateError);
  }

  // Update charity balance
  const { data: charity, error: charityFetchError } = await supabase
    .from('charities')
    .select('available_balance, total_received')
    .eq('id', campaign.charityId)
    .single();

  if (charityFetchError) {
    throw handleSupabaseError(charityFetchError);
  }

  const { error: charityUpdateError } = await supabase
    .from('charities')
    .update({
      available_balance: (charity.available_balance || 0) + seedAmount,
      total_received: (charity.total_received || 0) + seedAmount,
    })
    .eq('id', campaign.charityId);

  if (charityUpdateError) {
    throw handleSupabaseError(charityUpdateError);
  }

  // Send notification to charity
  try {
    const { createNotification } = await import('./notificationService');
    await createNotification({
      userId: campaign.charity?.userId || '',
      type: 'fund_released',
      title: '🎉 Seed Funding Released!',
      message: `₱${seedAmount.toLocaleString()} seed funding (25% of goal) has been released for your campaign "${campaign.title}". Use these funds to start your project!`,
      campaignId: campaignId,
      actionUrl: `/charity/funds`,
      metadata: {
        disbursement_id: disbursement.id,
        amount: seedAmount,
        type: 'seed',
      },
    });
  } catch (notificationError) {
    console.error('Failed to send seed funding notification:', notificationError);
  }

  // Log audit event
  await logAuditEvent(adminUserId, 'SEED_FUNDS_RELEASED', 'campaign', campaignId, {
    amount: seedAmount,
    disbursementId: disbursement.id,
  });

  return createSuccessResponse({
    amount: seedAmount,
    disbursementId: disbursement.id,
  });
});

/**
 * Create campaign update/impact post
 */
export const createCampaignUpdate = withErrorHandling(async (
  campaignId: string,
  updateData: {
    title: string;
    content: string;
    updateType: 'milestone' | 'impact' | 'general';
    milestoneId?: string;
    imageFile?: File;
  },
  userId: string
): Promise<ApiResponse<any>> => {
  // Validate campaign exists and user has permission
  const campaignResult = await getCampaignById(campaignId);
  if (!campaignResult.success || !campaignResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign not found', 404);
  }

  const campaign = campaignResult.data;

  // Check if user is the campaign owner
  const charityResult = await getCharityByUserId(userId);
  if (!charityResult.success || !charityResult.data ||
      charityResult.data.id !== campaign.charity.id) {
    throw new ClearCauseError('FORBIDDEN', 'You can only create updates for your own campaigns', 403);
  }

  // Handle image upload if provided
  let imageUrl = null;
  if (updateData.imageFile) {
    // Validate image file
    validateFile(updateData.imageFile, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    const filePath = `campaign-updates/${campaignId}/${Date.now()}-${updateData.imageFile.name}`;
    const { url, error: uploadError } = await uploadFile('Campaigns', filePath, updateData.imageFile);
    if (uploadError) {
      throw new ClearCauseError('UPLOAD_FAILED', 'Failed to upload image', 500);
    }
    imageUrl = url;
  }

  // Create the update
  const { data: update, error: insertError } = await supabase
    .from('campaign_updates')
    .insert({
      campaign_id: campaignId,
      charity_id: campaign.charity.id,
      title: updateData.title,
      content: updateData.content,
      update_type: updateData.updateType,
      milestone_id: updateData.milestoneId || null,
      image_url: imageUrl,
      created_by: userId,
      status: 'published'
    })
    .select(`
      *,
      campaigns (
        title,
        charities (
          organization_name
        )
      ),
      milestones (
        title
      ),
      profiles:created_by (
        full_name
      )
    `)
    .single();

  if (insertError) {
    throw handleSupabaseError(insertError);
  }

  // Log audit event
  await logAuditEvent(
    userId,
    'create_campaign_update',
    'campaign_update',
    update.id,
    {
      campaign_id: campaignId,
      update_type: updateData.updateType,
      milestone_id: updateData.milestoneId
    }
  );

  // Notify all donors of this campaign
  try {
    // Get all unique donors who have donated to this campaign
    const { data: donations, error: donorsError } = await supabase
      .from('donations')
      .select('user_id')
      .eq('campaign_id', campaignId)
      .eq('status', 'completed');

    if (!donorsError && donations && donations.length > 0) {
      // Get unique donor IDs
      const uniqueDonorIds = [...new Set(donations.map(d => d.user_id))];

      // Create notifications for each donor
      const { createNotification } = await import('./notificationService');

      for (const donorId of uniqueDonorIds) {
        await createNotification({
          userId: donorId,
          type: 'campaign_update',
          title: `New Update: ${updateData.title}`,
          message: `${campaign.charity.organizationName} posted a new update for "${campaign.title}". Check it out to see the latest progress!`,
          campaignId: campaignId,
          actionUrl: `/campaigns/${campaignId}?tab=updates`,
          metadata: {
            update_id: update.id,
            update_type: updateData.updateType,
            charity_name: campaign.charity.organizationName
          }
        });
      }
    }
  } catch (notificationError) {
    // Don't fail the update creation if notifications fail
    console.error('Failed to send donor notifications:', notificationError);
  }

  return createSuccessResponse({
    id: update.id,
    campaignId: update.campaign_id,
    charityId: update.charity_id,
    title: update.title,
    content: update.content,
    updateType: update.update_type,
    milestoneId: update.milestone_id,
    imageUrl: update.image_url,
    status: update.status,
    createdAt: update.created_at,
    updatedAt: update.updated_at,
    campaign: {
      title: update.campaigns?.title,
      organizationName: update.campaigns?.charities?.organization_name
    },
    milestone: update.milestones ? {
      title: update.milestones.title
    } : null,
    author: {
      name: update.profiles?.full_name
    }
  }, 'Campaign update created successfully');
});

/**
 * Get campaign updates for a specific campaign
 */
export const getCampaignUpdates = withErrorHandling(async (
  campaignId: string,
  params: PaginationParams & { status?: string } = { page: 1, limit: 10 }
): Promise<PaginatedResponse<any>> => {
  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('campaign_updates')
    .select(`
      *,
      campaigns (
        title,
        charities (
          organization_name
        )
      ),
      milestones (
        title
      ),
      profiles:created_by (
        full_name,
        avatar_url
      )
    `, { count: 'exact' })
    .eq('campaign_id', campaignId);

  // Filter by status if provided
  if (params.status) {
    query = query.eq('status', params.status);
  } else {
    // Default to published updates only
    query = query.eq('status', 'published');
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data: updates, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  // Transform data
  const transformedUpdates = (updates || []).map(update => ({
    id: update.id,
    campaignId: update.campaign_id,
    charityId: update.charity_id,
    title: update.title,
    content: update.content,
    updateType: update.update_type,
    milestoneId: update.milestone_id,
    imageUrl: update.image_url,
    status: update.status,
    createdAt: update.created_at,
    updatedAt: update.updated_at,
    campaign: {
      title: update.campaigns?.title,
      organizationName: update.campaigns?.charities?.organization_name
    },
    milestone: update.milestones ? {
      title: update.milestones.title
    } : null,
    author: {
      name: update.profiles?.full_name,
      avatarUrl: update.profiles?.avatar_url
    }
  }));

  return createPaginatedResponse(transformedUpdates, count || 0, validatedParams);
});

/**
 * Get all campaign updates (for admin moderation)
 */
export const getAllCampaignUpdates = withErrorHandling(async (
  filters: {
    status?: string;
    updateType?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access all campaign updates', 403);
  }

  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('campaign_updates')
    .select(`
      *,
      campaigns (
        title,
        charities (
          organization_name
        )
      ),
      milestones (
        title
      ),
      profiles:created_by (
        full_name,
        avatar_url
      )
    `, { count: 'exact' });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.updateType) {
    query = query.eq('update_type', filters.updateType);
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%,campaigns.title.ilike.%${filters.search}%`);
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data: updates, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  // Transform data
  const transformedUpdates = (updates || []).map(update => ({
    id: update.id,
    campaignId: update.campaign_id,
    charityId: update.charity_id,
    title: update.title,
    content: update.content,
    updateType: update.update_type,
    milestoneId: update.milestone_id,
    imageUrl: update.image_url,
    status: update.status,
    createdAt: update.created_at,
    updatedAt: update.updated_at,
    campaign: {
      title: update.campaigns?.title,
      organizationName: update.campaigns?.charities?.organization_name
    },
    milestone: update.milestones ? {
      title: update.milestones.title
    } : null,
    author: {
      name: update.profiles?.full_name,
      avatarUrl: update.profiles?.avatar_url
    }
  }));

  return createPaginatedResponse(transformedUpdates, count || 0, validatedParams);
});

/**
 * Update campaign update/impact post
 */
export const updateCampaignUpdate = withErrorHandling(async (
  updateId: string,
  updateData: {
    title?: string;
    content?: string;
    status?: string;
    imageFile?: File;
  },
  userId: string
): Promise<ApiResponse<any>> => {
  // Get the update and verify permissions
  const { data: existingUpdate, error: fetchError } = await supabase
    .from('campaign_updates')
    .select(`
      *,
      campaigns (
        charities (
          user_id
        )
      )
    `)
    .eq('id', updateId)
    .single();

  if (fetchError || !existingUpdate) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign update not found', 404);
  }

  // Check if user is the owner or admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError) {
    throw handleSupabaseError(userError);
  }

  const isOwner = existingUpdate.campaigns?.charities?.user_id === userId;
  const isAdmin = currentUser?.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ClearCauseError('FORBIDDEN', 'You can only edit your own campaign updates', 403);
  }

  // Handle image upload if provided
  let imageUrl = existingUpdate.image_url;
  if (updateData.imageFile) {
    validateFile(updateData.imageFile, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
    });

    const filePath = `campaign-updates/${existingUpdate.campaign_id}/${Date.now()}-${updateData.imageFile.name}`;
    const { url, error: uploadError } = await uploadFile('Campaigns', filePath, updateData.imageFile);
    if (uploadError) {
      throw new ClearCauseError('UPLOAD_FAILED', 'Failed to upload image', 500);
    }
    imageUrl = url;
  }

  // Prepare update data
  const updatePayload: any = {
    updated_at: new Date().toISOString()
  };

  if (updateData.title !== undefined) updatePayload.title = updateData.title;
  if (updateData.content !== undefined) updatePayload.content = updateData.content;
  if (updateData.status !== undefined) updatePayload.status = updateData.status;
  if (imageUrl !== existingUpdate.image_url) updatePayload.image_url = imageUrl;

  // Update the record
  const { data: updated, error: updateError } = await supabase
    .from('campaign_updates')
    .update(updatePayload)
    .eq('id', updateId)
    .select(`
      *,
      campaigns (
        title,
        charities (
          organization_name
        )
      ),
      milestones (
        title
      ),
      profiles:created_by (
        full_name
      )
    `)
    .single();

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  // Log audit event
  await logAuditEvent(
    userId,
    'update_campaign_update',
    'campaign_update',
    updateId,
    {
      changes: updateData,
      is_admin_action: isAdmin
    }
  );

  return createSuccessResponse({
    id: updated.id,
    campaignId: updated.campaign_id,
    charityId: updated.charity_id,
    title: updated.title,
    content: updated.content,
    updateType: updated.update_type,
    milestoneId: updated.milestone_id,
    imageUrl: updated.image_url,
    status: updated.status,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
    campaign: {
      title: updated.campaigns?.title,
      organizationName: updated.campaigns?.charities?.organization_name
    },
    milestone: updated.milestones ? {
      title: updated.milestones.title
    } : null,
    author: {
      name: updated.profiles?.full_name
    }
  }, 'Campaign update updated successfully');
});

/**
 * Delete campaign update
 */
export const deleteCampaignUpdate = withErrorHandling(async (
  updateId: string,
  userId: string
): Promise<ApiResponse<void>> => {
  // Get the update and verify permissions
  const { data: existingUpdate, error: fetchError } = await supabase
    .from('campaign_updates')
    .select(`
      *,
      campaigns (
        charities (
          user_id
        )
      )
    `)
    .eq('id', updateId)
    .single();

  if (fetchError || !existingUpdate) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign update not found', 404);
  }

  // Check if user is the owner or admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (userError) {
    throw handleSupabaseError(userError);
  }

  const isOwner = existingUpdate.campaigns?.charities?.user_id === userId;
  const isAdmin = currentUser?.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ClearCauseError('FORBIDDEN', 'You can only delete your own campaign updates', 403);
  }

  // Delete the update
  const { error: deleteError } = await supabase
    .from('campaign_updates')
    .delete()
    .eq('id', updateId);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  // Log audit event
  await logAuditEvent(
    userId,
    'delete_campaign_update',
    'campaign_update',
    updateId,
    {
      campaign_id: existingUpdate.campaign_id,
      is_admin_action: isAdmin
    }
  );

  return createSuccessResponse(undefined, 'Campaign update deleted successfully');
});

/**
 * Get campaign update by ID
 */
export const getCampaignUpdateById = withErrorHandling(async (
  updateId: string
): Promise<ApiResponse<any>> => {
  const { data: update, error } = await supabase
    .from('campaign_updates')
    .select(`
      *,
      campaigns (
        title,
        charities (
          organization_name
        )
      ),
      milestones (
        title
      ),
      profiles:created_by (
        full_name,
        avatar_url
      )
    `)
    .eq('id', updateId)
    .single();

  if (error || !update) {
    throw new ClearCauseError('NOT_FOUND', 'Campaign update not found', 404);
  }

  return createSuccessResponse({
    id: update.id,
    campaignId: update.campaign_id,
    charityId: update.charity_id,
    title: update.title,
    content: update.content,
    updateType: update.update_type,
    milestoneId: update.milestone_id,
    imageUrl: update.image_url,
    status: update.status,
    createdAt: update.created_at,
    updatedAt: update.updated_at,
    campaign: {
      title: update.campaigns?.title,
      organizationName: update.campaigns?.charities?.organization_name
    },
    milestone: update.milestones ? {
      title: update.milestones.title
    } : null,
    author: {
      name: update.profiles?.full_name,
      avatarUrl: update.profiles?.avatar_url
    }
  });
});

/**
 * Get campaign milestones
 * @deprecated Use milestoneService.getMilestones instead
 */
export const getCampaignMilestones = milestoneService.getMilestones;
