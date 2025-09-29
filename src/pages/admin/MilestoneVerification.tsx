
import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  AlertCircle,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import {
  approveMilestoneProof,
  rejectMilestoneProof,
  getMilestoneProofsForVerification,
  getMilestoneProofStats
} from '@/services/adminService';
import { toast } from 'sonner';

interface MilestoneProof {
  id: string;
  campaignTitle: string;
  milestoneNumber: number;
  milestoneTitle: string;
  charityName: string;
  submissionDate: string;
  status: 'pending' | 'under_review' | 'approved' | 'needs_revision';
  amount: string;
  proofType: string;
  description: string;
  files: Array<{
    name: string;
    type: 'document' | 'image' | 'video';
    size: string;
    url?: string;
  }>;
}

interface StatsData {
  pending: number;
  underReview: number;
  approved: number;
  needsRevision: number;
  totalApprovedAmount?: number;
}

const MilestoneVerification = () => {
  const { user } = useAuth();
  const [selectedProof, setSelectedProof] = useState<MilestoneProof | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  // Data state
  const [proofSubmissions, setProofSubmissions] = useState<MilestoneProof[]>([]);
  const [stats, setStats] = useState<StatsData>({
    pending: 0,
    underReview: 0,
    approved: 0,
    needsRevision: 0,
    totalApprovedAmount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // Load proof submissions
  const loadProofSubmissions = async (refresh = false) => {
    if (!user?.id) return;

    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      const filters = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm || undefined,
      };

      const result = await getMilestoneProofsForVerification(
        filters,
        { page: currentPage, limit: itemsPerPage },
        user.id
      );

      if (result.success && result.data) {
        setProofSubmissions(result.data);
        setTotalPages(Math.ceil(result.total / itemsPerPage));
      } else {
        console.error('Failed to load proof submissions:', result.error);
        toast.error('Failed to load proof submissions');
      }
    } catch (error) {
      console.error('Error loading proof submissions:', error);
      toast.error('Failed to load proof submissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    if (!user?.id) return;

    try {
      const result = await getMilestoneProofStats(user.id);
      if (result.success && result.data) {
        setStats({
          pending: result.data.pending || 0,
          underReview: result.data.under_review || 0,
          approved: result.data.approved_today || 0,
          needsRevision: result.data.needs_revision || 0,
          totalApprovedAmount: result.data.total_approved_amount || 0
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Initial data load
  useEffect(() => {
    loadProofSubmissions();
    loadStats();
  }, [user?.id]);

  // Reload data when filters change
  useEffect(() => {
    if (user?.id) {
      loadProofSubmissions();
    }
  }, [currentPage, statusFilter, searchTerm]);

  // Refresh function
  const handleRefresh = () => {
    loadProofSubmissions(true);
    loadStats();
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800", icon: Clock },
      under_review: { variant: "default" as const, color: "bg-blue-100 text-blue-800", icon: Eye },
      approved: { variant: "default" as const, color: "bg-green-100 text-green-800", icon: CheckCircle },
      needs_revision: { variant: "destructive" as const, color: "bg-red-100 text-red-800", icon: AlertCircle }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleApprove = async (proofId: string) => {
    if (!user?.id) return;

    try {
      const notes = verificationNotes || null;
      const result = await approveMilestoneProof(proofId, notes, user.id);
      if (result.success) {
        toast.success('Milestone proof approved successfully');
        setVerificationNotes('');
        // Refresh data to reflect changes
        loadProofSubmissions(true);
        loadStats();
      } else {
        toast.error(result.error || 'Failed to approve proof');
      }
    } catch (error) {
      console.error('Error approving proof:', error);
      toast.error('Failed to approve proof');
    }
  };

  const handleReject = async (proofId: string, reason?: string) => {
    if (!user?.id) return;

    // Use provided reason or verification notes or prompt for one
    const rejectionReason = reason || verificationNotes || prompt('Please provide a reason for rejection:');
    if (!rejectionReason) return;

    try {
      const notes = verificationNotes || null;
      const result = await rejectMilestoneProof(proofId, rejectionReason, notes, user.id);
      if (result.success) {
        toast.success('Milestone proof rejected');
        setVerificationNotes('');
        // Refresh data to reflect changes
        loadProofSubmissions(true);
        loadStats();
      } else {
        toast.error(result.error || 'Failed to reject proof');
      }
    } catch (error) {
      console.error('Error rejecting proof:', error);
      toast.error('Failed to reject proof');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Milestone Verification</h1>
          <p className="text-muted-foreground">
            Review and verify milestone proof submissions for fund disbursement
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="needs_revision">Needs Revision</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.underReview}</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalApprovedAmount
                ? `₱${stats.totalApprovedAmount.toLocaleString()} released`
                : 'Recently approved'
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Revision</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.needsRevision}</div>
            <p className="text-xs text-muted-foreground">Require updates</p>
          </CardContent>
        </Card>
      </div>

      {/* Proof Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Proof Submissions</CardTitle>
          <CardDescription>Review milestone proof submissions and approve fund releases</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !refreshing ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-clearcause-primary" />
                <p className="text-muted-foreground">Loading proof submissions...</p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
                <TabsTrigger value="under_review">Under Review ({stats.underReview})</TabsTrigger>
                <TabsTrigger value="needs_revision">Needs Revision ({stats.needsRevision})</TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4">
                {proofSubmissions.filter(p => p.status === 'pending').length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No pending proof submissions</p>
                  </div>
                ) : (
                  proofSubmissions.filter(p => p.status === 'pending').map((proof) => (
                    <Card key={proof.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{proof.campaignTitle}</h3>
                          {getStatusBadge(proof.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Milestone {proof.milestoneNumber}:</span> {proof.milestoneTitle}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Organization:</span> {proof.charityName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Amount:</span> {proof.amount}
                        </p>
                        <p className="text-sm">{proof.description}</p>
                        
                        {/* Files */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Attached Files:</h4>
                          <div className="grid gap-2 md:grid-cols-2">
                            {proof.files.map((file, index) => (
                              <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                                {getFileIcon(file.type)}
                                <span className="text-sm flex-1">{file.name}</span>
                                <span className="text-xs text-muted-foreground">{file.size}</span>
                                <Button size="sm" variant="ghost">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" onClick={() => setSelectedProof(proof)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Review Milestone Proof</DialogTitle>
                              <DialogDescription>
                                Carefully review the submitted proof materials before making a decision.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium">Campaign: {proof.campaignTitle}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Milestone {proof.milestoneNumber}: {proof.milestoneTitle}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Release Amount: {proof.amount}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Verification Notes</h4>
                                <Textarea
                                  placeholder="Add your verification notes here..."
                                  value={verificationNotes}
                                  onChange={(e) => setVerificationNotes(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter className="space-x-2">
                              <Button variant="outline" onClick={() => handleReject(proof.id)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                              <Button onClick={() => handleApprove(proof.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve & Release Funds
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="under_review" className="space-y-4">
                {proofSubmissions.filter(p => p.status === 'under_review').length === 0 ? (
                  <div className="text-center py-8">
                    <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No proofs under review</p>
                  </div>
                ) : (
                  proofSubmissions.filter(p => p.status === 'under_review').map((proof) => (
                    <Card key={proof.id} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{proof.campaignTitle}</h3>
                              {getStatusBadge(proof.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Milestone {proof.milestoneNumber}:</span> {proof.milestoneTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Organization:</span> {proof.charityName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Amount:</span> {proof.amount}
                            </p>
                            <p className="text-sm">{proof.description}</p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" onClick={() => setSelectedProof(proof)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Review Milestone Proof</DialogTitle>
                                  <DialogDescription>
                                    Continue reviewing this milestone proof submission.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium">Campaign: {proof.campaignTitle}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Milestone {proof.milestoneNumber}: {proof.milestoneTitle}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Release Amount: {proof.amount}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">Verification Notes</h4>
                                    <Textarea
                                      placeholder="Add your verification notes here..."
                                      value={verificationNotes}
                                      onChange={(e) => setVerificationNotes(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <DialogFooter className="space-x-2">
                                  <Button variant="outline" onClick={() => handleReject(proof.id)}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                  <Button onClick={() => handleApprove(proof.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve & Release Funds
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="needs_revision" className="space-y-4">
                {proofSubmissions.filter(p => p.status === 'needs_revision').length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No proofs requiring revision</p>
                  </div>
                ) : (
                  proofSubmissions.filter(p => p.status === 'needs_revision').map((proof) => (
                    <Card key={proof.id} className="border-l-4 border-l-red-500">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{proof.campaignTitle}</h3>
                              {getStatusBadge(proof.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Milestone {proof.milestoneNumber}:</span> {proof.milestoneTitle}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Organization:</span> {proof.charityName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Amount:</span> {proof.amount}
                            </p>
                            <p className="text-sm">{proof.description}</p>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" onClick={() => setSelectedProof(proof)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Review Again
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Re-review Milestone Proof</DialogTitle>
                                  <DialogDescription>
                                    This proof was previously rejected and needs revision. Review the updated submission.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium">Campaign: {proof.campaignTitle}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Milestone {proof.milestoneNumber}: {proof.milestoneTitle}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      Release Amount: {proof.amount}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="font-medium mb-2">Verification Notes</h4>
                                    <Textarea
                                      placeholder="Add your verification notes here..."
                                      value={verificationNotes}
                                      onChange={(e) => setVerificationNotes(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <DialogFooter className="space-x-2">
                                  <Button variant="outline" onClick={() => handleReject(proof.id)}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject Again
                                  </Button>
                                  <Button onClick={() => handleApprove(proof.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve & Release Funds
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MilestoneVerification;
