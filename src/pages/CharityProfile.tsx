
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Mail, Phone, Globe, Star, BarChart4, Award, Calendar, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CampaignGrid from '@/components/ui/campaign/CampaignGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import * as charityService from '@/services/charityService';
import * as campaignService from '@/services/campaignService';
import { CharityOrganization, Campaign } from '@/lib/types';

const CHARITY_INFO = {
  id: '1',
  name: 'Water For All Foundation',
  logo: 'https://randomuser.me/api/portraits/men/32.jpg',
  description: 'Water For All Foundation is committed to providing clean, safe drinking water to communities in need around the world. We believe that access to clean water is a fundamental human right that plays a critical role in public health, education, and economic development.',
  website: 'https://waterforall.org',
  email: 'info@waterforall.org',
  phone: '+63 2 8123 4567',
  founded: 2005,
  headquarters: 'Manila, Philippines',
  scorecard: {
    transparency: 98,
    efficiency: 95,
    reportingFrequency: 'Weekly',
    milestoneAchievement: '96%',
    averageVerificationTime: '3 days'
  }
};

const ACTIVE_CAMPAIGNS = [
  {
    id: "1",
    title: "Build Clean Water Wells in Rural Villages",
    imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    charity: "Water For All Foundation",
    description: "Help us build 10 clean water wells that will provide safe drinking water to over 5,000 people in rural communities.",
    raised: 850000,
    goal: 1000000,
    daysLeft: 15,
    verified: true,
    category: "Clean Water",
  },
  {
    id: "4",
    title: "Water Filtration Systems for Schools",
    imageUrl: "https://images.unsplash.com/photo-1594398901394-4e34939a4fd0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    charity: "Water For All Foundation",
    description: "Install water filtration systems in 20 schools, providing clean drinking water to over 10,000 students.",
    raised: 275000,
    goal: 450000,
    daysLeft: 45,
    verified: true,
    category: "Clean Water",
  }
];

const PAST_CAMPAIGNS = [
  {
    id: "past1",
    title: "Emergency Water Relief After Typhoon",
    imageUrl: "https://images.unsplash.com/photo-1544476915-ed1370594142?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    charity: "Water For All Foundation",
    description: "Provided emergency water supplies to communities affected by the recent typhoon.",
    raised: 500000,
    goal: 500000,
    daysLeft: 0,
    verified: true,
    category: "Emergency Relief",
    completed: true,
    completionDate: "October 15, 2023",
  },
  {
    id: "past2",
    title: "Community Water Education Program",
    imageUrl: "https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    charity: "Water For All Foundation",
    description: "Educated 5,000 people about water conservation and hygiene practices.",
    raised: 350000,
    goal: 300000,
    daysLeft: 0,
    verified: true,
    category: "Education",
    completed: true,
    completionDate: "June 30, 2023",
  }
];

const CharityProfile: React.FC = () => {
  const { charityId } = useParams<{ charityId: string }>();
  const navigate = useNavigate();
  const [charity, setCharity] = useState<CharityOrganization | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get the campaign ID from navigation state if coming from campaign detail page
  const fromCampaignId = window.history.state?.usr?.fromCampaignId;

  useEffect(() => {
    const loadCharityData = async () => {
      if (!charityId) {
        setError('No charity ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch charity details
        const charityResult = await charityService.getCharityById(charityId);
        if (!charityResult.success || !charityResult.data) {
          setError(charityResult.error || 'Charity not found');
          setLoading(false);
          return;
        }

        setCharity(charityResult.data);

        // Fetch charity campaigns
        const campaignsResult = await campaignService.getCampaignsByCharity(
          charityId,
          { page: 1, limit: 50 }
        );

        if (campaignsResult.success && campaignsResult.data) {
          setCampaigns(campaignsResult.data);
        }
      } catch (err) {
        setError('Failed to load charity profile');
        console.error('Charity profile loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCharityData();
  }, [charityId]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clearcause-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading charity profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !charity) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Charity Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'The charity you are looking for does not exist.'}</p>
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

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const completedCampaigns = campaigns.filter(c => c.status === 'completed');

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow">
        {/* Breadcrumb */}
        <div className="bg-clearcause-muted py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center text-sm">
              <button
                onClick={() => navigate(-1)}
                className="text-clearcause-primary hover:text-clearcause-secondary flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Campaign
              </button>
            </div>
          </div>
        </div>
        
        {/* Charity Header Section */}
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="h-24 w-24 rounded-lg overflow-hidden border-2 border-gray-100 bg-white flex-shrink-0">
                <img
                  src={charity.logoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(charity.organizationName) + '&background=3b82f6&color=fff'}
                  alt={charity.organizationName}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{charity.organizationName}</h1>
                  {charity.verificationStatus === 'approved' && (
                    <div className="verified-badge ml-2">
                      <Check size={14} />
                      <span>Verified</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-3">
                  {charity.websiteUrl && (
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-1" />
                      <a
                        href={charity.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-clearcause-primary hover:underline flex items-center"
                      >
                        Website
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                  {charity.user?.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      <span>{charity.user.email}</span>
                    </div>
                  )}
                  {charity.contactPhone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      <span>{charity.contactPhone}</span>
                    </div>
                  )}
                  {charity.createdAt && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Founded: {new Date(charity.createdAt).getFullYear()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Charity Content */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* About Section */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">About</h2>
                  <p className="text-gray-700">{charity.description || 'No description available.'}</p>
                  {charity.address && (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Address</h3>
                      <p className="text-gray-700">{charity.address}</p>
                    </div>
                  )}
                </div>

                {/* Active Campaigns */}
                {activeCampaigns.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <h2 className="text-xl font-semibold">Active Campaigns</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {activeCampaigns.map((campaign) => (
                        <Link
                          key={campaign.id}
                          to={`/campaigns/${campaign.id}`}
                          className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <div className="h-44 overflow-hidden">
                            <img
                              src={campaign.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}
                              alt={campaign.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{campaign.title}</h3>
                            <div className="mb-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">
                                  ₱{campaign.currentAmount.toLocaleString()} raised
                                </span>
                                <span className="font-medium">
                                  {Math.round((campaign.currentAmount / campaign.goalAmount) * 100)}%
                                </span>
                              </div>
                              <Progress value={(campaign.currentAmount / campaign.goalAmount) * 100} className="h-2" />
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>{campaign.category || 'General'}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Past Campaigns */}
                {completedCampaigns.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <h2 className="text-xl font-semibold">Past Campaigns</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {completedCampaigns.map((campaign) => (
                        <Link
                          key={campaign.id}
                          to={`/campaigns/${campaign.id}`}
                          className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <div className="h-44 overflow-hidden relative">
                            <img
                              src={campaign.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}
                              alt={campaign.title}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute top-2 right-2 bg-clearcause-success text-white text-xs font-medium px-2 py-1 rounded-full">
                              Completed
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{campaign.title}</h3>
                            <div className="mb-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">
                                  ₱{campaign.currentAmount.toLocaleString()} raised
                                </span>
                                <span className="font-medium">
                                  {Math.round((campaign.currentAmount / campaign.goalAmount) * 100)}%
                                </span>
                              </div>
                              <Progress value={(campaign.currentAmount / campaign.goalAmount) * 100} className="h-2 bg-clearcause-muted" />
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                              <span>{campaign.category || 'General'}</span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-clearcause-muted rounded-xl p-6">
                  <h2 className="text-lg font-semibold mb-3">Quick Stats</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-clearcause-primary">{campaigns.length}</div>
                      <div className="text-sm text-gray-600">Total Campaigns</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-clearcause-primary">
                        ₱{(campaigns.reduce((sum, c) => sum + c.currentAmount, 0) / 1000).toFixed(1)}K
                      </div>
                      <div className="text-sm text-gray-600">Total Raised</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-clearcause-primary">{activeCampaigns.length}</div>
                      <div className="text-sm text-gray-600">Active Campaigns</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-clearcause-primary">{completedCampaigns.length}</div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CharityProfile;
