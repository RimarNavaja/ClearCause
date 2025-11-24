
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CampaignBanner from '@/components/ui/campaign/CampaignBanner';
import CampaignHeader from '@/components/ui/campaign/CampaignHeader';
import DonationCard from '@/components/ui/campaign/DonationCard';
import TabNavigation from '@/components/ui/campaign/TabNavigation';
import TabContent from '@/components/ui/campaign/TabContent';
import * as campaignService from '@/services/campaignService';
import * as charityService from '@/services/charityService';
import { Campaign } from '@/lib/types';
import { calculateDaysLeft } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';

// Fallback banner URL for campaigns without images
const DEFAULT_BANNER_URL = "https://images.unsplash.com/photo-1503387837-b154d5074bd2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80";

const CampaignDetail: React.FC = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('about');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const loadCampaign = async () => {
      if (!campaignId) {
        setError('No campaign ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await campaignService.getCampaignById(campaignId);

        if (result.success && result.data) {
          setCampaign(result.data);
        } else {
          setError(result.error || 'Campaign not found');
        }
      } catch (err) {
        setError('Failed to load campaign');
        console.error('Campaign loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId]);

  // Check if current user is the campaign owner
  useEffect(() => {
    const checkOwnership = async () => {
      if (!user || !campaign) {
        setIsOwner(false);
        return;
      }

      try {
        // Get the charity profile for the current user
        const charityResult = await charityService.getCharityByUserId(user.id);

        if (charityResult.success && charityResult.data) {
          // Check if this charity owns the campaign
          setIsOwner(charityResult.data.id === campaign.charityId);
        } else {
          setIsOwner(false);
        }
      } catch (err) {
        console.error('Error checking campaign ownership:', err);
        setIsOwner(false);
      }
    };

    checkOwnership();
  }, [user, campaign]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clearcause-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading campaign...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The campaign you are looking for does not exist.'}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-clearcause-primary text-white rounded-md hover:bg-clearcause-primary-dark"
            >
              Back to Home
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const daysLeft = calculateDaysLeft(campaign.endDate);
  const progress = campaign.goalAmount > 0 ? (campaign.currentAmount / campaign.goalAmount) * 100 : 0;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow mb-4">
        <CampaignBanner
          bannerUrl={campaign.imageUrl || DEFAULT_BANNER_URL}
          title={campaign.title}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
          {/* Back Button */}
          <div className="mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-white hover:text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Campaign Info */}
            <div className="lg:col-span-2 space-y-6">
              <CampaignHeader
                category={campaign.category || 'General'}
                verified={campaign.status === 'active' && campaign.charity?.verificationStatus === 'approved'}
                title={campaign.title}
                charityLogo={campaign.charity?.logoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(campaign.charity?.organizationName || 'Charity') + '&background=3b82f6&color=fff'}
                charity={campaign.charity?.organizationName || 'Unknown Organization'}
                charityId={campaign.charityId}
                daysLeft={daysLeft}
              />

              {/* Tab Navigation and Content */}
              <div className="bg-white rounded-xl shadow-md">
                <TabNavigation
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />

                <div className="p-6">
                  <TabContent
                    activeTab={activeTab}
                    description={campaign.description}
                    location={campaign.location || 'Not specified'}
                    milestones={campaign.milestones?.map(m => ({
                      id: m.id,
                      title: m.title,
                      description: m.description || '',
                      status: m.status,
                      date: m.createdAt,
                      amount: m.targetAmount,
                      evidence: m.evidenceDescription || undefined,
                    })) || []}
                    impactMetrics={[]}
                    recentActivities={[]}
                    campaignId={campaignId || ''}
                    campaignStatus={campaign.status}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Donation Box */}
            <div className="lg:col-span-1 space-y-6">
              <DonationCard
                campaign={{
                  id: campaign.id,
                  title: campaign.title,
                  imageUrl: campaign.imageUrl || '',
                  charity: campaign.charity?.organizationName || 'Unknown Organization',
                  raised: campaign.currentAmount,
                  goal: campaign.goalAmount,
                  daysLeft: daysLeft,
                  verified: campaign.charity?.verificationStatus === 'approved',
                  category: campaign.category || 'General',
                  donors: campaign.donorsCount || 0,
                  location: campaign.location || 'Not specified',
                  charityLogo: campaign.charity?.logoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(campaign.charity?.organizationName || 'Charity') + '&background=3b82f6&color=fff',
                  transparency: 0,
                  efficiency: 0,
                  description: campaign.description,
                  bannerUrl: campaign.imageUrl || '',
                  status: campaign.status,
                  charityId: campaign.charityId,
                }}
                isOwner={isOwner}
                userRole={user?.role || null}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CampaignDetail;
