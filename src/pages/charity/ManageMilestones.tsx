
import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import CharityLayout from '@/components/layout/CharityLayout';
import { getCampaignById } from '@/services/campaignService';
import { getMilestones } from '@/services/milestoneService';
import { toast } from 'sonner';

// Milestone status type
type MilestoneStatus = 'awaiting_proof' | 'pending_review' | 'verified' | 'rejected' | 'pending' | 'in_progress' | 'completed';

// Milestone interface
interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: MilestoneStatus;
  feedback?: string;
  dateSubmitted?: string;
}

interface Campaign {
  id: string;
  title: string;
  totalRaised: number;
  goal: number;
}

const ManageMilestones: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!campaignId) {
        toast.error('Campaign ID not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Load campaign data
        const campaignResult = await getCampaignById(campaignId);
        if (campaignResult.success && campaignResult.data) {
          setCampaign({
            id: campaignResult.data.id,
            title: campaignResult.data.title,
            totalRaised: campaignResult.data.currentAmount || 0,
            goal: campaignResult.data.goalAmount,
          });
        }

        // Load milestones
        const milestonesResult = await getMilestones(campaignId);
        if (milestonesResult.success && milestonesResult.data) {
          setMilestones(milestonesResult.data.map((m: any) => ({
            id: m.id,
            title: m.title,
            description: m.description || '',
            amount: m.targetAmount,
            status: m.status as MilestoneStatus,
            dateSubmitted: m.createdAt,
          })));
        }
      } catch (error) {
        console.error('Error loading milestone data:', error);
        toast.error('Failed to load milestone data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [campaignId]);

  // Function to get status badge
  const getStatusBadge = (status: MilestoneStatus) => {
    switch(status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </span>
        );
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </span>
        );
      case 'awaiting_proof':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <Clock className="w-3 h-3 mr-1" />
            Awaiting Proof
          </span>
        );
      case 'pending_review':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  if (loading) {
    return (
      <CharityLayout title="Manage Milestones">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clearcause-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading milestones...</p>
          </div>
        </div>
      </CharityLayout>
    );
  }

  if (!campaign) {
    return (
      <CharityLayout title="Manage Milestones">
        <div className="text-center py-8">
          <p className="text-gray-500">Campaign not found</p>
          <Link to="/charity/campaigns">
            <Button className="mt-4">Back to Campaigns</Button>
          </Link>
        </div>
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title={`Manage Milestones: ${campaign.title}`}>
      {/* Back Button */}
      <Link to="/charity/campaigns" className="inline-flex items-center mb-6 text-sm font-medium text-gray-600 hover:text-clearcause-primary">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Campaigns
      </Link>
      
      {/* Campaign Summary */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium">Campaign Progress</h3>
              <p className="text-sm text-gray-500">Funding status for {campaign.title}</p>
            </div>
            <div className="mt-2 md:mt-0 md:text-right">
              <div className="text-xl font-bold">
                {formatCurrency(campaign.totalRaised)} / {formatCurrency(campaign.goal)}
              </div>
              <div className="text-sm text-gray-500">
                {Math.round((campaign.totalRaised / campaign.goal) * 100)}% funded
              </div>
            </div>
          </div>
          
          <Progress value={(campaign.totalRaised / campaign.goal) * 100} className="h-2 mb-2" />

          <div className="mt-4">
            <Link to={`/campaigns/${campaign.id}`}>
              <Button variant="outline" size="sm">
                View Public Campaign
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      
      {/* Milestones List */}
      <h2 className="text-xl font-medium mb-4">Milestones</h2>
      <div className="space-y-4">
        {milestones.map((milestone) => (
          <Card key={milestone.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="mb-2 md:mb-0">
                    <h3 className="text-lg font-medium">{milestone.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                  </div>
                  <div className="md:text-right">
                    <div className="font-bold">{formatCurrency(milestone.amount)}</div>
                    <div className="mt-1">{getStatusBadge(milestone.status)}</div>
                  </div>
                </div>
                
                {milestone.feedback && (
                  <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-100">
                    <p className="text-sm font-medium text-red-800 mb-1">Feedback:</p>
                    <p className="text-sm text-red-700">{milestone.feedback}</p>
                  </div>
                )}
                
                {(milestone.status === 'awaiting_proof' || milestone.status === 'rejected') && (
                  <div className="mt-4">
                    <Link to={`/charity/campaigns/${campaignId}/milestones/${milestone.id}/submit`}>
                      <Button>
                        <Upload className="w-4 h-4 mr-2" />
                        {milestone.status === 'rejected' ? 'Resubmit Proof' : 'Submit Proof'}
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {milestones.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-md">
          <h3 className="text-lg font-medium text-gray-900">No milestones found</h3>
          <p className="mt-1 text-gray-500">This campaign doesn't have any milestones yet</p>
        </div>
      )}
    </CharityLayout>
  );
};

export default ManageMilestones;
