
import React from 'react';
import AdminStatsGrid from '@/components/admin/AdminStatsGrid';
import AdminQuickActions from '@/components/admin/AdminQuickActions';
import AdminRecentActivity from '@/components/admin/AdminRecentActivity';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';

const AdminDashboard = () => {
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

        {/* Stats Grid */}
        <AdminStatsGrid />

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
