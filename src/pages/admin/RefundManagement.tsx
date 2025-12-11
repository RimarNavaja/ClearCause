/**
 * Refund Management - Admin Dashboard
 * Allows admins to monitor and manage all refund requests
 */

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useToast } from '@/hooks/use-toast';
import { getRefundRequests, getRefundStats, processRefundRequest } from '@/services/refundService';
import { MilestoneRefundRequest, RefundRequestStatus } from '@/lib/types';

interface RefundStats {
  totalRequests: number;
  pendingDecisions: number;
  processingCount: number;
  completedCount: number;
  totalAmount: number;
  pendingAmount: number;
  processedAmount: number;
}

export default function RefundManagement() {
  const { toast } = useToast();

  const [requests, setRequests] = useState<MilestoneRefundRequest[]>([]);
  const [stats, setStats] = useState<RefundStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load refund requests
      const requestsResult = await getRefundRequests(
        statusFilter === 'all' ? undefined : (statusFilter as RefundRequestStatus)
      );

      if (requestsResult.success && requestsResult.data) {
        setRequests(requestsResult.data);
      } else {
        throw new Error(requestsResult.error || 'Failed to load refund requests');
      }

      // Load stats
      const statsResult = await getRefundStats();
      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (err: any) {
      console.error('Error loading refund data:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (requestId: string) => {
    if (!confirm('Manually process all pending decisions for this refund request?')) {
      return;
    }

    setProcessingId(requestId);

    try {
      const result = await processRefundRequest(requestId);

      if (result.success) {
        toast({
          title: 'Success',
          description: `Processed ${result.data?.processed || 0} decisions successfully`,
        });
        await loadData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to process refund request',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error processing request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process refund request',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const toggleRowExpansion = (requestId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(requestId)) {
      newExpanded.delete(requestId);
    } else {
      newExpanded.add(requestId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (status: RefundRequestStatus) => {
    switch (status) {
      case 'pending_decisions':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-green-500 text-green-700">Completed</Badge>;
      case 'partially_completed':
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDecisionTypeBadge = (type: string) => {
    switch (type) {
      case 'refund':
        return <Badge variant="secondary">Refund</Badge>;
      case 'redirect_to_campaign':
        return <Badge variant="secondary">Redirect</Badge>;
      case 'donate_to_platform':
        return <Badge variant="secondary">Platform</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const filteredRequests = requests.filter((request) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        request.milestone?.title?.toLowerCase().includes(query) ||
        request.campaign?.title?.toLowerCase().includes(query) ||
        request.id.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading && !stats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Refund Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage milestone refund requests
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats.totalRequests}</div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Decisions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-yellow-600">
                  {stats.pendingDecisions}
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                ₱{stats.pendingAmount.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-blue-600">
                  {stats.processingCount}
                </div>
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-green-600">
                  {stats.completedCount}
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                ₱{stats.processedAmount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by campaign, milestone, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending_decisions">Pending Decisions</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partially_completed">Partially Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Refresh Button */}
            <Button onClick={loadData} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Refund Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Refund Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No refund requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Campaign / Milestone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Affected Donors</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <>
                    <TableRow key={request.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={() => toggleRowExpansion(request.id)}>
                        {expandedRows.has(request.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell onClick={() => toggleRowExpansion(request.id)}>
                        <div>
                          <div className="font-medium">
                            {request.campaign?.title || 'Unknown Campaign'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {request.milestone?.title || 'Unknown Milestone'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{request.affectedDonorsCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ₱{request.totalRefundAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === 'pending_decisions' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessRequest(request.id)}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              'Process Now'
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row - Decision Details */}
                    {expandedRows.has(request.id) && request.decisions && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="py-4 px-6">
                            <h4 className="font-semibold mb-3">Individual Decisions</h4>
                            <div className="space-y-2">
                              {request.decisions.map((decision: any) => (
                                <div
                                  key={decision.id}
                                  className="flex items-center justify-between bg-background rounded-lg p-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <div className="text-sm font-medium">
                                        Donor: {decision.donor?.full_name || 'Anonymous'}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        ₱{decision.refundAmount.toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {decision.decisionType && getDecisionTypeBadge(decision.decisionType)}
                                    {decision.status === 'completed' ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : decision.status === 'failed' ? (
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    ) : (
                                      <Clock className="h-4 w-4 text-yellow-600" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Rejection Reason */}
                            {request.rejectionReason && (
                              <Alert className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  <strong>Rejection Reason:</strong> {request.rejectionReason}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
