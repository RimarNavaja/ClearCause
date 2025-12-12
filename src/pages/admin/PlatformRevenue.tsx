/**
 * Platform Revenue Management Page (Admin)
 * Shows donations made to ClearCause platform from refund decisions
 */

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Users, Calendar, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/admin/AdminLayout';

interface PlatformDonation {
  id: string;
  donorId: string;
  amount: number;
  triggerType: 'milestone_rejection' | 'campaign_expiration' | 'campaign_cancellation';
  campaignTitle: string;
  donorName: string;
  decidedAt: string;
  processedAt: string;
}

interface RevenueStats {
  totalRevenue: number;
  totalDonations: number;
  uniqueDonors: number;
  standardFees: number; // New field
  byTriggerType: {
    milestone_rejection: number;
    campaign_expiration: number;
    campaign_cancellation: number;
  };
  monthlyRevenue: number;
}

export default function PlatformRevenue() {
  const { toast } = useToast();
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [donations, setDonations] = useState<PlatformDonation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadDonations()]);
    } catch (error) {
      console.error('Error loading platform revenue data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load platform revenue data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    // 1. Get Refund Decisions Revenue
    const { data: decisions, error: refundError } = await supabase
      .from('donor_refund_decisions')
      .select('refund_amount, donor_id, decided_at, metadata')
      .eq('decision_type', 'donate_platform')
      .eq('status', 'completed');

    if (refundError) throw refundError;

    // 2. Get Standard Platform Fees from Donations
    const { data: standardDonations, error: donationError } = await supabase
      .from('donations')
      .select('amount, metadata, user_id, donated_at')
      .eq('status', 'completed');

    if (donationError) throw donationError;

    // Calculate Refund Revenue
    const refundRevenue = decisions?.reduce((sum, d) => sum + parseFloat(d.refund_amount), 0) || 0;
    
    // Calculate Standard Fees Revenue
    const standardFeesRevenue = standardDonations?.reduce((sum, d) => {
      const fees = d.metadata?.fees || {};
      return sum + parseFloat(fees.platformFee || 0);
    }, 0) || 0;

    const totalRevenue = refundRevenue + standardFeesRevenue;
    
    // Combine unique donors
    const refundDonors = decisions?.map(d => d.donor_id) || [];
    const standardDonors = standardDonations?.map(d => d.user_id) || [];
    const uniqueDonors = new Set([...refundDonors, ...standardDonors]).size;

    const totalCount = (decisions?.length || 0) + (standardDonations?.length || 0);

    // Calculate by trigger type (only for refunds)
    const byTriggerType = {
      milestone_rejection: 0,
      campaign_expiration: 0,
      campaign_cancellation: 0,
    };

    decisions?.forEach((d) => {
      const triggerType = d.metadata?.trigger_type;
      if (triggerType && triggerType in byTriggerType) {
        byTriggerType[triggerType as keyof typeof byTriggerType] += parseFloat(d.refund_amount);
      }
    });

    // Calculate monthly revenue (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const monthlyRefunds = decisions
      ?.filter((d) => new Date(d.decided_at) >= thirtyDaysAgo)
      .reduce((sum, d) => sum + parseFloat(d.refund_amount), 0) || 0;

    const monthlyStandard = standardDonations
      ?.filter((d) => new Date(d.donated_at) >= thirtyDaysAgo)
      .reduce((sum, d) => {
        const fees = d.metadata?.fees || {};
        return sum + parseFloat(fees.platformFee || 0);
      }, 0) || 0;

    setStats({
      totalRevenue,
      totalDonations: totalCount,
      uniqueDonors,
      standardFees: standardFeesRevenue,
      byTriggerType,
      monthlyRevenue: monthlyRefunds + monthlyStandard,
    });
  };

  const loadDonations = async () => {
    // Get recent platform donations with details
    const { data, error } = await supabase
      .from('donor_refund_decisions')
      .select(`
        id,
        donor_id,
        refund_amount,
        decided_at,
        processed_at,
        metadata,
        milestone_refund_requests!inner(
          campaign_id,
          campaigns!inner(title)
        ),
        profiles!donor_id(
          full_name,
          email
        )
      `)
      .eq('decision_type', 'donate_platform')
      .eq('status', 'completed')
      .order('processed_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const mappedDonations: PlatformDonation[] = (data || []).map((d: any) => ({
      id: d.id,
      donorId: d.donor_id,
      amount: parseFloat(d.refund_amount),
      triggerType: d.metadata?.trigger_type || 'milestone_rejection',
      campaignTitle: d.milestone_refund_requests?.campaigns?.title || 'Unknown Campaign',
      donorName: d.profiles?.full_name || d.profiles?.email || 'Anonymous',
      decidedAt: d.decided_at,
      processedAt: d.processed_at,
    }));

    setDonations(mappedDonations);
  };

  const getTriggerTypeBadge = (type: string) => {
    switch (type) {
      case 'campaign_expiration':
        return <Badge variant="destructive">Campaign Expired</Badge>;
      case 'campaign_cancellation':
        return <Badge variant="destructive">Campaign Cancelled</Badge>;
      case 'milestone_rejection':
        return <Badge variant="default">Milestone Rejected</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const exportToCSV = () => {
    if (donations.length === 0) return;

    const csvContent = [
      ['Date', 'Donor', 'Amount', 'Trigger Type', 'Campaign'],
      ...donations.map((d) => [
        new Date(d.processedAt).toLocaleDateString(),
        d.donorName,
        d.amount.toFixed(2),
        d.triggerType,
        d.campaignTitle,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platform-revenue-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Revenue report exported to CSV',
    });
  };

  return (
    <AdminLayout title="Platform Revenue">
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Header Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={exportToCSV} disabled={donations.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₱{stats?.totalRevenue.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {stats?.totalDonations || 0} donations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₱{stats?.monthlyRevenue.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Donors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.uniqueDonors || 0}</div>
                <p className="text-xs text-muted-foreground">Contributors to platform</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalDonations || 0}</div>
                <p className="text-xs text-muted-foreground">Platform contributions</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Trigger Type */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Source</CardTitle>
              <CardDescription>Breakdown by refund trigger type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Standard Platform Fees</Badge>
                  </div>
                  <div className="font-semibold">
                    ₱{stats?.standardFees.toLocaleString() || 0}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Milestone Rejected</Badge>
                  </div>
                  <div className="font-semibold">
                    ₱{stats?.byTriggerType.milestone_rejection.toLocaleString() || 0}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Campaign Expired</Badge>
                  </div>
                  <div className="font-semibold">
                    ₱{stats?.byTriggerType.campaign_expiration.toLocaleString() || 0}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Campaign Cancelled</Badge>
                  </div>
                  <div className="font-semibold">
                    ₱{stats?.byTriggerType.campaign_cancellation.toLocaleString() || 0}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Donations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Platform Donations</CardTitle>
              <CardDescription>Latest donations to ClearCause platform</CardDescription>
            </CardHeader>
            <CardContent>
              {donations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No platform donations yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Donor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Original Campaign</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {donations.map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell>
                          {new Date(donation.processedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="font-medium">{donation.donorName}</TableCell>
                        <TableCell className="font-semibold">
                          ₱{donation.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{getTriggerTypeBadge(donation.triggerType)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {donation.campaignTitle}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
