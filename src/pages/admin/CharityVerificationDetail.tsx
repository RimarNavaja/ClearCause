import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Download,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building,
  Calendar,
  Hash
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { 
  getCharityVerificationById, 
  approveCharityVerification, 
  rejectCharityVerification,
  requestVerificationResubmission
} from '@/services/adminService';
import { toast } from 'sonner';

const CharityVerificationDetail = () => {
  const { verificationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showResubmissionForm, setShowResubmissionForm] = useState(false);

  useEffect(() => {
    const loadVerification = async () => {
      if (!verificationId || !user?.id) return;
      
      try {
        setLoading(true);
        const response = await getCharityVerificationById(verificationId, user.id);
        
        if (response.success) {
          setVerification(response.data);
        } else {
          setError(response.error);
          toast.error('Failed to load verification details');
        }
      } catch (err) {
        console.error('Error loading verification:', err);
        setError(err.message);
        toast.error('Failed to load verification details');
      } finally {
        setLoading(false);
      }
    };

    loadVerification();
  }, [verificationId, user?.id]);

  const handleApprove = async () => {
    if (!verification || !user?.id) return;
    
    try {
      setProcessing(true);
      const response = await approveCharityVerification(
        verification.id, 
        adminNotes || null, 
        user.id
      );
      
      if (response.success) {
        toast.success('Charity verification approved successfully');
        navigate('/admin/applications');
      } else {
        toast.error(response.error || 'Failed to approve verification');
      }
    } catch (err) {
      console.error('Error approving verification:', err);
      toast.error('Failed to approve verification');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!verification || !user?.id || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    
    try {
      setProcessing(true);
      const response = await rejectCharityVerification(
        verification.id,
        rejectionReason,
        adminNotes || null,
        user.id
      );
      
      if (response.success) {
        toast.success('Charity verification rejected');
        navigate('/admin/applications');
      } else {
        toast.error(response.error || 'Failed to reject verification');
      }
    } catch (err) {
      console.error('Error rejecting verification:', err);
      toast.error('Failed to reject verification');
    } finally {
      setProcessing(false);
      setShowRejectForm(false);
    }
  };

  const handleRequestResubmission = async () => {
    if (!verification || !user?.id || !rejectionReason.trim()) {
      toast.error('Please provide a reason for resubmission');
      return;
    }
    
    try {
      setProcessing(true);
      const response = await requestVerificationResubmission(
        verification.id,
        rejectionReason,
        adminNotes || null,
        user.id
      );
      
      if (response.success) {
        toast.success('Resubmission requested successfully');
        navigate('/admin/applications');
      } else {
        toast.error(response.error || 'Failed to request resubmission');
      }
    } catch (err) {
      console.error('Error requesting resubmission:', err);
      toast.error('Failed to request resubmission');
    } finally {
      setProcessing(false);
      setShowResubmissionForm(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'resubmission_required': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="space-y-6 p-6">
        <Alert variant="destructive">
          <AlertDescription>
            {error || 'Verification not found'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate('/admin/applications')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Applications
        </Button>
      </div>
    );
  }

  const canApproveOrReject = ['pending', 'under_review'].includes(verification.status);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/applications')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {verification.organization_name}
            </h1>
            <p className="text-muted-foreground">
              Verification Application Review
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(verification.status)}>
          {verification.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Organization Name
                </Label>
                <p className="text-sm">{verification.organization_name}</p>
              </div>
              
              {verification.organization_type && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Organization Type
                  </Label>
                  <p className="text-sm">{verification.organization_type}</p>
                </div>
              )}

              {verification.description && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Description
                  </Label>
                  <p className="text-sm">{verification.description}</p>
                </div>
              )}

              <Separator />

              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{verification.contact_email}</span>
                </div>
                
                {verification.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{verification.contact_phone}</span>
                  </div>
                )}
                
                {verification.website_url && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={verification.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {verification.website_url}
                    </a>
                  </div>
                )}
              </div>

              {/* Address */}
              {verification.address_line1 && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </Label>
                    <div className="text-sm space-y-1">
                      <p>{verification.address_line1}</p>
                      {verification.address_line2 && <p>{verification.address_line2}</p>}
                      <p>
                        {verification.city}, {verification.state_province} {verification.postal_code}
                      </p>
                      <p>{verification.country}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Registration Details */}
              <Separator />
              <div className="grid gap-2">
                {verification.registration_number && (
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Registration: {verification.registration_number}
                    </span>
                  </div>
                )}
                
                {verification.tax_id && (
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Tax ID: {verification.tax_id}</span>
                  </div>
                )}
                
                {verification.date_established && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Established: {new Date(verification.date_established).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents and Actions */}
        <div className="space-y-6">
          {/* Submitted Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Submitted Documents
              </CardTitle>
              <CardDescription>
                {verification.documents?.length || 0} documents uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {verification.documents && verification.documents.length > 0 ? (
                <div className="space-y-3">
                  {verification.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{doc.document_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.document_type.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded: {formatDate(doc.uploaded_at)}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No documents uploaded
                </p>
              )}
            </CardContent>
          </Card>

          {/* Admin Actions */}
          {canApproveOrReject && (
            <Card>
              <CardHeader>
                <CardTitle>Admin Review</CardTitle>
                <CardDescription>
                  Review and take action on this verification application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
                  <Textarea
                    id="adminNotes"
                    placeholder="Add any notes about this verification..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setShowResubmissionForm(true)}
                    disabled={processing}
                    className="flex-1"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Request Changes
                  </Button>
                  
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectForm(true)}
                    disabled={processing}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rejection Form */}
          {showRejectForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Reject Application</CardTitle>
                <CardDescription>
                  Please provide a reason for rejecting this application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                  <Textarea
                    id="rejectionReason"
                    placeholder="Explain why this application is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={processing || !rejectionReason.trim()}
                  >
                    Confirm Rejection
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason('');
                    }}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resubmission Form */}
          {showResubmissionForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">Request Resubmission</CardTitle>
                <CardDescription>
                  Request changes to this application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="resubmissionReason">Reason for Changes *</Label>
                  <Textarea
                    id="resubmissionReason"
                    placeholder="Explain what needs to be changed or added..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleRequestResubmission}
                    disabled={processing || !rejectionReason.trim()}
                  >
                    Request Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowResubmissionForm(false);
                      setRejectionReason('');
                    }}
                    disabled={processing}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Verification History */}
      {verification.history && verification.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Review History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {verification.history.map((entry) => (
                <div key={entry.id} className="border-l-2 border-muted pl-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {entry.action.replace('_', ' ').toUpperCase()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </p>
                  </div>
                  {entry.admin && (
                    <p className="text-sm text-muted-foreground">
                      by {entry.admin.full_name || entry.admin.email}
                    </p>
                  )}
                  {entry.notes && (
                    <p className="text-sm mt-1">{entry.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CharityVerificationDetail;