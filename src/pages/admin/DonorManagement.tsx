
import React, { useState, useEffect } from 'react';
import { Users, Eye, Ban, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminLayout from '@/components/admin/AdminLayout';
import { searchUsers } from '@/services/userService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import type { User } from '@/lib/types';
import { DonorCategoryBadge } from '@/components/ui/DonorCategoryBadge';

const DonorManagement = () => {
  const { user } = useAuth();
  const [donors, setDonors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDonors, setTotalDonors] = useState(0);

  useEffect(() => {
    const loadDonors = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const result = await searchUsers(
          '', // No search query - get all
          { role: 'donor' }, // Filter by donor role
          { page: 1, limit: 100 }, // Get first 100 donors
          user.id
        );

        if (result.success && result.data) {
          setDonors(result.data);
          setTotalDonors(result.total);
        } else {
          console.error('Failed to load donors:', result.error);
          toast.error('Failed to load donors');
        }
      } catch (error) {
        console.error('Error loading donors:', error);
        toast.error('Failed to load donors');
      } finally {
        setLoading(false);
      }
    };

    loadDonors();
  }, [user?.id]);

  const activeDonors = donors.filter(d => d.isActive);
  const verifiedDonors = donors.filter(d => d.isVerified);

  return (
    <AdminLayout title="Donor Management">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Donor Management</h1>
          <p className="text-muted-foreground">Manage donor accounts and activity</p>
        </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDonors}</div>
            <p className="text-xs text-muted-foreground">Registered donors</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDonors.length}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verifiedDonors.length}</div>
            <p className="text-xs text-muted-foreground">Verified donors</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Donor Accounts</CardTitle>
          <CardDescription>All registered donors on the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-clearcause-primary" />
                <p className="text-muted-foreground">Loading donors...</p>
              </div>
            </div>
          ) : donors.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No donors found</p>
            </div>
          ) : (
            donors.map((donor) => (
              <div key={donor.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  {donor.avatarUrl ? (
                    <img src={donor.avatarUrl} alt={donor.fullName} className="h-10 w-10 rounded-full" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-clearcause-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-clearcause-primary" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <h4 className="font-medium">{donor.fullName || 'N/A'}</h4>
                    <p className="text-sm text-muted-foreground">{donor.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined: {new Date(donor.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {donor.isActive ? (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Inactive</Badge>
                  )}
                  {donor.isVerified && (
                    <Badge className="bg-blue-100 text-blue-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  <DonorCategoryBadge user={donor} isAnonymous={false} size="sm" />
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
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

export default DonorManagement;
