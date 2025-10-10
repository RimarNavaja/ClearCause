
import React from 'react';
import MilestoneTracker from './MilestoneTracker';
import ImpactDashboard from './ImpactDashboard';
import AuditTrail from './AuditTrail';

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
    default:
      return null;
  }
};

export default TabContent;
