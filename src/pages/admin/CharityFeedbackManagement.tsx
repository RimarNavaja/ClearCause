import React, { useState, useEffect } from 'react';
import { Star, Search, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import CharityFeedbackList from '@/components/charity/CharityFeedbackList';
import * as charityFeedbackService from '@/services/charityFeedbackService';
import { CharityFeedback } from '@/lib/types';

const CharityFeedbackManagement: React.FC = () => {
  const { user } = useAuth();
  const [allFeedback, setAllFeedback] = useState<CharityFeedback[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<CharityFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<CharityFeedback | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Platform-wide stats
  const [platformStats, setPlatformStats] = useState({
    totalFeedback: 0,
    averageRating: 0,
    totalCharities: 0,
  });

  // Load all feedback
  const loadAllFeedback = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const result = await charityFeedbackService.listFeedback({}, { page: 1, limit: 500 });

      if (result.success && result.data) {
        setAllFeedback(result.data);
        setFilteredFeedback(result.data);

        // Calculate platform stats
        const totalFeedback = result.data.length;
        const ratings = result.data.map((f) => f.rating);
        const averageRating =
          ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
        const uniqueCharities = new Set(result.data.map((f) => f.charityId));

        setPlatformStats({
          totalFeedback,
          averageRating: Math.round(averageRating * 100) / 100,
          totalCharities: uniqueCharities.size,
        });
      } else {
        throw new Error(result.error || 'Failed to load feedback');
      }
    } catch (error: any) {
      console.error('Error loading feedback:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load feedback',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllFeedback();
  }, [user?.id]);

  // Apply search filter
  useEffect(() => {
    if (!searchTerm) {
      setFilteredFeedback(allFeedback);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = allFeedback.filter(
      (f) =>
        f.charity?.organizationName?.toLowerCase().includes(searchLower) ||
        f.donor?.fullName?.toLowerCase().includes(searchLower) ||
        f.comment?.toLowerCase().includes(searchLower)
    );

    setFilteredFeedback(filtered);
  }, [searchTerm, allFeedback]);

  // Handle delete confirmation
  const handleDeleteClick = (feedback: CharityFeedback) => {
    setSelectedFeedback(feedback);
    setDeleteReason('');
    setShowDeleteDialog(true);
  };

  // Handle delete feedback
  const handleDeleteConfirm = async () => {
    if (!user?.id || !selectedFeedback) return;

    if (!deleteReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for deleting this feedback',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDeleting(true);

      const result = await charityFeedbackService.adminDeleteFeedback(
        selectedFeedback.id,
        user.id,
        deleteReason
      );

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'Feedback deleted successfully',
        });
        setShowDeleteDialog(false);
        setSelectedFeedback(null);
        setDeleteReason('');
        // Reload feedback
        loadAllFeedback();
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
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Charity Feedback Management</h1>
            <p className="text-gray-600">Monitor and manage feedback across all charities</p>
          </div>
          <Button onClick={loadAllFeedback} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.totalFeedback}</div>
              <p className="text-xs text-muted-foreground">Across all charities</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Average</CardTitle>
              <Star className="h-4 w-4 text-yellow-600 fill-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.averageRating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Average rating</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Charities</CardTitle>
              <Star className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{platformStats.totalCharities}</div>
              <p className="text-xs text-muted-foreground">With feedback</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>All Feedback</CardTitle>
            <CardDescription>
              {filteredFeedback.length} feedback{filteredFeedback.length !== 1 ? 's' : ''} found
              {searchTerm && ' (filtered)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by charity, donor, or comment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Feedback List with Admin Actions */}
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">Loading feedback...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredFeedback.map((feedback) => (
                  <Card key={feedback.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">
                              {feedback.donor?.fullName || 'Anonymous Donor'}
                            </h4>
                            <span className="text-sm text-gray-500">→</span>
                            <span className="font-medium text-blue-600">
                              {feedback.charity?.organizationName}
                            </span>
                          </div>
                          <div className="flex gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= feedback.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          {feedback.comment && (
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                              {feedback.comment}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Submitted on {new Date(feedback.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(feedback)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredFeedback.length === 0 && (
                  <div className="text-center py-12">
                    <Star className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No feedback found</h3>
                    <p className="text-sm text-gray-500">
                      {searchTerm
                        ? 'Try adjusting your search'
                        : 'No charity feedback has been submitted yet'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warning Card */}
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6 flex gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">Admin Actions</h3>
              <ul className="space-y-1 text-sm text-yellow-800">
                <li>
                  • Feedback deletion should only be used for inappropriate content or spam
                </li>
                <li>• All deletions are logged in the audit trail with the reason provided</li>
                <li>• Deleted feedback cannot be recovered</li>
                <li>• Use this power responsibly to maintain platform integrity</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feedback</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the feedback and log the
              action in the audit trail.
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              {/* Feedback Preview */}
              <div className="p-4 bg-gray-50 rounded-md">
                <div className="mb-2">
                  <p className="font-semibold">
                    {selectedFeedback.donor?.fullName || 'Anonymous'} →{' '}
                    {selectedFeedback.charity?.organizationName}
                  </p>
                  <div className="flex gap-1 my-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= selectedFeedback.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {selectedFeedback.comment && (
                  <p className="text-sm text-gray-700">{selectedFeedback.comment}</p>
                )}
              </div>

              {/* Reason */}
              <div>
                <Label htmlFor="deleteReason">Reason for Deletion (Required)</Label>
                <Textarea
                  id="deleteReason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Explain why this feedback is being deleted (e.g., spam, inappropriate content, etc.)"
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting || !deleteReason.trim()}
            >
              {deleting ? 'Deleting...' : 'Delete Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default CharityFeedbackManagement;
