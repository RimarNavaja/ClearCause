import React, { useState, useEffect } from 'react';
import { Loader2, Filter, AlertCircle, Megaphone } from 'lucide-react';
import UpdateCard, { CampaignUpdate } from './UpdateCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCampaignUpdates } from '@/services/campaignService';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CampaignUpdatesFeedProps {
  campaignId: string;
  showFilters?: boolean;
  limit?: number;
}

const CampaignUpdatesFeed: React.FC<CampaignUpdatesFeedProps> = ({
  campaignId,
  showFilters = true,
  limit = 10,
}) => {
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'milestone' | 'impact' | 'general'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchUpdates();
  }, [campaignId, page, filterType]);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getCampaignUpdates(campaignId, {
        page,
        limit,
        sortBy: 'created_at',
        sortOrder: 'desc',
        status: 'published',
      });

      if (result.success && result.data) {
        // Filter by type if not 'all'
        let filteredData = result.data;
        if (filterType !== 'all') {
          filteredData = result.data.filter(update => update.updateType === filterType);
        }

        if (page === 1) {
          setUpdates(filteredData);
        } else {
          setUpdates(prev => [...prev, ...filteredData]);
        }

        setTotalCount(result.pagination?.total || 0);
        setHasMore((result.pagination?.page || 1) < (result.pagination?.totalPages || 1));
      } else {
        setError(result.error?.message || 'Failed to load updates');
      }
    } catch (err) {
      console.error('Error fetching campaign updates:', err);
      setError('An unexpected error occurred while loading updates');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (type: typeof filterType) => {
    setFilterType(type);
    setPage(1); // Reset to first page when filter changes
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const getFilterCount = (type: typeof filterType) => {
    if (type === 'all') return updates.length;
    return updates.filter(update => update.updateType === type).length;
  };

  // Loading state
  if (loading && page === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-clearcause-primary mb-4" />
        <p className="text-gray-600">Loading updates...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (updates.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="bg-gray-100 rounded-full p-6 mb-4">
          <Megaphone className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Updates Yet</h3>
        <p className="text-gray-600 text-center max-w-md">
          This campaign hasn't posted any updates yet. Check back soon to see progress and impact stories!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-gray-200">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 mr-2">Filter by type:</span>

          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('all')}
            className={filterType === 'all' ? 'bg-clearcause-primary' : ''}
          >
            All Updates
            <Badge variant="secondary" className="ml-2">
              {totalCount}
            </Badge>
          </Button>

          <Button
            variant={filterType === 'milestone' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('milestone')}
            className={filterType === 'milestone' ? 'bg-blue-600' : ''}
          >
            Milestones
          </Button>

          <Button
            variant={filterType === 'impact' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('impact')}
            className={filterType === 'impact' ? 'bg-green-600' : ''}
          >
            Impact Stories
          </Button>

          <Button
            variant={filterType === 'general' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('general')}
          >
            General
          </Button>
        </div>
      )}

      {/* Updates List */}
      <div className="space-y-6">
        {updates.map((update) => (
          <UpdateCard key={update.id} update={update} />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loading}
            className="min-w-[200px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More Updates'
            )}
          </Button>
        </div>
      )}

      {/* End of updates indicator */}
      {!hasMore && updates.length > 0 && (
        <div className="text-center py-4 text-gray-500 text-sm border-t border-gray-200">
          You've reached the end of the updates
        </div>
      )}
    </div>
  );
};

export default CampaignUpdatesFeed;
