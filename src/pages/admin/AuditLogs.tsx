
import React, { useState, useEffect } from 'react';
import { FileText, Clock, User, Activity, RefreshCw, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { getAuditLogs } from '@/services/adminService';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { AuditLog } from '@/lib/types';

const AuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');

  useEffect(() => {
    const loadLogs = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const filters = entityTypeFilter !== 'all' ? { entityType: entityTypeFilter } : {};
        const result = await getAuditLogs(
          filters,
          { page: 1, limit: 100 }, // Get last 100 logs
          user.id
        );

        if (result.success && result.data) {
          setLogs(result.data);
          setTotalLogs(result.total);
        } else {
          console.error('Failed to load audit logs:', result.error);
          toast.error('Failed to load audit logs');
        }
      } catch (error) {
        console.error('Error loading audit logs:', error);
        toast.error('Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [user?.id, entityTypeFilter]);

  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.createdAt);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  return (
    <AdminLayout title="Audit Logs">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">System activity and administrative actions</p>
          </div>
        </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLogs}</div>
            <p className="text-xs text-muted-foreground">All recorded actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Actions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayLogs.length}</div>
            <p className="text-xs text-muted-foreground">Actions today</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system and administrative actions</CardDescription>
            </div>
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="campaign">Campaigns</SelectItem>
                <SelectItem value="donation">Donations</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="verification">Verifications</SelectItem>
                <SelectItem value="milestone">Milestones</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-clearcause-primary" />
                <p className="text-muted-foreground">Loading audit logs...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 p-3 border rounded hover:bg-gray-50">
                <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{log.action}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {log.entityType}
                    </span>
                  </div>
                  {log.details && (
                    <p className="text-sm text-muted-foreground">
                      {typeof log.details === 'object'
                        ? Object.entries(log.details).map(([key, value]) => `${key}: ${value}`).join(', ')
                        : log.details.toString()}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      <User className="h-3 w-3 inline mr-1" />
                      {log.user?.email || log.user?.fullName || 'System'}
                    </p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
};

export default AuditLogs;
