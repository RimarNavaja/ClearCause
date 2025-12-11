/**
 * Refund Service
 * Handles rejected milestone revenue flow - allocations, decisions, and processing
 */

import { supabase } from '../lib/supabase';
import {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  ClearCauseError,
  Donation,
} from '../lib/types';
import {
  validateData,
  paginationSchema,
} from '../utils/validation';
import {
  withErrorHandling,
  handleSupabaseError,
  createSuccessResponse,
} from '../utils/errors';
import { createPaginatedResponse } from '../utils/helpers';
import { logAuditEvent } from './adminService';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type RefundRequestStatus =
  | 'pending_donor_decision'
  | 'processing'
  | 'completed'
  | 'partially_completed'
  | 'cancelled';

export type DonorDecisionType = 'refund' | 'redirect_campaign' | 'donate_platform';

export type DonorDecisionStatus =
  | 'pending'
  | 'decided'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'auto_refunded';

export interface MilestoneFundAllocation {
  id: string;
  milestoneId: string;
  donationId: string;
  campaignId: string;
  donorId: string;
  allocatedAmount: number;
  allocationPercentage: number;
  isReleased: boolean;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneRefundRequest {
  id: string;
  milestoneId: string;
  campaignId: string;
  charityId: string;
  milestoneProofId: string | null;
  totalAmount: number;
  totalDonorsCount: number;
  status: RefundRequestStatus;
  decisionDeadline: string;
  firstReminderSentAt: string | null;
  finalReminderSentAt: string | null;
  rejectionReason: string | null;
  adminNotes: string | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface DonorRefundDecision {
  id: string;
  refundRequestId: string;
  donorId: string;
  donationId: string;
  milestoneId: string;
  refundAmount: number;
  decisionType: DonorDecisionType | null;
  redirectCampaignId: string | null;
  status: DonorDecisionStatus;
  decidedAt: string | null;
  processedAt: string | null;
  refundTransactionId: string | null;
  newDonationId: string | null;
  processingError: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  refundCount: number;
  redirectCount: number;
  platformCount: number;
  errors: Array<{ decisionId: string; error: string }>;
}

export interface AutoProcessResult {
  processedCount: number;
  totalAmount: number;
  decisions: Array<{ donorId: string; amount: number }>;
}

// Minimum refund amount (amounts below this auto-convert to platform donation)
const MINIMUM_REFUND_AMOUNT = 50;

// ============================================================================
// CORE ALLOCATION FUNCTIONS
// ============================================================================

/**
 * Allocate donation to milestones proportionally
 * Called when donation status changes to 'completed'
 */
export const allocateDonationToMilestones = withErrorHandling(async (
  donationId: string,
  campaignId: string,
  amount: number,
  userId: string
): Promise<ApiResponse<void>> => {
  console.log(`[refundService] Allocating donation ${donationId} (₱${amount}) to milestones for campaign ${campaignId}`);

  // Use database function to handle allocation
  const { error } = await supabase.rpc('allocate_donation_to_milestones', {
    p_donation_id: donationId,
    p_campaign_id: campaignId,
    p_amount: amount,
    p_donor_id: userId,
  });

  if (error) {
    console.error('[refundService] Allocation error:', error);
    throw handleSupabaseError(error);
  }

  console.log(`[refundService] Successfully allocated donation ${donationId}`);
  return createSuccessResponse(undefined, 'Donation allocated to milestones');
});

/**
 * Get allocations for a specific milestone
 */
export const getMilestoneAllocations = withErrorHandling(async (
  milestoneId: string,
  onlyUnreleased: boolean = true
): Promise<ApiResponse<MilestoneFundAllocation[]>> => {
  let query = supabase
    .from('milestone_fund_allocations')
    .select('*')
    .eq('milestone_id', milestoneId);

  if (onlyUnreleased) {
    query = query.eq('is_released', false);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    throw handleSupabaseError(error);
  }

  const allocations: MilestoneFundAllocation[] = data.map(a => ({
    id: a.id,
    milestoneId: a.milestone_id,
    donationId: a.donation_id,
    campaignId: a.campaign_id,
    donorId: a.donor_id,
    allocatedAmount: parseFloat(a.allocated_amount),
    allocationPercentage: parseFloat(a.allocation_percentage),
    isReleased: a.is_released,
    releasedAt: a.released_at,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  }));

  return createSuccessResponse(allocations);
});

// ============================================================================
// REFUND INITIATION
// ============================================================================

/**
 * Initiate refund process when milestone rejected
 * Creates refund request and notifies all affected donors
 */
export const initiateRefundProcess = withErrorHandling(async (
  milestoneId: string,
  milestoneProofId: string,
  rejectionReason: string,
  adminId: string
): Promise<ApiResponse<{
  refundRequestId: string;
  totalAmount: number;
  affectedDonors: number;
}>> => {
  console.log(`[refundService] Initiating refund process for milestone ${milestoneId}`);

  // Step 1: Get milestone details
  const { data: milestone, error: milestoneError } = await supabase
    .from('milestones')
    .select('*, campaigns(id, charity_id)')
    .eq('id', milestoneId)
    .single();

  if (milestoneError || !milestone) {
    throw new ClearCauseError('NOT_FOUND', 'Milestone not found', 404);
  }

  // Check if refund already initiated
  if (milestone.refund_initiated) {
    throw new ClearCauseError('ALREADY_INITIATED', 'Refund already initiated for this milestone', 400);
  }

  // Step 2: Get all unreleased allocations for this milestone
  const allocationsResult = await getMilestoneAllocations(milestoneId, true);
  const allocations = allocationsResult.data || [];

  if (allocations.length === 0) {
    throw new ClearCauseError('NO_ALLOCATIONS', 'No funds to refund for this milestone', 400);
  }

  // Calculate total amount and unique donors
  const totalAmount = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
  const uniqueDonors = new Set(allocations.map(a => a.donorId));
  const donorsCount = uniqueDonors.size;

  // Step 3: Calculate decision deadline (14 days from now)
  const decisionDeadline = new Date();
  decisionDeadline.setDate(decisionDeadline.getDate() + 14);

  // Step 4: Create refund request
  const { data: refundRequest, error: requestError } = await supabase
    .from('milestone_refund_requests')
    .insert({
      milestone_id: milestoneId,
      campaign_id: milestone.campaign_id,
      charity_id: milestone.campaigns.charity_id,
      milestone_proof_id: milestoneProofId,
      total_amount: totalAmount,
      total_donors_count: donorsCount,
      status: 'pending_donor_decision',
      decision_deadline: decisionDeadline.toISOString(),
      rejection_reason: rejectionReason,
      created_by: adminId,
    })
    .select()
    .single();

  if (requestError) {
    throw handleSupabaseError(requestError);
  }

  // Step 5: Create decision records for each unique donor
  const decisionsToCreate = [];
  for (const allocation of allocations) {
    decisionsToCreate.push({
      refund_request_id: refundRequest.id,
      donor_id: allocation.donorId,
      donation_id: allocation.donationId,
      milestone_id: milestoneId,
      refund_amount: allocation.allocatedAmount,
      status: 'pending',
      metadata: {
        allocation_id: allocation.id,
        allocation_percentage: allocation.allocationPercentage,
      },
    });
  }

  const { error: decisionsError } = await supabase
    .from('donor_refund_decisions')
    .insert(decisionsToCreate);

  if (decisionsError) {
    // Rollback refund request
    await supabase.from('milestone_refund_requests').delete().eq('id', refundRequest.id);
    throw handleSupabaseError(decisionsError);
  }

  // Step 6: Mark milestone as refund initiated
  await supabase
    .from('milestones')
    .update({
      refund_initiated: true,
      refund_initiated_at: new Date().toISOString(),
    })
    .eq('id', milestoneId);

  // Step 7: Send notifications to all affected donors
  try {
    const { createNotification } = await import('./notificationService');

    // Get milestone and campaign details for notification
    const { data: milestoneWithCampaign } = await supabase
      .from('milestones')
      .select('title, campaigns(title)')
      .eq('id', milestoneId)
      .single();

    for (const donorId of Array.from(uniqueDonors)) {
      // Find this donor's total amount
      const donorAmount = allocations
        .filter(a => a.donorId === donorId)
        .reduce((sum, a) => sum + a.allocatedAmount, 0);

      await createNotification({
        userId: donorId,
        type: 'refund_decision_required',
        title: '⚠️ Milestone Rejected - Decision Required',
        message: `A milestone for "${milestoneWithCampaign?.campaigns?.title}" was rejected. You have ₱${donorAmount.toLocaleString()} to reallocate. Please make your decision within 14 days.`,
        campaignId: milestone.campaign_id,
        milestoneId: milestoneId,
        actionUrl: '/donor/refund-decisions',
        metadata: {
          refund_request_id: refundRequest.id,
          amount: donorAmount,
          deadline: decisionDeadline.toISOString(),
        },
      });
    }
  } catch (notificationError) {
    console.error('[refundService] Failed to send notifications:', notificationError);
    // Don't fail the refund initiation if notifications fail
  }

  // Log audit event
  await logAuditEvent(
    adminId,
    'REFUND_INITIATED',
    'milestone',
    milestoneId,
    {
      refund_request_id: refundRequest.id,
      total_amount: totalAmount,
      affected_donors: donorsCount,
      rejection_reason: rejectionReason,
    }
  );

  console.log(`[refundService] Refund initiated: ${donorsCount} donors, ₱${totalAmount.toLocaleString()}`);

  return createSuccessResponse({
    refundRequestId: refundRequest.id,
    totalAmount: totalAmount,
    affectedDonors: donorsCount,
  }, 'Refund process initiated successfully');
});

// ============================================================================
// DONOR DECISION MANAGEMENT
// ============================================================================

/**
 * Get pending refund decisions for a donor
 */
export const getDonorPendingRefundDecisions = withErrorHandling(async (
  donorId: string,
  params: PaginationParams = { page: 1, limit: 20 }
): Promise<PaginatedResponse<DonorRefundDecision & { milestone?: any; campaign?: any }>> => {
  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  const { data, count, error } = await supabase
    .from('donor_refund_decisions')
    .select(`
      *,
      milestone_refund_requests!inner(
        decision_deadline,
        status,
        campaigns(id, title, image_url)
      ),
      milestones(id, title, description)
    `, { count: 'exact' })
    .eq('donor_id', donorId)
    .eq('status', 'pending')
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  if (error) {
    throw handleSupabaseError(error);
  }

  const decisions = (data || []).map(d => ({
    id: d.id,
    refundRequestId: d.refund_request_id,
    donorId: d.donor_id,
    donationId: d.donation_id,
    milestoneId: d.milestone_id,
    refundAmount: parseFloat(d.refund_amount),
    decisionType: d.decision_type,
    redirectCampaignId: d.redirect_campaign_id,
    status: d.status,
    decidedAt: d.decided_at,
    processedAt: d.processed_at,
    refundTransactionId: d.refund_transaction_id,
    newDonationId: d.new_donation_id,
    processingError: d.processing_error,
    metadata: d.metadata || {},
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    milestone: d.milestones,
    campaign: d.milestone_refund_requests?.campaigns,
    decisionDeadline: d.milestone_refund_requests?.decision_deadline,
  }));

  return createPaginatedResponse(decisions, count || 0, validatedParams);
});

/**
 * Submit donor's choice (refund, redirect, or donate to platform)
 */
export const submitDonorDecision = withErrorHandling(async (
  decisionId: string,
  donorId: string,
  decision: {
    type: DonorDecisionType;
    redirectCampaignId?: string;
  }
): Promise<ApiResponse<void>> => {
  console.log(`[refundService] Donor ${donorId} submitting decision ${decisionId}:`, decision);

  // Step 1: Get decision record
  const { data: decisionRecord, error: fetchError } = await supabase
    .from('donor_refund_decisions')
    .select(`
      *,
      milestone_refund_requests!inner(decision_deadline, campaign_id)
    `)
    .eq('id', decisionId)
    .eq('donor_id', donorId)
    .single();

  if (fetchError || !decisionRecord) {
    throw new ClearCauseError('NOT_FOUND', 'Decision record not found', 404);
  }

  // Step 2: Verify decision is still pending
  if (decisionRecord.status !== 'pending') {
    throw new ClearCauseError('INVALID_STATUS', 'Decision already submitted', 400);
  }

  // Step 3: Check deadline not expired
  const deadline = new Date(decisionRecord.milestone_refund_requests.decision_deadline);
  if (deadline < new Date()) {
    throw new ClearCauseError('DEADLINE_EXPIRED', 'Decision deadline has passed', 400);
  }

  // Step 4: Handle minimum refund amount
  let finalDecisionType = decision.type;
  let metadata = { ...decisionRecord.metadata };

  if (decision.type === 'refund' && decisionRecord.refund_amount < MINIMUM_REFUND_AMOUNT) {
    // Auto-convert to platform donation
    finalDecisionType = 'donate_platform';
    metadata.autoConverted = true;
    metadata.reason = 'below_minimum_refund_threshold';
    metadata.originalDecision = 'refund';
    metadata.minimumAmount = MINIMUM_REFUND_AMOUNT;

    console.log(`[refundService] Auto-converted refund to platform donation (amount ₱${decisionRecord.refund_amount} < ₱${MINIMUM_REFUND_AMOUNT})`);
  }

  // Step 5: Validate redirect campaign if applicable
  if (finalDecisionType === 'redirect_campaign') {
    if (!decision.redirectCampaignId) {
      throw new ClearCauseError('MISSING_CAMPAIGN', 'Redirect campaign ID is required', 400);
    }

    // Verify campaign is valid
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, status, end_date, goal_amount, current_amount')
      .eq('id', decision.redirectCampaignId)
      .single();

    if (campaignError || !campaign) {
      throw new ClearCauseError('INVALID_CAMPAIGN', 'Selected campaign not found', 404);
    }

    // Verify campaign is active
    if (campaign.status !== 'active') {
      throw new ClearCauseError('INACTIVE_CAMPAIGN', 'Selected campaign is not active', 400);
    }

    // Verify campaign has enough time remaining (7+ days)
    if (campaign.end_date) {
      const endDate = new Date(campaign.end_date);
      const daysRemaining = (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysRemaining < 7) {
        throw new ClearCauseError('CAMPAIGN_ENDING_SOON', 'Selected campaign ends too soon. Please choose a campaign with at least 7 days remaining.', 400);
      }
    }

    // Verify campaign is not already fully funded
    if (campaign.current_amount >= campaign.goal_amount) {
      throw new ClearCauseError('CAMPAIGN_FUNDED', 'Selected campaign is already fully funded', 400);
    }

    // Cannot redirect to the same campaign
    if (decision.redirectCampaignId === decisionRecord.milestone_refund_requests.campaign_id) {
      throw new ClearCauseError('SAME_CAMPAIGN', 'Cannot redirect to the same campaign', 400);
    }
  }

  // Step 6: Update decision record
  const { error: updateError } = await supabase
    .from('donor_refund_decisions')
    .update({
      decision_type: finalDecisionType,
      redirect_campaign_id: decision.redirectCampaignId || null,
      status: 'decided',
      decided_at: new Date().toISOString(),
      metadata: metadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', decisionId)
    .eq('donor_id', donorId);

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  // Step 7: Send confirmation notification
  try {
    const { createNotification } = await import('./notificationService');

    let message = '';
    if (finalDecisionType === 'refund') {
      message = `Your refund request of ₱${decisionRecord.refund_amount.toLocaleString()} has been submitted. Processing will begin shortly.`;
    } else if (finalDecisionType === 'redirect_campaign') {
      message = `Your donation of ₱${decisionRecord.refund_amount.toLocaleString()} will be redirected to your selected campaign.`;
    } else if (finalDecisionType === 'donate_platform') {
      message = `Thank you for supporting ClearCause! Your ₱${decisionRecord.refund_amount.toLocaleString()} contribution helps us keep the platform running.`;
    }

    await createNotification({
      userId: donorId,
      type: 'refund_processed',
      title: '✅ Decision Submitted',
      message: message,
      actionUrl: '/donor/donations',
      metadata: {
        decision_id: decisionId,
        decision_type: finalDecisionType,
        amount: decisionRecord.refund_amount,
      },
    });
  } catch (notificationError) {
    console.error('[refundService] Failed to send decision confirmation:', notificationError);
  }

  console.log(`[refundService] Decision submitted successfully: ${finalDecisionType}`);

  return createSuccessResponse(undefined, 'Decision submitted successfully');
});

// ============================================================================
// REFUND PROCESSING
// ============================================================================

/**
 * Process refund to payment provider (PayMongo)
 */
const processRefundToProvider = async (
  donation: Donation,
  amount: number,
  decisionId: string
): Promise<{ success: boolean; transactionId?: string; error?: string }> => {
  console.log(`[refundService] Processing refund to PayMongo: ₱${amount} for donation ${donation.id}`);

  // Validate donation has payment provider info
  if (!donation.providerPaymentId || !donation.provider) {
    return {
      success: false,
      error: 'Missing payment provider information',
    };
  }

  try {
    // Call PayMongo refund API
    const PAYMONGO_SECRET_KEY = import.meta.env.VITE_PAYMONGO_SECRET_KEY;

    if (!PAYMONGO_SECRET_KEY) {
      console.error('[refundService] PayMongo secret key not configured');
      return {
        success: false,
        error: 'Payment provider not configured',
      };
    }

    const response = await fetch('https://api.paymongo.com/v1/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: Math.round(amount * 100), // Convert to cents
            payment_intent: donation.providerPaymentId,
            reason: 'requested_by_customer',
            notes: `Milestone rejection refund - Decision ID: ${decisionId}`,
          },
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[refundService] PayMongo refund error:', result);
      return {
        success: false,
        error: result.errors?.[0]?.detail || 'Refund request failed',
      };
    }

    console.log('[refundService] PayMongo refund successful:', result.data.id);

    return {
      success: true,
      transactionId: result.data.id,
    };
  } catch (error: any) {
    console.error('[refundService] Refund processing error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error processing refund',
    };
  }
};

/**
 * Process a single decision (refund, redirect, or platform)
 */
const processSingleDecision = async (decision: any): Promise<{ success: boolean; error?: string }> => {
  try {
    if (decision.decision_type === 'refund') {
      // Get donation details
      const { data: donation } = await supabase
        .from('donations')
        .select('*')
        .eq('id', decision.donation_id)
        .single();

      if (!donation) {
        throw new Error('Donation not found');
      }

      // Process refund with retry logic
      let refundResult;
      for (let attempt = 1; attempt <= 3; attempt++) {
        refundResult = await processRefundToProvider(donation, decision.refund_amount, decision.id);
        if (refundResult.success) break;

        // Wait before retry: 2s, 4s, 8s
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      if (!refundResult.success) {
        throw new Error(refundResult.error || 'Refund failed after retries');
      }

      // Update decision status
      await supabase
        .from('donor_refund_decisions')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          refund_transaction_id: refundResult.transactionId,
        })
        .eq('id', decision.id);

      return { success: true };

    } else if (decision.decision_type === 'redirect_campaign') {
      // Create new donation for redirect campaign
      const { data: newDonation, error: donationError } = await supabase
        .from('donations')
        .insert({
          user_id: decision.donor_id,
          campaign_id: decision.redirect_campaign_id,
          amount: decision.refund_amount,
          payment_method: 'redirected',
          status: 'completed',
          transaction_id: `REDIRECT_${decision.id}`,
          metadata: {
            source: 'milestone_rejection_redirect',
            original_donation_id: decision.donation_id,
            original_campaign_id: decision.milestone_refund_requests?.campaign_id,
            decision_id: decision.id,
          },
        })
        .select()
        .single();

      if (donationError) {
        throw new Error('Failed to create redirect donation');
      }

      // Update campaign amount
      await supabase.rpc('increment_campaign_amount', {
        campaign_id: decision.redirect_campaign_id,
        amount: decision.refund_amount,
      });

      // Update decision status
      await supabase
        .from('donor_refund_decisions')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          new_donation_id: newDonation.id,
        })
        .eq('id', decision.id);

      return { success: true };

    } else if (decision.decision_type === 'donate_platform') {
      // Record platform donation (could update platform_settings or separate table)
      // For now, just mark as completed

      await supabase
        .from('donor_refund_decisions')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
        })
        .eq('id', decision.id);

      return { success: true };
    }

    return { success: false, error: 'Unknown decision type' };

  } catch (error: any) {
    console.error('[refundService] Error processing decision:', error);

    // Mark as failed
    await supabase
      .from('donor_refund_decisions')
      .update({
        status: 'failed',
        processing_error: error.message,
      })
      .eq('id', decision.id);

    return { success: false, error: error.message };
  }
};

/**
 * Process all decisions for a refund request
 * Can be called by admin or automatically after deadline
 */
export const processRefundRequest = withErrorHandling(async (
  refundRequestId: string,
  adminId?: string
): Promise<ApiResponse<ProcessingResult>> => {
  console.log(`[refundService] Processing refund request ${refundRequestId}`);

  // Get all decided decisions for this request
  const { data: decisions, error: decisionsError } = await supabase
    .from('donor_refund_decisions')
    .select(`
      *,
      milestone_refund_requests!inner(campaign_id)
    `)
    .eq('refund_request_id', refundRequestId)
    .in('status', ['decided', 'auto_refunded']);

  if (decisionsError) {
    throw handleSupabaseError(decisionsError);
  }

  if (!decisions || decisions.length === 0) {
    throw new ClearCauseError('NO_DECISIONS', 'No decisions ready for processing', 400);
  }

  // Process each decision
  const result: ProcessingResult = {
    totalProcessed: decisions.length,
    successCount: 0,
    failureCount: 0,
    refundCount: 0,
    redirectCount: 0,
    platformCount: 0,
    errors: [],
  };

  for (const decision of decisions) {
    const processResult = await processSingleDecision(decision);

    if (processResult.success) {
      result.successCount++;
      if (decision.decision_type === 'refund') result.refundCount++;
      else if (decision.decision_type === 'redirect_campaign') result.redirectCount++;
      else if (decision.decision_type === 'donate_platform') result.platformCount++;
    } else {
      result.failureCount++;
      result.errors.push({
        decisionId: decision.id,
        error: processResult.error || 'Unknown error',
      });
    }
  }

  // Update refund request status
  const newStatus = result.failureCount === 0
    ? 'completed'
    : result.successCount > 0
      ? 'partially_completed'
      : 'processing';

  await supabase
    .from('milestone_refund_requests')
    .update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', refundRequestId);

  // Log audit event
  if (adminId) {
    await logAuditEvent(
      adminId,
      'REFUND_PROCESSED',
      'milestone_refund_request',
      refundRequestId,
      result
    );
  }

  console.log(`[refundService] Processing complete:`, result);

  return createSuccessResponse(result, `Processed ${result.successCount} of ${result.totalProcessed} decisions`);
});

/**
 * Auto-process expired decisions (called by cron job)
 */
export const autoProcessExpiredDecisions = withErrorHandling(async (): Promise<ApiResponse<AutoProcessResult>> => {
  console.log('[refundService] Running auto-process for expired decisions');

  // Call database function to auto-process
  const { data, error } = await supabase.rpc('auto_process_expired_refund_decisions');

  if (error) {
    throw handleSupabaseError(error);
  }

  const processedDecisions = data || [];
  const totalAmount = processedDecisions.reduce((sum: number, d: any) => sum + parseFloat(d.refund_amount), 0);

  const result: AutoProcessResult = {
    processedCount: processedDecisions.length,
    totalAmount: totalAmount,
    decisions: processedDecisions.map((d: any) => ({
      donorId: d.donor_id,
      amount: parseFloat(d.refund_amount),
    })),
  };

  console.log(`[refundService] Auto-processed ${result.processedCount} expired decisions (₱${result.totalAmount.toLocaleString()})`);

  return createSuccessResponse(result, `Auto-processed ${result.processedCount} expired decisions`);
});

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Get all refund requests with filters
 */
export const getRefundRequests = withErrorHandling(async (
  filters: {
    status?: RefundRequestStatus;
    charityId?: string;
    campaignId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {},
  params: PaginationParams,
  currentUserId: string
): Promise<PaginatedResponse<MilestoneRefundRequest>> => {
  // Verify admin
  const { data: user } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (user?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Admin access required', 403);
  }

  const validatedParams = validateData(paginationSchema, params);
  const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = validatedParams;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('milestone_refund_requests')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.charityId) query = query.eq('charity_id', filters.charityId);
  if (filters.campaignId) query = query.eq('campaign_id', filters.campaignId);
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  const requests = (data || []).map(r => ({
    id: r.id,
    milestoneId: r.milestone_id,
    campaignId: r.campaign_id,
    charityId: r.charity_id,
    milestoneProofId: r.milestone_proof_id,
    totalAmount: parseFloat(r.total_amount),
    totalDonorsCount: r.total_donors_count,
    status: r.status,
    decisionDeadline: r.decision_deadline,
    firstReminderSentAt: r.first_reminder_sent_at,
    finalReminderSentAt: r.final_reminder_sent_at,
    rejectionReason: r.rejection_reason,
    adminNotes: r.admin_notes,
    createdBy: r.created_by,
    createdAt: r.created_at,
    completedAt: r.completed_at,
    updatedAt: r.updated_at,
  }));

  return createPaginatedResponse(requests, count || 0, validatedParams);
});

/**
 * Get refund statistics
 */
export const getRefundStats = withErrorHandling(async (
  currentUserId: string
): Promise<ApiResponse<{
  totalRequests: number;
  pendingRequests: number;
  totalPendingAmount: number;
  totalDonorsAffected: number;
  averageResponseTime: number;
  decisionTypeDistribution: Record<DonorDecisionType, number>;
}>> => {
  // Verify admin
  const { data: user } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (user?.role !== 'admin') {
    throw new ClearCauseError('FORBIDDEN', 'Admin access required', 403);
  }

  // Get stats
  const [totalResult, pendingResult, decisionsResult] = await Promise.all([
    supabase.from('milestone_refund_requests').select('*', { count: 'exact', head: true }),
    supabase.from('milestone_refund_requests').select('total_amount, total_donors_count').eq('status', 'pending_donor_decision'),
    supabase.from('donor_refund_decisions').select('decision_type, decided_at, created_at').not('decision_type', 'is', null),
  ]);

  const totalPendingAmount = (pendingResult.data || []).reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
  const totalDonorsAffected = (pendingResult.data || []).reduce((sum, r) => sum + r.total_donors_count, 0);

  // Calculate average response time
  let averageResponseTime = 0;
  if (decisionsResult.data && decisionsResult.data.length > 0) {
    const responseTimes = decisionsResult.data
      .filter(d => d.decided_at && d.created_at)
      .map(d => {
        const created = new Date(d.created_at).getTime();
        const decided = new Date(d.decided_at).getTime();
        return (decided - created) / (1000 * 60 * 60 * 24); // Days
      });

    if (responseTimes.length > 0) {
      averageResponseTime = responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length;
    }
  }

  // Decision type distribution
  const decisionTypeDistribution: Record<DonorDecisionType, number> = {
    refund: 0,
    redirect_campaign: 0,
    donate_platform: 0,
  };

  (decisionsResult.data || []).forEach(d => {
    if (d.decision_type) {
      decisionTypeDistribution[d.decision_type as DonorDecisionType]++;
    }
  });

  return createSuccessResponse({
    totalRequests: totalResult.count || 0,
    pendingRequests: pendingResult.data?.length || 0,
    totalPendingAmount,
    totalDonorsAffected,
    averageResponseTime: Math.round(averageResponseTime * 10) / 10,
    decisionTypeDistribution,
  });
});
