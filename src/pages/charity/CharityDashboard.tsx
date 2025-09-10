import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BarChart2, Clock, Eye, PlusCircle, DollarSign, Users, TrendingUp, Heart, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CharityLayout from '@/components/layout/CharityLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import * as charityService from '@/services/charityService';
import * as campaignService from '@/services/campaignService';
import { formatCurrency, getRelativeTime } from '@/utils/helpers';

const CharityDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
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

      // Load charity statistics
      const statsResult = await charityService.getCharityStatistics(user.id);
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }

      // Load recent campaigns
      const campaignsResult = await campaignService.getCharityCampaigns(user.id, { limit: 3 });
      if (campaignsResult.success && campaignsResult.data) {
        setCampaigns(campaignsResult.data.campaigns);
      }

      // Load recent activity
      const activityResult = await charityService.getCharityActivity(user.id, { limit: 5 });
      if (activityResult.success && activityResult.data) {
        setRecentActivity(activityResult.data);
      }

    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const unsubscribeFns: (() => void)[] = [];

    // Subscribe to donation updates
    const donationSub = subscribe('donations', (payload) => {
      if (payload.new.campaign?.charity_id === user.id) {
        // Refresh stats when new donations come in
        loadDashboardData();
      }
    });
    unsubscribeFns.push(donationSub);

    // Subscribe to campaign updates
    const campaignSub = subscribe('campaigns', (payload) => {
      if (payload.new.charity_id === user.id) {
        // Update campaign data
        setCampaigns(prev => prev.map(campaign => 
          campaign.id === payload.new.id ? { ...campaign, ...payload.new } : campaign
        ));
      }
    });
    unsubscribeFns.push(campaignSub);

    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }, [user, subscribe]);

  // Initial data load
  useEffect(() => {
    loadDashboardData();
  }, [user]);

  // Get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'donation':
        return <Heart className="h-5 w-5 text-green-500" />;
      case 'milestone_verified':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'milestone_rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'payout':
        return <DollarSign className="h-5 w-5 text-blue-500" />;
      case 'campaign_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'verification_required':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <CharityLayout title="Charity Dashboard">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
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
      </CharityLayout>
    );
  }

  if (error) {
    return (
      <CharityLayout title="Charity Dashboard">
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
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title="Charity Dashboard">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
                <h3 className="text-2xl font-bold mt-1">{stats?.activeCampaigns || 0}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {stats?.totalCampaigns || 0} total campaigns
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <BarChart2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Funds Raised</p>
                <h3 className="text-2xl font-bold mt-1">
                  {formatCurrency(stats?.totalFundsRaised || 0)}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {stats?.totalDonations || 0} donations
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Funds Released</p>
                <h3 className="text-2xl font-bold mt-1">
                  {formatCurrency(stats?.totalFundsReleased || 0)}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {((stats?.totalFundsReleased || 0) / (stats?.totalFundsRaised || 1) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Donors</p>
                <h3 className="text-2xl font-bold mt-1">{stats?.totalDonors || 0}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Unique supporters
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      {(stats?.pendingVerifications > 0 || stats?.pendingMilestones > 0) && (
        <Card className="mb-8 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.pendingVerifications > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-700">
                    {stats.pendingVerifications} verification document(s) needed
                  </span>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/charity/verifications">Submit Documents</Link>
                  </Button>
                </div>
              )}
              {stats?.pendingMilestones > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-orange-700">
                    {stats.pendingMilestones} milestone proof(s) to submit
                  </span>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/charity/campaigns">Submit Proofs</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Campaigns</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/charity/campaigns">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <BarChart2 className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating your first campaign</p>
                <Button className="mt-4" asChild>
                  <Link to="/charity/campaigns/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{campaign.title}</h4>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500">
                          {formatCurrency(campaign.amountRaised)} raised
                        </span>
                        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                          {campaign.status}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/charity/campaigns/${campaign.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/charity/activity">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                <p className="mt-1 text-sm text-gray-500">Activity will appear here as you manage your campaigns</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm text-gray-700">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                      )}
                      <span className="text-xs text-gray-400 mt-1">
                        {getRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-20 flex flex-col gap-2" asChild>
              <Link to="/charity/campaigns/new">
                <PlusCircle className="h-6 w-6" />
                Create New Campaign
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2" asChild>
              <Link to="/charity/funds">
                <DollarSign className="h-6 w-6" />
                Manage Funds
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2" asChild>
              <Link to="/charity/profile">
                <Users className="h-6 w-6" />
                Update Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </CharityLayout>
  );
};

export default CharityDashboard;