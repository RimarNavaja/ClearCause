
import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Check,
  X,
  Ban,
  AlertTriangle,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Activity,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/components/admin/AdminLayout';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import * as campaignService from '@/services/campaignService';
import { Campaign, CampaignStatus, PaginationParams } from '@/lib/types';
import { formatCurrency, getRelativeTime, debounce } from '@/utils/helpers';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status', color: 'default' },
  { value: 'draft', label: 'Draft', color: 'secondary' },
  { value: 'pending', label: 'Pending Approval', color: 'warning' },
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'paused', label: 'Paused', color: 'warning' },
  { value: 'completed', label: 'Completed', color: 'default' },
  { value: 'cancelled', label: 'Cancelled', color: 'destructive' },
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'education', label: 'Education' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'environment', label: 'Environment' },
  { value: 'poverty', label: 'Poverty & Housing' },
  { value: 'disaster-relief', label: 'Disaster Relief' },
  { value: 'animal-welfare', label: 'Animal Welfare' },
  { value: 'arts-culture', label: 'Arts & Culture' },
  { value: 'human-rights', label: 'Human Rights' },
  { value: 'community', label: 'Community Development' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Created Date' },
  { value: 'title', label: 'Campaign Title' },
  { value: 'goal_amount', label: 'Goal Amount' },
  { value: 'current_amount', label: 'Amount Raised' },
  { value: 'status', label: 'Status' },
];

const CampaignManagement = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [charityFilter, setCharityFilter] = useState('');
  const [minAmountFilter, setMinAmountFilter] = useState('');
  const [maxAmountFilter, setMaxAmountFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'revision' | 'suspend' | 'reactivate' | null;
    campaign: Campaign | null;
  }>({ open: false, type: null, campaign: null });
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  // Debounced search
  const debouncedSearch = debounce((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, 500);

  useEffect(() => {
    debouncedSearch(searchInput);
  }, [searchInput]);

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setLocationFilter('');
    setCharityFilter('');
    setMinAmountFilter('');
    setMaxAmountFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  // Load campaigns
  const loadCampaigns = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const params: PaginationParams = {
        page: currentPage,
        limit: 20,
        sortBy: sortBy,
        sortOrder: sortOrder
      };

      const filters: any = {};

      // Status filter
      if (statusFilter !== 'all') {
        filters.status = [statusFilter];
      }

      // Search query
      if (searchQuery) {
        filters.search = searchQuery;
      }

      // Category filter
      if (categoryFilter !== 'all' && categoryFilter) {
        filters.category = [categoryFilter];
      }

      // Location filter
      if (locationFilter) {
        filters.location = [locationFilter];
      }

      // Amount range filters
      if (minAmountFilter) {
        filters.minGoal = parseFloat(minAmountFilter);
      }
      if (maxAmountFilter) {
        filters.maxGoal = parseFloat(maxAmountFilter);
      }

      // Date range filters
      if (dateFromFilter) {
        filters.dateFrom = dateFromFilter;
      }
      if (dateToFilter) {
        filters.dateTo = dateToFilter;
      }

      // Charity filter (we'll implement this as search in organization name)
      if (charityFilter) {
        const searchTerms = [searchQuery, charityFilter].filter(Boolean);
        filters.search = searchTerms.join(' ');
      }

      const result = await campaignService.listCampaigns(filters, params);

      if (result.success && result.data) {
        setCampaigns(result.data.items);
        setTotalPages(result.data.pagination.totalPages);
        setTotalCampaigns(result.data.pagination.totalItems);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaigns. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    if (!user) return;

    try {
      // Get campaign statistics
      const totalActive = campaigns.filter(c => c.status === 'active').length;
      const totalPending = campaigns.filter(c => c.status === 'pending').length;
      const totalCompleted = campaigns.filter(c => c.status === 'completed').length;
      const totalRaised = campaigns.reduce((sum, c) => sum + c.currentAmount, 0);

      setStats({
        totalCampaigns,
        activeCampaigns: totalActive,
        pendingApproval: totalPending,
        completedCampaigns: totalCompleted,
        totalRaised,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, [
    user,
    currentPage,
    statusFilter,
    searchQuery,
    categoryFilter,
    locationFilter,
    charityFilter,
    minAmountFilter,
    maxAmountFilter,
    dateFromFilter,
    dateToFilter,
    sortBy,
    sortOrder
  ]);

  useEffect(() => {
    loadStats();
  }, [campaigns, totalCampaigns]);

  // Handle campaign actions
  const handleCampaignAction = (campaign: Campaign, action: 'approve' | 'reject' | 'revision' | 'suspend' | 'reactivate') => {
    setActionDialog({
      open: true,
      type: action,
      campaign,
    });
    setActionReason('');
  };

  const executeCampaignAction = async () => {
    if (!actionDialog.campaign || !actionDialog.type || !user) return;

    try {
      setActionLoading(true);
      const campaign = actionDialog.campaign;
      let result;

      switch (actionDialog.type) {
        case 'approve':
          result = await campaignService.approveCampaign(
            campaign.id,
            user.id,
            {
              reason: actionReason || 'Campaign approved by administrator',
              sendNotification: true,
              autoActivate: true,
            }
          );
          break;
        case 'reject':
          if (!actionReason.trim()) {
            toast({
              title: 'Error',
              description: 'Please provide a reason for rejection.',
              variant: 'destructive',
            });
            return;
          }
          result = await campaignService.rejectCampaign(
            campaign.id,
            user.id,
            {
              reason: actionReason,
              allowResubmission: true,
              sendNotification: true,
            }
          );
          break;
        case 'revision':
          if (!actionReason.trim()) {
            toast({
              title: 'Error',
              description: 'Please provide a reason for requesting revision.',
              variant: 'destructive',
            });
            return;
          }
          result = await campaignService.requestCampaignRevision(
            campaign.id,
            user.id,
            {
              reason: actionReason,
              sendNotification: true,
            }
          );
          break;
        case 'suspend':
          result = await campaignService.updateCampaignStatus(
            campaign.id,
            'paused',
            user.id
          );
          break;
        case 'reactivate':
          result = await campaignService.updateCampaignStatus(
            campaign.id,
            'active',
            user.id
          );
          break;
        default:
          return;
      }

      if (result.success) {
        toast({
          title: 'Success',
          description: `Campaign ${actionDialog.type}d successfully.`,
        });
        setActionDialog({ open: false, type: null, campaign: null });
        loadCampaigns(); // Reload campaigns
      }
    } catch (error) {
      console.error('Failed to update campaign:', error);
      toast({
        title: 'Error',
        description: `Failed to ${actionDialog.type} campaign. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const statusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];

    const variants: Record<string, any> = {
      success: 'default',
      warning: 'secondary',
      destructive: 'destructive',
      default: 'outline'
    };

    return (
      <Badge variant={variants[statusConfig.color] || 'outline'}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getActionButtons = (campaign: Campaign) => {
    const buttons = [];

    if (campaign.status === 'draft' || campaign.status === 'pending') {
      buttons.push(
        <DropdownMenuItem
          key="approve"
          onClick={() => handleCampaignAction(campaign, 'approve')}
          className="text-green-600"
        >
          <Check className="mr-2 h-4 w-4" />
          Approve
        </DropdownMenuItem>
      );
      buttons.push(
        <DropdownMenuItem
          key="reject"
          onClick={() => handleCampaignAction(campaign, 'reject')}
          className="text-red-600"
        >
          <X className="mr-2 h-4 w-4" />
          Reject
        </DropdownMenuItem>
      );

      // Add revision option for pending campaigns
      if (campaign.status === 'pending') {
        buttons.push(
          <DropdownMenuItem
            key="revision"
            onClick={() => handleCampaignAction(campaign, 'revision')}
            className="text-blue-600"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Request Revision
          </DropdownMenuItem>
        );
      }
    }

    if (campaign.status === 'active') {
      buttons.push(
        <DropdownMenuItem
          key="suspend"
          onClick={() => handleCampaignAction(campaign, 'suspend')}
          className="text-orange-600"
        >
          <Ban className="mr-2 h-4 w-4" />
          Suspend
        </DropdownMenuItem>
      );
    }

    if (campaign.status === 'paused') {
      buttons.push(
        <DropdownMenuItem
          key="reactivate"
          onClick={() => handleCampaignAction(campaign, 'reactivate')}
          className="text-green-600"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reactivate
        </DropdownMenuItem>
      );
    }

    return buttons;
  };

  return (
    <AdminLayout title="Campaign Management">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Management</h1>
          <p className="text-muted-foreground">Monitor and manage all campaigns on the platform</p>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalCampaigns || 0}</div>
              <p className="text-xs text-muted-foreground">All campaigns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeCampaigns || 0}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingApproval || 0}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats?.totalRaised || 0)}</div>
              <p className="text-xs text-muted-foreground">Across all campaigns</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>Monitor campaign activity and performance</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Basic Filters Row */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search campaigns, charities..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                variant="outline"
              >
                <Filter className="mr-2 h-4 w-4" />
                Advanced
              </Button>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border rounded-lg p-4 mb-4 bg-muted/20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="charity-filter">Charity Organization</Label>
                    <Input
                      id="charity-filter"
                      placeholder="Filter by charity name..."
                      value={charityFilter}
                      onChange={(e) => setCharityFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location-filter">Location</Label>
                    <Input
                      id="location-filter"
                      placeholder="Filter by location..."
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sort-by">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="min-amount">Min Goal Amount ($)</Label>
                    <Input
                      id="min-amount"
                      type="number"
                      placeholder="0"
                      value={minAmountFilter}
                      onChange={(e) => setMinAmountFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-amount">Max Goal Amount ($)</Label>
                    <Input
                      id="max-amount"
                      type="number"
                      placeholder="1000000"
                      value={maxAmountFilter}
                      onChange={(e) => setMaxAmountFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sort-order">Sort Order</Label>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Descending</SelectItem>
                        <SelectItem value="asc">Ascending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date-from">Created From</Label>
                    <Input
                      id="date-from"
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date-to">Created Until</Label>
                    <Input
                      id="date-to"
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button onClick={clearFilters} variant="outline">
                    Clear All Filters
                  </Button>
                  <Button onClick={loadCampaigns} variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            )}

            {/* Campaigns Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading campaigns...</p>
                </div>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No campaigns found.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Charity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {campaign.imageUrl && (
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={campaign.imageUrl} alt={campaign.title} />
                                <AvatarFallback>{campaign.title.charAt(0)}</AvatarFallback>
                              </Avatar>
                            )}
                            <div>
                              <div className="font-medium">{campaign.title}</div>
                              <div className="text-sm text-muted-foreground">
                                Goal: {formatCurrency(campaign.goalAmount)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {campaign.charity?.organizationName || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(campaign.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatCurrency(campaign.currentAmount)} / {formatCurrency(campaign.goalAmount)}
                            <div className="text-xs text-muted-foreground">
                              {campaign.progress?.toFixed(1)}% funded
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {getRelativeTime(campaign.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedCampaign(campaign)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {getActionButtons(campaign)}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Showing {campaigns.length} of {totalCampaigns} campaigns
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setActionDialog({ open: false, type: null, campaign: null });
          setActionReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Approve Campaign'}
              {actionDialog.type === 'reject' && 'Reject Campaign'}
              {actionDialog.type === 'revision' && 'Request Campaign Revision'}
              {actionDialog.type === 'suspend' && 'Suspend Campaign'}
              {actionDialog.type === 'reactivate' && 'Reactivate Campaign'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' && 'This will make the campaign active and visible to donors.'}
              {actionDialog.type === 'reject' && 'This will cancel the campaign and it cannot be reactivated.'}
              {actionDialog.type === 'revision' && 'This will send the campaign back to draft status for the charity to make revisions.'}
              {actionDialog.type === 'suspend' && 'This will pause the campaign and hide it from donors temporarily.'}
              {actionDialog.type === 'reactivate' && 'This will make the campaign active again and visible to donors.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter a reason for this action..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, type: null, campaign: null })}>
              Cancel
            </Button>
            <Button
              onClick={executeCampaignAction}
              disabled={actionLoading}
              variant={actionDialog.type === 'reject' || actionDialog.type === 'suspend' ? 'destructive' : 'default'}
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default CampaignManagement;
