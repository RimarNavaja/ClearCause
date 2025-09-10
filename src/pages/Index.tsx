
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Shield, Search, BarChart4, CreditCard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CampaignGrid from '@/components/ui/campaign/CampaignGrid';

import { Campaign, CampaignStatus } from '@/lib/types';

const SAMPLE_CAMPAIGNS: Campaign[] = [
  {
    id: "1",
    charityId: "charity-1",
    title: "Build Clean Water Wells in Rural Villages",
    description: "Help us build 10 clean water wells that will provide safe drinking water to over 5,000 people in rural communities.",
    goalAmount: 1000000,
    currentAmount: 850000,
    imageUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    status: 'active' as CampaignStatus,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Clean Water",
    location: "Rural Villages",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 85,
    charity: {
      id: "charity-1",
      organizationName: "Water For All Foundation",
      isVerified: true,
    }
  },
  {
    id: "2",
    charityId: "charity-2",
    title: "Rebuild School After Typhoon Damage",
    description: "Help rebuild the elementary school that was severely damaged during the recent typhoon, affecting 500 students.",
    goalAmount: 750000,
    currentAmount: 320000,
    imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    status: 'active' as CampaignStatus,
    startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Education",
    location: "Philippines",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 43,
    charity: {
      id: "charity-2",
      organizationName: "EducateNow",
      isVerified: true,
    }
  },
  {
    id: "3",
    charityId: "charity-3",
    title: "Community Food Bank Expansion",
    description: "Help us expand our food bank to serve an additional 200 families per week in the local community.",
    goalAmount: 350000,
    currentAmount: 175000,
    imageUrl: "https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    status: 'active' as CampaignStatus,
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Food Security",
    location: "Local Community",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 50,
    charity: {
      id: "charity-3",
      organizationName: "Food For Everyone",
      isVerified: false,
    }
  }
];

const Index: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-clearcause-muted via-white to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
                  Donate with confidence. <span className="text-clearcause-primary">Track every dollar</span>, see the impact.
                </h1>
                <p className="text-xl text-gray-600 mb-8">
                  ClearCause is the first donation platform focused on radical transparency, providing verifiable, real-time impact tracking to restore trust in charitable giving.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/campaigns">
                    <Button className="bg-clearcause-accent hover:bg-clearcause-accent/90 text-white font-medium px-8 py-6">
                      Browse Campaigns
                    </Button>
                  </Link>
                  <Link to="/how-it-works">
                    <Button variant="outline" className="text-clearcause-primary hover:text-clearcause-primary border-clearcause-primary hover:border-clearcause-primary px-8 py-6">
                      How It Works
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Transparent charity impact" 
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute -right-4 -bottom-6 bg-white p-4 rounded-lg shadow-lg w-48">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Project Progress</span>
                    <span className="text-sm font-bold">75%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-clearcause-success h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Updated 2 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900">How ClearCause Works</h2>
              <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
                We're revolutionizing the way charitable giving works through transparency and accountability
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-clearcause-muted rounded-xl p-6 text-center">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Shield className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Verified Campaigns</h3>
                <p className="text-gray-600">
                  Every campaign on our platform goes through a rigorous verification process to ensure legitimacy and impact.
                </p>
              </div>
              
              <div className="bg-clearcause-muted rounded-xl p-6 text-center">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <BarChart4 className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Real-time Tracking</h3>
                <p className="text-gray-600">
                  Track the impact of your donation in real-time with detailed metrics and updates from the field.
                </p>
              </div>
              
              <div className="bg-clearcause-muted rounded-xl p-6 text-center">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CreditCard className="h-8 w-8 text-clearcause-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Milestone-Based Funding</h3>
                <p className="text-gray-600">
                  Funds are released to campaigns only after milestone completion is verified by ClearCause.
                </p>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <Link to="/how-it-works" className="inline-flex items-center text-clearcause-primary hover:text-clearcause-secondary font-medium">
                Learn more about our process 
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Campaigns Section */}
        <section className="py-16 bg-clearcause-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Featured Campaigns</h2>
                <p className="mt-2 text-gray-600">
                  Support these verified campaigns making a real difference
                </p>
              </div>
              <Link to="/campaigns" className="text-clearcause-primary hover:text-clearcause-secondary font-medium flex items-center">
                View all campaigns
                <ChevronRight className="ml-1 h-5 w-5" />
              </Link>
            </div>
            
            <CampaignGrid campaigns={SAMPLE_CAMPAIGNS} />
          </div>
        </section>

        {/* Transparency Promise Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-clearcause-primary to-clearcause-dark-blue rounded-2xl overflow-hidden shadow-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-8 md:p-12">
                  <h2 className="text-3xl font-bold text-white mb-4">Our Transparency Promise</h2>
                  <p className="text-white/90 text-lg mb-8">
                    We verify every milestone before releasing funds and provide detailed reports on how your donation is making an impact.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mt-1">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="ml-3 text-white/90">100% verified milestones before fund release</p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mt-1">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="ml-3 text-white/90">Real-time impact tracking for every donation</p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center mt-1">
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                      <p className="ml-3 text-white/90">Only 1-3% platform fee, much lower than industry average</p>
                    </div>
                  </div>
                  <div className="mt-8">
                    <Link to="/about">
                      <Button className="bg-white text-clearcause-primary hover:bg-white/90">
                        Learn More
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="hidden lg:block relative">
                  <img 
                    src="https://images.unsplash.com/photo-1579208570378-8c970854bc23?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                    alt="Transparency in action" 
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-clearcause-muted">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to make a transparent impact?</h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Join thousands of donors who are tracking their impact in real-time and restoring trust in charitable giving.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/campaigns">
                <Button className="bg-clearcause-accent hover:bg-clearcause-accent/90 text-white font-medium px-8 py-6">
                  Browse Campaigns
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="outline" className="text-clearcause-primary hover:text-clearcause-primary border-clearcause-primary hover:border-clearcause-primary px-8 py-6">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
