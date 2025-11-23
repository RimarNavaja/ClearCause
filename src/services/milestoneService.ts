/**
 * Milestone Service
 * Handles all milestone-related operations including CRUD, proof management, verification, and fund release
 */

import { supabase } from '../lib/supabase';
import {
  Milestone,
  MilestoneProof,
  MilestoneStatus,
  VerificationStatus,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  ClearCauseError
} from '../lib/types';
import {
  validateData,
  paginationSchema,
  validateMilestoneAmounts
} from '../utils/validation';
import {
  withErrorHandling,
  handleSupabaseError,
  createSuccessResponse
} from '../utils/errors';
import { createPaginatedResponse } from '../utils/helpers';
import { logAuditEvent } from './adminService';

// ============================================================================
// CORE MILESTONE OPERATIONS
// ============================================================================

/**
 * Create milestones for a campaign
 */
export const createMilestones = withErrorHandling(async (
  campaignId: string,
  milestonesData: Array<{
    title: string;
    description: string;
    targetAmount: number;
    evidenceDescription?: string;
  }>
): Promise<ApiResponse<Milestone[]>> => {
  // Prepare milestone inserts
  const milestoneInserts = milestonesData.map(milestone => ({
    campaign_id: campaignId,
    title: milestone.title,
    description: milestone.description,
    target_amount: milestone.targetAmount,
    evidence_description: milestone.evidenceDescription,
    status: 'pending' as MilestoneStatus,
  }));

  const { data: createdMilestones, error: milestoneError } = await supabase
    .from('milestones')
    .insert(milestoneInserts)
    .select();

  if (milestoneError) {
    throw handleSupabaseError(milestoneError);
  }

  const milestones: Milestone[] = createdMilestones.map(m => ({
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
    dueDate: m.due_date,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }));

  return createSuccessResponse(milestones);
});

/**
 * Get all milestones for a campaign
 */
export const getMilestones = withErrorHandling(async (
  campaignId: string
): Promise<ApiResponse<Milestone[]>> => {
  const { data: milestonesData, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('target_amount', { ascending: true });

  if (error) {
    throw handleSupabaseError(error);
  }

  const milestones: Milestone[] = milestonesData.map(m => ({
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
    dueDate: m.due_date,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }));

  return createSuccessResponse(milestones);
});

/**
 * Get a single milestone by ID
 */
export const getMilestoneById = withErrorHandling(async (
  milestoneId: string
): Promise<ApiResponse<Milestone>> => {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('id', milestoneId)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new ClearCauseError('NOT_FOUND', 'Milestone not found', 404);
  }

  const milestone: Milestone = {
    id: data.id,
    campaignId: data.campaign_id,
    title: data.title,
    description: data.description,
    targetAmount: data.target_amount,
    evidenceDescription: data.evidence_description,
    status: data.status,
    proofDocuments: data.proof_documents,
    verificationNotes: data.verification_notes,
    verifiedAt: data.verified_at,
    verifiedBy: data.verified_by,
    dueDate: data.due_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return createSuccessResponse(milestone);
});

/**
 * Update milestone details
 */
export const updateMilestone = withErrorHandling(async (
  milestoneId: string,
  updates: Partial<{
    title: string;
    description: string;
    targetAmount: number;
    evidenceDescription: string;
    dueDate: string;
  }>
): Promise<ApiResponse<Milestone>> => {
  const updateData: any = {};

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.targetAmount !== undefined) updateData.target_amount = updates.targetAmount;
  if (updates.evidenceDescription !== undefined) updateData.evidence_description = updates.evidenceDescription;
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;

  const { data, error } = await supabase
    .from('milestones')
    .update(updateData)
    .eq('id', milestoneId)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  const milestone: Milestone = {
    id: data.id,
    campaignId: data.campaign_id,
    title: data.title,
    description: data.description,
    targetAmount: data.target_amount,
    evidenceDescription: data.evidence_description,
    status: data.status,
    proofDocuments: data.proof_documents,
    verificationNotes: data.verification_notes,
    verifiedAt: data.verified_at,
    verifiedBy: data.verified_by,
    dueDate: data.due_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return createSuccessResponse(milestone);
});

/**
 * Update milestone status
 */
export const updateMilestoneStatus = withErrorHandling(async (
  milestoneId: string,
  status: MilestoneStatus
): Promise<ApiResponse<Milestone>> => {
  const { data, error } = await supabase
    .from('milestones')
    .update({ status })
    .eq('id', milestoneId)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  const milestone: Milestone = {
    id: data.id,
    campaignId: data.campaign_id,
    title: data.title,
    description: data.description,
    targetAmount: data.target_amount,
    evidenceDescription: data.evidence_description,
    status: data.status,
    proofDocuments: data.proof_documents,
    verificationNotes: data.verification_notes,
    verifiedAt: data.verified_at,
    verifiedBy: data.verified_by,
    dueDate: data.due_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return createSuccessResponse(milestone);
});

/**
 * Delete a milestone
 */
export const deleteMilestone = withErrorHandling(async (
  milestoneId: string
): Promise<ApiResponse<void>> => {
  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', milestoneId);

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(undefined);
});

// ============================================================================
// MILESTONE PROOF MANAGEMENT
// ============================================================================

/**
 * Submit proof for a milestone
 */
export const submitMilestoneProof = withErrorHandling(async (
  milestoneId: string,
  proofData: {
    proofUrl: string;
    description?: string;
  }
): Promise<ApiResponse<MilestoneProof>> => {
  const { data, error } = await supabase
    .from('milestone_proofs')
    .insert({
      milestone_id: milestoneId,
      proof_url: proofData.proofUrl,
      description: proofData.description || null,
      verification_status: 'pending' as VerificationStatus,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  const proof: MilestoneProof = {
    id: data.id,
    milestoneId: data.milestone_id,
    proofUrl: data.proof_url,
    description: data.description,
    submittedAt: data.submitted_at,
    verifiedBy: data.verified_by,
    verificationStatus: data.verification_status,
    verificationNotes: data.verification_notes,
  };

  return createSuccessResponse(proof);
});

/**
 * Get all proofs for a milestone
 */
export const getMilestoneProofs = withErrorHandling(async (
  milestoneId: string
): Promise<ApiResponse<MilestoneProof[]>> => {
  const { data, error } = await supabase
    .from('milestone_proofs')
    .select('*')
    .eq('milestone_id', milestoneId)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw handleSupabaseError(error);
  }

  const proofs: MilestoneProof[] = data.map(p => ({
    id: p.id,
    milestoneId: p.milestone_id,
    proofUrl: p.proof_url,
    description: p.description,
    submittedAt: p.submitted_at,
    verifiedBy: p.verified_by,
    verificationStatus: p.verification_status,
    verificationNotes: p.verification_notes,
  }));

  return createSuccessResponse(proofs);
});

/**
 * Get a single milestone proof by ID
 * Moved from adminService.ts
 */
export const getMilestoneProofById = withErrorHandling(async (
  proofId: string,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access milestone proofs', 403);
  }

  const { data, error } = await supabase
    .from('milestone_proofs')
    .select(`
      *,
      milestones:milestone_id (
        id,
        title,
        description,
        target_amount,
        campaigns:campaign_id (
          id,
          title,
          charities:charity_id (
            id,
            organization_name,
            user_id,
            profiles:user_id (
              full_name,
              email
            )
          )
        )
      )
    `)
    .eq('id', proofId)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new ClearCauseError('NOT_FOUND', 'Milestone proof not found', 404);
  }

  return createSuccessResponse(data);
});

/**
 * Get milestone proofs for verification (admin)
 * Moved from adminService.ts
 */
export const getMilestoneProofsForVerification = withErrorHandling(async (
  filters: {
    status?: string;
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
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access milestone proofs', 403);
  }

  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'submitted_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('milestone_proofs')
    .select(`
      *,
      milestones:milestone_id (
        id,
        title,
        description,
        target_amount,
        campaigns:campaign_id (
          id,
          title,
          charities:charity_id (
            id,
            organization_name,
            user_id,
            profiles:user_id (
              full_name,
              email
            )
          )
        )
      )
    `, { count: 'exact' });

  // Apply filters
  if (filters.status) {
    query = query.eq('verification_status', filters.status);
  }

  if (filters.search) {
    query = query.or(`milestones.title.ilike.%${filters.search}%,milestones.campaigns.title.ilike.%${filters.search}%`);
  }

  if (filters.dateFrom) {
    query = query.gte('submitted_at', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('submitted_at', filters.dateTo);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  // Transform data for easier consumption
  const transformedData = (data || []).map(proof => ({
    id: proof.id,
    proofUrl: proof.proof_url,
    description: proof.description,
    submittedAt: proof.submitted_at,
    verificationStatus: proof.verification_status,
    verificationNotes: proof.verification_notes,
    verifiedBy: proof.verified_by,
    milestone: {
      id: proof.milestones?.id,
      title: proof.milestones?.title,
      description: proof.milestones?.description,
      targetAmount: proof.milestones?.target_amount,
      campaign: {
        id: proof.milestones?.campaigns?.id,
        title: proof.milestones?.campaigns?.title,
        charity: {
          id: proof.milestones?.campaigns?.charities?.id,
          organizationName: proof.milestones?.campaigns?.charities?.organization_name,
          userId: proof.milestones?.campaigns?.charities?.user_id,
          contactName: proof.milestones?.campaigns?.charities?.profiles?.full_name,
          contactEmail: proof.milestones?.campaigns?.charities?.profiles?.email,
        }
      }
    }
  }));

  return createPaginatedResponse(
    transformedData,
    count || 0,
    validatedParams.page,
    validatedParams.limit
  );
});

/**
 * Get milestone proof statistics
 * Moved from adminService.ts
 */
export const getMilestoneProofStats = withErrorHandling(async (
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access milestone proof stats', 403);
  }

  // Get counts for each status
  const { data: pending } = await supabase
    .from('milestone_proofs')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'pending');

  const { data: underReview } = await supabase
    .from('milestone_proofs')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'under_review');

  const { data: approved } = await supabase
    .from('milestone_proofs')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'approved');

  const { data: rejected } = await supabase
    .from('milestone_proofs')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'rejected');

  const { data: resubmissionRequired } = await supabase
    .from('milestone_proofs')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'resubmission_required');

  const stats = {
    pending: pending?.length || 0,
    underReview: underReview?.length || 0,
    approved: approved?.length || 0,
    rejected: rejected?.length || 0,
    resubmissionRequired: resubmissionRequired?.length || 0,
    total: (pending?.length || 0) + (underReview?.length || 0) + (approved?.length || 0) + (rejected?.length || 0) + (resubmissionRequired?.length || 0)
  };

  return createSuccessResponse(stats);
});

// ============================================================================
// MILESTONE VERIFICATION WORKFLOWS
// ============================================================================

/**
 * Approve milestone proof submission
 * Moved from adminService.ts
 */
export const approveMilestoneProof = withErrorHandling(async (
  proofId: string,
  adminNotes: string | null,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can approve milestone proofs', 403);
  }

  // Update milestone proof status
  const { data, error } = await supabase
    .from('milestone_proofs')
    .update({
      verification_status: 'approved',
      verified_by: currentUserId,
      verification_notes: adminNotes,
    })
    .eq('id', proofId)
    .select('*, milestones(*)')
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'approve_milestone_proof',
    'milestone_proof',
    proofId,
    { admin_notes: adminNotes }
  );

  return createSuccessResponse(data);
});

/**
 * Reject milestone proof submission
 * Moved from adminService.ts
 */
export const rejectMilestoneProof = withErrorHandling(async (
  proofId: string,
  rejectionReason: string,
  adminNotes: string | null,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can reject milestone proofs', 403);
  }

  // Update milestone proof status with formatted notes
  const { data, error } = await supabase
    .from('milestone_proofs')
    .update({
      verification_status: 'rejected',
      verified_by: currentUserId,
      verification_notes: `REJECTED: ${rejectionReason}${adminNotes ? `\n\nAdmin Notes: ${adminNotes}` : ''}`,
    })
    .eq('id', proofId)
    .select('*, milestones(*)')
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'reject_milestone_proof',
    'milestone_proof',
    proofId,
    { rejection_reason: rejectionReason, admin_notes: adminNotes }
  );

  return createSuccessResponse(data);
});

/**
 * Request resubmission of milestone proof
 */
export const requestProofResubmission = withErrorHandling(async (
  proofId: string,
  reason: string,
  adminNotes: string | null,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can request proof resubmission', 403);
  }

  // Update milestone proof status
  const { data, error } = await supabase
    .from('milestone_proofs')
    .update({
      verification_status: 'resubmission_required',
      verified_by: currentUserId,
      verification_notes: adminNotes,
    })
    .eq('id', proofId)
    .select('*, milestones(*)')
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'request_milestone_proof_resubmission',
    'milestone_proof',
    proofId,
    { reason, admin_notes: adminNotes }
  );

  return createSuccessResponse(data);
});

// ============================================================================
// FUND RELEASE & PROGRESS TRACKING
// ============================================================================

/**
 * Get approved milestones ready for fund release
 * Moved from adminService.ts
 */
export const getApprovedMilestonesForFundRelease = withErrorHandling(async (
  campaignId: string,
  currentUserId: string
): Promise<ApiResponse<any[]>> => {
  // Check if current user is admin
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError || currentUser?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Only administrators can access fund release data', 403);
  }

  // Get milestones with approved proofs
  const { data, error } = await supabase
    .from('milestones')
    .select(`
      *,
      milestone_proofs!inner (
        id,
        verification_status,
        verified_by,
        verification_notes,
        submitted_at
      ),
      campaigns:campaign_id (
        id,
        title,
        goal_amount,
        current_amount
      )
    `)
    .eq('campaign_id', campaignId)
    .eq('milestone_proofs.verification_status', 'approved')
    .order('target_amount', { ascending: true });

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(data || []);
});

/**
 * Get milestone progress for a campaign
 */
export const getMilestoneProgress = withErrorHandling(async (
  campaignId: string
): Promise<ApiResponse<any>> => {
  // Get all milestones for the campaign
  const { data: milestones, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('target_amount', { ascending: true });

  if (error) {
    throw handleSupabaseError(error);
  }

  const total = milestones?.length || 0;
  const completed = milestones?.filter(m => m.status === 'completed' || m.status === 'verified').length || 0;
  const inProgress = milestones?.filter(m => m.status === 'in_progress').length || 0;
  const pending = milestones?.filter(m => m.status === 'pending').length || 0;

  const progress = {
    total,
    completed,
    inProgress,
    pending,
    percentComplete: total > 0 ? Math.round((completed / total) * 100) : 0,
    milestones: milestones || []
  };

  return createSuccessResponse(progress);
});

/**
 * Calculate campaign completion percentage based on milestones
 */
export const calculateCampaignProgress = withErrorHandling(async (
  campaignId: string
): Promise<ApiResponse<number>> => {
  const { data: milestones, error } = await supabase
    .from('milestones')
    .select('status')
    .eq('campaign_id', campaignId);

  if (error) {
    throw handleSupabaseError(error);
  }

  const total = milestones?.length || 0;
  if (total === 0) return createSuccessResponse(0);

  const completed = milestones?.filter(m => m.status === 'completed' || m.status === 'verified').length || 0;
  const percentComplete = Math.round((completed / total) * 100);

  return createSuccessResponse(percentComplete);
});

/**
 * Check if funds can be released for a milestone
 */
export const canReleaseFunds = withErrorHandling(async (
  milestoneId: string
): Promise<ApiResponse<boolean>> => {
  // Get milestone with its proofs
  const { data: milestone, error } = await supabase
    .from('milestones')
    .select(`
      *,
      milestone_proofs (
        verification_status
      )
    `)
    .eq('id', milestoneId)
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!milestone) {
    throw new ClearCauseError('NOT_FOUND', 'Milestone not found', 404);
  }

  // Funds can be released if:
  // 1. Milestone has at least one proof
  // 2. At least one proof is approved
  // 3. Milestone status is completed or verified
  const hasApprovedProof = milestone.milestone_proofs?.some(
    (proof: any) => proof.verification_status === 'approved'
  );

  const isCompleted = milestone.status === 'completed' || milestone.status === 'verified';

  const canRelease = hasApprovedProof && isCompleted;

  return createSuccessResponse(canRelease);
});
