
import React, { useState } from 'react';
import MilestoneTracker from './MilestoneTracker';
import ImpactDashboard from './ImpactDashboard';
import AuditTrail from './AuditTrail';
import ReviewForm from '@/components/campaign/ReviewForm';
import ReviewsList from '@/components/campaign/ReviewsList';
import { useAuth } from '@/hooks/useAuth';

interface Milestone {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'verified' | 'released' | 'upcoming';
  date?: string;
  amount: number;
  evidence?: string;
}

interface ImpactMetric {
  id: string;
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: number;
}

interface RecentActivity {
  id: string;
  title: string;
  timestamp: string;
  description: string;
}

interface TabContentProps {
  activeTab: string;
  description: string;
  location: string;
  milestones: Milestone[];
  impactMetrics: ImpactMetric[];
  recentActivities: RecentActivity[];
  campaignId: string;
  campaignStatus?: string;
}

const TabContent: React.FC<TabContentProps> = ({
  activeTab,
  description,
  location,
  milestones,
  impactMetrics,
  recentActivities,
  campaignId,
  campaignStatus
}) => {
  const { user } = useAuth();
  const [refreshReviews, setRefreshReviews] = useState(0);

  // Check if user has donated to this campaign (simplified - you may want to fetch this from the backend)
  const [hasDonated, setHasDonated] = useState(false);

  const handleReviewSuccess = () => {
    // Refresh the reviews list
    setRefreshReviews(prev => prev + 1);
  };

  switch (activeTab) {
    case 'about':
      return (
        <div className="prose max-w-none">
          <p className="text-base text-gray-700 whitespace-pre-line">{description}</p>
          <h3 className="font-semibold text-lg mt-6 mb-3">Project Location</h3>
          <p>{location}</p>
        </div>
      );
    case 'updates':
      return <ImpactDashboard metrics={impactMetrics} recentActivities={recentActivities} />;
    case 'milestones':
      return <MilestoneTracker milestones={milestones} />;
    case 'audit':
      return <AuditTrail campaignId={campaignId} />;
    case 'reviews':
      return (
        <div className="space-y-8">
          {/* Review Form - Only show to logged in donors */}
          {user && user.role === 'donor' && (
            <ReviewForm
              campaignId={campaignId}
              onSuccess={handleReviewSuccess}
            />
          )}

          {/* Reviews List */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Campaign Reviews</h3>
            <ReviewsList
              campaignId={campaignId}
              refreshTrigger={refreshReviews}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
};

export default TabContent;
