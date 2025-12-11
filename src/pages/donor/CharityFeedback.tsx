import React, { useState, useEffect } from 'react';
import { MessageCircle, Star, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import DonorLayout from '@/components/layout/DonorLayout';
import { useAuth } from '@/hooks/useAuth';
import CharityFeedbackForm from '@/components/charity/CharityFeedbackForm';
import CharityFeedbackList from '@/components/charity/CharityFeedbackList';
import * as charityFeedbackService from '@/services/charityFeedbackService';
import { CharityFeedback } from '@/lib/types';

interface EligibleCharity {
  id: string;
  organizationName: string;
  logoUrl: string | null;
}

const CharityFeedbackPage: React.FC = () => {
  const { user } = useAuth();
  const [eligibleCharities, setEligibleCharities] = useState<EligibleCharity[]>([]);
  const [myFeedback, setMyFeedback] = useState<CharityFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEligible, setLoadingEligible] = useState(true);
  const [selectedCharity, setSelectedCharity] = useState<EligibleCharity | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<CharityFeedback | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load eligible charities (donated but no feedback yet)
  const loadEligibleCharities = async () => {
    if (!user?.id) return;

    try {
      setLoadingEligible(true);
      const result = await charityFeedbackService.getEligibleCharitiesForFeedback(user.id);

      if (result.success && result.data) {
        setEligibleCharities(result.data);
      } else {
        throw new Error(result.error || 'Failed to load eligible charities');
      }
    } catch (error: any) {
      console.error('Error loading eligible charities:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load eligible charities',
        variant: 'destructive',
      });
    } finally {
      setLoadingEligible(false);
    }
  };

  // Load my feedback
  const loadMyFeedback = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const result = await charityFeedbackService.getDonorFeedback(
        user.id,
        { page: 1, limit: 100 }
      );

      if (result.success && result.data) {
        setMyFeedback(result.data);
      } else {
        throw new Error(result.error || 'Failed to load feedback');
      }
    } catch (error: any) {
      console.error('Error loading feedback:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load your feedback',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadEligibleCharities();
      loadMyFeedback();
    }
  }, [user?.id]);

  // Handle create feedback
  const handleCreateFeedback = async (data: { rating: number; comment?: string }) => {
    if (!user?.id || !selectedCharity) return;

    try {
      setSubmitting(true);

      const result = await charityFeedbackService.createFeedback(
        {
          charityId: selectedCharity.id,
          rating: data.rating,
          comment: data.comment,
        },
        user.id
      );

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Feedback submitted successfully!',
        });
        setShowDialog(false);
        setSelectedCharity(null);
        // Reload data
        loadEligibleCharities();
        loadMyFeedback();
      } else {
        throw new Error(result.error || 'Failed to submit feedback');
      }
    } catch (error: any) {
      console.error('Error creating feedback:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit feedback',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle update feedback
  const handleUpdateFeedback = async (data: { rating: number; comment?: string }) => {
    if (!user?.id || !editingFeedback) return;

    try {
      setSubmitting(true);

      const result = await charityFeedbackService.updateFeedback(
        editingFeedback.id,
        {
          rating: data.rating,
          comment: data.comment,
        },
        user.id
      );

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Feedback updated successfully!',
        });
        setShowDialog(false);
        setEditingFeedback(null);
        // Reload feedback
        loadMyFeedback();
      } else {
        throw new Error(result.error || 'Failed to update feedback');
      }
    } catch (error: any) {
      console.error('Error updating feedback:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update feedback',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete feedback
  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!user?.id) return;

    if (!confirm('Are you sure you want to delete this feedback?')) {
      return;
    }

    try {
      const result = await charityFeedbackService.deleteFeedback(feedbackId, user.id);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Feedback deleted successfully',
        });
        // Reload data
        loadEligibleCharities();
        loadMyFeedback();
      } else {
        throw new Error(result.error || 'Failed to delete feedback');
      }
    } catch (error: any) {
      console.error('Error deleting feedback:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete feedback',
        variant: 'destructive',
      });
    }
  };

  // Open dialog for new feedback
  const handleLeaveFeedback = (charity: EligibleCharity) => {
    setSelectedCharity(charity);
    setEditingFeedback(null);
    setShowDialog(true);
  };

  // Open dialog for editing
  const handleEditFeedback = (feedback: CharityFeedback) => {
    setEditingFeedback(feedback);
    setSelectedCharity(null);
    setShowDialog(true);
  };

  return (
    <DonorLayout title="Charity Feedback">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-gray-600">
            Share your experience with charities you've supported
          </p>
        </div>

        {/* Eligible Charities Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Leave Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEligible ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 mx-auto border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="mt-2 text-sm text-gray-600">Loading charities...</p>
              </div>
            ) : eligibleCharities.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No charities to review
                </h3>
                <p className="text-sm text-gray-500">
                  You've either already reviewed all charities you've donated to, or you haven't
                  made any donations yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eligibleCharities.map((charity) => (
                  <div
                    key={charity.id}
                    className="border rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {charity.logoUrl ? (
                        <img
                          src={charity.logoUrl}
                          alt={charity.organizationName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Star className="w-6 h-6 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold">{charity.organizationName}</h4>
                        <p className="text-sm text-gray-600">Click to leave feedback</p>
                      </div>
                    </div>
                    <Button onClick={() => handleLeaveFeedback(charity)}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Feedback
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Feedback Section */}
        <Card>
          <CardHeader>
            <CardTitle>My Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <CharityFeedbackList
              feedback={myFeedback}
              loading={loading}
              onEdit={handleEditFeedback}
              onDelete={handleDeleteFeedback}
              showActions={true}
              emptyMessage="You haven't left any feedback yet"
            />
          </CardContent>
        </Card>
      </div>

      {/* Feedback Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFeedback ? 'Edit Your Feedback' : 'Leave Feedback'}
            </DialogTitle>
            <DialogDescription>
              {editingFeedback
                ? 'Update your feedback for this charity'
                : 'Share your experience to help other donors'}
            </DialogDescription>
          </DialogHeader>

          <CharityFeedbackForm
            onSubmit={editingFeedback ? handleUpdateFeedback : handleCreateFeedback}
            initialData={
              editingFeedback
                ? {
                    rating: editingFeedback.rating,
                    comment: editingFeedback.comment || undefined,
                  }
                : undefined
            }
            isLoading={submitting}
            charityName={
              editingFeedback
                ? editingFeedback.charity?.organizationName || 'this charity'
                : selectedCharity?.organizationName || ''
            }
          />
        </DialogContent>
      </Dialog>
    </DonorLayout>
  );
};

export default CharityFeedbackPage;
