import React, { useState, useEffect } from 'react';
import { Star, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import CharityLayout from '@/components/layout/CharityLayout';
import { useAuth } from '@/hooks/useAuth';
import CharityFeedbackStats from '@/components/charity/CharityFeedbackStats';
import CharityFeedbackList from '@/components/charity/CharityFeedbackList';
import * as charityFeedbackService from '@/services/charityFeedbackService';
import { CharityFeedback, CharityFeedbackStats as FeedbackStats } from '@/lib/types';

const ReceivedFeedback: React.FC = () => {
  const { user } = useAuth();
  const [charityId, setCharityId] = useState<string>('');
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [feedback, setFeedback] = useState<CharityFeedback[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<CharityFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  // Get charity ID from user profile
  useEffect(() => {
    const fetchCharityId = async () => {
      if (!user?.id) return;

      try {
        // Query charities table to get charity ID for this user
        const { data, error } = await import('@/lib/supabase').then((mod) =>
          mod.supabase
            .from('charities')
            .select('id')
            .eq('user_id', user.id)
            .single()
        );

        if (error) throw error;

        if (data) {
          setCharityId(data.id);
        }
      } catch (error) {
        console.error('Error fetching charity ID:', error);
        toast({
          title: 'Error',
          description: 'Could not load charity information',
          variant: 'destructive',
        });
      }
    };

    fetchCharityId();
  }, [user?.id]);

  // Load stats
  const loadStats = async () => {
    if (!charityId) return;

    try {
      setLoadingStats(true);
      const result = await charityFeedbackService.getCharityFeedbackStats(charityId);

      if (result.success && result.data) {
        setStats(result.data);
      } else {
        throw new Error(result.error || 'Failed to load stats');
      }
    } catch (error: any) {
      console.error('Error loading stats:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load feedback statistics',
        variant: 'destructive',
      });
    } finally {
      setLoadingStats(false);
    }
  };

  // Load feedback
  const loadFeedback = async () => {
    if (!charityId) return;

    try {
      setLoading(true);
      const result = await charityFeedbackService.getCharityFeedback(charityId, {
        page: 1,
        limit: 100,
      });

      if (result.success && result.data) {
        setFeedback(result.data);
        setFilteredFeedback(result.data);
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
    if (charityId) {
      loadStats();
      loadFeedback();
    }
  }, [charityId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...feedback];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.donor?.fullName?.toLowerCase().includes(searchLower) ||
          f.comment?.toLowerCase().includes(searchLower)
      );
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      const rating = parseInt(ratingFilter);
      filtered = filtered.filter((f) => f.rating === rating);
    }

    setFilteredFeedback(filtered);
  }, [searchTerm, ratingFilter, feedback]);

  if (!charityId) {
    return (
      <CharityLayout title="Received Feedback">
        <div className="text-center py-12">
          <Star className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No charity organization found
          </h3>
          <p className="text-sm text-gray-500">
            Your account is not associated with a charity organization.
          </p>
        </div>
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title="Received Feedback">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-gray-600">
            View and analyze feedback from donors who have supported your organization
          </p>
        </div>

        {/* Stats Dashboard */}
        <CharityFeedbackStats stats={stats} loading={loadingStats} />

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Feedback</span>
              <Button variant="outline" size="sm" onClick={() => {
                setSearchTerm('');
                setRatingFilter('all');
              }}>
                Clear Filters
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by donor name or comment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Rating Filter */}
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by rating" />
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

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredFeedback.length} of {feedback.length} feedback
              {(searchTerm || ratingFilter !== 'all') && ' (filtered)'}
            </div>

            {/* Feedback List */}
            <CharityFeedbackList
              feedback={filteredFeedback}
              loading={loading}
              showActions={false}
              emptyMessage="No feedback received yet"
            />
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2">About Feedback</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Feedback is published immediately after donors submit it</li>
              <li>• Only donors who have donated to your campaigns can leave feedback</li>
              <li>• Each donor can only leave one feedback per charity</li>
              <li>• Use this feedback to improve your organization and build trust</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </CharityLayout>
  );
};

export default ReceivedFeedback;
