import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  Heart,
  Calendar,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CharityLayout from '@/components/layout/CharityLayout';
import { formatCurrency, getRelativeTime } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import * as charityService from '@/services/charityService';
import * as campaignService from '@/services/campaignService';
import * as donationService from '@/services/donationService';
import { waitForAuthReady } from '@/utils/authHelper';

const CharityAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  // State for data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [recentDonations, setRecentDonations] = useState<any[]>([]);
  const [charityId, setCharityId] = useState<string | null>(null);

  // Load analytics data
  const loadAnalyticsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Wait for auth to be ready
      console.log('[CharityAnalytics] Waiting for auth to be ready...');
      await waitForAuthReady(5000);

      // Get charity ID
      console.log('[CharityAnalytics] Fetching charity data...');
      const charityResult = await charityService.getCharityByUserId(user.id);

      if (!charityResult.success || !charityResult.data) {
        setError('No charity organization found');
        return;
      }

      const currentCharityId = charityResult.data.id;
      setCharityId(currentCharityId);

      // Load statistics
      console.log('[CharityAnalytics] Loading statistics...');
      const statsResult = await charityService.getCharityStatistics(currentCharityId, user.id);
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      } else {
        // Set default stats if loading fails
        setStats({
          totalFundsRaised: 0,
          totalDonors: 0,
          totalDonations: 0,
          averageDonation: 0,
          activeCampaigns: 0,
          totalCampaigns: 0,
          pendingMilestones: 0,
        });
      }

      // Load campaigns
      console.log('[CharityAnalytics] Loading campaigns...');
      const campaignsResult = await campaignService.getCharityCampaigns(
        currentCharityId,
        { page: 1, limit: 10 },
        user.id
      );
      if (campaignsResult.success && campaignsResult.data) {
        const campaignsData = Array.isArray(campaignsResult.data) ? campaignsResult.data : [];
        setCampaigns(campaignsData);
      } else {
        setCampaigns([]);
      }

      // Load recent donations
      console.log('[CharityAnalytics] Loading recent donations...');
      const activityResult = await charityService.getCharityActivity(currentCharityId, user.id, { limit: 10 });
      if (activityResult.success && activityResult.data) {
        // Filter for donation activities
        const donations = activityResult.data.filter((activity: any) => activity.type === 'donation');
        setRecentDonations(donations.slice(0, 5));
      } else {
        setRecentDonations([]);
      }

    } catch (err: any) {
      console.error('[CharityAnalytics] Error loading analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadAnalyticsData();
    }
  }, [user?.id]);

  // Export report handler
  const handleExportReport = () => {
    // TODO: Implement export functionality
    console.log('Exporting report for time range:', timeRange);
    alert('Export functionality coming soon!');
  };

  // Loading state
  if (loading) {
    return (
      <CharityLayout title="Analytics">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                    <div className="h-8 bg-gray-200 rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CharityLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <CharityLayout title="Analytics">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading analytics</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <Button onClick={loadAnalyticsData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </CharityLayout>
    );
  }

  // Get top performing campaigns
  const topCampaigns = campaigns
    .sort((a, b) => (b.currentAmount || 0) - (a.currentAmount || 0))
    .slice(0, 3);

  return (
    <CharityLayout title="Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Track your campaign performance and engagement metrics</p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Raised</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.totalFundsRaised || 0)}</p>
                  <p className="text-xs text-gray-400 mt-1">All time</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Donors</p>
                  <p className="text-2xl font-bold">{stats?.totalDonors || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Unique supporters</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Donations</p>
                  <p className="text-2xl font-bold">{stats?.totalDonations || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Contributions</p>
                </div>
                <Heart className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg. Donation</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.averageDonation || 0)}</p>
                  <p className="text-xs text-gray-400 mt-1">Per donation</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
                  <p className="text-2xl font-bold">{stats?.activeCampaigns || 0}</p>
                </div>
                <BarChart3 className="h-6 w-6 text-teal-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Campaigns</p>
                  <p className="text-2xl font-bold">{stats?.totalCampaigns || 0}</p>
                </div>
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Funds Released</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.totalFundsReleased || 0)}</p>
                </div>
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Milestones</p>
                  <p className="text-2xl font-bold">{stats?.pendingMilestones || 0}</p>
                </div>
                <Calendar className="h-6 w-6 text-cyan-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Campaigns</CardTitle>
              <CardDescription>Campaigns ranked by funds raised</CardDescription>
            </CardHeader>
            <CardContent>
              {topCampaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p>No campaigns yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {topCampaigns.map((campaign) => (
                    <div key={campaign.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{campaign.title}</p>
                          <p className="text-sm text-gray-500">{campaign.donorsCount || 0} donors</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(campaign.currentAmount || 0)}</p>
                          <p className="text-sm text-gray-500">
                            of {formatCurrency(campaign.goalAmount || 0)}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(((campaign.currentAmount || 0) / (campaign.goalAmount || 1)) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest donations and updates</CardDescription>
            </CardHeader>
            <CardContent>
              {recentDonations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p>No recent donations</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDonations.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-gray-500">{activity.description}</p>
                        )}
                        <p className="text-xs text-gray-400">{getRelativeTime(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Donation Trends</CardTitle>
            <CardDescription>Monthly donation performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Chart visualization coming soon</p>
                <p className="text-sm text-gray-400">Advanced analytics with charting libraries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CharityLayout>
  );
};

export default CharityAnalytics;
