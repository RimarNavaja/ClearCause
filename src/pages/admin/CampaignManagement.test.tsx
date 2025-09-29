/**
 * Campaign Management Component Test Suite
 * Tests for admin campaign management interface with enhanced search and filters
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CampaignManagement from './CampaignManagement';
import { AuthProvider } from '@/hooks/useAuth';
import * as campaignService from '@/services/campaignService';

// Mock dependencies
vi.mock('@/services/campaignService');
vi.mock('@/hooks/useAuth');
vi.mock('@/hooks/use-toast');

const mockCampaignService = campaignService as any;

// Mock auth hook
const mockUseAuth = {
  user: {
    id: 'admin-1',
    role: 'admin',
    email: 'admin@test.com'
  },
  loading: false
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockCampaigns = [
  {
    id: 'campaign-1',
    title: 'Education for All',
    description: 'Providing education to underprivileged children',
    status: 'active',
    goalAmount: 10000,
    currentAmount: 7500,
    category: 'education',
    location: 'New York',
    createdAt: '2024-01-01T00:00:00.000Z',
    progress: 75,
    charity: {
      id: 'charity-1',
      organizationName: 'Education Foundation',
      verificationStatus: 'approved'
    }
  },
  {
    id: 'campaign-2',
    title: 'Healthcare Initiative',
    description: 'Medical aid for rural communities',
    status: 'pending',
    goalAmount: 25000,
    currentAmount: 0,
    category: 'healthcare',
    location: 'Texas',
    createdAt: '2024-01-02T00:00:00.000Z',
    progress: 0,
    charity: {
      id: 'charity-2',
      organizationName: 'Health for All',
      verificationStatus: 'approved'
    }
  }
];

describe('CampaignManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockCampaignService.listCampaigns.mockResolvedValue({
      success: true,
      data: {
        items: mockCampaigns,
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 2,
          totalPages: 1
        }
      }
    });

    mockCampaignService.approveCampaign.mockResolvedValue({
      success: true,
      data: { ...mockCampaigns[1], status: 'active' }
    });

    mockCampaignService.rejectCampaign.mockResolvedValue({
      success: true,
      data: { ...mockCampaigns[1], status: 'cancelled' }
    });

    mockCampaignService.requestCampaignRevision.mockResolvedValue({
      success: true,
      data: { ...mockCampaigns[1], status: 'draft' }
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render campaign management interface', async () => {
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Campaign Management')).toBeInTheDocument();
        expect(screen.getByText('Monitor and manage all campaigns on the platform')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search campaigns, charities...')).toBeInTheDocument();
      });
    });

    it('should display campaigns in table format', async () => {
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Education for All')).toBeInTheDocument();
        expect(screen.getByText('Healthcare Initiative')).toBeInTheDocument();
        expect(screen.getByText('Education Foundation')).toBeInTheDocument();
        expect(screen.getByText('Health for All')).toBeInTheDocument();
      });
    });

    it('should display campaign statistics', async () => {
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Total Campaigns')).toBeInTheDocument();
        expect(screen.getByText('Active Campaigns')).toBeInTheDocument();
        expect(screen.getByText('Pending Approval')).toBeInTheDocument();
        expect(screen.getByText('Total Raised')).toBeInTheDocument();
      });
    });
  });

  describe('Basic Filtering', () => {
    it('should filter campaigns by status', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Filter by status')).toBeInTheDocument();
      });

      // Click status filter dropdown
      const statusSelect = screen.getByText('Filter by status');
      await user.click(statusSelect);

      // Select 'Active' status
      await user.click(screen.getByText('Active'));

      await waitFor(() => {
        expect(mockCampaignService.listCampaigns).toHaveBeenLastCalledWith(
          expect.objectContaining({ status: ['active'] }),
          expect.any(Object)
        );
      });
    });

    it('should filter campaigns by category', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Filter by category')).toBeInTheDocument();
      });

      // Click category filter dropdown
      const categorySelect = screen.getByText('Filter by category');
      await user.click(categorySelect);

      // Select 'Education' category
      await user.click(screen.getByText('Education'));

      await waitFor(() => {
        expect(mockCampaignService.listCampaigns).toHaveBeenLastCalledWith(
          expect.objectContaining({ category: ['education'] }),
          expect.any(Object)
        );
      });
    });

    it('should search campaigns by text', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      const searchInput = screen.getByPlaceholderText('Search campaigns, charities...');
      await user.type(searchInput, 'education');

      // Wait for debounced search
      await waitFor(
        () => {
          expect(mockCampaignService.listCampaigns).toHaveBeenLastCalledWith(
            expect.objectContaining({ search: 'education' }),
            expect.any(Object)
          );
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Advanced Filtering', () => {
    it('should show advanced filters when toggled', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      const advancedButton = screen.getByRole('button', { name: /advanced/i });
      await user.click(advancedButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Charity Organization')).toBeInTheDocument();
        expect(screen.getByLabelText('Location')).toBeInTheDocument();
        expect(screen.getByLabelText('Min Goal Amount ($)')).toBeInTheDocument();
        expect(screen.getByLabelText('Max Goal Amount ($)')).toBeInTheDocument();
        expect(screen.getByLabelText('Created From')).toBeInTheDocument();
        expect(screen.getByLabelText('Created Until')).toBeInTheDocument();
      });
    });

    it('should apply amount range filters', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      // Show advanced filters
      const advancedButton = screen.getByRole('button', { name: /advanced/i });
      await user.click(advancedButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Min Goal Amount ($)')).toBeInTheDocument();
      });

      // Set amount range
      const minAmountInput = screen.getByLabelText('Min Goal Amount ($)');
      const maxAmountInput = screen.getByLabelText('Max Goal Amount ($)');

      await user.type(minAmountInput, '5000');
      await user.type(maxAmountInput, '20000');

      await waitFor(() => {
        expect(mockCampaignService.listCampaigns).toHaveBeenLastCalledWith(
          expect.objectContaining({
            minGoal: 5000,
            maxGoal: 20000
          }),
          expect.any(Object)
        );
      });
    });

    it('should clear all filters', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      // Show advanced filters
      const advancedButton = screen.getByRole('button', { name: /advanced/i });
      await user.click(advancedButton);

      await waitFor(() => {
        expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
      });

      // Set some filters first
      const minAmountInput = screen.getByLabelText('Min Goal Amount ($)');
      await user.type(minAmountInput, '1000');

      // Clear filters
      const clearButton = screen.getByText('Clear All Filters');
      await user.click(clearButton);

      await waitFor(() => {
        expect(minAmountInput).toHaveValue('');
      });
    });
  });

  describe('Campaign Actions', () => {
    it('should show approve and reject options for pending campaigns', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Healthcare Initiative')).toBeInTheDocument();
      });

      // Find the actions button for the pending campaign
      const actionButtons = screen.getAllByLabelText('Actions');
      const pendingCampaignActionButton = actionButtons.find(button => {
        const row = button.closest('tr');
        return row && row.textContent?.includes('Healthcare Initiative');
      });

      expect(pendingCampaignActionButton).toBeInTheDocument();
      await user.click(pendingCampaignActionButton!);

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
        expect(screen.getByText('Reject')).toBeInTheDocument();
        expect(screen.getByText('Request Revision')).toBeInTheDocument();
      });
    });

    it('should approve a campaign with reason', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Healthcare Initiative')).toBeInTheDocument();
      });

      // Click actions and approve
      const actionButtons = screen.getAllByLabelText('Actions');
      const pendingCampaignActionButton = actionButtons.find(button => {
        const row = button.closest('tr');
        return row && row.textContent?.includes('Healthcare Initiative');
      });

      await user.click(pendingCampaignActionButton!);
      await user.click(screen.getByText('Approve'));

      // Should open approval dialog
      await waitFor(() => {
        expect(screen.getByText('Approve Campaign')).toBeInTheDocument();
        expect(screen.getByText('This will make the campaign active and visible to donors.')).toBeInTheDocument();
      });

      // Enter reason and confirm
      const reasonTextarea = screen.getByPlaceholderText('Enter a reason for this action...');
      await user.type(reasonTextarea, 'Campaign meets all requirements');

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockCampaignService.approveCampaign).toHaveBeenCalledWith(
          'campaign-2',
          'admin-1',
          {
            reason: 'Campaign meets all requirements',
            sendNotification: true,
            autoActivate: true
          }
        );
      });
    });

    it('should reject a campaign with required reason', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Healthcare Initiative')).toBeInTheDocument();
      });

      // Click actions and reject
      const actionButtons = screen.getAllByLabelText('Actions');
      const pendingCampaignActionButton = actionButtons.find(button => {
        const row = button.closest('tr');
        return row && row.textContent?.includes('Healthcare Initiative');
      });

      await user.click(pendingCampaignActionButton!);
      await user.click(screen.getByText('Reject'));

      // Should open rejection dialog
      await waitFor(() => {
        expect(screen.getByText('Reject Campaign')).toBeInTheDocument();
      });

      // Try to confirm without reason (should show error)
      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      // Should not call the service without reason
      expect(mockCampaignService.rejectCampaign).not.toHaveBeenCalled();

      // Enter reason and confirm
      const reasonTextarea = screen.getByPlaceholderText('Enter a reason for this action...');
      await user.type(reasonTextarea, 'Campaign does not meet quality standards');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockCampaignService.rejectCampaign).toHaveBeenCalledWith(
          'campaign-2',
          'admin-1',
          {
            reason: 'Campaign does not meet quality standards',
            allowResubmission: true,
            sendNotification: true
          }
        );
      });
    });

    it('should request revision with reason', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Healthcare Initiative')).toBeInTheDocument();
      });

      // Click actions and request revision
      const actionButtons = screen.getAllByLabelText('Actions');
      const pendingCampaignActionButton = actionButtons.find(button => {
        const row = button.closest('tr');
        return row && row.textContent?.includes('Healthcare Initiative');
      });

      await user.click(pendingCampaignActionButton!);
      await user.click(screen.getByText('Request Revision'));

      // Should open revision dialog
      await waitFor(() => {
        expect(screen.getByText('Request Campaign Revision')).toBeInTheDocument();
        expect(screen.getByText('This will send the campaign back to draft status for the charity to make revisions.')).toBeInTheDocument();
      });

      // Enter reason and confirm
      const reasonTextarea = screen.getByPlaceholderText('Enter a reason for this action...');
      await user.type(reasonTextarea, 'Please provide more detailed budget breakdown');

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockCampaignService.requestCampaignRevision).toHaveBeenCalledWith(
          'campaign-2',
          'admin-1',
          {
            reason: 'Please provide more detailed budget breakdown',
            sendNotification: true
          }
        );
      });
    });
  });

  describe('Sorting and Pagination', () => {
    it('should apply sorting options', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      // Show advanced filters
      const advancedButton = screen.getByRole('button', { name: /advanced/i });
      await user.click(advancedButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Sort By')).toBeInTheDocument();
      });

      // Change sorting
      const sortBySelect = screen.getByLabelText('Sort By');
      await user.click(sortBySelect);
      await user.click(screen.getByText('Goal Amount'));

      const sortOrderSelect = screen.getByLabelText('Sort Order');
      await user.click(sortOrderSelect);
      await user.click(screen.getByText('Ascending'));

      await waitFor(() => {
        expect(mockCampaignService.listCampaigns).toHaveBeenLastCalledWith(
          expect.any(Object),
          expect.objectContaining({
            sortBy: 'goal_amount',
            sortOrder: 'asc'
          })
        );
      });
    });

    it('should handle pagination', async () => {
      // Mock multiple pages of campaigns
      mockCampaignService.listCampaigns.mockResolvedValue({
        success: true,
        data: {
          items: mockCampaigns,
          pagination: {
            page: 1,
            limit: 20,
            totalItems: 50,
            totalPages: 3
          }
        }
      });

      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
      });

      // Click next page
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockCampaignService.listCampaigns).toHaveBeenLastCalledWith(
          expect.any(Object),
          expect.objectContaining({ page: 2 })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle campaign loading errors', async () => {
      mockCampaignService.listCampaigns.mockRejectedValue(
        new Error('Failed to load campaigns')
      );

      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should show error state or fallback UI
        expect(screen.queryByText('Education for All')).not.toBeInTheDocument();
      });
    });

    it('should handle approval action errors', async () => {
      mockCampaignService.approveCampaign.mockRejectedValue(
        new Error('Failed to approve campaign')
      );

      const user = userEvent.setup();
      render(
        <TestWrapper>
          <CampaignManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Healthcare Initiative')).toBeInTheDocument();
      });

      // Try to approve campaign
      const actionButtons = screen.getAllByLabelText('Actions');
      const pendingCampaignActionButton = actionButtons.find(button => {
        const row = button.closest('tr');
        return row && row.textContent?.includes('Healthcare Initiative');
      });

      await user.click(pendingCampaignActionButton!);
      await user.click(screen.getByText('Approve'));

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockCampaignService.approveCampaign).toHaveBeenCalled();
      });
    });
  });
});