import React, { useState, useEffect } from 'react';
import {
  Star,
  MessageSquare,
  Filter,
  Search,
  ThumbsUp,
  RefreshCw,
} from 'lucide-react';
import CharityLayout from '@/components/layout/CharityLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import * as reviewService from '@/services/reviewService';
import * as charityService from '@/services/charityService';
import { CampaignReview } from '@/services/reviewService';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CharityReviews: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<CampaignReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [charityId, setCharityId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // 1. Get Charity ID
      const charityResult = await charityService.getCharityByUserId(user.id);
      if (!charityResult.success || !charityResult.data) {
        throw new Error('Charity organization not found');
      }
      setCharityId(charityResult.data.id);

      // 2. Get Reviews for this charity's campaigns
      const reviewsResult = await reviewService.listReviews(
        {
          charityId: charityResult.data.id,
          // Show all statuses so charity knows if reviews are pending/rejected? 
          // Usually charities only see approved reviews publicly, but maybe they want to see what's coming.
          // For now, let's show only 'approved' to avoid confusion, or maybe 'approved' + 'pending' if they want to know.
          // ReviewService.listReviews restricts non-admins to 'approved' unless viewing own.
          // Since charity is viewing *other's* reviews on *their* campaigns, RLS might block non-approved.
          // Let's stick to default (approved only for non-admins).
        },
        { page: 1, limit: 100 },
        user.id
      );

      if (reviewsResult.success && reviewsResult.data) {
        setReviews(reviewsResult.data);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

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

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch = 
      review.campaign?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRating = ratingFilter === 'all' || review.rating === parseInt(ratingFilter);

    return matchesSearch && matchesRating;
  });

  // Calculate stats
  const averageRating = reviews.length > 0 
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
    : 0;

  return (
    <CharityLayout title="Donor Reviews">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
                <div className="flex text-yellow-400">
                  <Star className="w-5 h-5 fill-current" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Across all campaigns</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{reviews.length}</div>
              <p className="text-xs text-gray-500 mt-1">Approved donor feedback</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {reviews.filter(r => new Date(r.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
              </div>
              <p className="text-xs text-gray-500 mt-1">New reviews this week</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by campaign or comment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full md:w-48">
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={loadData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="space-y-4">
          {loading && reviews.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500">Loading reviews...</p>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No reviews found</h3>
              <p className="text-gray-500">
                {searchTerm || ratingFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Your campaigns haven\'t received any reviews yet.'}
              </p>
            </div>
          ) : (
            filteredReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarImage src={review.user?.avatarUrl || undefined} />
                      <AvatarFallback>{getInitials(review.user?.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {review.user?.fullName || 'Anonymous Donor'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(review.rating)}
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">
                              {format(new Date(review.createdAt), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="font-normal">
                          {review.campaign?.title}
                        </Badge>
                      </div>
                      
                      <p className="mt-3 text-gray-700 whitespace-pre-wrap">
                        {review.comment}
                      </p>

                      <div className="mt-4 flex gap-4">
                        <Button variant="ghost" size="sm" className="text-gray-500">
                          <ThumbsUp className="w-4 h-4 mr-2" />
                          Helpful
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </CharityLayout>
  );
};

export default CharityReviews;
