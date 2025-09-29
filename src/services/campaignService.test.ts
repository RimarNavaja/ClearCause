/**
 * Campaign Service Test Suite
 * Tests for campaign CRUD operations, approval workflow, and update functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCampaign,
  getCampaignById,
  listCampaigns,
  approveCampaign,
  rejectCampaign,
  requestCampaignRevision,
  createCampaignUpdate,
  getCampaignUpdates,
  updateCampaignStatus
} from './campaignService';
import { supabase } from '../lib/supabase';
import * as charityService from './charityService';
import * as userService from './userService';
import * as adminService from './adminService';

// Mock dependencies
vi.mock('../lib/supabase');
vi.mock('./charityService');
vi.mock('./userService');
vi.mock('./adminService');

const mockSupabase = supabase as any;
const mockCharityService = charityService as any;
const mockUserService = userService as any;
const mockAdminService = adminService as any;

describe('Campaign Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createCampaign', () => {
    const mockCampaignData = {
      title: 'Test Campaign',
      description: 'A test campaign for education',
      goalAmount: 10000,
      category: 'education',
      location: 'New York',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      milestones: [
        {
          title: 'First Milestone',
          description: 'Complete phase 1',
          targetAmount: 5000
        }
      ]
    };

    it('should create a campaign successfully', async () => {
      // Mock charity verification
      mockCharityService.getCharityByUserId.mockResolvedValue({
        success: true,
        data: {
          id: 'charity-1',
          verificationStatus: 'approved'
        }
      });

      // Mock campaign creation
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'campaign-1',
                title: 'Test Campaign',
                status: 'pending',
                charity_id: 'charity-1',
                goal_amount: 10000,
                current_amount: 0,
                created_at: '2024-01-01T00:00:00.000Z'
              },
              error: null
            })
          })
        })
      });

      // Mock milestone creation
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'milestone-1',
                campaign_id: 'campaign-1',
                title: 'First Milestone',
                target_amount: 5000,
                status: 'pending'
              }
            ],
            error: null
          })
        })
      });

      // Mock audit log
      mockAdminService.logAuditEvent.mockResolvedValue({ success: true });

      const result = await createCampaign(mockCampaignData, 'user-1');

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Test Campaign');
      expect(result.data?.status).toBe('pending');
      expect(mockCharityService.getCharityByUserId).toHaveBeenCalledWith('user-1');
      expect(mockAdminService.logAuditEvent).toHaveBeenCalledWith(
        'user-1',
        'CAMPAIGN_CREATED',
        'campaign',
        'campaign-1',
        expect.any(Object)
      );
    });

    it('should reject campaign creation for unverified charity', async () => {
      mockCharityService.getCharityByUserId.mockResolvedValue({
        success: true,
        data: {
          id: 'charity-1',
          verificationStatus: 'pending'
        }
      });

      await expect(createCampaign(mockCampaignData, 'user-1'))
        .rejects
        .toThrow('Your charity organization must be verified to create campaigns');
    });

    it('should reject campaign creation for user without charity', async () => {
      mockCharityService.getCharityByUserId.mockResolvedValue({
        success: false,
        data: null
      });

      await expect(createCampaign(mockCampaignData, 'user-1'))
        .rejects
        .toThrow('You must have a verified charity organization to create campaigns');
    });
  });

  describe('Campaign Approval Workflow', () => {
    const mockCampaign = {
      id: 'campaign-1',
      title: 'Test Campaign',
      status: 'pending' as const,
      charityId: 'charity-1',
      charity: {
        id: 'charity-1',
        organizationName: 'Test Charity',
        user: { email: 'charity@test.com' }
      }
    };

    beforeEach(() => {
      // Mock admin user verification
      mockUserService.getUserProfile.mockResolvedValue({
        success: true,
        data: { role: 'admin' }
      });

      // Mock campaign retrieval
      vi.mocked(getCampaignById).mockResolvedValue({
        success: true,
        data: mockCampaign
      });

      // Mock campaign status update
      vi.mocked(updateCampaignStatus).mockResolvedValue({
        success: true,
        data: { ...mockCampaign, status: 'active' }
      });

      // Mock approval record creation
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: null
        })
      });

      // Mock audit logging
      mockAdminService.logAuditEvent.mockResolvedValue({ success: true });
    });

    describe('approveCampaign', () => {
      it('should approve a pending campaign successfully', async () => {
        const result = await approveCampaign('campaign-1', 'admin-1', {
          reason: 'Campaign meets all requirements',
          autoActivate: true
        });

        expect(result.success).toBe(true);
        expect(updateCampaignStatus).toHaveBeenCalledWith('campaign-1', 'active', 'admin-1');
        expect(mockAdminService.logAuditEvent).toHaveBeenCalledWith(
          'admin-1',
          'CAMPAIGN_APPROVED',
          'campaign',
          'campaign-1',
          expect.objectContaining({
            reason: 'Campaign meets all requirements',
            newStatus: 'active'
          })
        );
      });

      it('should reject approval for non-admin user', async () => {
        mockUserService.getUserProfile.mockResolvedValue({
          success: true,
          data: { role: 'charity' }
        });

        await expect(approveCampaign('campaign-1', 'user-1', {}))
          .rejects
          .toThrow('Only administrators can approve campaigns');
      });

      it('should reject approval for non-pending campaign', async () => {
        vi.mocked(getCampaignById).mockResolvedValue({
          success: true,
          data: { ...mockCampaign, status: 'active' }
        });

        await expect(approveCampaign('campaign-1', 'admin-1', {}))
          .rejects
          .toThrow('Only pending campaigns can be approved');
      });
    });

    describe('rejectCampaign', () => {
      it('should reject a pending campaign successfully', async () => {
        const result = await rejectCampaign('campaign-1', 'admin-1', {
          reason: 'Campaign does not meet requirements',
          allowResubmission: true
        });

        expect(result.success).toBe(true);
        expect(updateCampaignStatus).toHaveBeenCalledWith('campaign-1', 'draft', 'admin-1');
        expect(mockAdminService.logAuditEvent).toHaveBeenCalledWith(
          'admin-1',
          'CAMPAIGN_REJECTED',
          'campaign',
          'campaign-1',
          expect.objectContaining({
            reason: 'Campaign does not meet requirements',
            allowResubmission: true
          })
        );
      });
    });

    describe('requestCampaignRevision', () => {
      it('should request revision for a pending campaign successfully', async () => {
        const result = await requestCampaignRevision('campaign-1', 'admin-1', {
          reason: 'Please update campaign description',
          suggestions: 'Add more details about the project timeline'
        });

        expect(result.success).toBe(true);
        expect(updateCampaignStatus).toHaveBeenCalledWith('campaign-1', 'draft', 'admin-1');
        expect(mockAdminService.logAuditEvent).toHaveBeenCalledWith(
          'admin-1',
          'CAMPAIGN_REVISION_REQUESTED',
          'campaign',
          'campaign-1',
          expect.objectContaining({
            reason: 'Please update campaign description',
            suggestions: 'Add more details about the project timeline'
          })
        );
      });
    });
  });

  describe('Campaign Updates', () => {
    const mockUpdateData = {
      title: 'Project Progress Update',
      content: 'We have completed the first phase of our project.',
      updateType: 'milestone' as const,
      milestoneId: 'milestone-1'
    };

    beforeEach(() => {
      // Mock campaign retrieval
      vi.mocked(getCampaignById).mockResolvedValue({
        success: true,
        data: {
          id: 'campaign-1',
          charity: { id: 'charity-1' }
        }
      });

      // Mock charity verification
      mockCharityService.getCharityByUserId.mockResolvedValue({
        success: true,
        data: { id: 'charity-1' }
      });

      // Mock update creation
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'update-1',
                campaign_id: 'campaign-1',
                title: 'Project Progress Update',
                update_type: 'milestone',
                created_at: '2024-01-01T00:00:00.000Z'
              },
              error: null
            })
          })
        })
      });

      // Mock audit logging
      mockAdminService.logAuditEvent.mockResolvedValue({ success: true });
    });

    describe('createCampaignUpdate', () => {
      it('should create a campaign update successfully', async () => {
        const result = await createCampaignUpdate('campaign-1', mockUpdateData, 'user-1');

        expect(result.success).toBe(true);
        expect(result.data?.title).toBe('Project Progress Update');
        expect(mockAdminService.logAuditEvent).toHaveBeenCalledWith(
          'user-1',
          'create_campaign_update',
          'campaign_update',
          'update-1',
          expect.objectContaining({
            campaign_id: 'campaign-1',
            update_type: 'milestone'
          })
        );
      });

      it('should reject update creation for unauthorized user', async () => {
        mockCharityService.getCharityByUserId.mockResolvedValue({
          success: true,
          data: { id: 'different-charity-id' }
        });

        await expect(createCampaignUpdate('campaign-1', mockUpdateData, 'user-1'))
          .rejects
          .toThrow('You can only create updates for your own campaigns');
      });
    });

    describe('getCampaignUpdates', () => {
      it('should retrieve campaign updates with pagination', async () => {
        mockSupabase.from.mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'update-1',
                      campaign_id: 'campaign-1',
                      title: 'Update 1',
                      update_type: 'general',
                      created_at: '2024-01-01T00:00:00.000Z'
                    }
                  ],
                  count: 1,
                  error: null
                })
              })
            })
          })
        });

        const result = await getCampaignUpdates('campaign-1', { page: 1, limit: 10 });

        expect(result.success).toBe(true);
        expect(result.data?.items).toHaveLength(1);
        expect(result.data?.pagination.totalItems).toBe(1);
      });
    });
  });

  describe('Campaign Search and Filters', () => {
    const mockCampaigns = [
      {
        id: 'campaign-1',
        title: 'Education Campaign',
        status: 'active',
        category: 'education',
        goal_amount: 10000,
        current_amount: 5000,
        created_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'campaign-2',
        title: 'Healthcare Campaign',
        status: 'pending',
        category: 'healthcare',
        goal_amount: 20000,
        current_amount: 0,
        created_at: '2024-01-02T00:00:00.000Z'
      }
    ];

    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockCampaigns,
              count: 2,
              error: null
            })
          })
        })
      });
    });

    describe('listCampaigns', () => {
      it('should filter campaigns by status', async () => {
        const result = await listCampaigns(
          { status: ['active'] },
          { page: 1, limit: 10 }
        );

        expect(result.success).toBe(true);
        expect(result.data?.items).toHaveLength(2);
      });

      it('should filter campaigns by category', async () => {
        const result = await listCampaigns(
          { category: ['education'] },
          { page: 1, limit: 10 }
        );

        expect(result.success).toBe(true);
        expect(mockSupabase.from().select().in).toHaveBeenCalledWith('category', ['education']);
      });

      it('should filter campaigns by amount range', async () => {
        const result = await listCampaigns(
          { minGoal: 5000, maxGoal: 15000 },
          { page: 1, limit: 10 }
        );

        expect(result.success).toBe(true);
        expect(mockSupabase.from().select().gte).toHaveBeenCalledWith('goal_amount', 5000);
        expect(mockSupabase.from().select().lte).toHaveBeenCalledWith('goal_amount', 15000);
      });

      it('should search campaigns by text', async () => {
        const result = await listCampaigns(
          { search: 'education' },
          { page: 1, limit: 10 }
        );

        expect(result.success).toBe(true);
        expect(mockSupabase.from().select().or).toHaveBeenCalledWith(
          'title.ilike.%education%,description.ilike.%education%'
        );
      });

      it('should apply custom sorting', async () => {
        const result = await listCampaigns(
          {},
          { page: 1, limit: 10, sortBy: 'goal_amount', sortOrder: 'asc' }
        );

        expect(result.success).toBe(true);
        expect(mockSupabase.from().select().order).toHaveBeenCalledWith(
          'goal_amount',
          { ascending: true }
        );
      });
    });
  });
});