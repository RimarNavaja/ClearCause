import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Landmark, Heart, Clock, TrendingUp, ExternalLink, Gift, Target, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import DonorLayout from '@/components/layout/DonorLayout';
import CampaignGrid from '@/components/ui/campaign/CampaignGrid';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import * as donationService from '@/services/donationService';
import * as campaignService from '@/services/campaignService';
import { formatCurrency, getRelativeTime } from '@/utils/helpers';

const DonorDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [recentDonations, setRecentDonations] = useState<any[]>([]);
  const [impactUpdates, setImpactUpdates] = useState<any[]>([]);
  const [suggestedCampaigns, setSuggestedCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { subscribe } = useRealtime();

  // Load dashboard data
  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Load donor statistics
      const statsResult = await donationService.getDonorStatistics(user.id);
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }

      // Load recent donations
      const donationsResult = await donationService.getDonationsByDonor(user.id, { limit: 5 });
      if (donationsResult.success && donationsResult.data) {
        setRecentDonations(donationsResult.data.donations);
      }

      // Load impact updates from supported campaigns
      const impactResult = await donationService.getDonorImpactUpdates(user.id, { limit: 3 });
      if (impactResult.success && impactResult.data) {
        setImpactUpdates(impactResult.data);
      }

      // Load suggested campaigns
      const suggestionsResult = await campaignService.getSuggestedCampaigns(user.id, { limit: 4 });
      if (suggestionsResult.success && suggestionsResult.data) {
        setSuggestedCampaigns(suggestionsResult.data.campaigns);
      }

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Donor dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const unsubscribeFns: (() => void)[] = [];

    // Subscribe to campaign updates for campaigns the user has donated to
    const campaignSub = subscribe('campaigns', (payload) => {
      // Check if user has donated to this campaign
      const hasDonated = recentDonations.some(d => d.campaign?.id === payload.new.id);
      if (hasDonated) {
        // Refresh impact updates
        loadDashboardData();
      }
    });
    unsubscribeFns.push(campaignSub);

    // Subscribe to milestone updates
    const milestoneSub = subscribe('milestones', (payload) => {
      if (payload.new.status === 'verified') {
        // Refresh impact updates when milestones are verified
        loadDashboardData();
      }
    });
    unsubscribeFns.push(milestoneSub);

    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }, [user, subscribe, recentDonations]);

  // Initial data load
  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Get donation status badge
  const getDonationStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="text-green-600">Completed</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-600">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DonorLayout title="Donor Dashboard">
        <div className="space-y-6">
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-8 bg-gray-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-16 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DonorLayout>
    );
  }

  if (error) {
    return (
      <DonorLayout title="Donor Dashboard">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <Button onClick={loadDashboardData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </DonorLayout>
    );
  }

  return (
    <DonorLayout title="Donor Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.fullName || 'Donor'}! 
          </h1>
          <p className="text-gray-600">
            Thank you for making a difference. Here's your impact summary.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Donated</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats?.totalDonated || 0)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {stats?.donationCount || 0} donations made
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Landmark className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Campaigns Supported</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.campaignsSupported || 0}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {stats?.activeDonations || 0} currently active
                  </p>
                </div>
                <div className="bg-rose-100 p-3 rounded-full">
                  <Heart className="h-6 w-6 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Impact Score</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.impactScore || 0}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Based on campaign outcomes
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Donations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Recent Donations
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/donor/donations">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentDonations.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No donations yet</h3>
                  <p className="mt-1 text-sm text-gray-500">Start making a difference today</p>
                  <Button className="mt-4" asChild>
                    <Link to="/campaigns">Browse Campaigns</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentDonations.map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-gray-900">
                          {donation.campaign?.title}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {getRelativeTime(donation.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(donation.amount)}
                        </p>
                        {getDonationStatusBadge(donation.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Impact Updates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Impact Updates
                </CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/donor/impact">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {impactUpdates.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No impact updates</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Impact updates will appear here as campaigns progress
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {impactUpdates.map((update) => (
                    <div key={update.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900">
                            {update.campaign?.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {update.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              {getRelativeTime(update.createdAt)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {update.type}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/campaigns/${update.campaign?.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Suggested Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Suggested Campaigns</CardTitle>
                <CardDescription>
                  Based on your donation history and interests
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link to="/campaigns">
                  Browse All Campaigns
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {suggestedCampaigns.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No suggestions available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Make a few donations to get personalized campaign suggestions
                </p>
              </div>
            ) : (
              <CampaignGrid 
                campaigns={suggestedCampaigns}
                loading={false}
                error={null}
                showRealTimeUpdates={true}
                compact={true}
                columns={2}
              />
            )}
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-clearcause-primary to-clearcause-secondary text-white">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Ready to make more impact?</h3>
            <p className="mb-4 opacity-90">
              Discover new campaigns that align with your values and interests
            </p>
            <Button variant="secondary" asChild>
              <Link to="/campaigns">
                Explore Campaigns
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DonorLayout>
  );
};

export default DonorDashboard;