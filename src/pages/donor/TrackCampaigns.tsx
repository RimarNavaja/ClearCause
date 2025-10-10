import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Eye, Bell, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DonorLayout from '@/components/layout/DonorLayout';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, getRelativeTime } from '@/utils/helpers';
import * as donationService from '@/services/donationService';
import * as campaignService from '@/services/campaignService';
import { Campaign } from '@/lib/types';

interface TrackedCampaign extends Campaign {
  donationAmount?: number;
  donatedAt?: string;
}

const TrackCampaigns: React.FC = () => {
  const { user } = useAuth();
  const [trackedCampaigns, setTrackedCampaigns] = useState<TrackedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrackedCampaigns = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Get all donations by this donor
        const donationsResult = await donationService.getDonationsByDonor(
          user.id,
          { page: 1, limit: 100 },
          user.id
        );

        if (!donationsResult.success || !donationsResult.data) {
          setError('Failed to load your donations');
          return;
        }

        // Get unique campaign IDs and donation info
        const campaignDonationMap = new Map<string, { amount: number; date: string }>();
        donationsResult.data.forEach((donation: any) => {
          if (donation.campaign?.id && donation.status === 'completed') {
            const existing = campaignDonationMap.get(donation.campaign.id);
            if (!existing || new Date(donation.createdAt) > new Date(existing.date)) {
              campaignDonationMap.set(donation.campaign.id, {
                amount: donation.amount,
                date: donation.createdAt,
              });
            }
          }
        });

        // Load full campaign details for each campaign
        const campaigns: TrackedCampaign[] = [];
        for (const [campaignId, donationInfo] of campaignDonationMap) {
          const campaignResult = await campaignService.getCampaignById(campaignId, true);
          if (campaignResult.success && campaignResult.data) {
            campaigns.push({
              ...campaignResult.data,
              donationAmount: donationInfo.amount,
              donatedAt: donationInfo.date,
            });
          }
        }

        // Sort by most recent donation
        campaigns.sort((a, b) => {
          if (!a.donatedAt || !b.donatedAt) return 0;
          return new Date(b.donatedAt).getTime() - new Date(a.donatedAt).getTime();
        });

        setTrackedCampaigns(campaigns);
      } catch (err) {
        console.error('Error loading tracked campaigns:', err);
        setError('Failed to load tracked campaigns');
      } finally {
        setLoading(false);
      }
    };

    loadTrackedCampaigns();
  }, [user?.id]);

  const getMilestoneStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return null;
    }
  };

  const getCampaignStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'paused':
        return <Badge variant="outline">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <DonorLayout title="Track Campaigns">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
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
      <DonorLayout title="Track Campaigns">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">Error loading campaigns</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </DonorLayout>
    );
  }

  return (
    <DonorLayout title="Track Campaigns">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Track Campaigns</h1>
            <p className="text-gray-600">Monitor campaigns you've supported</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Campaigns Tracked</p>
                  <p className="text-2xl font-bold">{trackedCampaigns.length}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
                  <p className="text-2xl font-bold">
                    {trackedCampaigns.filter(c => c.status === 'active').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed Campaigns</p>
                  <p className="text-2xl font-bold">
                    {trackedCampaigns.filter(c => c.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tracked Campaigns */}
        {trackedCampaigns.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No campaigns tracked yet</h3>
              <p className="mt-2 text-gray-500">
                Campaigns you donate to will appear here for tracking
              </p>
              <Button className="mt-4" asChild>
                <Link to="/campaigns">Browse Campaigns</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {trackedCampaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      {campaign.imageUrl && (
                        <img
                          src={campaign.imageUrl}
                          alt={campaign.title}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle>{campaign.title}</CardTitle>
                          {getCampaignStatusBadge(campaign.status)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          by {campaign.charity?.organizationName || 'Unknown'}
                        </p>
                        {campaign.donationAmount && (
                          <p className="text-sm text-gray-500 mt-1">
                            You donated {formatCurrency(campaign.donationAmount)}
                            {campaign.donatedAt && ` • ${getRelativeTime(campaign.donatedAt)}`}
                          </p>
                        )}
                        <div className="mt-3">
                          <Progress
                            value={(campaign.currentAmount / campaign.goalAmount) * 100}
                            className="h-2"
                          />
                          <div className="flex justify-between text-sm mt-1">
                            <span className="font-semibold">{formatCurrency(campaign.currentAmount)}</span>
                            <span className="text-gray-500">
                              of {formatCurrency(campaign.goalAmount)} • {campaign.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/campaigns/${campaign.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Campaign
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="info">
                    <TabsList>
                      <TabsTrigger value="info">Campaign Info</TabsTrigger>
                      <TabsTrigger value="milestones">
                        Milestones {campaign.milestones?.length ? `(${campaign.milestones.length})` : ''}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-3 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Category</p>
                          <p className="text-sm">{campaign.category || 'General'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Location</p>
                          <p className="text-sm">{campaign.location || 'Not specified'}</p>
                        </div>
                        {campaign.startDate && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Start Date</p>
                            <p className="text-sm">{new Date(campaign.startDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {campaign.endDate && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">End Date</p>
                            <p className="text-sm">{new Date(campaign.endDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="milestones" className="space-y-3 mt-4">
                      {!campaign.milestones || campaign.milestones.length === 0 ? (
                        <p className="text-center text-gray-500 py-6">No milestones set for this campaign</p>
                      ) : (
                        campaign.milestones.map((milestone) => (
                          <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium">{milestone.title}</h4>
                              {milestone.description && (
                                <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                              )}
                              <p className="text-sm text-gray-600 mt-1">
                                Target: {formatCurrency(milestone.targetAmount)}
                              </p>
                            </div>
                            {getMilestoneStatusBadge(milestone.status)}
                          </div>
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DonorLayout>
  );
};

export default TrackCampaigns;
