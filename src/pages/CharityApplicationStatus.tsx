import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getCharityVerificationStatus } from '@/services/charityVerificationService';
import { Link, useNavigate } from 'react-router-dom';

const CharityApplicationStatus: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'pending' | 'under_review' | 'approved' | 'rejected' | 'resubmission_required' | null>(null);
  const [data, setData] = useState<any>(null);

  const refresh = async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await getCharityVerificationStatus(user.id);
    if (res.success) {
      setData(res.data);
      setStatus(res.data?.status || null);
      if (res.data?.status === 'approved') {
        // After approval, go to organizer dashboard
        setTimeout(() => navigate('/charity/dashboard', { replace: true }), 1000);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const StatusBadge = () => {
    switch (status) {
      case 'pending':
      case 'under_review':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1"/> {status?.replace('_',' ')}
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1"/> Approved
          </Badge>
        );
      case 'rejected':
      case 'resubmission_required':
        return (
          <Badge className="bg-orange-100 text-orange-800">
            <AlertTriangle className="h-3 w-3 mr-1"/> {status?.replace('_',' ')}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-10 bg-clearcause-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Application Status</h1>
                <StatusBadge />
              </div>

              {loading && <p className="text-muted-foreground">Checking status...</p>}

              {!loading && !data && (
                <div className="space-y-3">
                  <p className="text-muted-foreground">No application found.</p>
                  <Button asChild>
                    <Link to="/signup/charity-application">Start Application</Link>
                  </Button>
                </div>
              )}

              {!loading && data && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Organization: {data.organization_name}</p>
                  {data.rejection_reason && (
                    <div className="bg-orange-50 border border-orange-200 p-3 rounded text-sm">
                      <p className="font-medium text-orange-800">Action Required</p>
                      <p className="text-orange-700">{data.rejection_reason}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={refresh}>
                      <RefreshCw className="h-4 w-4 mr-2"/> Refresh
                    </Button>
                    {(status === 'rejected' || status === 'resubmission_required') && (
                      <Button asChild>
                        <Link to="/signup/charity-application">Update & Resubmit</Link>
                      </Button>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">This page will redirect to your Organizer Dashboard when approved.</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CharityApplicationStatus;
