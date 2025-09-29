/**
 * Test suite for enhanced DonorProfile component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { screen, waitFor } from '@testing-library/react';
import DonorProfile from './DonorProfile';
import * as userService from '@/services/userService';

// Mock the user service
vi.mock('@/services/userService', () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
  uploadUserAvatar: vi.fn(),
}));

describe('DonorProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without form context errors', () => {
    vi.mocked(userService.getUserProfile).mockResolvedValue({
      success: true,
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: null,
        phone: null,
        role: 'donor',
        isVerified: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    const testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'donor' as const,
      isVerified: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      avatarUrl: null,
      phone: null,
    };

    // This should not throw a form context error
    expect(() => {
      renderWithProviders(<DonorProfile />, {
        authUser: testUser,
      });
    }).not.toThrow();
  });

  it('should handle loading state properly', () => {
    vi.mocked(userService.getUserProfile).mockReturnValue(
      new Promise(() => {}) // Never resolving promise to simulate loading
    );

    const testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'donor' as const,
      isVerified: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      avatarUrl: null,
      phone: null,
    };

    renderWithProviders(<DonorProfile />, {
      authUser: testUser,
    });

    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('should handle case when user is not available', () => {
    renderWithProviders(<DonorProfile />); // No auth user provided

    expect(screen.getByText('Authenticating...')).toBeInTheDocument();
  });

  it('should render basic profile components', () => {
    // Mock a successful response but immediate
    vi.mocked(userService.getUserProfile).mockResolvedValue({
      success: true,
      data: {
        id: 'test-user-id',
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: null,
        phone: null,
        role: 'donor',
        isVerified: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    const testUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'donor' as const,
      isVerified: true,
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      avatarUrl: null,
      phone: null,
    };

    const { container } = renderWithProviders(<DonorProfile />, {
      authUser: testUser,
    });

    // Just verify the component renders without throwing form context errors
    expect(container).toBeInTheDocument();
  });
});