
import React, { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import CampaignCard from './CampaignCard';
import { Campaign } from '@/lib/types';

interface CampaignGridProps {
  campaigns: Campaign[];
  loading?: boolean;
  error?: string | null;
  showRealTimeUpdates?: boolean;
  compact?: boolean;
  columns?: 2 | 3 | 4;
  donatedCampaignIds?: Set<string>;
}

const CampaignGrid: React.FC<CampaignGridProps> = ({
  campaigns,
  loading = false,
  error = null,
  showRealTimeUpdates = true,
  compact = false,
  columns = 3,
  donatedCampaignIds,
}) => {
  const getGridCols = () => {
    switch (columns) {
      case 2: return 'grid-cols-1 sm:grid-cols-2';
      case 3: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    }
  };

  if (loading) {
    return (
      <div className={`grid ${getGridCols()} gap-6`}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className={`bg-gray-200 animate-pulse ${compact ? 'h-32' : 'h-48'}`} />
            <div className={`${compact ? 'p-3' : 'p-4'} space-y-3`}>
              <div className="h-6 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
              {!compact && <div className="h-4 bg-gray-200 rounded animate-pulse" />}
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded animate-pulse" />
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                </div>
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load campaigns</h3>
        <p className="text-gray-600 text-center max-w-md">{error}</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No campaigns found</h3>
        <p className="text-gray-600 text-center">Try adjusting your search or filter criteria.</p>
      </div>
    );
  }

  return (
    <div className={`grid ${getGridCols()} gap-6`}>
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          showRealTimeUpdates={showRealTimeUpdates}
          compact={compact}
          isDonated={donatedCampaignIds?.has(campaign.id) || false}
        />
      ))}
    </div>
  );
};

export default CampaignGrid;
