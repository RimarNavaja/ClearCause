
import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  History,
  TrendingUp,
  XCircle,
  Eye,
  Building,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  getApprovedMilestonesForFundRelease,
  initiateFundRelease,
  updateFundReleaseStatus,
  getFundReleaseStats,
  getFundReleaseHistory
} from '@/services/adminService';

interface FundReleaseItem {
  id: string;
  milestoneId: string;
  proofUrl: string;
  description: string;
  submittedAt: string;
  verifiedAt: string;
  verificationNotes: string;
  verifiedBy: string;
  milestone: {
    id: string;
    title: string;
    description: string;
    targetAmount: number;
    campaign: {
      id: string;
      title: string;
      charity: {
        id: string;
        organizationName: string;
        bankAccountName?: string;
        bankAccountNumber?: string;
        bankName?: string;
        bankBranch?: string;
        userId: string;
        contactName: string;
        contactEmail: string;
      };
    };
  };
  fundRelease?: {
    id: string;
    status: string;
    amount: number;
    releasedAt?: string;
    processingFee?: number;
    transactionReference?: string;
  } | null;
}

interface StatsData {
  totalReleases: number;
  pendingReleases: number;
  processingReleases: number;
  completedReleases: number;
  failedReleases: number;
  totalAmountReleased: number;
  totalProcessingFees: number;
  totalNetAmount: number;
}

const FundReleaseManagement = () => {
  const { user } = useAuth();

  // Data state
  const [releases, setReleases] = useState<FundReleaseItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalReleases: 0,
    pendingReleases: 0,
    processingReleases: 0,
    completedReleases: 0,
    failedReleases: 0,
    totalAmountReleased: 0,
    totalProcessingFees: 0,
    totalNetAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Dialog state
  const [selectedRelease, setSelectedRelease] = useState<FundReleaseItem | null>(null);
  const [releaseAmount, setReleaseAmount] = useState<string>('');
  const [processingFee, setProcessingFee] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [dialogLoading, setDialogLoading] = useState(false);

  // Load fund releases ready for release
  const loadFundReleases = async (refresh = false) => {
    if (!user?.id) return;

    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const filters = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm || undefined,
      };

      const result = await getApprovedMilestonesForFundRelease(
        filters,
        { page: currentPage, limit: itemsPerPage },
        user.id
      );

      if (result.success && result.data) {
        setReleases(result.data);
        setTotalPages(Math.ceil(result.total / itemsPerPage));
      } else {
        console.error('Failed to load fund releases:', result.error);
        toast.error('Failed to load fund releases');
      }
    } catch (error) {
      console.error('Error loading fund releases:', error);
      toast.error('Failed to load fund releases');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    if (!user?.id) return;

    try {
      const result = await getFundReleaseStats(user.id);
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Initial data load
  useEffect(() => {
    loadFundReleases();
    loadStats();
  }, [user?.id]);

  // Reload data when filters change
  useEffect(() => {
    if (user?.id) {
      loadFundReleases();
    }
  }, [currentPage, statusFilter, searchTerm]);

  // Refresh function
  const handleRefresh = () => {
    loadFundReleases(true);
    loadStats();
  };

  // Open release dialog
  const openReleaseDialog = (release: FundReleaseItem) => {
    setSelectedRelease(release);
    setReleaseAmount(release.milestone.targetAmount.toString());
    setProcessingFee('0');
    setAdminNotes('');
  };

  // Handle fund release initiation
  const handleInitiateRelease = async () => {
    if (!selectedRelease || !user?.id) return;

    try {
      setDialogLoading(true);

      const amount = parseFloat(releaseAmount);
      const fee = parseFloat(processingFee);

      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid release amount');
        return;
      }

      if (isNaN(fee) || fee < 0) {
        toast.error('Please enter a valid processing fee');
        return;
      }

      const result = await initiateFundRelease(
        selectedRelease.id,
        amount,
        fee,
        adminNotes || null,
        user.id
      );

      if (result.success) {
        toast.success('Fund release initiated successfully');
        setSelectedRelease(null);
        loadFundReleases(true);
        loadStats();
      } else {
        toast.error(result.error || 'Failed to initiate fund release');
      }
    } catch (error) {
      console.error('Error initiating fund release:', error);
      toast.error('Failed to initiate fund release');
    } finally {
      setDialogLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending_release: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800", icon: Clock },
      processing: { variant: "default" as const, color: "bg-blue-100 text-blue-800", icon: RefreshCw },
      completed: { variant: "default" as const, color: "bg-green-100 text-green-800", icon: CheckCircle },
      failed: { variant: "destructive" as const, color: "bg-red-100 text-red-800", icon: AlertTriangle }
    };

    const config = variants[status as keyof typeof variants] || variants.pending_release;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant} className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getReleaseStatus = (release: FundReleaseItem) => {
    if (!release.fundRelease) return 'pending_release';
    return release.fundRelease.status;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fund Release Management</h1>
          <p className="text-muted-foreground">
            Authorize and track approved fund releases to verified organizations
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns or organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_release">Pending Release</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Release</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReleases}</div>
            <p className="text-xs text-muted-foreground">Awaiting authorization</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingReleases}</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedReleases}</div>
            <p className="text-xs text-muted-foreground">
              ₱{stats.totalAmountReleased.toLocaleString()} released
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedReleases}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Fund Releases */}
      <Card>
        <CardHeader>
          <CardTitle>Fund Releases</CardTitle>
          <CardDescription>Approved milestones ready for fund release authorization</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !refreshing ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-clearcause-primary" />
                <p className="text-muted-foreground">Loading fund releases...</p>
              </div>
            </div>
          ) : releases.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No fund releases found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {releases.map((release) => (
                <Card key={release.id} className="border-l-4 border-l-green-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{release.milestone.campaign.title}</h3>
                          {getStatusBadge(getReleaseStatus(release))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Milestone:</span> {release.milestone.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Organization:</span> {release.milestone.campaign.charity.organizationName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Amount:</span> ₱{release.milestone.targetAmount.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Verified:</span> {new Date(release.verifiedAt).toLocaleDateString()}
                        </p>

                        {/* Bank Details */}
                        {release.milestone.campaign.charity.bankName && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Building className="h-4 w-4" />
                            <span>
                              {release.milestone.campaign.charity.bankName} -
                              ****{release.milestone.campaign.charity.bankAccountNumber?.slice(-4)}
                            </span>
                          </div>
                        )}

                        {/* Fund Release Info */}
                        {release.fundRelease && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                            <p><span className="font-medium">Transaction Ref:</span> {release.fundRelease.transactionReference}</p>
                            {release.fundRelease.processingFee && (
                              <p><span className="font-medium">Processing Fee:</span> ₱{release.fundRelease.processingFee.toLocaleString()}</p>
                            )}
                            {release.fundRelease.releasedAt && (
                              <p><span className="font-medium">Released:</span> {new Date(release.fundRelease.releasedAt).toLocaleDateString()}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2 ml-4">
                        {!release.fundRelease && (
                          <Button
                            onClick={() => openReleaseDialog(release)}
                            className="bg-clearcause-primary hover:bg-clearcause-secondary"
                          >
                            <DollarSign className="h-4 w-4 mr-2" />
                            Authorize Release
                          </Button>
                        )}
                        {release.fundRelease?.status === 'processing' && (
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Update Status
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Release Authorization Dialog */}
      <Dialog open={selectedRelease !== null} onOpenChange={() => setSelectedRelease(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Authorize Fund Release</DialogTitle>
            <DialogDescription>
              Review and authorize the fund release for this approved milestone.
            </DialogDescription>
          </DialogHeader>
          {selectedRelease && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Campaign</Label>
                  <p className="text-sm">{selectedRelease.milestone.campaign.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Milestone</Label>
                  <p className="text-sm">{selectedRelease.milestone.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Organization</Label>
                  <p className="text-sm">{selectedRelease.milestone.campaign.charity.organizationName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Target Amount</Label>
                  <p className="text-sm">₱{selectedRelease.milestone.targetAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* Bank Details */}
              {selectedRelease.milestone.campaign.charity.bankName && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <Label className="text-sm font-medium">Bank Account Details</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Bank:</span> {selectedRelease.milestone.campaign.charity.bankName}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Account:</span> ****{selectedRelease.milestone.campaign.charity.bankAccountNumber?.slice(-4)}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Account Name:</span> {selectedRelease.milestone.campaign.charity.bankAccountName}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="releaseAmount">Release Amount (₱)</Label>
                  <Input
                    id="releaseAmount"
                    type="number"
                    value={releaseAmount}
                    onChange={(e) => setReleaseAmount(e.target.value)}
                    placeholder="Enter amount to release"
                  />
                </div>
                <div>
                  <Label htmlFor="processingFee">Processing Fee (₱)</Label>
                  <Input
                    id="processingFee"
                    type="number"
                    value={processingFee}
                    onChange={(e) => setProcessingFee(e.target.value)}
                    placeholder="Enter processing fee"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
                <Textarea
                  id="adminNotes"
                  placeholder="Add any notes about this fund release..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>

              {/* Net Amount Display */}
              {releaseAmount && processingFee && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <Label className="text-sm font-medium">Net Amount to Transfer</Label>
                  <p className="text-lg font-bold text-green-600">
                    ₱{(parseFloat(releaseAmount) - parseFloat(processingFee)).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRelease(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleInitiateRelease}
              disabled={dialogLoading}
              className="bg-clearcause-primary hover:bg-clearcause-secondary"
            >
              {dialogLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4 mr-2" />
              )}
              {dialogLoading ? 'Initiating...' : 'Authorize Release'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FundReleaseManagement;
