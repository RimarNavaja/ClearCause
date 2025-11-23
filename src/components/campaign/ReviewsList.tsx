import React, { useState, useEffect } from 'react';
import { Star, User, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import * as reviewService from '@/services/reviewService';
import { CampaignReview } from '@/services/reviewService';
import { format } from 'date-fns';

interface ReviewsListProps {
  campaignId: string;
  refreshTrigger?: number; // Used to refresh the list externally
}

export const ReviewsList: React.FC<ReviewsListProps> = ({ campaignId, refreshTrigger }) => {
  const [reviews, setReviews] = useState<CampaignReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<any>(null);
  const { user } = useAuth();

  const limit = 10;

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await reviewService.getCampaignReviews(
        campaignId,
        { page, limit },
        user?.id
      );

      if (result.success && result.data) {
        setReviews(result.data);
        setTotalPages(Math.ceil((result.total || 0) / limit));
      } else {
        throw new Error(result.error || 'Failed to load reviews');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const result = await reviewService.getCampaignReviewStats(campaignId);
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch review stats:', err);
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [campaignId, page, user?.id, refreshTrigger]);

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

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading && reviews.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Review Statistics */}
      {stats && stats.approvedReviews > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold">
                  {stats.averageRating.toFixed(1)}
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    out of 5
                  </span>
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {renderStars(Math.round(stats.averageRating))}
                  <span className="text-sm text-muted-foreground">
                    {stats.approvedReviews} {stats.approvedReviews === 1 ? 'review' : 'reviews'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingDistribution[rating] || 0;
                const percentage =
                  stats.approvedReviews > 0 ? (count / stats.approvedReviews) * 100 : 0;

                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm w-8">{rating} ★</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-2">
              <Star className="w-12 h-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">No Reviews Yet</h3>
              <p className="text-sm text-muted-foreground">
                Be the first to review this campaign!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={review.user?.avatarUrl || undefined} />
                    <AvatarFallback>
                      {review.user?.fullName ? getInitials(review.user.fullName) : <User className="w-6 h-6" />}
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
                          {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      {user?.role === 'admin' && review.status !== 'approved' && (
                        <Badge variant={review.status === 'pending' ? 'secondary' : 'destructive'}>
                          {review.status}
                        </Badge>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="mb-3">{renderStars(review.rating)}</div>

                    {/* Comment */}
                    {review.comment && (
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {review.comment}
                      </p>
                    )}

                    {/* Admin Notes (visible to admins only) */}
                    {user?.role === 'admin' && review.adminNotes && (
                      <div className="mt-3 p-3 bg-muted rounded-md">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          Admin Notes:
                        </p>
                        <p className="text-sm">{review.adminNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReviewsList;
