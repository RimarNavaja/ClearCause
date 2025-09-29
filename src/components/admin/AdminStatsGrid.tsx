
import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import * as adminService from '@/services/adminService';
import { formatCurrency } from '@/utils/helpers';
import { PlatformStatistics } from '@/lib/types';

const AdminStatsGrid = () => {
  const [stats, setStats] = useState<PlatformStatistics | null>(null);
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
          <Card key={index} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-clearcause-muted rounded animate-pulse" />
              <div className="h-4 w-4 bg-clearcause-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-clearcause-muted rounded animate-pulse mb-2" />
              <div className="h-4 w-20 bg-clearcause-muted rounded animate-pulse" />
              <div className="mt-4 h-12 bg-clearcause-muted/50 rounded animate-pulse" />
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
      value: stats?.pendingVerifications || 0,
      change: "Awaiting review",
      icon: Clock,
      color: "text-clearcause-accent",
      barColor: "#F59E0B",
      href: "/admin/verifications",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      change: `${stats?.activeUsers || 0} active`,
      icon: Users,
      color: "text-clearcause-primary",
      barColor: "#0891B2",
      href: "/admin/donors",
    },
    {
      title: "Total Raised",
      value: stats?.totalAmountRaised || 0,
      change: `${stats?.totalDonations || 0} donations`,
      icon: DollarSign,
      color: "text-green-600",
      barColor: "#22C55E",
      isCurrency: true,
      href: "/admin/campaigns",
    },
    {
      title: "Active Campaigns",
      value: stats?.activeCampaigns || 0,
      change: `${stats?.totalCampaigns || 0} total`,
      icon: TrendingUp,
      color: "text-purple-600",
      barColor: "#7C3AED",
      href: "/admin/campaigns",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statItems.map((stat, index) => (
        <Link key={index} to={stat.href}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.isCurrency ? formatCurrency(stat.value) : stat.value.toString()}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{stat.change}</p>
              {/* Mini progress bar based on relative value */}
              <div className="mt-2">
                <div className="h-2 w-full rounded bg-muted relative overflow-hidden">
                  <div
                    className="h-2 rounded animate-progress-fill"
                    style={{
                      width: `${Math.min(100, (Number(stat.value) || 0) / (Number(stats?.totalUsers) || 1) * 100)}%`,
                      backgroundColor: stat.barColor
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default AdminStatsGrid;
