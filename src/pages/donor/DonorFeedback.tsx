import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Star, Send, ThumbsUp, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import DonorLayout from '@/components/layout/DonorLayout';
import { useAuth } from '@/hooks/useAuth';

interface Feedback {
  id: string;
  campaignTitle: string;
  charityName: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: 'published' | 'pending' | 'flagged';
}

const DonorFeedback: React.FC = () => {
  const { user } = useAuth();
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mock feedback data
  const [myFeedback] = useState<Feedback[]>([
    {
      id: '1',
      campaignTitle: 'Clean Water Project',
      charityName: 'Water for Life',
      rating: 5,
      comment: 'Amazing transparency! I can see exactly where my donation is going.',
      createdAt: '2025-01-15',
      status: 'published',
    },
  ]);

  // Mock campaigns I've donated to
  const donatedCampaigns = [
    { id: '1', title: 'Clean Water Project', charity: 'Water for Life' },
    { id: '2', title: 'School Rebuilding', charity: 'Education First' },
  ];

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCampaign || !comment.trim() || rating === 0) {
      toast({
        title: 'Missing information',
        description: 'Please select a campaign, rating, and write a review',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Mock submission - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Feedback submitted!',
        description: 'Thank you for sharing your experience',
      });

      // Reset form
      setSelectedCampaign('');
      setRating(0);
      setComment('');
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: 'Please try again later',
        variant: 'destructive',
      });
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
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <Label htmlFor="campaign">Select Campaign</Label>
                <select
                  id="campaign"
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a campaign you've donated to --</option>
                  {donatedCampaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.title} - {campaign.charity}
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

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
          </CardContent>
        </Card>

        {/* My Feedback History */}
        <Card>
          <CardHeader>
            <CardTitle>My Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {myFeedback.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No reviews yet</h3>
                <p className="mt-2 text-gray-500">
                  Share your experience with campaigns you've supported
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {myFeedback.map((feedback) => (
                  <div key={feedback.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold">{feedback.campaignTitle}</h4>
                        <p className="text-sm text-gray-600">by {feedback.charityName}</p>
                      </div>
                      <Badge
                        variant={
                          feedback.status === 'published'
                            ? 'default'
                            : feedback.status === 'pending'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {feedback.status}
                      </Badge>
                    </div>

                    <div className="mb-2">{renderStars(feedback.rating)}</div>

                    <p className="text-gray-700 mb-3">{feedback.comment}</p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          Helpful (0)
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Flag className="w-4 h-4 mr-1" />
                          Report
                        </Button>
                      </div>
                    </div>
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
              <li>• Reviews are moderated and may take up to 24 hours to appear</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DonorLayout>
  );
};

export default DonorFeedback;
