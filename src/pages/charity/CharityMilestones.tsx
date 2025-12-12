import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Plus, CheckCircle, Clock, AlertTriangle, AlertCircle, Upload, Search, Filter, SlidersHorizontal, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import CharityLayout from '@/components/layout/CharityLayout';
import { formatCurrency, debounce } from '@/utils/helpers';
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
  verificationStatus?: 'pending' | 'under_review' | 'approved' | 'rejected' | null;
  dueDate?: string;
  proofSubmittedAt?: string;
  completedAt?: string;
}

interface CampaignOption {
  id: string;
  title: string;
}

const CharityMilestones: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [allMilestones, setAllMilestones] = useState<Milestone[]>([]);
  const [filteredMilestones, setFilteredMilestones] = useState<Milestone[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [charityId, setCharityId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  const debouncedSearch = debounce((query: string) => {
    setSearchQuery(query);
  }, 300);

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
        setAllMilestones([]);
        setFilteredMilestones([]);
        return;
      }

      const campaignsData = Array.isArray(campaignsResult.data) ? campaignsResult.data : [];
      
      // Save campaigns for filter
      setCampaigns(campaignsData.map((c: any) => ({ id: c.id, title: c.title })));

      const loadedMilestones: Milestone[] = [];

      // Load milestones for each campaign
      console.log('[CharityMilestones] Loading milestones for each campaign...');
      for (const campaign of campaignsData) {
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
              currentAmount: campaign.currentAmount || 0, // This is campaign amount, ideally should be milestone specific if supported
              status: m.status,
              verificationStatus: m.verificationStatus,
              dueDate: m.dueDate,
              proofSubmittedAt: m.proofSubmittedAt,
              completedAt: m.completedAt, // Make sure this is available in your API/Type
            }));
            loadedMilestones.push(...campaignMilestones);
          }
        } catch (err) {
          console.error(`[CharityMilestones] Error loading milestones for campaign ${campaign.id}:`, err);
        }
      }

      setAllMilestones(loadedMilestones);
      setFilteredMilestones(loadedMilestones);
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

  // Apply filters
  useEffect(() => {
    let result = [...allMilestones];

    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(lowerQuery) ||
          m.description.toLowerCase().includes(lowerQuery) ||
          m.campaignTitle.toLowerCase().includes(lowerQuery)
      );
    }

    // Campaign filter
    if (selectedCampaignId !== "all") {
      result = result.filter((m) => m.campaignId === selectedCampaignId);
    }

    // Status filter
    if (selectedStatus !== "all") {
      result = result.filter((m) => m.status === selectedStatus);
    }

    // Verification Status filter
    if (selectedVerificationStatus !== "all") {
      if (selectedVerificationStatus === "not_submitted") {
        result = result.filter((m) => !m.verificationStatus);
      } else {
        result = result.filter((m) => m.verificationStatus === selectedVerificationStatus);
      }
    }

    setFilteredMilestones(result);
  }, [allMilestones, searchQuery, selectedCampaignId, selectedStatus, selectedVerificationStatus]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCampaignId("all");
    setSelectedStatus("all");
    setSelectedVerificationStatus("all");
    // Also clear the input field visually if needed, but controlled input handles it via state
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedCampaignId !== "all") count++;
    if (selectedStatus !== "all") count++;
    if (selectedVerificationStatus !== "all") count++;
    return count;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'verified':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      default:
        return null;
    }
  };

  const getVerificationBadge = (status?: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">✓ Verified</Badge>;
      case 'under_review':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Under Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Pending Review</Badge>;
      case null:
      case undefined:
        return <Badge variant="outline">Not Submitted</Badge>;
      default:
        return <Badge variant="outline">Not Submitted</Badge>;
    }
  };

  // Stats calculation
  const completedCount = allMilestones.filter((m) => m.status === 'completed').length;
  const activeCount = allMilestones.filter((m) => m.status === 'in_progress').length;
  const verifiedCount = allMilestones.filter((m) => m.verificationStatus === 'approved').length;

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
            <p className="text-gray-600">Track and submit proof for your campaign milestones</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Milestones</p>
                  <p className="text-2xl font-bold">{allMilestones.length}</p>
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
                  <p className="text-2xl font-bold">{activeCount}</p>
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
                  <p className="text-2xl font-bold">{completedCount}</p>
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
                  <p className="text-2xl font-bold">{verifiedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <CardTitle>All Milestones</CardTitle>
              
              {/* Filter Bar */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Search Bar */}
                  <div className="flex-1 max-w-lg">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="Search milestones..."
                        onChange={(e) => debouncedSearch(e.target.value)}
                        className="pl-9 w-full"
                      />
                    </div>
                  </div>

                  {/* Filter Controls */}
                  <div className="flex items-center gap-2">
                    {/* Mobile Filter Toggle */}
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      className="lg:hidden"
                    >
                      <SlidersHorizontal className="h-4 w-4 mr-2" />
                      Filters
                      {getActiveFilterCount() > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {getActiveFilterCount()}
                        </Badge>
                      )}
                    </Button>

                    {/* Desktop Filters */}
                    <div className="hidden lg:flex items-center gap-2">
                      {/* Campaign Filter */}
                      <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="All Campaigns" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Campaigns</SelectItem>
                          {campaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Status Filter */}
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Verification Status Filter */}
                      <Select value={selectedVerificationStatus} onValueChange={setSelectedVerificationStatus}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Verification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Verification</SelectItem>
                          <SelectItem value="not_submitted">Not Submitted</SelectItem>
                          <SelectItem value="pending">Pending Review</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Clear Filters */}
                      {getActiveFilterCount() > 0 && (
                        <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear Filters">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile Filters Panel */}
                {showFilters && (
                  <div className="lg:hidden mt-4 pt-4 border-t space-y-4">
                     <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Campaign</label>
                      <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Campaigns" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Campaigns</SelectItem>
                          {campaigns.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Verification</label>
                      <Select value={selectedVerificationStatus} onValueChange={setSelectedVerificationStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Verification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Verification</SelectItem>
                          <SelectItem value="not_submitted">Not Submitted</SelectItem>
                          <SelectItem value="pending">Pending Review</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {getActiveFilterCount() > 0 && (
                      <Button variant="outline" onClick={clearFilters} className="w-full">
                        <X className="h-4 w-4 mr-2" />
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMilestones.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium">No milestones found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
                {getActiveFilterCount() > 0 && (
                   <Button variant="link" onClick={clearFilters} className="mt-2 text-blue-600">
                     Clear filters
                   </Button>
                )}
                {allMilestones.length === 0 && (
                  <div className="mt-4">
                    <Button asChild>
                      <Link to="/charity/campaigns">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Campaign
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Target Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMilestones.map((milestone) => (
                    <TableRow key={milestone.id}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={milestone.campaignTitle}>
                        {milestone.campaignTitle}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-robotobold text-blue-700">{milestone.title}</p>
                          <p className="text-sm text-gray-500 max-w-[300px] truncate" title={milestone.description}>
                            {milestone.description}
                          </p>
                          {milestone.dueDate && (
                             <p className="text-xs text-gray-400 mt-1">
                               Due: {new Date(milestone.dueDate).toLocaleDateString()}
                             </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(milestone.targetAmount)}</TableCell>
                      <TableCell>{getStatusBadge(milestone.status)}</TableCell>
                      <TableCell>{getVerificationBadge(milestone.verificationStatus)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* Logic to show submit button: 
                              1. Not approved
                              2. Not under review (unless we want to allow re-upload? usually no)
                              3. Can be rejected, pending, or null
                              4. Status should ideally be completed or in_progress? Usually one submits proof when completed.
                          */}
                          {(!milestone.verificationStatus || milestone.verificationStatus === 'rejected' || milestone.verificationStatus === 'pending') && milestone.verificationStatus !== 'approved' && milestone.verificationStatus !== 'under_review' && (
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/charity/campaigns/${milestone.campaignId}/milestones/${milestone.id}/submit`}>
                                <Upload className="w-4 h-4 mr-1" />
                                {milestone.verificationStatus === 'rejected' ? 'Resubmit Proof' : 'Submit Proof'}
                              </Link>
                            </Button>
                          )}
                          {milestone.proofSubmittedAt && (
                            <div className="flex flex-col">
                              <p className="text-xs text-muted-foreground">
                                Submitted: {new Date(milestone.proofSubmittedAt).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </CharityLayout>
  );
};

export default CharityMilestones;
