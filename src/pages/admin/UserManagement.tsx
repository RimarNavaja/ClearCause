
import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MoreHorizontal,
  Shield,
  ShieldOff,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as userService from '@/services/userService';
import * as adminService from '@/services/adminService';
import { User, UserRole } from '@/lib/types';
import { formatCurrency, getRelativeTime, debounce } from '@/utils/helpers';

interface UserWithStats extends User {
  totalDonated?: number;
  campaignsSupported?: number;
  totalRaised?: number;
  activeCampaigns?: number;
  organizationName?: string;
}

const UserManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'donors' | 'charities' | 'pending'>('all');
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeDonors: 0,
    verifiedCharities: 0,
    pendingApprovals: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: "default" as const, color: "bg-green-100 text-green-800" },
      pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800" },
      suspended: { variant: "destructive" as const, color: "bg-red-100 text-red-800" },
      verified: { variant: "default" as const, color: "bg-blue-100 text-blue-800" }
    };
    
    const config = variants[status as keyof typeof variants] || variants.active;
    return <Badge variant={config.variant} className={config.color}>{status}</Badge>;
  };

  const getUserTypeIcon = (type: string) => {
    return type === 'charity' ? <Shield className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />;
  };

  // Debounced search
  useEffect(() => {
    const debouncedSearch = debounce((value: string) => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 500);

    debouncedSearch(searchInput);
  }, [searchInput]);

  // Load users
  useEffect(() => {
    loadUsers();
  }, [user, searchTerm, selectedTab, currentPage]);

  // Load stats
  useEffect(() => {
    loadStats();
  }, [user, users]);

  const loadUsers = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const filters: any = {};

      // Apply tab filter
      if (selectedTab === 'donors') {
        filters.role = 'donor';
      } else if (selectedTab === 'charities') {
        filters.role = 'charity';
      }

      const result = await userService.searchUsers(
        searchTerm,
        filters,
        { page: currentPage, limit: 20 },
        user.id
      );

      console.log('Search users result:', result);

      if (result.success && result.data) {
        // result.data is the array directly from createPaginatedResponse
        const usersData = Array.isArray(result.data) ? result.data : [];
        console.log('Users data:', usersData);

        // Fetch additional stats for each user
        const enrichedUsers = await Promise.all(
          usersData.map(async (u) => {
            const userWithStats: UserWithStats = { ...u };

            // Get donor stats
            if (u.role === 'donor') {
              try {
                const statsResult = await userService.getUserStatistics(u.id, user.id);
                if (statsResult.success && statsResult.data) {
                  userWithStats.totalDonated = statsResult.data.totalDonations;
                  userWithStats.campaignsSupported = statsResult.data.campaignsSupported;
                }
              } catch (err) {
                console.log('Failed to load donor stats for', u.id);
              }
            }

            // Get charity stats
            if (u.role === 'charity') {
              // This would need a charity service function
              // For now, we'll leave it empty
              userWithStats.activeCampaigns = 0;
              userWithStats.totalRaised = 0;
            }

            return userWithStats;
          })
        );

        setUsers(enrichedUsers);
        setTotalPages(result.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user?.id) return;

    try {
      const platformStats = await adminService.getPlatformStatistics(user.id);

      if (platformStats.success && platformStats.data) {
        setStats({
          totalUsers: platformStats.data.totalUsers || 0,
          activeDonors: platformStats.data.activeUsers || 0,
          verifiedCharities: platformStats.data.totalCharities || 0,
          pendingApprovals: platformStats.data.pendingVerifications || 0
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    // TODO: Implement user suspension
    toast({
      title: 'Not Implemented',
      description: 'User suspension feature coming soon.',
    });
  };

  const handleActivateUser = async (userId: string) => {
    // TODO: Implement user activation
    toast({
      title: 'Not Implemented',
      description: 'User activation feature coming soon.',
    });
  };

  return (
    <AdminLayout title="User Management">
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage donor and charity accounts
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Donors</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDonors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Users with donor role</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Charities</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.verifiedCharities.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Approved organizations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Verification requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>Manage all user accounts and their permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Users</TabsTrigger>
              <TabsTrigger value="donors">Donors</TabsTrigger>
              <TabsTrigger value="charities">Charities</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatarUrl || undefined} />
                              <AvatarFallback>{u.fullName?.split(' ').map(n => n[0]).join('') || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{u.fullName || 'Unknown'}</div>
                              <div className="text-sm text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {getUserTypeIcon(u.role)}
                            <span className="capitalize">{u.role}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? 'default' : 'destructive'}>
                            {u.isActive ? 'Active' : 'Suspended'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.role === 'donor' ? (
                            <div>
                              <div className="text-sm font-medium">
                                {formatCurrency(u.totalDonated || 0)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {u.campaignsSupported || 0} campaigns
                              </div>
                            </div>
                          ) : u.role === 'charity' ? (
                            <div>
                              <div className="text-sm font-medium">
                                {formatCurrency(u.totalRaised || 0)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {u.activeCampaigns || 0} campaigns
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">-</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getRelativeTime(u.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {u.isActive ? (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleSuspendUser(u.id)}
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Suspend Account
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => handleActivateUser(u.id)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate Account
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
};

export default UserManagement;
