/**
 * Test suite for OrganizationProfile component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import OrganizationProfile from './OrganizationProfile';
import * as charityService from '@/services/charityService';

// Mock the charity service
vi.mock('@/services/charityService', () => ({
  getCharityByUserId: vi.fn(),
  updateCharity: vi.fn(),
}));

describe('OrganizationProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    vi.mocked(charityService.getCharityByUserId).mockResolvedValue({
      success: true,
      data: null,
      message: 'No charity found',
    });

    renderWithProviders(<OrganizationProfile />, {
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

    expect(screen.getAllByText('Organization Profile')).toHaveLength(2); // Once in navigation, once as heading
  });

  it('should render form sections', () => {
    vi.mocked(charityService.getCharityByUserId).mockResolvedValue({
      success: true,
      data: null,
      message: 'No charity found',
    });

    renderWithProviders(<OrganizationProfile />, {
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

    expect(screen.getByText('Organization Information')).toBeInTheDocument();
    expect(screen.getByText('Primary Contact Person')).toBeInTheDocument();
    expect(screen.getByText('Verification Documents')).toBeInTheDocument();
  });

  it('should render form fields', () => {
    vi.mocked(charityService.getCharityByUserId).mockResolvedValue({
      success: true,
      data: null,
      message: 'No charity found',
    });

    renderWithProviders(<OrganizationProfile />, {
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

    // Check for organization information fields
    expect(screen.getByLabelText(/Organization Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Registration Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Website/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Organization Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mission Statement/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Complete Address/i)).toBeInTheDocument();

    // Check for contact person fields
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();

    // Check for save button
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should allow form input', () => {
    vi.mocked(charityService.getCharityByUserId).mockResolvedValue({
      success: true,
      data: null,
      message: 'No charity found',
    });

    renderWithProviders(<OrganizationProfile />, {
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

    // Fill out a field to test form interaction
    const organizationNameField = screen.getByLabelText(/Organization Name/i);
    fireEvent.change(organizationNameField, {
      target: { value: 'Test Charity Name' },
    });

    expect(organizationNameField).toHaveValue('Test Charity Name');
  });

  it('should handle form validation when no charity exists', () => {
    vi.mocked(charityService.getCharityByUserId).mockResolvedValue({
      success: true,
      data: null,
      message: 'No charity found',
    });

    renderWithProviders(<OrganizationProfile />, {
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

    // Try to submit form without charity data
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should show error about needing charity organization
    expect(charityService.updateCharity).not.toHaveBeenCalled();
  });

  it('should handle file upload for documents', () => {
    vi.mocked(charityService.getCharityByUserId).mockResolvedValue({
      success: true,
      data: null,
      message: 'No charity found',
    });

    renderWithProviders(<OrganizationProfile />, {
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

    // Check that file upload input exists
    const fileInput = screen.getByLabelText(/Upload New\/Updated Document/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');

    // Check that upload button exists
    const uploadButton = screen.getByText('Upload');
    expect(uploadButton).toBeInTheDocument();
  });
});