import React, { useState, useEffect } from 'react';
import { Activity, Users, DollarSign, FileText, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatCurrency } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import { getAuditLogs } from '@/services/adminService';
import { toast } from 'sonner';
import type { AuditLog } from '@/lib/types';

interface ActivityLog {
  id: string;
  type: 'donation' | 'campaign' | 'verification' | 'user' | 'system';
  action: string;
  user: string;
  details: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

const ActivityMonitor: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Map entity type to activity type
  const mapEntityTypeToActivityType = (entityType: string): ActivityLog['type'] => {
    const lowerType = entityType.toLowerCase();
    if (lowerType.includes('donation')) return 'donation';
    if (lowerType.includes('campaign')) return 'campaign';
    if (lowerType.includes('verification') || lowerType.includes('charity')) return 'verification';
    if (lowerType.includes('user') || lowerType.includes('profile')) return 'user';
    return 'system';
  };

  // Determine status from action
  const determineStatus = (action: string): ActivityLog['status'] => {
    const lowerAction = action.toLowerCase();
    if (lowerAction.includes('failed') || lowerAction.includes('error') || lowerAction.includes('reject')) return 'error';
    if (lowerAction.includes('pending') || lowerAction.includes('submit')) return 'warning';
    return 'success';
  };

  // Convert AuditLog to ActivityLog
  const convertToActivityLog = (auditLog: AuditLog): ActivityLog => {
    return {
      id: auditLog.id,
      type: mapEntityTypeToActivityType(auditLog.entityType),
      action: auditLog.action,
      user: auditLog.user?.email || auditLog.user?.fullName || 'System',
      details: typeof auditLog.details === 'object' && auditLog.details
        ? Object.entries(auditLog.details).map(([key, value]) => `${key}: ${value}`).join(', ')
        : auditLog.details?.toString() || 'No additional details',
      timestamp: auditLog.createdAt,
      status: determineStatus(auditLog.action),
    };
  };

  useEffect(() => {
    const loadActivities = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const result = await getAuditLogs(
          {}, // No filters - get all recent activities
          { page: 1, limit: 50 }, // Get last 50 activities
          user.id
        );

        if (result.success && result.data) {
          const convertedActivities = result.data.map(convertToActivityLog);
          setActivities(convertedActivities);
        } else {
          console.error('Failed to load activities:', result.error);
          toast.error('Failed to load recent activities');
        }
      } catch (error) {
        console.error('Error loading activities:', error);
        toast.error('Failed to load recent activities');
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [user?.id]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'donation':
        return <DollarSign className="h-4 w-4" />;
      case 'campaign':
        return <FileText className="h-4 w-4" />;
      case 'verification':
        return <CheckCircle className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      case 'system':
        return <Activity className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const stats = {
    totalActivities: activities.length,
    todayActivities: activities.filter((a) => {
      const today = new Date().toDateString();
      return new Date(a.timestamp).toDateString() === today;
    }).length,
    successRate: activities.length > 0
      ? ((activities.filter((a) => a.status === 'success').length / activities.length) * 100).toFixed(1)
      : '0.0',
    pendingActions: activities.filter((a) => a.status === 'warning').length,
  };

  return (
    <AdminLayout title="Activity Monitor">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Activities</p>
                  <p className="text-2xl font-bold">{stats.totalActivities}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Today's Activity</p>
                  <p className="text-2xl font-bold">{stats.todayActivities}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Success Rate</p>
                  <p className="text-2xl font-bold">{stats.successRate}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Actions</p>
                  <p className="text-2xl font-bold">{stats.pendingActions}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Real-Time Activity Feed</CardTitle>
            <CardDescription>Monitor all platform activities as they happen</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All Activities</TabsTrigger>
                <TabsTrigger value="donations">Donations</TabsTrigger>
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                <TabsTrigger value="verifications">Verifications</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3 mt-4">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="animate-pulse border rounded-lg p-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-3 flex-1">
                          <div className="p-2 bg-blue-100 rounded-full h-fit">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{activity.action}</h4>
                              {getStatusBadge(activity.status)}
                            </div>
                            <p className="text-sm text-gray-600">{activity.details}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>User: {activity.user}</span>
                              <span>•</span>
                              <span>{new Date(activity.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="donations">
                <div className="space-y-3 mt-4">
                  {activities
                    .filter((a) => a.type === 'donation')
                    .map((activity) => (
                      <div key={activity.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{activity.action}</h4>
                            <p className="text-sm text-gray-600">{activity.details}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {getStatusBadge(activity.status)}
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="campaigns">
                <div className="space-y-3 mt-4">
                  {activities
                    .filter((a) => a.type === 'campaign')
                    .map((activity) => (
                      <div key={activity.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{activity.action}</h4>
                            <p className="text-sm text-gray-600">{activity.details}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {getStatusBadge(activity.status)}
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="verifications">
                <div className="space-y-3 mt-4">
                  {activities
                    .filter((a) => a.type === 'verification')
                    .map((activity) => (
                      <div key={activity.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{activity.action}</h4>
                            <p className="text-sm text-gray-600">{activity.details}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {getStatusBadge(activity.status)}
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="users">
                <div className="space-y-3 mt-4">
                  {activities
                    .filter((a) => a.type === 'user')
                    .map((activity) => (
                      <div key={activity.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{activity.action}</h4>
                            <p className="text-sm text-gray-600">{activity.details}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                          {getStatusBadge(activity.status)}
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <Badge className="bg-green-100 text-green-800">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Payment Gateway</span>
                  <Badge className="bg-green-100 text-green-800">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Email Service</span>
                  <Badge className="bg-green-100 text-green-800">Operational</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage</span>
                  <Badge className="bg-green-100 text-green-800">Operational</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total Activities</span>
                  <span className="font-semibold">{stats.totalActivities}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Today's Activities</span>
                  <span className="font-semibold">{stats.todayActivities}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending Actions</span>
                  <span className="font-semibold">{stats.pendingActions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Success Rate</span>
                  <span className="font-semibold">{stats.successRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ActivityMonitor;
