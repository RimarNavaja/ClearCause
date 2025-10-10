
import React, { useState, useEffect } from 'react';
import { CheckCircle, DollarSign, Shield, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import * as adminService from '@/services/adminService';

const AdminQuickActions = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({
    pendingCharityVerifications: 0,
    pendingCampaigns: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCounts = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);

        // Fetch all stats in parallel
        const [statsResult] = await Promise.all([
          adminService.getPlatformStatistics(user.id),
        ]);

        setCounts({
          pendingCharityVerifications: statsResult.data?.pendingVerifications || 0,
          pendingCampaigns: 0, // Will be calculated from campaigns with draft status
        });
      } catch (error) {
        console.error('Error loading quick action counts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCounts();
  }, [user?.id]);

  const quickActions = [
    {
      title: "Charity Verifications",
      description: "Review charity applications",
      icon: Shield,
      href: "/admin/charity-verifications",
      color: "bg-clearcause-light-blue text-clearcause-dark-blue",
      count: loading ? "..." : counts.pendingCharityVerifications > 0 ? `${counts.pendingCharityVerifications} pending` : "No pending"
    },
    {
      title: "Campaign Reviews",
      description: "Approve campaign applications",
      icon: CheckCircle,
      href: "/admin/campaigns",
      color: "bg-emerald-50 text-emerald-600",
      count: loading ? "..." : counts.pendingCampaigns > 0 ? `${counts.pendingCampaigns} pending` : "View all"
    },
    {
      title: "User Management",
      description: "Manage user accounts",
      icon: FileText,
      href: "/admin/users",
      color: "bg-purple-50 text-purple-600",
      count: null
    },
    {
      title: "Platform Settings",
      description: "Manage site configuration",
      icon: FileText,
      href: "/admin/settings",
      color: "bg-orange-50 text-orange-600",
      count: null
    }
  ];

  return (
    <Card className="border-clearcause-light-blue/50">
      <CardHeader>
        <CardTitle className="text-clearcause-primary">Quick Actions</CardTitle>
        <CardDescription>
          Access key administrative functions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickActions.map((action, index) => (
          <Link key={index} to={action.href}>
            <div className="flex items-center space-x-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-all hover:shadow-sm">
              <div className={`p-2 rounded-lg ${action.color}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{action.title}</h4>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
              {action.count && (
                <Badge variant="outline" className="text-xs">
                  {action.count}
                </Badge>
              )}
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
};

export default AdminQuickActions;
