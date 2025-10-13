
import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Eye, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { 
  getPendingCharityVerifications, 
  getCharityVerificationStats 
} from '@/services/adminService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const CharityApplicationReview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    pendingVerifications: 0,
    totalVerifications: 0,
    approvedVerifications: 0,
    rejectedVerifications: 0,
    avgProcessingTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Load pending applications and stats
        const [applicationsResponse, statsResponse] = await Promise.all([
          getPendingCharityVerifications({ page: 1, limit: 50 }, user.id),
          getCharityVerificationStats(user.id)
        ]);
        
        if (applicationsResponse.success) {
          setApplications(applicationsResponse.data?.items || []);
        } else {
          throw new Error(applicationsResponse.error);
        }
        
        if (statsResponse.success) {
          setStats(statsResponse.data);
        }
        
      } catch (err) {
        console.error('Error loading charity applications:', err);
        setError(err.message);
        toast.error('Failed to load charity applications');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user?.id]);

  const handleViewApplication = (verificationId: string) => {
    navigate(`/admin/charity-verifications/${verificationId}`);
  };

  if (loading) {
    return (
      <AdminLayout title="Charity Application Review">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Charity Application Review">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Charity Application Review</h1>
          <p className="text-muted-foreground">Review and approve new charity registrations</p>
        </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingVerifications}</div>
            <p className="text-xs text-muted-foreground">New applications</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVerifications}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedVerifications}</div>
            <p className="text-xs text-muted-foreground">Verified charities</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProcessingTime}</div>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Applications</CardTitle>
          <CardDescription>Charity registration applications awaiting review</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending applications</p>
              <p className="text-sm">All charity applications have been reviewed</p>
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{app.organization_name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {app.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <User className="h-3 w-3 inline mr-1" />
                    {app.charity?.full_name || app.charity?.email} • {app.contact_email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {app.registration_number} • Submitted {new Date(app.submitted_at).toLocaleDateString()}
                  </p>
                  {app.organization_type && (
                    <p className="text-xs text-muted-foreground">
                      Type: {app.organization_type}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewApplication(app.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Review
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

export default CharityApplicationReview;
