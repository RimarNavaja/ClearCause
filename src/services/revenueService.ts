import { supabase } from '@/lib/supabase';

/**
 * Revenue Service
 * Aggregates platform fee data from donations to provide revenue analytics
 */

export interface RevenueStats {
  platformFees: number;
  netRevenue: number;
  donationCount: number;
}

export interface PeriodRevenueStats {
  platformFees: number;
  totalGross: number;
  totalNet: number;
  donationCount: number;
}

export interface RevenueTrend {
  month: string;
  platformFees: number;
  donationCount: number;
}

export interface CampaignRevenue {
  campaignId: string;
  campaignTitle: string;
  grossAmount: number;
  platformFees: number;
  netToCharity: number;
  donationCount: number;
}

/**
 * Get total platform fees collected (lifetime)
 * Calculates aggregate revenue from all completed donations AND platform refund donations
 */
export async function getTotalPlatformRevenue(): Promise<RevenueStats> {
  // 1. Get standard platform fees from donations
  const { data: donations, error: donationError } = await supabase
    .from('donations')
    .select('metadata')
    .eq('status', 'completed');

  if (donationError) throw donationError;

  // 2. Get revenue from "donate to platform" refund decisions
  const { data: refunds, error: refundError } = await supabase
    .from('donor_refund_decisions')
    .select('refund_amount')
    .eq('status', 'completed')
    .eq('decision_type', 'donate_platform');

  if (refundError) throw refundError;

  // Calculate totals
  const donationStats = donations.reduce((acc, donation) => {
    const fees = donation.metadata?.fees || {};
    const platformFee = parseFloat(fees.platformFee || 0);

    return {
      platformFees: acc.platformFees + platformFee,
      netRevenue: acc.netRevenue + platformFee,
      donationCount: acc.donationCount + 1,
    };
  }, { platformFees: 0, netRevenue: 0, donationCount: 0 });

  const refundStats = refunds.reduce((acc, refund) => {
    const amount = parseFloat(refund.refund_amount || 0);
    return {
      platformFees: acc.platformFees + amount,
      netRevenue: acc.netRevenue + amount,
      donationCount: acc.donationCount + 1,
    };
  }, { platformFees: 0, netRevenue: 0, donationCount: 0 });

  return {
    platformFees: donationStats.platformFees + refundStats.platformFees,
    netRevenue: donationStats.netRevenue + refundStats.netRevenue,
    donationCount: donationStats.donationCount + refundStats.donationCount,
  };
}

/**
 * Get platform fees by time period
 * Returns revenue statistics for a specific date range
 *
 * @param startDate - ISO 8601 date string (e.g., '2024-01-01T00:00:00Z')
 * @param endDate - ISO 8601 date string (e.g., '2024-01-31T23:59:59Z')
 */
export async function getPlatformRevenueByPeriod(
  startDate: string,
  endDate: string
): Promise<PeriodRevenueStats> {
  // 1. Get standard platform fees
  const { data: donations, error: donationError } = await supabase
    .from('donations')
    .select('amount, metadata, donated_at')
    .eq('status', 'completed')
    .gte('donated_at', startDate)
    .lte('donated_at', endDate);

  if (donationError) throw donationError;

  // 2. Get refund donations
  const { data: refunds, error: refundError } = await supabase
    .from('donor_refund_decisions')
    .select('refund_amount, processed_at')
    .eq('status', 'completed')
    .eq('decision_type', 'donate_platform')
    .gte('processed_at', startDate)
    .lte('processed_at', endDate);

  if (refundError) throw refundError;

  // Calculate stats
  const donationStats = donations.reduce((acc, donation) => {
    const fees = donation.metadata?.fees || {};
    return {
      platformFees: acc.platformFees + parseFloat(fees.platformFee || 0),
      totalGross: acc.totalGross + parseFloat(fees.grossAmount || donation.amount || 0),
      totalNet: acc.totalNet + parseFloat(fees.netAmount || 0),
      donationCount: acc.donationCount + 1,
    };
  }, {
    platformFees: 0,
    totalGross: 0,
    totalNet: 0,
    donationCount: 0,
  });

  const refundStats = refunds.reduce((acc, refund) => {
    const amount = parseFloat(refund.refund_amount || 0);
    return {
      platformFees: acc.platformFees + amount,
      totalGross: acc.totalGross + amount, // For refunds, gross = net = amount
      totalNet: acc.totalNet + amount,
      donationCount: acc.donationCount + 1,
    };
  }, {
    platformFees: 0,
    totalGross: 0,
    totalNet: 0,
    donationCount: 0,
  });

  return {
    platformFees: donationStats.platformFees + refundStats.platformFees,
    totalGross: donationStats.totalGross + refundStats.totalGross,
    totalNet: donationStats.totalNet + refundStats.totalNet,
    donationCount: donationStats.donationCount + refundStats.donationCount,
  };
}

/**
 * Get revenue trends (monthly breakdown)
 * Returns platform and gateway fees grouped by month
 *
 * @param months - Number of months to look back (default: 6)
 */
export async function getRevenueTrends(months: number = 6): Promise<RevenueTrend[]> {
  const cutoffDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('donations')
    .select('metadata, donated_at')
    .eq('status', 'completed')
    .gte('donated_at', cutoffDate.toISOString())
    .order('donated_at', { ascending: true });

  if (error) throw error;

  // Group by month
  const monthlyData = new Map<string, { platformFees: number; count: number }>();

  data.forEach(donation => {
    const month = new Date(donation.donated_at).toISOString().substring(0, 7); // YYYY-MM
    const fees = donation.metadata?.fees || {};
    const platformFee = parseFloat(fees.platformFee || 0);

    const existing = monthlyData.get(month) || { platformFees: 0, count: 0 };
    monthlyData.set(month, {
      platformFees: existing.platformFees + platformFee,
      count: existing.count + 1,
    });
  });

  return Array.from(monthlyData.entries()).map(([month, data]) => ({
    month,
    platformFees: data.platformFees,
    donationCount: data.count,
  }));
}

/**
 * Get platform fees by campaign
 * Returns revenue breakdown for each campaign, sorted by platform fees collected
 */
export async function getPlatformRevenueByCampaign(): Promise<CampaignRevenue[]> {
  const { data, error } = await supabase
    .from('donations')
    .select('campaign_id, amount, metadata, campaigns(title)')
    .eq('status', 'completed');

  if (error) throw error;

  // Group by campaign
  const campaignData = new Map<string, any>();

  data.forEach(donation => {
    const campaignId = donation.campaign_id;
    const fees = donation.metadata?.fees || {};
    const platformFee = parseFloat(fees.platformFee || 0);
    const netAmount = parseFloat(fees.netAmount || 0);
    const grossAmount = parseFloat(fees.grossAmount || donation.amount || 0);

    // Handle the campaigns join result properly
    const campaignTitle = (donation.campaigns as any)?.title || 'Unknown Campaign';

    const existing = campaignData.get(campaignId) || {
      campaignTitle,
      grossAmount: 0,
      platformFees: 0,
      netToCharity: 0,
      count: 0,
    };

    campaignData.set(campaignId, {
      ...existing,
      grossAmount: existing.grossAmount + grossAmount,
      platformFees: existing.platformFees + platformFee,
      netToCharity: existing.netToCharity + netAmount,
      count: existing.count + 1,
    });
  });

  return Array.from(campaignData.entries())
    .map(([campaignId, data]) => ({
      campaignId,
      campaignTitle: data.campaignTitle,
      grossAmount: data.grossAmount,
      platformFees: data.platformFees,
      netToCharity: data.netToCharity,
      donationCount: data.count,
    }))
    .sort((a, b) => b.platformFees - a.platformFees);
}
