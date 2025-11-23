import React, { useState, useEffect } from 'react';
import {
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Search,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import * as reviewService from '@/services/reviewService';
import { CampaignReview } from '@/services/reviewService';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ReviewModeration = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [reviews, setReviews] = useState<CampaignReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<CampaignReview | null>(null);
  const [moderating, setModerating] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [showModerationDialog, setShowModerationDialog] = useState(false);
  const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | null>(null);

  const loadReviews = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const result = await reviewService.getPendingReviews({ page: 1, limit: 100 }, user.id);

      if (result.success && result.data) {
        setReviews(result.data);
      } else {
        throw new Error(result.error || 'Failed to load reviews');
      }
    } catch (error: any) {
      console.error('Error loading reviews:', error);
      toast.error(error.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [user?.id]);

  const handleModerateClick = (review: CampaignReview, action: 'approve' | 'reject') => {
    setSelectedReview(review);
    setModerationAction(action);
    setAdminNotes('');
    setShowModerationDialog(true);
  };

  const handleModerateConfirm = async () => {
    if (!selectedReview || !moderationAction || !user?.id) return;

    try {
      setModerating(true);

      const result = await reviewService.moderateReview(
        selectedReview.id,
        {
          status: moderationAction === 'approve' ? 'approved' : 'rejected',
          adminNotes,
        },
        user.id
      );

      if (result.success) {
        toast.success(
          result.message || `Review ${moderationAction === 'approve' ? 'approved' : 'rejected'} successfully`
        );
        setShowModerationDialog(false);
        setSelectedReview(null);
        setAdminNotes('');
        setModerationAction(null);
        // Reload reviews
        loadReviews();
      } else {
        throw new Error(result.error || 'Failed to moderate review');
      }
    } catch (error: any) {
      console.error('Error moderating review:', error);
      toast.error(error.message || 'Failed to moderate review');
    } finally {
      setModerating(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: 'secondary' as const, icon: Clock, label: 'Pending' },
      approved: { variant: 'default' as const, icon: CheckCircle, label: 'Approved' },
      rejected: { variant: 'destructive' as const, icon: XCircle, label: 'Rejected' },
    };

    const statusConfig = config[status as keyof typeof config] || config.pending;
    const IconComponent = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant}>
        <IconComponent className="w-3 h-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredReviews = reviews.filter((review) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      review.campaign?.title.toLowerCase().includes(searchLower) ||
      review.user?.fullName?.toLowerCase().includes(searchLower) ||
      review.comment?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    pending: reviews.filter((r) => r.status === 'pending').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    rejected: reviews.filter((r) => r.status === 'rejected').length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Review Moderation</h1>
            <p className="text-gray-600">Review and moderate donor campaign reviews</p>
          </div>
          <Button onClick={loadReviews} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting moderation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">Published reviews</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">Not approved</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by campaign, donor, or review content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Reviews</CardTitle>
            <CardDescription>
              {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Loading reviews...</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No Reviews Found</h3>
                <p className="text-sm text-gray-600">
                  {searchTerm ? 'Try adjusting your search' : 'All caught up! No pending reviews.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviews.map((review) => (
                  <Card key={review.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={review.user?.avatarUrl || undefined} />
                          <AvatarFallback>
                            {review.user?.fullName
                              ? getInitials(review.user.fullName)
                              : 'U'}
                          </AvatarFallback>
                        </Avatar>

                        {/* Review Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h4 className="font-semibold">
                                {review.user?.fullName || 'Anonymous Donor'}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(review.createdAt), 'MMM dd, yyyy \'at\' h:mm a')}
                              </p>
                            </div>
                            {getStatusBadge(review.status)}
                          </div>

                          {/* Campaign */}
                          <div className="mb-3 text-sm text-muted-foreground">
                            Campaign: <span className="font-medium text-foreground">{review.campaign?.title || 'Unknown Campaign'}</span>
                          </div>

                          {/* Rating */}
                          <div className="mb-3">{renderStars(review.rating)}</div>

                          {/* Comment */}
                          {review.comment && (
                            <div className="mb-4 p-3 bg-muted rounded-md">
                              <p className="text-sm text-foreground/90">{review.comment}</p>
                            </div>
                          )}

                          {/* Admin Notes (if any) */}
                          {review.adminNotes && (
                            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                              <p className="text-xs font-semibold text-yellow-900 mb-1">
                                Admin Notes:
                              </p>
                              <p className="text-sm text-yellow-800">{review.adminNotes}</p>
                            </div>
                          )}

                          {/* Actions */}
                          {review.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleModerateClick(review, 'approve')}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleModerateClick(review, 'reject')}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Moderation Dialog */}
      <Dialog open={showModerationDialog} onOpenChange={setShowModerationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moderationAction === 'approve' ? 'Approve Review' : 'Reject Review'}
            </DialogTitle>
            <DialogDescription>
              {moderationAction === 'approve'
                ? 'This review will be published and visible to all users.'
                : 'This review will be rejected and not shown to users.'}
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              {/* Review Preview */}
              <div className="p-4 bg-muted rounded-md">
                <div className="mb-2">
                  <p className="font-semibold">{selectedReview.user?.fullName || 'Anonymous'}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReview.campaign?.title}
                  </p>
                </div>
                {renderStars(selectedReview.rating)}
                {selectedReview.comment && (
                  <p className="mt-2 text-sm">{selectedReview.comment}</p>
                )}
              </div>

              {/* Admin Notes */}
              <div>
                <Label htmlFor="adminNotes">
                  Admin Notes {moderationAction === 'reject' ? '(Required)' : '(Optional)'}
                </Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    moderationAction === 'approve'
                      ? 'Add any internal notes about this review...'
                      : 'Explain why this review is being rejected...'
                  }
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModerationDialog(false)}
              disabled={moderating}
            >
              Cancel
            </Button>
            <Button
              variant={moderationAction === 'approve' ? 'default' : 'destructive'}
              onClick={handleModerateConfirm}
              disabled={moderating || (moderationAction === 'reject' && !adminNotes.trim())}
            >
              {moderating ? 'Processing...' : moderationAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default ReviewModeration;
