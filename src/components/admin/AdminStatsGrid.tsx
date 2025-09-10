
import React, { useState, useEffect } from 'react';
import { Clock, FileText, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import * as adminService from '@/services/adminService';
import { formatCurrency } from '@/utils/helpers';

const AdminStatsGrid = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadStats = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const result = await adminService.getPlatformStatistics(user.id);
        
        if (result.success && result.data) {
          setStats(result.data);
        } else {
          setError(result.error || 'Failed to load statistics');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Admin stats error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Failed to load statistics</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statItems = [
    {
      title: "Pending Verifications",
      value: stats?.pendingVerifications?.toString() || "0",
      change: "Awaiting review",
      icon: Clock,
      color: "text-orange-600",
      href: "/admin/verifications"
    },
    {
      title: "Total Users",
      value: stats?.totalUsers?.toString() || "0",
      change: `${stats?.activeUsers || 0} active`,
      icon: FileText,
      color: "text-blue-600",
      href: "/admin/donors"
    },
    {
      title: "Total Raised",
      value: formatCurrency(stats?.totalAmountRaised || 0),
      change: `${stats?.totalDonations || 0} donations`,
      icon: DollarSign,
      color: "text-green-600",
      href: "/admin/campaigns"
    },
    {
      title: "Active Campaigns",
      value: stats?.activeCampaigns?.toString() || "0",
      change: `${stats?.totalCampaigns || 0} total`,
      icon: TrendingUp,
      color: "text-purple-600",
      href: "/admin/campaigns"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat, index) => (
        <Link key={index} to={stat.href}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default AdminStatsGrid;
