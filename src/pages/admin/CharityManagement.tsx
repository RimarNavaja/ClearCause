
import React, { useState, useEffect } from 'react';
import { Shield, Eye, Users, CheckCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { listCharities } from '@/services/charityService';
import { toast } from 'sonner';
import type { CharityOrganization } from '@/lib/types';

interface CharityWithStats extends CharityOrganization {
  campaignCount?: number;
}

const CharityManagement = () => {
  const [charities, setCharities] = useState<CharityWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCharities, setTotalCharities] = useState(0);

  useEffect(() => {
    const loadCharities = async () => {
      try {
        setLoading(true);
        const result = await listCharities(
          {}, // No filters - get all charities
          { page: 1, limit: 100 } // Get first 100 charities
        );

        if (result.success && result.data) {
          setCharities(result.data);
          setTotalCharities(result.total);
        } else {
          console.error('Failed to load charities:', result.error);
          toast.error('Failed to load charities');
        }
      } catch (error) {
        console.error('Error loading charities:', error);
        toast.error('Failed to load charities');
      } finally {
        setLoading(false);
      }
    };

    loadCharities();
  }, []);

  return (
    <AdminLayout title="Charity Management">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Charity Management</h1>
            <p className="text-muted-foreground">Manage registered charity organizations</p>
          </div>
        <Button asChild>
          <Link to="/admin/applications">View Applications</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Charities</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCharities}</div>
            <p className="text-xs text-muted-foreground">
              {charities.filter(c => c.verificationStatus === 'verified').length} verified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {charities.filter(c => c.verificationStatus === 'verified').length}
            </div>
            <p className="text-xs text-muted-foreground">Active organizations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {charities.filter(c => c.verificationStatus === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Charities</CardTitle>
          <CardDescription>All charity organizations on the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-clearcause-primary" />
                <p className="text-muted-foreground">Loading charities...</p>
              </div>
            </div>
          ) : charities.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No charities found</p>
            </div>
          ) : (
            charities.map((charity) => (
              <div key={charity.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">{charity.organizationName}</h4>
                  <p className="text-sm text-muted-foreground">{charity.user?.email || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">
                    {charity.totalRaised ? `₱${charity.totalRaised.toLocaleString()} raised` : 'No funds raised yet'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Joined: {new Date(charity.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={charity.verificationStatus === 'verified' ? 'default' : 'secondary'}>
                    {charity.verificationStatus}
                  </Badge>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/admin/charities/${charity.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Link>
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

export default CharityManagement;
