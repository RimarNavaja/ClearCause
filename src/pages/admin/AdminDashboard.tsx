
import React, { useState, useEffect } from 'react';
import AdminStatsGrid from '@/components/admin/AdminStatsGrid';
import AdminGrowthMetrics from '@/components/admin/AdminGrowthMetrics';
import AdminPerformanceMetrics from '@/components/admin/AdminPerformanceMetrics';
import AdminQuickActions from '@/components/admin/AdminQuickActions';
import AdminRecentActivity from '@/components/admin/AdminRecentActivity';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import * as adminService from '@/services/adminService';
import { PlatformStatistics } from '@/lib/types';

const AdminDashboard = () => {
  const [stats, setStats] = useState<PlatformStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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
