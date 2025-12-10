
import React, { useState, useEffect } from 'react';
import AdminStatsGrid from '@/components/admin/AdminStatsGrid';
import AdminGrowthMetrics from '@/components/admin/AdminGrowthMetrics';
import AdminPerformanceMetrics from '@/components/admin/AdminPerformanceMetrics';
import AdminQuickActions from '@/components/admin/AdminQuickActions';
import AdminRecentActivity from '@/components/admin/AdminRecentActivity';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import * as adminService from '@/services/adminService';
import { PlatformStatistics } from '@/lib/types';
import { DollarSign, TrendingUp, CreditCard, PiggyBank } from 'lucide-react';
import {
  getTotalPlatformRevenue,
  getPlatformRevenueByPeriod,
  getPlatformRevenueByCampaign,
  CampaignRevenue,
} from '@/services/revenueService';

const AdminDashboard = () => {
  const [stats, setStats] = useState<PlatformStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Revenue stats state
  const [revenueStats, setRevenueStats] = useState({
    totalPlatformFees: 0,
    totalGatewayFees: 0,
    netRevenue: 0,
    monthlyPlatformFees: 0,
    monthlyGrowth: 0,
  });
  const [revenueLoading, setRevenueLoading] = useState(true);
  const [campaignRevenue, setCampaignRevenue] = useState<CampaignRevenue[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const result = await adminService.getPlatformStatistics(user.id);

        if (result.success && result.data) {
          setStats(result.data);
        }
      } catch (err) {
        console.error('Failed to load admin statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user]);

  // Load revenue data
  useEffect(() => {
    const loadRevenueData = async () => {
      try {
        setRevenueLoading(true);

        // Get lifetime revenue
        const totalRevenue = await getTotalPlatformRevenue();

        // Get this month's revenue
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const monthlyRevenue = await getPlatformRevenueByPeriod(startOfMonth, endOfMonth);

        // Get last month for growth calculation
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
        const lastMonthRevenue = await getPlatformRevenueByPeriod(startOfLastMonth, endOfLastMonth);

        const growth = lastMonthRevenue.platformFees > 0
          ? ((monthlyRevenue.platformFees - lastMonthRevenue.platformFees) / lastMonthRevenue.platformFees) * 100
          : 0;

        setRevenueStats({
          totalPlatformFees: totalRevenue.platformFees,
          totalGatewayFees: totalRevenue.gatewayFees,
          netRevenue: totalRevenue.netRevenue,
          monthlyPlatformFees: monthlyRevenue.platformFees,
          monthlyGrowth: growth,
        });

        // Load campaign revenue data
        const campaignRevenueData = await getPlatformRevenueByCampaign();
        setCampaignRevenue(campaignRevenueData.slice(0, 5)); // Top 5 campaigns
      } catch (error) {
        console.error('Error loading revenue data:', error);
      } finally {
        setRevenueLoading(false);
      }
    };

    loadRevenueData();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8">
        {/* Top banner */}
        <Card className="bg-gradient-to-r from-clearcause-muted via-white to-clearcause-muted border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Welcome to the <span className="text-clearcause-primary">Admin Dashboard</span>
                </h1>
                <p className="text-muted-foreground mt-1">
                  Monitor platform activity and manage verification processes
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-full text-xs bg-clearcause-light-blue text-clearcause-dark-blue font-medium">
                  Live Status: Operational
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Stats Grid */}
        <AdminStatsGrid />

        {/* Platform Revenue Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Platform Revenue</h2>
          {revenueLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mb-2" />
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Platform Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₱{revenueStats.totalPlatformFees.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">Lifetime platform fees collected</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₱{revenueStats.monthlyPlatformFees.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className={`text-xs ${revenueStats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenueStats.monthlyGrowth >= 0 ? '+' : ''}{revenueStats.monthlyGrowth.toFixed(1)}% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gateway Fees Paid</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₱{revenueStats.totalGatewayFees.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">Total PayMongo fees</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
                  <PiggyBank className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₱{revenueStats.netRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">Platform fees - Gateway fees</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Top Revenue-Generating Campaigns */}
        {!revenueLoading && campaignRevenue.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Top Revenue-Generating Campaigns</CardTitle>
              <CardDescription>Platform fees collected by campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Donations</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
                    <TableHead className="text-right">Platform Fees</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignRevenue.map((campaign) => (
                    <TableRow key={campaign.campaignId}>
                      <TableCell className="font-medium">{campaign.campaignTitle}</TableCell>
                      <TableCell className="text-right">{campaign.donationCount}</TableCell>
                      <TableCell className="text-right">
                        ₱{campaign.grossAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        ₱{campaign.platformFees.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Growth Metrics */}
        {!loading && <AdminGrowthMetrics stats={stats} />}

        {/* Performance Metrics */}
        {!loading && <AdminPerformanceMetrics stats={stats} />}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions */}
          <AdminQuickActions />

          {/* Recent Activity */}
          <AdminRecentActivity />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
