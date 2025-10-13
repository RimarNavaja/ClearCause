
import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { getMilestoneProofsForVerification, getMilestoneProofStats } from '@/services/adminService';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/helpers';

const VerificationQueue = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingReview: 0,
    underReview: 0,
    approvedToday: 0,
    totalAmountApproved: 0,
    avgReviewTime: 0
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        const [proofsResult, statsResult] = await Promise.all([
          getMilestoneProofsForVerification({}, { page: 1, limit: 50 }, user.id),
          getMilestoneProofStats(user.id)
        ]);

        if (proofsResult.success && proofsResult.data) {
          setVerifications(proofsResult.data);
        }

        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data);
        }
      } catch (error) {
        console.error('Error loading verifications:', error);
        toast.error('Failed to load verification queue');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800", icon: Clock },
      under_review: { variant: "default" as const, color: "bg-blue-100 text-blue-800", icon: Eye },
      needs_revision: { variant: "destructive" as const, color: "bg-red-100 text-red-800", icon: AlertTriangle }
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

  const getPriorityBadge = (priority: string) => {
    const colors = {
      urgent: "bg-red-50 text-red-700 border-red-200",
      high: "bg-orange-50 text-orange-700 border-orange-200",
      medium: "bg-blue-50 text-blue-700 border-blue-200",
      low: "bg-gray-50 text-gray-700 border-gray-200"
    };
    
    return (
      <Badge variant="outline" className={colors[priority as keyof typeof colors]}>
        {priority}
      </Badge>
    );
  };

  return (
    <AdminLayout title="Milestone Verification Queue">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Milestone Verification Queue</h1>
          <p className="text-muted-foreground">
            Review milestone proof submissions and approve fund releases
          </p>
        </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.pendingReview}</div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.underReview}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.approvedToday}</div>
                <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalAmountApproved)} released</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Review Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.avgReviewTime}h</div>
                <p className="text-xs text-muted-foreground">Average time</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Queue</CardTitle>
          <CardDescription>Milestone proof submissions awaiting review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns or charities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>

          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Pending ({verifications.filter(v => v.status === 'pending').length})
              </TabsTrigger>
              <TabsTrigger value="under_review">
                Under Review ({verifications.filter(v => v.status === 'under_review').length})
              </TabsTrigger>
              <TabsTrigger value="needs_revision">
                Needs Revision ({verifications.filter(v => v.status === 'needs_revision').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse border rounded-lg p-6">
                      <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  ))}
                </div>
              ) : verifications.filter(v => v.status === 'pending').length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending verifications</p>
                  <p className="text-sm">All milestone proofs have been reviewed</p>
                </div>
              ) : (
                verifications
                  .filter(v => v.status === 'pending')
                  .map((verification) => (
                    <Card key={verification.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{verification.campaign?.title || 'Unknown Campaign'}</h3>
                              {getStatusBadge(verification.status)}
                              {verification.priority && getPriorityBadge(verification.priority)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Milestone {verification.milestone?.milestone_number || 'N/A'}:</span> {verification.milestone?.title || 'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Organization:</span> {verification.campaign?.charity?.organization_name || 'Unknown'}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span><span className="font-medium">Amount:</span> {verification.milestone?.target_amount ? formatCurrency(verification.milestone.target_amount) : 'N/A'}</span>
                              <span><span className="font-medium">Submitted:</span> {verification.submitted_at ? new Date(verification.submitted_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>

                          <div className="flex space-x-2 ml-4">
                            <Button variant="outline" asChild>
                              <Link to={`/admin/verifications/${verification.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Review
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </TabsContent>

            <TabsContent value="under_review" className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse border rounded-lg p-6">
                      <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  ))}
                </div>
              ) : verifications.filter(v => v.status === 'under_review').length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No verifications under review</p>
                  <p className="text-sm">Start reviewing pending submissions</p>
                </div>
              ) : (
                verifications
                  .filter(v => v.status === 'under_review')
                  .map((verification) => (
                    <Card key={verification.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{verification.campaign?.title || 'Unknown Campaign'}</h3>
                              {getStatusBadge(verification.status)}
                              {verification.priority && getPriorityBadge(verification.priority)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Milestone {verification.milestone?.milestone_number || 'N/A'}:</span> {verification.milestone?.title || 'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Organization:</span> {verification.campaign?.charity?.organization_name || 'Unknown'}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span><span className="font-medium">Amount:</span> {verification.milestone?.target_amount ? formatCurrency(verification.milestone.target_amount) : 'N/A'}</span>
                              <span><span className="font-medium">Submitted:</span> {verification.submitted_at ? new Date(verification.submitted_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>

                          <div className="flex space-x-2 ml-4">
                            <Button variant="outline" asChild>
                              <Link to={`/admin/verifications/${verification.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Review
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </TabsContent>

            <TabsContent value="needs_revision" className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse border rounded-lg p-6">
                      <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  ))}
                </div>
              ) : verifications.filter(v => v.status === 'needs_revision').length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No verifications need revision</p>
                  <p className="text-sm">All submissions are in good standing</p>
                </div>
              ) : (
                verifications
                  .filter(v => v.status === 'needs_revision')
                  .map((verification) => (
                    <Card key={verification.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{verification.campaign?.title || 'Unknown Campaign'}</h3>
                              {getStatusBadge(verification.status)}
                              {verification.priority && getPriorityBadge(verification.priority)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Milestone {verification.milestone?.milestone_number || 'N/A'}:</span> {verification.milestone?.title || 'N/A'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium">Organization:</span> {verification.campaign?.charity?.organization_name || 'Unknown'}
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <span><span className="font-medium">Amount:</span> {verification.milestone?.target_amount ? formatCurrency(verification.milestone.target_amount) : 'N/A'}</span>
                              <span><span className="font-medium">Submitted:</span> {verification.submitted_at ? new Date(verification.submitted_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>

                          <div className="flex space-x-2 ml-4">
                            <Button variant="outline" asChild>
                              <Link to={`/admin/verifications/${verification.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Review
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
};

export default VerificationQueue;
