import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, MessageSquare, Plus, Trash2, Search, Filter, MoreHorizontal, AlertCircle, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CharityLayout from '@/components/layout/CharityLayout';
import CampaignGrid from '@/components/ui/campaign/CampaignGrid';
import { useAuth } from '@/hooks/useAuth';
import { useRealtime } from '@/hooks/useRealtime';
import * as campaignService from '@/services/campaignService';
import { Campaign, CampaignStatus } from '@/lib/types';
import { formatCurrency, getRelativeTime, debounce, calculateDaysLeft } from '@/utils/helpers';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Campaigns' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'expired', label: 'Expired' },
];

const ManageCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<any>(null);

  const { user } = useAuth();
  const { subscribe } = useRealtime();

  // Debounced search
  const debouncedSearch = debounce((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, 500);

  // Load campaigns
  const loadCampaigns = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const filters = {
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page: currentPage,
        limit: 12,
      };

      const result = await campaignService.getCharityCampaigns(user.id, filters);

      if (result.success && result.data) {
        setCampaigns(result.data.campaigns);
        setTotalPages(result.data.pagination.totalPages);
        setStats(result.data.stats);
      } else {
        setError(result.error || 'Failed to load campaigns');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Campaign loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const unsubscribeFn = subscribe('campaigns', (payload) => {
      if (payload.new.charity_id === user.id) {
        // Update campaign in list
        setCampaigns(prev => {
          const existingIndex = prev.findIndex(c => c.id === payload.new.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...payload.new };
            return updated;
          }
          return prev;
        });
      }
    });

    return unsubscribeFn;
  }, [user, subscribe]);

  // Load campaigns when filters change
  useEffect(() => {
    loadCampaigns();
  }, [user, searchQuery, statusFilter, currentPage]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  // Handle campaign deletion
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await campaignService.deleteCampaign(campaignId);
      if (result.success) {
        setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      } else {
        alert('Failed to delete campaign: ' + result.error);
      }
    } catch (err) {
      alert('An error occurred while deleting the campaign');
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: CampaignStatus) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'paused': return 'outline';
      case 'draft': return 'outline';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  // Campaign action menu
  const CampaignActionMenu = ({ campaign }: { campaign: Campaign }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/campaigns/${campaign.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View Public Page
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/charity/campaigns/edit/${campaign.id}`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Campaign
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/charity/campaigns/${campaign.id}/milestones`}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Manage Milestones
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={`/charity/campaigns/${campaign.id}/updates`}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Post Update
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600"
          onClick={() => handleDeleteCampaign(campaign.id)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Campaign
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Campaign table row
  const CampaignTableRow = ({ campaign }: { campaign: Campaign }) => {
    const progress = (campaign.amountRaised / campaign.goalAmount) * 100;
    const daysLeft = calculateDaysLeft(campaign.endDate);
    
    return (
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <h3 className="font-medium text-gray-900">{campaign.title}</h3>
            <p className="text-sm text-gray-500">
              Created {getRelativeTime(campaign.createdAt)}
            </p>
          </div>
          
          <div>
            <Badge variant={getStatusBadgeVariant(campaign.status)}>
              {campaign.status}
            </Badge>
            {daysLeft > 0 && campaign.status === 'active' && (
              <p className="text-xs text-gray-500 mt-1">
                {daysLeft} days left
              </p>
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium">
              {formatCurrency(campaign.amountRaised)}
            </p>
            <p className="text-xs text-gray-500">
              of {formatCurrency(campaign.goalAmount)} ({progress.toFixed(1)}%)
            </p>
            <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
              <div 
                className="bg-blue-600 h-1 rounded-full" 
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-end">
            <CampaignActionMenu campaign={campaign} />
          </div>
        </div>
      </div>
    );
  };

  if (loading && campaigns.length === 0) {
    return (
      <CharityLayout title="Manage Campaigns">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
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
        </div>
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title="Manage Campaigns">
      <div className="space-y-6">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Campaigns</h1>
            <p className="text-gray-600">Create and manage your fundraising campaigns</p>
          </div>
          <Button asChild>
            <Link to="/charity/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Campaigns</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active</p>
                    <p className="text-2xl font-bold">{stats.active}</p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="h-3 w-3 bg-green-600 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Raised</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalRaised)}</p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm font-bold">₱</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Avg. Success Rate</p>
                    <p className="text-2xl font-bold">{stats.successRate}%</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search campaigns..."
              value={searchInput}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'table')}>
            <TabsList>
              <TabsTrigger value="grid">Grid</TabsTrigger>
              <TabsTrigger value="table">List</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-medium text-red-800">Error loading campaigns</h3>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadCampaigns}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign Display */}
        {viewMode === 'grid' ? (
          <CampaignGrid 
            campaigns={campaigns}
            loading={loading}
            error={error}
            showRealTimeUpdates={true}
            compact={false}
          />
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <CampaignTableRow key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && campaigns.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No campaigns found</h3>
              <p className="mt-2 text-gray-500">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating your first campaign.'
                }
              </p>
              {(!searchQuery && statusFilter === 'all') && (
                <Button className="mt-4" asChild>
                  <Link to="/charity/campaigns/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Campaign
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
            >
              Previous
            </Button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    onClick={() => setCurrentPage(page)}
                    className="w-10 h-10 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </CharityLayout>
  );
};

export default ManageCampaigns;