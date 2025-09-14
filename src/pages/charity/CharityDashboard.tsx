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
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  
  // Circuit breaker: prevent repeated calls within 5 seconds
  const MINIMUM_RETRY_INTERVAL = 5000;

  // Load dashboard data
  const loadDashboardData = async () => {
    if (!user) return;
    
    // Circuit breaker: prevent repeated calls too quickly
    const now = Date.now();
    if (lastLoadTime > 0 && (now - lastLoadTime) < MINIMUM_RETRY_INTERVAL) {
      console.debug('Preventing rapid retry, waiting for cooldown period');
      return;
    }
    
    // Limit retry attempts
    if (loadingAttempts >= 3) {
      console.warn('Maximum loading attempts reached');
      setError('Too many failed attempts. Please refresh the page.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLoadingAttempts(prev => prev + 1);
      setLastLoadTime(now);

      console.debug('Loading charity dashboard data for user:', user.id, 'Attempt:', loadingAttempts + 1);
      
      // First get the charity organization for this user
      let charityId: string | null = null;
      try {
        console.debug('Getting charity organization for user...');
        const charityResult = await charityService.getCharityByUserId(user.id);
        if (charityResult.success && charityResult.data) {
          charityId = charityResult.data.id;
          console.debug('Found charity ID:', charityId);
        } else {
          console.warn('No charity organization found for user:', user.id);
          setError('No charity organization found. Please register as a charity first.');
          return;
        }
      } catch (charityError) {
        console.error('Failed to get charity organization:', charityError);
        setError('Failed to load charity information.');
        return;
      }

      if (!charityId) {
        console.warn('User does not have a charity organization');
        // Instead of showing an error, show a helpful message
        setError('charity_not_registered');
        setLoading(false);
        return;
      }

      // Set default stats to prevent crashes
      const defaultStats = {
        totalCampaigns: 0,
        activeCampaigns: 0,
        totalRaised: 0,
        totalDonations: 0,
        averageDonation: 0,
        totalFundsReleased: 0,
        totalDonors: 0,
        pendingVerifications: 0,
        pendingMilestones: 0
      };

      // Load charity statistics with error handling
      try {
        console.debug('Loading charity statistics for charity:', charityId);
        const statsResult = await charityService.getCharityStatistics(charityId, user.id);
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
          console.debug('Stats loaded successfully:', statsResult.data);
        } else {
          console.warn('Failed to load stats:', statsResult.error);
          setStats(defaultStats);
        }
      } catch (statsError) {
        console.error('Stats loading error:', statsError);
        setStats(defaultStats);
      }

      // Load recent campaigns with error handling
      try {
        console.debug('Loading recent campaigns for charity:', charityId);
        const campaignsResult = await campaignService.getCharityCampaigns(charityId, { limit: 3 }, user.id);
        if (campaignsResult.success && campaignsResult.data) {
          setCampaigns(campaignsResult.data.campaigns || []);
          console.debug('Campaigns loaded successfully:', campaignsResult.data.campaigns?.length || 0);
        } else {
          console.warn('Failed to load campaigns:', campaignsResult.error);
          setCampaigns([]);
        }
      } catch (campaignError) {
        console.error('Campaigns loading error:', campaignError);
        setCampaigns([]);
      }

      // Load recent activity with error handling
      try {
        console.debug('Loading recent activity for charity:', charityId);
        const activityResult = await charityService.getCharityActivity(charityId, user.id, { limit: 5 });
        if (activityResult.success && activityResult.data) {
          setRecentActivity(activityResult.data);
          console.debug('Activity loaded successfully:', activityResult.data.length);
        } else {
          console.warn('Failed to load activity:', activityResult.error);
          setRecentActivity([]);
        }
      } catch (activityError) {
        console.error('Activity loading error:', activityError);
        setRecentActivity([]);
      }

      console.debug('Dashboard data loading completed');
      // Reset attempts counter on successful load
      setLoadingAttempts(0);

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
        // Refresh stats when new donations come in (with circuit breaker)
        setTimeout(() => loadDashboardData(), 1000); // Slight delay to prevent rapid calls
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
      unsubscribeFns.forEach(fn => {
        if (typeof fn === 'function') {
          fn();
        }
      });
    };
  }, [user, subscribe]);

  // Initial data load - only when user changes and is available
  useEffect(() => {
    if (user?.id && loadingAttempts === 0) {
      loadDashboardData();
    }
  }, [user?.id]); // Only depend on user ID

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
    // Special case: user hasn't registered as a charity yet
    if (error === 'charity_not_registered') {
      return (
        <CharityLayout title="Charity Dashboard">
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <div className="bg-blue-100 p-4 rounded-full w-fit mx-auto mb-4">
                <AlertCircle className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Charity Registration Required</h3>
              <p className="text-sm text-gray-600 mb-6">
                You need to register your charity organization before you can access the dashboard. 
                Please complete the charity registration process to continue.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link to="/charity/register">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Register Charity
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/profile">
                    View Profile
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CharityLayout>
      );
    }
    
    // General error case
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