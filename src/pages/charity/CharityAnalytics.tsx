import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  Heart,
  Calendar,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CharityLayout from '@/components/layout/CharityLayout';
import { formatCurrency } from '@/utils/helpers';

const CharityAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  // Mock data
  const campaigns = [
    { id: '1', title: 'Clean Water Project' },
    { id: '2', title: 'School Rebuilding' },
  ];

  const stats = {
    totalRaised: 125000,
    totalDonors: 450,
    totalViews: 12500,
    conversionRate: 3.6,
    avgDonation: 278,
    repeatDonors: 85,
    campaignsActive: 2,
    milestonesCompleted: 5,
  };

  const recentDonations = [
    { id: '1', amount: 500, donor: 'Anonymous', campaign: 'Clean Water Project', date: '2025-01-20' },
    { id: '2', amount: 1000, donor: 'John D.', campaign: 'School Rebuilding', date: '2025-01-19' },
    { id: '3', amount: 250, donor: 'Anonymous', campaign: 'Clean Water Project', date: '2025-01-19' },
  ];

  const topCampaigns = [
    { title: 'Clean Water Project', raised: 75000, goal: 100000, donors: 280 },
    { title: 'School Rebuilding', raised: 50000, goal: 75000, donors: 170 },
  ];

  return (
    <CharityLayout title="Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Track your campaign performance and engagement metrics</p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Raised</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRaised)}</p>
                  <p className="text-xs text-green-600 mt-1">+12% from last month</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Donors</p>
                  <p className="text-2xl font-bold">{stats.totalDonors}</p>
                  <p className="text-xs text-blue-600 mt-1">+8% from last month</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Campaign Views</p>
                  <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                  <p className="text-xs text-purple-600 mt-1">+15% from last month</p>
                </div>
                <Eye className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                  <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                  <p className="text-xs text-orange-600 mt-1">+0.5% from last month</p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg. Donation</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.avgDonation)}</p>
                </div>
                <Heart className="h-6 w-6 text-pink-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Repeat Donors</p>
                  <p className="text-2xl font-bold">{stats.repeatDonors}</p>
                </div>
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
                  <p className="text-2xl font-bold">{stats.campaignsActive}</p>
                </div>
                <BarChart3 className="h-6 w-6 text-teal-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Milestones Done</p>
                  <p className="text-2xl font-bold">{stats.milestonesCompleted}</p>
                </div>
                <Calendar className="h-6 w-6 text-cyan-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Campaigns</CardTitle>
              <CardDescription>Campaigns ranked by funds raised</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCampaigns.map((campaign, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{campaign.title}</p>
                        <p className="text-sm text-gray-500">{campaign.donors} donors</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(campaign.raised)}</p>
                        <p className="text-sm text-gray-500">
                          of {formatCurrency(campaign.goal)}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(campaign.raised / campaign.goal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Donations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Donations</CardTitle>
              <CardDescription>Latest contributions to your campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentDonations.map((donation) => (
                  <div key={donation.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{donation.donor}</p>
                      <p className="text-sm text-gray-500">{donation.campaign}</p>
                      <p className="text-xs text-gray-400">{new Date(donation.date).toLocaleDateString()}</p>
                    </div>
                    <p className="font-semibold text-green-600">{formatCurrency(donation.amount)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Donation Trends</CardTitle>
            <CardDescription>Monthly donation performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Chart visualization will be integrated here</p>
                <p className="text-sm text-gray-400">Using Chart.js or Recharts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Engagement Metrics */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="donors">Donor Insights</TabsTrigger>
            <TabsTrigger value="campaigns">Campaign Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Engagement Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Page Views</p>
                    <p className="text-2xl font-bold">12.5K</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Unique Visitors</p>
                    <p className="text-2xl font-bold">8.2K</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg. Time on Page</p>
                    <p className="text-2xl font-bold">3:45</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bounce Rate</p>
                    <p className="text-2xl font-bold">32%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="donors">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Donor Demographics</h3>
                <p className="text-gray-500">Detailed donor insights coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campaigns">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Campaign Breakdown</h3>
                <p className="text-gray-500">Individual campaign analytics coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CharityLayout>
  );
};

export default CharityAnalytics;
