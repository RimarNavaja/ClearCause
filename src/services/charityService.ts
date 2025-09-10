/**
 * Charity Service
 * Handles charity organization registration, verification, and management
 */

import { supabase, uploadFile } from '../lib/supabase';
import { 
  CharityOrganization, 
  ApiResponse, 
  PaginatedResponse, 
  PaginationParams, 
  CharityRegistrationData,
  VerificationStatus,
  ClearCauseError 
} from '../lib/types';
import { 
  validateData, 
  charityRegistrationSchema, 
  charityUpdateSchema, 
  charityVerificationSchema,
  paginationSchema,
  validateFile
} from '../utils/validation';
import { withErrorHandling, handleSupabaseError, createSuccessResponse } from '../utils/errors';
import { createPaginatedResponse } from '../utils/helpers';
import { logAuditEvent } from './adminService';
import { getUserProfile } from './userService';

/**
 * Register charity organization
 */
export const registerCharity = withErrorHandling(async (
  charityData: CharityRegistrationData,
  userId: string
): Promise<ApiResponse<CharityOrganization>> => {
  // Validate input
  const validatedData = validateData(charityRegistrationSchema, charityData);

  // Check if user already has a charity organization
  const { data: existingCharity, error: existingError } = await supabase
    .from('charities')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingError && existingError.code !== 'PGRST116') {
    throw handleSupabaseError(existingError);
  }

  if (existingCharity) {
    throw new ClearCauseError('ALREADY_EXISTS', 'User already has a charity organization registered', 409);
  }

  // Upload verification documents if provided
  let documentUrls: string[] = [];
  if (charityData.verificationDocuments && charityData.verificationDocuments.length > 0) {
    for (let i = 0; i < charityData.verificationDocuments.length; i++) {
      const file = charityData.verificationDocuments[i];
      
      // Validate file
      const fileValidation = validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
      });

      if (!fileValidation.valid) {
        throw new ClearCauseError('INVALID_FILE_TYPE', fileValidation.error || 'Invalid file', 400);
      }

      const filePath = `charity-documents/${userId}-${Date.now()}-${i}`;
      const { url, error: uploadError } = await uploadFile('documents', filePath, file);

      if (uploadError || !url) {
        throw new ClearCauseError('UPLOAD_FAILED', uploadError || 'Document upload failed', 500);
      }

      documentUrls.push(url);
    }
  }

  // Create charity organization
  const { data, error } = await supabase
    .from('charities')
    .insert({
      user_id: userId,
      organization_name: validatedData.organizationName,
      description: validatedData.description,
      website_url: validatedData.websiteUrl || null,
      contact_phone: validatedData.phone || null,
      address: validatedData.address || null,
      verification_status: 'pending',
    })
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role,
        is_verified
      )
    `)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(userId, 'CHARITY_REGISTRATION', 'charity', data.id, validatedData);

  return createSuccessResponse({
    id: data.id,
    userId: data.user_id,
    organizationName: data.organization_name,
    organizationType: data.organization_type,
    description: data.description,
    websiteUrl: data.website_url,
    logoUrl: data.logo_url,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    address: data.address,
    verificationStatus: data.verification_status,
    verificationNotes: data.verification_notes,
    transparencyScore: data.transparency_score,
    totalRaised: data.total_raised,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    user: data.profiles ? {
      id: data.profiles.id,
      email: data.profiles.email,
      fullName: data.profiles.full_name,
      avatarUrl: data.profiles.avatar_url,
      role: data.profiles.role,
      phone: null,
      isVerified: data.profiles.is_verified,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    } : undefined,
  }, 'Charity organization registered successfully. Verification is pending.');
});

/**
 * Get charity organization by ID
 */
export const getCharityById = withErrorHandling(async (
  charityId: string
): Promise<ApiResponse<CharityOrganization>> => {
  const { data, error } = await supabase
    .from('charity_organizations')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role,
        is_verified,
        created_at,
        updated_at
      )
    `)
    .eq('id', charityId)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new ClearCauseError('NOT_FOUND', 'Charity organization not found', 404);
  }

  return createSuccessResponse({
    id: data.id,
    userId: data.user_id,
    organizationName: data.organization_name,
    description: data.description,
    websiteUrl: data.website_url,
    phone: data.phone,
    address: data.address,
    registrationNumber: data.registration_number,
    verificationStatus: data.verification_status,
    verificationDocuments: data.verification_documents,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    user: data.profiles ? {
      id: data.profiles.id,
      email: data.profiles.email,
      fullName: data.profiles.full_name,
      avatarUrl: data.profiles.avatar_url,
      role: data.profiles.role,
      isVerified: data.profiles.is_verified,
      createdAt: data.profiles.created_at,
      updatedAt: data.profiles.updated_at,
    } : undefined,
  });
});

/**
 * Get charity organization by user ID
 */
export const getCharityByUserId = withErrorHandling(async (
  userId: string
): Promise<ApiResponse<CharityOrganization | null>> => {
  const { data, error } = await supabase
    .from('charity_organizations')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role,
        is_verified,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw handleSupabaseError(error);
  }

  if (!data) {
    return createSuccessResponse(null);
  }

  return createSuccessResponse({
    id: data.id,
    userId: data.user_id,
    organizationName: data.organization_name,
    description: data.description,
    websiteUrl: data.website_url,
    phone: data.phone,
    address: data.address,
    registrationNumber: data.registration_number,
    verificationStatus: data.verification_status,
    verificationDocuments: data.verification_documents,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    user: data.profiles ? {
      id: data.profiles.id,
      email: data.profiles.email,
      fullName: data.profiles.full_name,
      avatarUrl: data.profiles.avatar_url,
      role: data.profiles.role,
      isVerified: data.profiles.is_verified,
      createdAt: data.profiles.created_at,
      updatedAt: data.profiles.updated_at,
    } : undefined,
  });
});

/**
 * Update charity organization
 */
export const updateCharity = withErrorHandling(async (
  charityId: string,
  updates: Partial<CharityRegistrationData>,
  currentUserId: string
): Promise<ApiResponse<CharityOrganization>> => {
  // Validate input
  const validatedUpdates = validateData(charityUpdateSchema, updates);

  // Get charity to check ownership
  const charityResult = await getCharityById(charityId);
  if (!charityResult.success || !charityResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Charity organization not found', 404);
  }

  const charity = charityResult.data;

  // Check if user can update this charity
  if (charity.userId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only update your own charity organization', 403);
    }
  }

  // Handle document uploads if provided
  let documentUrls = charity.verificationDocuments || [];
  if (updates.verificationDocuments && updates.verificationDocuments.length > 0) {
    const newDocumentUrls: string[] = [];
    
    for (let i = 0; i < updates.verificationDocuments.length; i++) {
      const file = updates.verificationDocuments[i];
      
      // Validate file
      const fileValidation = validateFile(file, {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
      });

      if (!fileValidation.valid) {
        throw new ClearCauseError('INVALID_FILE_TYPE', fileValidation.error || 'Invalid file', 400);
      }

      const filePath = `charity-documents/${charity.userId}-${Date.now()}-${i}`;
      const { url, error: uploadError } = await uploadFile('documents', filePath, file);

      if (uploadError || !url) {
        throw new ClearCauseError('UPLOAD_FAILED', uploadError || 'Document upload failed', 500);
      }

      newDocumentUrls.push(url);
    }
    
    documentUrls = [...documentUrls, ...newDocumentUrls];
  }

  // Update charity organization
  const { data, error } = await supabase
    .from('charity_organizations')
    .update({
      organization_name: validatedUpdates.organizationName,
      description: validatedUpdates.description,
      website_url: validatedUpdates.websiteUrl,
      phone: validatedUpdates.phone,
      address: validatedUpdates.address,
      registration_number: validatedUpdates.registrationNumber,
      verification_documents: documentUrls.length > 0 ? documentUrls : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', charityId)
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role,
        is_verified,
        created_at,
        updated_at
      )
    `)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(currentUserId, 'CHARITY_UPDATE', 'charity', charityId, validatedUpdates);

  return createSuccessResponse({
    id: data.id,
    userId: data.user_id,
    organizationName: data.organization_name,
    description: data.description,
    websiteUrl: data.website_url,
    phone: data.phone,
    address: data.address,
    registrationNumber: data.registration_number,
    verificationStatus: data.verification_status,
    verificationDocuments: data.verification_documents,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    user: data.profiles ? {
      id: data.profiles.id,
      email: data.profiles.email,
      fullName: data.profiles.full_name,
      avatarUrl: data.profiles.avatar_url,
      role: data.profiles.role,
      isVerified: data.profiles.is_verified,
      createdAt: data.profiles.created_at,
      updatedAt: data.profiles.updated_at,
    } : undefined,
  }, 'Charity organization updated successfully');
});

/**
 * Verify charity organization (admin only)
 */
export const verifyCharity = withErrorHandling(async (
  charityId: string,
  verificationData: {
    status: 'approved' | 'rejected';
    notes?: string;
  },
  currentUserId: string
): Promise<ApiResponse<CharityOrganization>> => {
  // Validate input
  const validatedData = validateData(charityVerificationSchema, {
    organizationId: charityId,
    ...verificationData,
  });

  // Check if current user is admin
  const currentUser = await getUserProfile(currentUserId);
  if (!currentUser.success || currentUser.data?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can verify charity organizations', 403);
  }

  // Update verification status
  const { data, error } = await supabase
    .from('charity_organizations')
    .update({
      verification_status: validatedData.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', charityId)
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role,
        is_verified,
        created_at,
        updated_at
      )
    `)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(currentUserId, 'CHARITY_VERIFICATION_UPDATE', 'charity', charityId, {
    status: validatedData.status,
    notes: validatedData.notes,
  });

  return createSuccessResponse({
    id: data.id,
    userId: data.user_id,
    organizationName: data.organization_name,
    description: data.description,
    websiteUrl: data.website_url,
    phone: data.phone,
    address: data.address,
    registrationNumber: data.registration_number,
    verificationStatus: data.verification_status,
    verificationDocuments: data.verification_documents,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    user: data.profiles ? {
      id: data.profiles.id,
      email: data.profiles.email,
      fullName: data.profiles.full_name,
      avatarUrl: data.profiles.avatar_url,
      role: data.profiles.role,
      isVerified: data.profiles.is_verified,
      createdAt: data.profiles.created_at,
      updatedAt: data.profiles.updated_at,
    } : undefined,
  }, `Charity organization ${validatedData.status === 'approved' ? 'approved' : 'rejected'} successfully`);
});

/**
 * List charity organizations with filters and pagination
 */
export const listCharities = withErrorHandling(async (
  filters: {
    verificationStatus?: VerificationStatus;
    search?: string;
  } = {},
  params: PaginationParams
): Promise<PaginatedResponse<CharityOrganization>> => {
  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from('charity_organizations')
    .select(`
      *,
      profiles:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role,
        is_verified,
        created_at,
        updated_at
      )
    `, { count: 'exact' });

  // Apply filters
  if (filters.verificationStatus) {
    query = query.eq('verification_status', filters.verificationStatus);
  }

  if (filters.search) {
    query = query.or(`organization_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  const charities = data.map(charity => ({
    id: charity.id,
    userId: charity.user_id,
    organizationName: charity.organization_name,
    description: charity.description,
    websiteUrl: charity.website_url,
    phone: charity.phone,
    address: charity.address,
    registrationNumber: charity.registration_number,
    verificationStatus: charity.verification_status,
    verificationDocuments: charity.verification_documents,
    createdAt: charity.created_at,
    updatedAt: charity.updated_at,
    user: charity.profiles ? {
      id: charity.profiles.id,
      email: charity.profiles.email,
      fullName: charity.profiles.full_name,
      avatarUrl: charity.profiles.avatar_url,
      role: charity.profiles.role,
      isVerified: charity.profiles.is_verified,
      createdAt: charity.profiles.created_at,
      updatedAt: charity.profiles.updated_at,
    } : undefined,
  }));

  return createPaginatedResponse(charities, count || 0, validatedParams);
});

// Create charity activity function
export const getCharityActivity = withErrorHandling(async (
  charityId: string,
  currentUserId: string,
  params: PaginationParams = { page: 1, limit: 10 }
): Promise<ApiResponse<Array<{
  id: string;
  type: 'campaign_created' | 'donation_received' | 'milestone_completed';
  title: string;
  description: string;
  amount?: number;
  createdAt: string;
}>>> => {
  // Get charity to check ownership
  const charityResult = await getCharityById(charityId);
  if (!charityResult.success || !charityResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Charity organization not found', 404);
  }

  const charity = charityResult.data;

  // Check if user can view this activity
  if (charity.userId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only view your own charity activity', 403);
    }
  }

  // For now, return recent campaigns as activity
  // In the future, this could include donations, milestones, etc.
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, title, description, goal_amount, created_at')
    .eq('charity_id', charityId)
    .order('created_at', { ascending: false })
    .limit(params.limit || 10);

  if (error) {
    throw handleSupabaseError(error);
  }

  const activity = campaigns.map(campaign => ({
    id: campaign.id,
    type: 'campaign_created' as const,
    title: `Campaign Created: ${campaign.title}`,
    description: campaign.description.substring(0, 100) + '...',
    amount: campaign.goal_amount,
    createdAt: campaign.created_at,
  }));

  return createSuccessResponse(activity);
});

/**
 * Get charity statistics
 */
export const getCharityStatistics = withErrorHandling(async (
  charityId: string,
  currentUserId: string
): Promise<ApiResponse<{
  totalCampaigns: number;
  activeCampaigns: number;
  totalRaised: number;
  totalDonations: number;
  averageDonation: number;
}>> => {
  // Get charity to check ownership
  const charityResult = await getCharityById(charityId);
  if (!charityResult.success || !charityResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Charity organization not found', 404);
  }

  const charity = charityResult.data;

  // Check if user can view these statistics
  if (charity.userId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only view your own charity statistics', 403);
    }
  }

  // Get campaign statistics
  const { data: campaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select('id, status, current_amount')
    .eq('charity_id', charityId);

  if (campaignError) {
    throw handleSupabaseError(campaignError);
  }

  // Get donation statistics
  const { data: donations, error: donationError } = await supabase
    .from('donations')
    .select('amount, status')
    .in('campaign_id', campaigns.map(c => c.id));

  if (donationError) {
    throw handleSupabaseError(donationError);
  }

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalRaised = campaigns.reduce((sum, c) => sum + c.current_amount, 0);
  const completedDonations = donations.filter(d => d.status === 'completed');
  const totalDonations = completedDonations.length;
  const averageDonation = totalDonations > 0 
    ? completedDonations.reduce((sum, d) => sum + d.amount, 0) / totalDonations 
    : 0;

  return createSuccessResponse({
    totalCampaigns,
    activeCampaigns,
    totalRaised,
    totalDonations,
    averageDonation: Math.round(averageDonation * 100) / 100,
  });
});

/**
 * Delete charity organization
 */
export const deleteCharity = withErrorHandling(async (
  charityId: string,
  currentUserId: string
): Promise<ApiResponse<void>> => {
  // Get charity to check ownership
  const charityResult = await getCharityById(charityId);
  if (!charityResult.success || !charityResult.data) {
    throw new ClearCauseError('NOT_FOUND', 'Charity organization not found', 404);
  }

  const charity = charityResult.data;

  // Check if user can delete this charity
  if (charity.userId !== currentUserId) {
    const currentUser = await getUserProfile(currentUserId);
    if (!currentUser.success || currentUser.data?.role !== 'admin') {
      throw new ClearCauseError('FORBIDDEN', 'You can only delete your own charity organization', 403);
    }
  }

  // Check for active campaigns
  const { data: activeCampaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select('id')
    .eq('charity_id', charityId)
    .in('status', ['active', 'paused']);

  if (campaignError) {
    throw handleSupabaseError(campaignError);
  }

  if (activeCampaigns && activeCampaigns.length > 0) {
    throw new ClearCauseError(
      'DELETION_BLOCKED',
      'Cannot delete charity with active campaigns. Please complete or cancel all campaigns first.',
      400
    );
  }

  // Log audit event before deletion
  await logAuditEvent(currentUserId, 'CHARITY_DELETE', 'charity', charityId);

  // Delete charity organization
  const { error: deleteError } = await supabase
    .from('charity_organizations')
    .delete()
    .eq('id', charityId);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  return createSuccessResponse(undefined, 'Charity organization deleted successfully');
});
