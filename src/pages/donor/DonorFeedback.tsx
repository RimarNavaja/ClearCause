import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, Send, ThumbsUp, Flag, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import DonorLayout from '@/components/layout/DonorLayout';
import { useAuth } from '@/hooks/useAuth';
import * as reviewService from '@/services/reviewService';
import * as donationService from '@/services/donationService';
import { CampaignReview } from '@/services/reviewService';
import { Campaign } from '@/lib/types';

interface EligibleCampaign {
  id: string;
  title: string;
  charityName: string;
}

const DonorFeedback: React.FC = () => {
  const { user } = useAuth();
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [myReviews, setMyReviews] = useState<CampaignReview[]>([]);
  const [eligibleCampaigns, setEligibleCampaigns] = useState<EligibleCampaign[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      try {
        // 1. Fetch my reviews
        const reviewsResult = await reviewService.getUserReviews(
          user.id,
          { page: 1, limit: 100 },
          user.id
        );
        
        console.log('Reviews Result:', reviewsResult);
        const reviews = reviewsResult.success && reviewsResult.data ? reviewsResult.data : [];
        setMyReviews(reviews);
        
        // 2. Fetch my donations to find eligible campaigns
        const donationsResult = await donationService.getDonationsByDonor(
          user.id,
          { page: 1, limit: 100 },
          user.id
        );
        
        console.log('Donations Result:', donationsResult);
        
        if (donationsResult.success && donationsResult.data) {
          const reviewedCampaignIds = new Set(reviews.map(r => r.campaignId));
          const uniqueCampaigns = new Map<string, EligibleCampaign>();
          
          console.log('Processing donations:', donationsResult.data.length);
          
          donationsResult.data.forEach((donation: any) => {
            console.log('Checking donation:', donation.id, donation.status, donation.campaign?.id);
            if (
              (donation.status === 'completed' || donation.status === 'pending') && 
              donation.campaign && 
              !reviewedCampaignIds.has(donation.campaign.id)
            ) {
              uniqueCampaigns.set(donation.campaign.id, {
                id: donation.campaign.id,
                title: donation.campaign.title,
                charityName: donation.campaign.charity?.organizationName || 'Unknown Charity'
              });
            } else {
                console.log('Donation excluded. Reason:', 
                    donation.status !== 'completed' ? 'Status not completed' :
                    !donation.campaign ? 'No campaign data' :
                    reviewedCampaignIds.has(donation.campaign?.id) ? 'Already reviewed' : 'Unknown'
                );
            }
          });
          
          setEligibleCampaigns(Array.from(uniqueCampaigns.values()));
        }
      } catch (error) {
        console.error('Error fetching feedback data:', error);
        toast.error('Failed to load your feedback data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) return;

    if (!selectedCampaignId || !comment.trim() || rating === 0) {
      toast.error('Please select a campaign, rating, and write a review');
      return;
    }

    setSubmitting(true);

    try {
      const result = await reviewService.createReview({
        campaignId: selectedCampaignId,
        rating,
        comment
      }, user.id);

      if (result.success && result.data) {
        toast.success('Review submitted successfully!');

        // Add new review to list
        setMyReviews([result.data, ...myReviews]);
        
        // Remove campaign from eligible list
        setEligibleCampaigns(prev => prev.filter(c => c.id !== selectedCampaignId));
        
        // Reset form
        setSelectedCampaignId('');
        setRating(0);
        setComment('');
      } else {
        throw new Error(result.error || 'Failed to submit review');
      }
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (count: number, interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-6 h-6 ${
              star <= count
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            onClick={() => interactive && setRating(star)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <DonorLayout title="Feedback & Reviews">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </DonorLayout>
    );
  }

  return (
    <DonorLayout title="Feedback & Reviews">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-gray-600">Share your experience and help others make informed decisions</p>
        </div>

        {/* Submit New Feedback */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Write a Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eligibleCampaigns.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  You don't have any pending reviews. Donate to more campaigns to share your feedback!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div>
                  <Label htmlFor="campaign">Select Campaign</Label>
                  <select
                    id="campaign"
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select a campaign you've donated to</option>
                    {eligibleCampaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.title} - {campaign.charityName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Rating</Label>
                  <div className="mt-2">{renderStars(rating, true)}</div>
                  <p className="text-sm text-gray-500 mt-1">Click to rate</p>
                </div>

                <div>
                  <Label htmlFor="comment">Your Review</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience with this campaign..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <Button type="submit" className='bg-blue-700 hover:bg-blue-600' disabled={submitting || !selectedCampaignId || rating === 0}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Review
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* My Feedback History */}
        <Card>
          <CardHeader>
            <CardTitle>My Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {myReviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No reviews yet</h3>
                <p className="mt-2 text-gray-500">
                  Share your experience with campaigns you've supported
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myReviews.map((review) => (
                  <div key={review.id} className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{review.campaign?.title || 'Unknown Campaign'}</h4>
                        <p className="text-sm text-gray-600">
                          Posted on {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {review.status === 'rejected' && (
                        <Badge variant="destructive" className="capitalize">
                          {review.status}
                        </Badge>
                      )}
                    </div>

                    <div className="mb-2">{renderStars(review.rating)}</div>

                    <p className="text-gray-700 mb-3 whitespace-pre-wrap">{review.comment}</p>

                    {review.adminNotes && review.status === 'rejected' && (
                      <div className="bg-red-50 p-3 rounded-md border border-red-100 mt-2">
                        <p className="text-sm font-medium text-red-800">Admin Feedback:</p>
                        <p className="text-sm text-red-600">{review.adminNotes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guidelines */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Review Guidelines</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Be honest and constructive in your feedback</li>
              <li>• Focus on your personal experience with the campaign</li>
              <li>• Avoid offensive language or personal attacks</li>
              <li>• Reviews are published immediately and visible to everyone</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DonorLayout>
  );
};

export default DonorFeedback;