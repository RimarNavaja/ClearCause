/**
 * Test suite for CampaignForm component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import CampaignForm from './CampaignForm';
import * as campaignService from '@/services/campaignService';

// Mock the campaign service
vi.mock('@/services/campaignService', () => ({
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  getCampaignById: vi.fn(),
}));

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ campaignId: undefined }),
    useNavigate: () => vi.fn(),
  };
});

describe('CampaignForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    renderWithProviders(<CampaignForm />, {
      authUser: {
        id: 'charity-user-id',
        email: 'charity@example.com',
        fullName: 'Charity User',
        role: 'charity',
        isVerified: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    expect(screen.getByText('Create New Campaign')).toBeInTheDocument();
  });

  it('should render form fields for campaign creation', () => {
    renderWithProviders(<CampaignForm />, {
      authUser: {
        id: 'charity-user-id',
        email: 'charity@example.com',
        fullName: 'Charity User',
        role: 'charity',
        isVerified: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    // Check for key form elements on first step
    expect(screen.getByLabelText(/Campaign Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Campaign Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Campaign Category/i)).toBeInTheDocument();
  });

  it('should show step navigation', () => {
    renderWithProviders(<CampaignForm />, {
      authUser: {
        id: 'charity-user-id',
        email: 'charity@example.com',
        fullName: 'Charity User',
        role: 'charity',
        isVerified: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    // Check for step navigation elements
    expect(screen.getAllByText('Campaign Details')).toHaveLength(2); // Once in step indicator, once as heading
    expect(screen.getByText('Funding Goal')).toBeInTheDocument();
    expect(screen.getByText('Define Milestones')).toBeInTheDocument();
    expect(screen.getByText('Evidence Requirements')).toBeInTheDocument();
  });

  it('should render navigation buttons', () => {
    renderWithProviders(<CampaignForm />, {
      authUser: {
        id: 'charity-user-id',
        email: 'charity@example.com',
        fullName: 'Charity User',
        role: 'charity',
        isVerified: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    // Should show navigation buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save as Draft')).toBeInTheDocument();
    expect(screen.getByText('Next Step')).toBeInTheDocument();
  });
});