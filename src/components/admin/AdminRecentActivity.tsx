
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, User, DollarSign, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import * as adminService from '@/services/adminService';
import { getRelativeTime } from '@/utils/helpers';

const AdminRecentActivity = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadRecentActivity = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const result = await adminService.getRecentActivity(10, user.id);
        
        if (result.success && result.data) {
          setActivities(result.data);
        } else {
          setError(result.error || 'Failed to load recent activity');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Recent activity error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRecentActivity();
  }, [user]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'donation':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'campaign_created':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'verification':
        return <CheckCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityHref = (type: string, entityId?: string) => {
    switch (type) {
      case 'user_signup':
        return '/admin/donors';
      case 'donation':
        return '/admin/campaigns';
      case 'campaign_created':
        return '/admin/campaigns';
      case 'verification':
        return '/admin/verifications';
      default:
        return '/admin/logs';
    }
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
          <CardDescription>Failed to load recent activity</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
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
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          activities.map((activity) => (
            <Link key={activity.id} to={getActivityHref(activity.type)}>
              <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-all hover:shadow-sm cursor-pointer">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {getRelativeTime(activity.timestamp)}
                    </p>
                    {activity.userName && (
                      <Badge variant="outline" className="text-xs">
                        {activity.userName}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
        <Button variant="outline" className="w-full mt-3" asChild>
          <Link to="/admin/logs">View All Activity</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminRecentActivity;
