/**
 * Unit Tests for Refund Service
 * Tests the milestone refund allocation and processing functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/lib/supabase';
import {
  allocateDonationToMilestones,
  initiateRefundProcess,
  submitDonorDecision,
  getDonorPendingRefundDecisions,
  getRefundRequests,
  getRefundStats,
} from './refundService';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

// Mock notification service
vi.mock('./notificationService', () => ({
  createNotification: vi.fn().mockResolvedValue({ success: true }),
}));

describe('RefundService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('allocateDonationToMilestones', () => {
    it('should successfully allocate donation to milestones', async () => {
      const mockRpcResponse = { data: null, error: null };
      (supabase.rpc as any).mockResolvedValue(mockRpcResponse);

      const result = await allocateDonationToMilestones(
        'donation-123',
        'campaign-456',
        1000,
        'donor-789'
      );

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('allocate_donation_to_milestones', {
        p_donation_id: 'donation-123',
        p_campaign_id: 'campaign-456',
        p_amount: 1000,
        p_donor_id: 'donor-789',
      });
    });

    it('should handle allocation errors gracefully', async () => {
      const mockRpcResponse = {
        data: null,
        error: { message: 'Database error' },
      };
      (supabase.rpc as any).mockResolvedValue(mockRpcResponse);

      const result = await allocateDonationToMilestones(
        'donation-123',
        'campaign-456',
        1000,
        'donor-789'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });

    it('should validate minimum donation amount', async () => {
      const result = await allocateDonationToMilestones(
        'donation-123',
        'campaign-456',
        0,
        'donor-789'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('initiateRefundProcess', () => {
    it('should successfully initiate refund process', async () => {
      const mockRpcResponse = {
        data: {
          refund_request_id: 'refund-123',
          total_amount: 5000,
          affected_donors: 3,
        },
        error: null,
      };
      (supabase.rpc as any).mockResolvedValue(mockRpcResponse);

      const result = await initiateRefundProcess(
        'milestone-123',
        'proof-456',
        'Milestone did not meet requirements',
        'admin-789'
      );

      expect(result.success).toBe(true);
      expect(result.data?.refundRequestId).toBe('refund-123');
      expect(result.data?.totalAmount).toBe(5000);
      expect(result.data?.affectedDonors).toBe(3);
      expect(supabase.rpc).toHaveBeenCalledWith('initiate_milestone_refund', {
        p_milestone_id: 'milestone-123',
        p_milestone_proof_id: 'proof-456',
        p_rejection_reason: 'Milestone did not meet requirements',
        p_admin_id: 'admin-789',
      });
    });

    it('should handle initiation errors', async () => {
      const mockRpcResponse = {
        data: null,
        error: { message: 'Failed to create refund request' },
      };
      (supabase.rpc as any).mockResolvedValue(mockRpcResponse);

      const result = await initiateRefundProcess(
        'milestone-123',
        'proof-456',
        'Reason',
        'admin-789'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create refund request');
    });
  });

  describe('getDonorPendingRefundDecisions', () => {
    it('should fetch pending decisions for donor', async () => {
      const mockDecisions = [
        {
          id: 'decision-1',
          refund_request_id: 'refund-1',
          donor_id: 'donor-123',
          donation_id: 'donation-1',
          milestone_id: 'milestone-1',
          campaign_id: 'campaign-1',
          refund_amount: 1000,
          decision_type: null,
          redirect_campaign_id: null,
          status: 'pending',
          decision_deadline: '2025-12-25T00:00:00Z',
          created_at: '2025-12-11T00:00:00Z',
          updated_at: '2025-12-11T00:00:00Z',
        },
      ];

      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: mockDecisions,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await getDonorPendingRefundDecisions('donor-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe('decision-1');
      expect(mockFromChain.select).toHaveBeenCalled();
      expect(mockFromChain.eq).toHaveBeenCalledWith('donor_id', 'donor-123');
      expect(mockFromChain.in).toHaveBeenCalledWith('status', ['pending', 'failed']);
    });

    it('should handle empty results', async () => {
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await getDonorPendingRefundDecisions('donor-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await getDonorPendingRefundDecisions('donor-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('submitDonorDecision', () => {
    it('should successfully submit refund decision', async () => {
      // Mock the decision lookup
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'decision-123',
            donor_id: 'donor-789',
            refund_amount: 1000,
            status: 'pending',
          },
          error: null,
        }),
      };

      // Mock the RPC call for processing
      const mockRpcResponse = { data: null, error: null };

      (supabase.from as any).mockReturnValue(mockFromChain);
      (supabase.rpc as any).mockResolvedValue(mockRpcResponse);

      const result = await submitDonorDecision('decision-123', 'donor-789', {
        type: 'refund',
      });

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('process_donor_refund_decision', {
        p_decision_id: 'decision-123',
        p_decision_type: 'refund',
        p_redirect_campaign_id: null,
      });
    });

    it('should validate redirect campaign ID when required', async () => {
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'decision-123',
            donor_id: 'donor-789',
            refund_amount: 1000,
            status: 'pending',
          },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await submitDonorDecision('decision-123', 'donor-789', {
        type: 'redirect_campaign',
        // Missing redirectCampaignId
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('campaign ID');
    });

    it('should prevent unauthorized decision submission', async () => {
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'decision-123',
            donor_id: 'donor-different',
            refund_amount: 1000,
            status: 'pending',
          },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await submitDonorDecision('decision-123', 'donor-789', {
        type: 'refund',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not authorized');
    });

    it('should prevent duplicate submissions', async () => {
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'decision-123',
            donor_id: 'donor-789',
            refund_amount: 1000,
            status: 'completed',
          },
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await submitDonorDecision('decision-123', 'donor-789', {
        type: 'refund',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been processed');
    });
  });

  describe('getRefundRequests', () => {
    it('should fetch all refund requests', async () => {
      const mockRequests = [
        {
          id: 'refund-1',
          milestone_id: 'milestone-1',
          campaign_id: 'campaign-1',
          status: 'pending_decisions',
          total_refund_amount: 5000,
          affected_donors_count: 3,
          rejection_reason: 'Not met',
          created_at: '2025-12-11T00:00:00Z',
          updated_at: '2025-12-11T00:00:00Z',
        },
      ];

      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockRequests,
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await getRefundRequests();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].id).toBe('refund-1');
    });

    it('should filter by status when provided', async () => {
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      await getRefundRequests('completed');

      expect(mockFromChain.eq).toHaveBeenCalledWith('status', 'completed');
    });
  });

  describe('getRefundStats', () => {
    it('should calculate refund statistics', async () => {
      const mockStats = {
        totalRequests: 10,
        pendingDecisions: 5,
        processingCount: 2,
        completedCount: 3,
        totalAmount: 50000,
        pendingAmount: 25000,
        processedAmount: 25000,
      };

      const mockFromChain = {
        select: vi.fn().mockResolvedValue({
          data: [
            { status: 'pending_decisions', count: 5, total: 25000 },
            { status: 'processing', count: 2, total: 10000 },
            { status: 'completed', count: 3, total: 15000 },
          ],
          error: null,
        }),
      };

      (supabase.from as any).mockReturnValue(mockFromChain);

      const result = await getRefundStats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Stats calculation logic would be tested here
    });
  });
});
