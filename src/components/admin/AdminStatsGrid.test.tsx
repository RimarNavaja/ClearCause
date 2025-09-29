/**
 * Test suite for AdminStatsGrid component
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import AdminStatsGrid from './AdminStatsGrid';

describe('AdminStatsGrid', () => {
  it('should render without crashing', () => {
    renderWithProviders(<AdminStatsGrid />, {
      authUser: {
        id: 'admin-user-id',
        email: 'admin@example.com',
        fullName: 'Admin User',
        role: 'admin',
        isVerified: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });
  });
});