import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
  Upload,
  Download,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import CharityLayout from '@/components/layout/CharityLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface VerificationDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size: number;
  uploaded_at: string;
  is_verified: boolean;
  admin_notes: string | null;
}

interface VerificationData {
  id: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resubmission_required';
  organization_name: string;
  organization_type: string;
  contact_email: string;
  submitted_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  documents: VerificationDocument[];
}

const OrganizationVerificationStatus: React.FC = () => {
  const { user } = useAuth();
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerificationStatus();
  }, [user]);

  const fetchVerificationStatus = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('charity_verifications')
        .select(`
          *,
          documents:verification_documents(*)
        `)
        .eq('charity_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setVerification(data);
    } catch (error: any) {
      console.error('Error fetching verification:', error);
      toast({
        title: 'Error loading verification status',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case 'under_review':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Eye className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'resubmission_required':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            <RefreshCw className="w-3 h-3 mr-1" />
            Resubmission Required
          </Badge>
        );
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      registration_certificate: 'Registration Certificate',
      tax_exemption: 'Tax Exemption Document',
      representative_id: 'Representative ID',
      proof_of_address: 'Proof of Address',
    };
    return labels[type] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const viewDocument = async (fileUrl: string) => {
    try {
      // Extract just the file path from the URL if it's a full URL
      let filePath = fileUrl;
      if (fileUrl.includes('storage/v1/object/public/verification-documents/')) {
        // Extract path after the bucket name
        filePath = fileUrl.split('storage/v1/object/public/verification-documents/')[1];
      } else if (fileUrl.startsWith('http')) {
        // Handle any other URL format - extract after bucket name
        const parts = fileUrl.split('/');
        const bucketIndex = parts.indexOf('verification-documents');
        if (bucketIndex !== -1) {
          filePath = parts.slice(bucketIndex + 1).join('/');
        }
      }

      const { data, error } = await supabase.storage
        .from('verification-documents')
        .createSignedUrl(filePath, 3600); // URL valid for 1 hour

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating signed URL:', error);
      toast({
        title: 'Error viewing document',
        description: 'Failed to load document. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <CharityLayout title="Verification Status">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </CharityLayout>
    );
  }

  if (!verification) {
    return (
      <CharityLayout title="Verification Status">
        <Card>
          <CardHeader>
            <CardTitle>Organization Verification</CardTitle>
            <CardDescription>
              Your organization needs to be verified before you can create campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No Verification Application Found
              </h3>
              <p className="text-gray-600 mb-6">
                You haven't submitted a verification application yet. Please complete the
                verification form to start creating campaigns.
              </p>
              <Link to="/charity/verification/apply">
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Verification Application
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title="Verification Status">
      <div className="space-y-6">
        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Verification Status</span>
              {getStatusBadge(verification.status)}
            </CardTitle>
            <CardDescription>
              Current status of your organization verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Organization Name</p>
                <p className="text-base">{verification.organization_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Organization Type</p>
                <p className="text-base capitalize">{verification.organization_type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Contact Email</p>
                <p className="text-base">{verification.contact_email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Submitted On</p>
                <p className="text-base">
                  {new Date(verification.submitted_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {verification.status === 'approved' && verification.approved_at && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-2" />
                  <div>
                    <p className="font-medium text-green-800">
                      Verification Approved
                    </p>
                    <p className="text-sm text-green-700">
                      Your organization was verified on{' '}
                      {new Date(verification.approved_at).toLocaleDateString()}. You can now
                      create campaigns and receive donations.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(verification.status === 'rejected' || verification.status === 'resubmission_required') && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                  <div className="flex-1">
                    <p className="font-medium text-red-800">
                      {verification.status === 'rejected'
                        ? 'Verification Rejected'
                        : 'Resubmission Required'}
                    </p>
                    {verification.rejection_reason && (
                      <p className="text-sm text-red-700 mt-1">
                        <strong>Reason:</strong> {verification.rejection_reason}
                      </p>
                    )}
                    {verification.admin_notes && (
                      <p className="text-sm text-red-700 mt-1">
                        <strong>Admin Notes:</strong> {verification.admin_notes}
                      </p>
                    )}
                    <div className="mt-4">
                      <Link to="/charity/verification/apply">
                        <Button variant="outline" size="sm">
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Resubmit Application
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {verification.status === 'under_review' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start">
                  <Eye className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
                  <div>
                    <p className="font-medium text-yellow-800">Under Review</p>
                    <p className="text-sm text-yellow-700">
                      Our team is currently reviewing your verification application. We'll
                      notify you once the review is complete.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {verification.status === 'pending' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
                  <div>
                    <p className="font-medium text-blue-800">Pending Review</p>
                    <p className="text-sm text-blue-700">
                      Your application has been submitted and is waiting to be reviewed by our
                      verification team.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Uploaded Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Uploaded Documents
            </CardTitle>
            <CardDescription>
              Documents submitted with your verification application
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verification.documents && verification.documents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Type</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verification.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        {getDocumentTypeLabel(doc.document_type)}
                      </TableCell>
                      <TableCell>{doc.document_name}</TableCell>
                      <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell>
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {doc.is_verified ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDocument(doc.file_url)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-gray-500 py-4">
                No documents uploaded yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submission History */}
        <Card>
          <CardHeader>
            <CardTitle>Submission History</CardTitle>
            <CardDescription>Timeline of your verification application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Upload className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Application Submitted</p>
                  <p className="text-sm text-gray-600">
                    {new Date(verification.submitted_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {verification.reviewed_at && (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">Review Started</p>
                    <p className="text-sm text-gray-600">
                      {new Date(verification.reviewed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {verification.approved_at && (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Application Approved</p>
                    <p className="text-sm text-gray-600">
                      {new Date(verification.approved_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {verification.rejected_at && (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">Application Rejected</p>
                    <p className="text-sm text-gray-600">
                      {new Date(verification.rejected_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </CharityLayout>
  );
};

export default OrganizationVerificationStatus;
