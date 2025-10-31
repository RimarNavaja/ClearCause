import React from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Clock,
  Shield,
  Search,
  BarChart4,
  CreditCard,
  Check,
  Users,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

import { Campaign, CampaignStatus } from "@/lib/types";

const SAMPLE_CAMPAIGNS: Campaign[] = [
  {
    id: "1",
    charityId: "charity-1",
    title: "Build Clean Water Wells in Rural Villages",
    description:
      "Help us build 10 clean water wells that will provide safe drinking water to over 5,000 people in rural communities.",
    goalAmount: 1000000,
    currentAmount: 850000,
    donorsCount: 15,
    imageUrl:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    status: "active" as CampaignStatus,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Clean Water",
    location: "Rural Villages",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 85,
    charity: {
      id: "charity-1",
      userId: "user-1",
      organizationName: "Water For All Foundation",
      organizationType: "Non-profit",
      description: "Providing clean water access worldwide",
      websiteUrl: null,
      logoUrl: null,
      contactEmail: null,
      contactPhone: null,
      address: null,
      verificationStatus: "approved",
      verificationNotes: null,
      transparencyScore: null,
      totalRaised: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: "2",
    charityId: "charity-2",
    title: "Rebuild School After Typhoon Damage",
    description:
      "Help rebuild the elementary school that was severely damaged during the recent typhoon, affecting 500 students.",
    goalAmount: 750000,
    currentAmount: 320000,
    donorsCount: 24,
    imageUrl:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    status: "active" as CampaignStatus,
    startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Education",
    location: "Philippines",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 43,
    charity: {
      id: "charity-2",
      userId: "user-2",
      organizationName: "EducateNow",
      organizationType: "Non-profit",
      description: "Education for all children",
      websiteUrl: null,
      logoUrl: null,
      contactEmail: null,
      contactPhone: null,
      address: null,
      verificationStatus: "approved",
      verificationNotes: null,
      transparencyScore: null,
      totalRaised: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    id: "3",
    charityId: "charity-3",
    title: "Community Food Bank Expansion",
    description:
      "Help us expand our food bank to serve an additional 200 families per week in the local community.",
    goalAmount: 350000,
    currentAmount: 175000,
    donorsCount: 30,
    imageUrl:
      "https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    status: "active" as CampaignStatus,
    startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Food Security",
    location: "Local Community",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 50,
    charity: {
      id: "charity-3",
      userId: "user-3",
      organizationName: "Food For Everyone",
      organizationType: "Non-profit",
      description: "Fighting hunger in local communities",
      websiteUrl: null,
      logoUrl: null,
      contactEmail: null,
      contactPhone: null,
      address: null,
      verificationStatus: "pending",
      verificationNotes: null,
      transparencyScore: null,
      totalRaised: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

// Custom campaign card component for homepage that matches Figma design
const HomeCampaignCard: React.FC<{ campaign: Campaign }> = ({ campaign }) => {
  const progressPercentage = Math.min(
    (campaign.currentAmount / campaign.goalAmount) * 100,
    100
  );
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(campaign.endDate || "").getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    )
  );

  const formatPHP = (amount: number) => {
    return `PHP ${amount.toLocaleString("en-PH")}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
      <div className="relative h-48">
        <img
          src={campaign.imageUrl || "/api/placeholder/400/300"}
          alt={campaign.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-4 left-4">
          <Badge className="bg-blue-600 text-white text-xs font-medium px-3 py-1">
            {campaign.category}
          </Badge>
        </div>
        {campaign.charity?.verificationStatus === "approved" && (
          <div className="absolute top-4 right-4">
            <Badge className="bg-green-600 text-white text-xs font-medium px-3 py-1">
              <Check className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
          {campaign.title}
        </h3>
        <p className="text-sm text-gray-600 mb-1">
          by {campaign.charity?.organizationName}
        </p>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
          {campaign.description}
        </p>

        <div className="space-y-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-bold text-gray-900">
                {formatPHP(campaign.currentAmount)}
              </p>
              <p className="text-sm text-gray-500">
                of {formatPHP(campaign.goalAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {daysLeft} days left
              </p>
            </div>
          </div>

          <Link to={`/donate/${campaign.id}`}>
            <Button className="w-full bg-clearcause-accent hover:bg-clearcause-accent/90 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2">
              <Heart className="h-4 w-4" />
              Donate Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const Index: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-200 via-white to-white relative overflow-hidden">
          {/* <div className="absolute top-1/2 right-20 opacity-15">
            <img src="/trazado-pink.png" alt="" className="w-40 h-40" />
          </div> */}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10">
            {/* Decorative Elements */}
            <div className="absolute bottom-4 left-2">
              <img
                src="/Decoration-1.svg"
                alt=""
                className="w-[145px] h-[30px]"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="font-sans">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6 ">
                  Donate with confidence.
                  <br />
                  <span className="text-blue-600">Track every pesos</span>, see
                  the impact.
                </h1>
                <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed font-sans">
                  ClearCause is the first donation platform focused on radical
                  transparency, providing verifiable, real-time impact tracking
                  to restore trust in charitable giving.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/campaigns">
                    <Button
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg"
                    >
                      Browse Campaigns
                    </Button>
                  </Link>
                  <Link to="/how-it-works">
                    <Button
                      size="lg"
                      variant="outline"
                      className="text-blue-600 border-blue-600 hover:bg-blue-50 font-semibold px-8 py-4 rounded-lg"
                    >
                      How It Works
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="absolute -top-10 -right-4 ">
                  <img
                    src="/Decoration-7.svg"
                    alt=""
                    className="w-[26px] h-[25px]"
                  />
                </div>
                <img
                  src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                  alt="Children benefiting from charitable donations"
                  className="rounded-2xl shadow-2xl w-full h-auto"
                />
                <div className="absolute -right-6 -bottom-6 bg-white p-6 rounded-xl shadow-lg border border-gray-100 w-48 max-h-26 mr-4 lg:mr-0">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Project Progress
                    </span>
                    <span className="text-sm font-bold">75%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                    <div
                      className="bg-blue-700 h-3 rounded-full transition-all duration-500"
                      style={{ width: "75%" }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">Updated 2 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-white relative">
          {/* Decorative Elements */}
          {/* <div className="absolute top-10 left-10 opacity-10">
            <img src="/decoration-6.png" alt="" className="w-28 h-28" />
          </div> */}
          {/* <div className="absolute bottom-10 right-10 opacity-20">
            <img src="/decoration.png" alt="" className="w-36 h-36" />
          </div> */}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                How ClearCause Works
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                We're revolutionizing the way charitable giving works through
                transparency and accountability
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-blue-50 rounded-2xl p-8 text-center hover:shadow-lg transition-all duration-300">
                <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">
                  Verified Campaigns
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Every campaign on our platform goes through a rigorous
                  verification process to ensure legitimacy and impact.
                </p>
              </div>

              <div className="bg-blue-50 rounded-2xl p-8 text-center hover:shadow-lg transition-all duration-300">
                <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <BarChart4 className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">
                  Real-time Tracking
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Track the impact of your donation in real-time with detailed
                  metrics and updates from the field.
                </p>
              </div>

              <div className="bg-blue-50 rounded-2xl p-8 text-center hover:shadow-lg transition-all duration-300">
                <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <CreditCard className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">
                  Milestone-Based Funding
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Funds are released to campaigns only after milestone
                  completion is verified by ClearCause.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <Link
                to="/how-it-works"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-lg transition-colors"
              >
                Learn more about our process
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Campaigns Section */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  Featured Campaigns
                </h2>
                <p className="text-lg text-gray-600">
                  Support these verified campaigns making a real difference
                </p>
              </div>
              <Link
                to="/campaigns"
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center text-lg"
              >
                View all campaigns
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {SAMPLE_CAMPAIGNS.map((campaign) => (
                <HomeCampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </div>
        </section>

        {/* Transparency Promise Section */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-700 rounded-3xl overflow-hidden shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-8 md:p-12 lg:p-16">
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                    Our Transparency Promise
                  </h2>
                  <p className="text-white/90 text-lg mb-8 leading-relaxed">
                    We verify every milestone before releasing funds and provide
                    detailed reports on how your donation is making an impact.
                  </p>
                  <div className="space-y-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mt-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <p className="ml-4 text-white/90 text-lg">
                        100% verified milestones before fund release
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mt-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <p className="ml-4 text-white/90 text-lg">
                        Real-time impact tracking for every donation
                      </p>
                    </div>
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mt-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <p className="ml-4 text-white/90 text-lg">
                        Only 1-3% platform fee, much lower than industry average
                      </p>
                    </div>
                  </div>
                  <div className="mt-10">
                    <Link to="/about">
                      <Button
                        size="lg"
                        className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 rounded-lg"
                      >
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
        <section className="py-20 bg-gradient-to-br from-blue-50 to-purple-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Ready to make a transparent impact?
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Join thousands of donors who are tracking their impact in
              real-time and restoring trust in charitable giving.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link to="/campaigns">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-4 rounded-lg"
                >
                  Browse Campaigns
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-blue-600 border-blue-600 hover:bg-blue-50 font-semibold px-10 py-4 rounded-lg"
                >
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
