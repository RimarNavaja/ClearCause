
import React, { useState, useEffect } from 'react';
import {
  Activity,
  Download,
  Filter,
  RefreshCw,
  Search,
  Calendar,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as activityLogService from '@/services/activityLogService';
import { ActivityLogEntry, ActivityLogFilters } from '@/lib/types';
import { getRelativeTime } from '@/utils/helpers';

const ActivityLog = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filter state
  const [filters, setFilters] = useState<ActivityLogFilters>({});
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  
  // Date range filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load action types for filter dropdown
  useEffect(() => {
    const loadActionTypes = async () => {
      if (!user?.id) return;
      try {
        const types = await activityLogService.getUniqueActionTypes(user.id);
        setActionTypes(types);
      } catch (error) {
        console.error('Failed to load action types:', error);
      }
    };
    loadActionTypes();
  }, [user?.id]);

  // Load activity logs
  useEffect(() => {
    loadActivityLogs();
  }, [user?.id, currentPage, pageSize, filters]);

  const loadActivityLogs = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const result = await activityLogService.getActivityLogs(
        filters,
        { page: currentPage, limit: pageSize },
        user.id
      );

      if (result.success && result.data) {
        setLogs(result.data);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotalRecords(result.pagination.total);
        }
      }
    } catch (error: any) {
      console.error('Failed to load activity logs:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load activity logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const newFilters: ActivityLogFilters = {};
    
    if (dateFrom) newFilters.dateFrom = dateFrom;
    if (dateTo) newFilters.dateTo = dateTo;
    if (searchQuery) newFilters.search = searchQuery;
    
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({});
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleExportCSV = async () => {
    if (!user?.id) return;

    try {
      setExporting(true);
      
      // Fetch all logs without pagination for export
      const result = await activityLogService.getActivityLogs(
        filters,
        { page: 1, limit: 10000 }, // Large limit to get all records
        user.id
      );

      if (result.success && result.data) {
        const csv = activityLogService.exportActivityLogsToCSV(result.data);
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Success',
          description: 'Activity log exported successfully',
        });
      }
    } catch (error: any) {
      console.error('Failed to export activity log:', error);
      toast({
        title: 'Error',
        description: 'Failed to export activity log',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <AdminLayout title="Activity Log">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
            <p className="text-muted-foreground">
              Audit trail of administrative actions and platform changes
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              disabled={exporting || logs.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button onClick={loadActivityLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter activity logs by date range, action type, or search term</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="dateFrom">Date From</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateTo">Date To</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search actions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <Button onClick={handleApplyFilters} className="flex-1">
                    Apply Filters
                  </Button>
                  <Button onClick={handleResetFilters} variant="outline">
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRecords.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Page</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentPage} of {totalPages}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Showing</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length} records</div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Log Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Records</CardTitle>
            <CardDescription>Detailed log of all administrative actions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No activity logs found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters or check back later
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const style = activityLogService.getActionStyle(log.action);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            <div className="text-sm">{new Date(log.createdAt).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {getRelativeTime(log.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {log.user?.fullName || log.user?.email || 'Unknown'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {log.user?.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={style.color}>
                              {activityLogService.formatActionName(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {log.entityType}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground max-w-xs truncate">
                              {log.details ? JSON.stringify(log.details) : '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to{' '}
                    {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && <span className="text-muted-foreground">...</span>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ActivityLog;
