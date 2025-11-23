import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Plus, CheckCircle, Clock, AlertTriangle, AlertCircle, Edit, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CharityLayout from '@/components/layout/CharityLayout';
import { formatCurrency } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import * as charityService from '@/services/charityService';
import * as campaignService from '@/services/campaignService';
import * as milestoneService from '@/services/milestoneService';
import { waitForAuthReady } from '@/utils/authHelper';

interface Milestone {
  id: string;
  campaignId: string;
  campaignTitle: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  verificationStatus?: 'pending' | 'under_review' | 'approved' | 'rejected';
  dueDate?: string;
  completedAt?: string;
}

const CharityMilestones: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [charityId, setCharityId] = useState<string | null>(null);

  // Load milestones data
  const loadMilestonesData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Wait for auth to be ready
      console.log('[CharityMilestones] Waiting for auth to be ready...');
      await waitForAuthReady(5000);

      // Get charity ID
      console.log('[CharityMilestones] Fetching charity data...');
      const charityResult = await charityService.getCharityByUserId(user.id);

      if (!charityResult.success || !charityResult.data) {
        setError('No charity organization found');
        return;
      }

      const currentCharityId = charityResult.data.id;
      setCharityId(currentCharityId);

      // Load campaigns
      console.log('[CharityMilestones] Loading campaigns...');
      const campaignsResult = await campaignService.getCharityCampaigns(
        currentCharityId,
        { page: 1, limit: 100 },
        user.id
      );

      if (!campaignsResult.success || !campaignsResult.data) {
        setMilestones([]);
        return;
      }

      const campaigns = Array.isArray(campaignsResult.data) ? campaignsResult.data : [];
      const allMilestones: Milestone[] = [];

      // Load milestones for each campaign
      console.log('[CharityMilestones] Loading milestones for each campaign...');
      for (const campaign of campaigns) {
        try {
          const milestonesResult = await milestoneService.getMilestones(campaign.id);

          if (milestonesResult.success && milestonesResult.data) {
            const campaignMilestones = milestonesResult.data.map((m: any) => ({
              id: m.id,
              campaignId: m.campaignId,
              campaignTitle: campaign.title,
              title: m.title,
              description: m.description || '',
              targetAmount: m.targetAmount,
              currentAmount: campaign.currentAmount || 0,
              status: m.status,
              verificationStatus: m.verifiedAt ? 'approved' : 'pending',
              dueDate: m.dueDate,
              completedAt: m.verifiedAt,
            }));
            allMilestones.push(...campaignMilestones);
          }
        } catch (err) {
          console.error(`[CharityMilestones] Error loading milestones for campaign ${campaign.id}:`, err);
          // Continue with next campaign
        }
      }

      setMilestones(allMilestones);
    } catch (err: any) {
      console.error('[CharityMilestones] Error loading milestones:', err);
      setError(err.message || 'Failed to load milestones data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadMilestonesData();
    }
  }, [user?.id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'verified':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      default:
        return null;
    }
  };

  const getVerificationBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">✓ Verified</Badge>;
      case 'under_review':
        return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'pending':
        return <Badge variant="outline">Not Submitted</Badge>;
      default:
        return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

  const completedMilestones = milestones.filter((m) => m.status === 'completed');
  const activeMilestones = milestones.filter((m) => m.status === 'in_progress');
  const pendingMilestones = milestones.filter((m) => m.status === 'pending');

  // Loading state
  if (loading) {
    return (
      <CharityLayout title="Milestones">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </CharityLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <CharityLayout title="Milestones">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading milestones</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <Button onClick={loadMilestonesData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title="Milestones">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Milestones</h1>
            <p className="text-gray-600">Define, track, and submit proof for your campaign milestones</p>
          </div>
          <Button asChild>
            <Link to="/charity/campaigns">
              <Plus className="w-4 h-4 mr-2" />
              Add Milestone
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Milestones</p>
                  <p className="text-2xl font-bold">{milestones.length}</p>
                </div>
                <Target className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold">{activeMilestones.length}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-bold">{completedMilestones.length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Verified</p>
                  <p className="text-2xl font-bold">
                    {milestones.filter((m) => m.verificationStatus === 'approved').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Milestones Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>All Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">No milestones yet</p>
                <p className="text-sm mt-1">Create campaigns with milestones to track your progress</p>
                <Button asChild className="mt-4">
                  <Link to="/charity/campaigns">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Link>
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="all">
                <TabsList>
                  <TabsTrigger value="all">All ({milestones.length})</TabsTrigger>
                  <TabsTrigger value="active">Active ({activeMilestones.length})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({completedMilestones.length})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({pendingMilestones.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Milestone</TableHead>
                        <TableHead>Target Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Verification</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {milestones.map((milestone) => (
                        <TableRow key={milestone.id}>
                          <TableCell className="font-medium">{milestone.campaignTitle}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{milestone.title}</p>
                              <p className="text-sm text-gray-500">{milestone.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(milestone.targetAmount)}</TableCell>
                          <TableCell>
                            {milestone.dueDate
                              ? new Date(milestone.dueDate).toLocaleDateString()
                              : 'Not set'
                            }
                          </TableCell>
                          <TableCell>{getStatusBadge(milestone.status)}</TableCell>
                          <TableCell>{getVerificationBadge(milestone.verificationStatus)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {milestone.status === 'completed' && milestone.verificationStatus === 'pending' && (
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/charity/campaigns/${milestone.campaignId}/milestones/${milestone.id}/submit`}>
                                    <Upload className="w-4 h-4 mr-1" />
                                    Submit Proof
                                  </Link>
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/charity/campaigns/${milestone.campaignId}/milestones`}>
                                  <Edit className="w-4 h-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="active">
                  <div className="space-y-4">
                    {activeMilestones.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No active milestones</p>
                    ) : (
                      activeMilestones.map((milestone) => (
                        <div key={milestone.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{milestone.title}</h4>
                              <p className="text-sm text-gray-600">{milestone.campaignTitle}</p>
                              <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                              <div className="mt-3">
                                <div className="flex justify-between text-sm mb-1">
                                  <span>Progress to target</span>
                                  <span>{formatCurrency(milestone.targetAmount)}</span>
                                </div>
                                <Progress
                                  value={Math.min(((milestone.currentAmount || 0) / milestone.targetAmount) * 100, 100)}
                                  className="h-2"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {getStatusBadge(milestone.status)}
                              {getVerificationBadge(milestone.verificationStatus)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="completed">
                  <div className="space-y-4">
                    {completedMilestones.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No completed milestones</p>
                    ) : (
                      completedMilestones.map((milestone) => (
                        <div key={milestone.id} className="border rounded-lg p-4 bg-green-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{milestone.title}</h4>
                              <p className="text-sm text-gray-600">{milestone.campaignTitle}</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Completed on {milestone.completedAt ? new Date(milestone.completedAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2">
                              {getStatusBadge(milestone.status)}
                              {getVerificationBadge(milestone.verificationStatus)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="pending">
                  <div className="space-y-4">
                    {pendingMilestones.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No pending milestones</p>
                    ) : (
                      pendingMilestones.map((milestone) => (
                        <div key={milestone.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{milestone.title}</h4>
                              <p className="text-sm text-gray-600">{milestone.campaignTitle}</p>
                              <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                              <p className="text-sm text-gray-500 mt-2">
                                Due: {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : 'Not set'}
                              </p>
                            </div>
                            {getStatusBadge(milestone.status)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </CharityLayout>
  );
};

export default CharityMilestones;
