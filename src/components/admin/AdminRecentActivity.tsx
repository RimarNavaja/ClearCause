
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, User, DollarSign, FileText, Shield, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import * as activityLogService from '@/services/activityLogService';
import { getRelativeTime } from '@/utils/helpers';
import { ActivityLogEntry } from '@/lib/types';

const AdminRecentActivity = () => {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadRecentActivity = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const logs = await activityLogService.getRecentCriticalActivity(10, user.id);
        setActivities(logs);
        setError(null);
      } catch (err: any) {
        console.error('Recent activity error:', err);
        setActivities([]);
        setError(null); // Don't show error, just empty state
      } finally {
        setLoading(false);
      }
    };

    loadRecentActivity();
  }, [user]);

  const getActivityIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('approve')) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (actionLower.includes('reject')) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (actionLower.includes('setting')) {
      return <Settings className="h-4 w-4 text-purple-500" />;
    }
    if (actionLower.includes('verification')) {
      return <Shield className="h-4 w-4 text-orange-500" />;
    }
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const formatActivityDescription = (log: ActivityLogEntry): string => {
    const userName = log.user?.fullName || log.user?.email || 'Admin';
    const action = activityLogService.formatActionName(log.action);
    
    if (log.details && log.details.key) {
      return `${userName} updated ${log.details.key} setting`;
    }
    
    return `${userName} performed ${action}`;
  };

  if (loading) {
    return (
      <Card className="border-clearcause-light-blue/50">
        <CardHeader>
          <CardTitle className="text-clearcause-primary">Recent Activity</CardTitle>
          <CardDescription>Loading recent activity...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-start space-x-3 p-2">
              <div className="h-4 w-4 bg-clearcause-muted rounded animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full bg-clearcause-muted rounded animate-pulse" />
                <div className="h-3 w-20 bg-clearcause-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Recent Activity</CardTitle>
          <CardDescription>Unable to load recent activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-600 mb-2">{error}</p>
              {error.includes('FORBIDDEN') && (
                <p className="text-xs text-muted-foreground">
                  Make sure you're logged in as an administrator to view activity logs.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-clearcause-light-blue/50">
      <CardHeader>
        <CardTitle className="text-clearcause-primary">Recent Activity</CardTitle>
        <CardDescription>
          Latest platform events requiring attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity to display</p>
            <p className="text-xs text-muted-foreground mt-1">Activity will appear here as admins make changes</p>
          </div>
        ) : (
          activities.map((log) => (
            <Link key={log.id} to="/admin/activity-log">
              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-all hover:shadow-sm cursor-pointer">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activityLogService.formatActionName(log.action)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatActivityDescription(log)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {getRelativeTime(log.createdAt)}
                    </p>
                    {log.user && (
                      <Badge variant="outline" className="text-xs">
                        {log.user.fullName || log.user.email}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
        <Button variant="outline" className="w-full mt-3" asChild>
          <Link to="/admin/activity-log">View All Activity</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminRecentActivity;
