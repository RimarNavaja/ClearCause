/**
 * MSW API Handlers
 * Mock handlers for Supabase API endpoints
 */

import { http, HttpResponse } from 'msw';

// Mock data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'donor' as const,
  isVerified: true,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockCharity = {
  id: 'test-charity-id',
  userId: 'test-charity-user-id',
  organizationName: 'Test Charity',
  organizationType: 'Non-profit',
  description: 'A test charity organization',
  websiteUrl: 'https://testcharity.org',
  logoUrl: '/test-logo.png',
  contactEmail: 'contact@testcharity.org',
  contactPhone: '+1234567890',
  address: '123 Test Street, Test City, TC 12345',
  verificationStatus: 'approved' as const,
  verificationNotes: null,
  transparencyScore: 95,
  totalRaised: 50000,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockCampaign = {
  id: 'test-campaign-id',
  charityId: 'test-charity-id',
  title: 'Test Campaign',
  description: 'A test campaign for testing purposes',
  goalAmount: 10000,
  currentAmount: 7500,
  donorsCount: 25,
  category: 'Education',
  location: 'Test City',
  imageUrl: '/test-campaign.jpg',
  status: 'active' as const,
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-12-31T23:59:59Z',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  charity: mockCharity,
};

export const handlers = [
  // Auth endpoints
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: mockUser,
    });
  }),

  // Profiles
  http.get('*/rest/v1/profiles', () => {
    return HttpResponse.json([mockUser]);
  }),

  http.post('*/rest/v1/profiles', () => {
    return HttpResponse.json(mockUser, { status: 201 });
  }),

  // Charities
  http.get('*/rest/v1/charities', () => {
    return HttpResponse.json([mockCharity]);
  }),

  http.post('*/rest/v1/charities', () => {
    return HttpResponse.json(mockCharity, { status: 201 });
  }),

  // Campaigns
  http.get('*/rest/v1/campaigns', () => {
    return HttpResponse.json([mockCampaign]);
  }),

  http.post('*/rest/v1/campaigns', () => {
    return HttpResponse.json(mockCampaign, { status: 201 });
  }),

  // Platform statistics (admin)
  http.get('*/rest/v1/rpc/get_platform_statistics', () => {
    return HttpResponse.json({
      totalUsers: 150,
      totalCharities: 25,
      totalCampaigns: 75,
      totalDonations: 500,
      totalAmountRaised: 250000,
      activeUsers: 120,
      activeCampaigns: 45,
      pendingVerifications: 8,
    });
  }),

  // Donations
  http.post('*/rest/v1/donations', () => {
    return HttpResponse.json({
      id: 'test-donation-id',
      userId: mockUser.id,
      campaignId: mockCampaign.id,
      amount: 100,
      paymentMethod: 'credit_card',
      transactionId: 'txn_test_123',
      status: 'completed',
      donatedAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Error scenarios for testing
  http.get('*/rest/v1/error-test', () => {
    return HttpResponse.json(
      { error: 'Test error message' },
      { status: 500 }
    );
  }),
];