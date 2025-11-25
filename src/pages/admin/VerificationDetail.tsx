
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  Download,
  ArrowLeft,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { getMilestoneProofById, approveMilestoneProof, rejectMilestoneProof } from '@/services/milestoneService';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';

const VerificationDetail = () => {
  const { submissionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState('');
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Function to extract file path from proof URL
  const extractFilePath = (url: string): string => {
    try {
      // Extract the path after 'milestone-proofs/'
      const parts = url.split('/');
      const bucketIndex = parts.findIndex(part => part === 'milestone-proofs');

      if (bucketIndex !== -1) {
        return parts.slice(bucketIndex + 1).join('/');
      }

      // If URL format is unexpected, return the URL as-is
      return url;
    } catch (error) {
      console.error('Error extracting file path:', error);
      return url;
    }
  };

  // Function to handle file viewing with signed URL
  const handleViewFile = async (fileUrl: string) => {
    try {
      const filePath = extractFilePath(fileUrl);

      const { data, error } = await supabase.storage
        .from('milestone-proofs')
        .createSignedUrl(filePath, 3600); // URL valid for 1 hour

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating signed URL:', error);
      toast.error('Failed to load file. Please try again.');
    }
  };

  // Load image preview URL when submission loads
  useEffect(() => {
    const loadImagePreview = async () => {
      if (!submission?.proofUrl) return;

      const fileName = submission.proofUrl.split('/').pop() || '';
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

      if (isImage) {
        try {
          const filePath = extractFilePath(submission.proofUrl);

          const { data, error } = await supabase.storage
            .from('milestone-proofs')
            .createSignedUrl(filePath, 3600);

          if (error) throw error;

          if (data?.signedUrl) {
            setImagePreviewUrl(data.signedUrl);
          }
        } catch (error) {
          console.error('Error loading image preview:', error);
        }
      }
    };

    loadImagePreview();
  }, [submission?.proofUrl]);

  useEffect(() => {
    const loadSubmission = async () => {
      if (!user?.id || !submissionId) return;

      try {
        setLoading(true);
        const result = await getMilestoneProofById(submissionId, user.id);

        if (result.success && result.data) {
          setSubmission(result.data);
        } else {
          toast.error(result.error || 'Failed to load verification details');
          navigate('/admin/verifications');
        }
      } catch (error) {
        console.error('Error loading submission:', error);
        toast.error('Failed to load verification details');
        navigate('/admin/verifications');
      } finally {
        setLoading(false);
      }
    };

    loadSubmission();
  }, [submissionId, user?.id, navigate]);

  const handleApprove = async () => {
    if (!user?.id || !submissionId || !feedback.trim()) {
      toast.error('Please provide feedback before approving');
      return;
    }

    try {
      setSubmitting(true);
      const result = await approveMilestoneProof(submissionId, feedback, user.id);
      if (result.success) {
        toast.success('Milestone approved and funds released!', {
          description: 'The charity has been notified and funds have been added to their balance.',
        });
        navigate('/admin/verifications');
      } else {
        toast.error(result.error || 'Failed to approve submission');
      }
    } catch (error) {
      console.error('Error approving submission:', error);
      toast.error('Failed to approve submission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!user?.id || !submissionId || !feedback.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      const result = await rejectMilestoneProof(submissionId, feedback, null, user.id);
      if (result.success) {
        toast.success('Submission rejected', {
          description: 'The charity will be notified of the rejection.',
        });
        navigate('/admin/verifications');
      } else {
        toast.error(result.error || 'Failed to reject submission');
      }
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast.error('Failed to reject submission');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Verification Detail">
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-48 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded mt-6"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!submission) {
    return (
      <AdminLayout title="Verification Detail">
        <div className="space-y-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Submission not found</p>
            <Button className="mt-4" asChild>
              <Link to="/admin/verifications">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Queue
              </Link>
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Verification Detail">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/verifications">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Queue
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Verification Detail</h1>
            <p className="text-muted-foreground">Review milestone proof submission</p>
          </div>
        </div>

      {/* Submission Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Milestone Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{submission.milestone?.campaign?.title || 'Unknown Campaign'}</h3>
              <p className="text-sm text-muted-foreground">{submission.milestone?.campaign?.charity?.organizationName || 'Unknown Charity'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Milestone</p>
              <p className="text-lg font-semibold">{submission.milestone?.title || 'N/A'}</p>
              <p className="text-sm text-muted-foreground mt-1">{submission.milestone?.description || ''}</p>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm text-muted-foreground">Release Amount:</span>
              <span className="text-lg font-bold text-green-600">
                {submission.milestone?.targetAmount ? formatCurrency(submission.milestone.targetAmount) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Submitted:</span>
              <span>{submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={submission.verificationStatus === 'approved' ? 'default' : submission.verificationStatus === 'pending' ? 'secondary' : 'destructive'}>
                {submission.verificationStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proof Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{submission.description || 'No description provided'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Attached Files */}
      <Card>
        <CardHeader>
          <CardTitle>Attached Files</CardTitle>
          <CardDescription>Review submitted proof materials</CardDescription>
        </CardHeader>
        <CardContent>
          {submission.proofUrl ? (
            <div className="space-y-4">
              {(() => {
                const fileUrl = submission.proofUrl;
                const fileName = fileUrl.split('/').pop() || 'proof_file';
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

                return (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 border rounded-lg bg-gray-50">
                      {isImage ?
                        <ImageIcon className="h-8 w-8 text-blue-500" /> :
                        <FileText className="h-8 w-8 text-gray-500" />
                      }
                      <div className="flex-1">
                        <p className="font-medium">{fileName}</p>
                        <p className="text-sm text-muted-foreground">{isImage ? 'Image File' : 'Document'}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewFile(fileUrl)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        View File
                      </Button>
                    </div>

                    {/* Image Preview for image files */}
                    {isImage && imagePreviewUrl && (
                      <div className="border rounded-lg p-4 bg-white">
                        <p className="text-sm font-medium mb-3">Preview:</p>
                        <img
                          src={imagePreviewUrl}
                          alt="Proof document"
                          className="max-w-full h-auto rounded-lg shadow-sm max-h-96 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    {isImage && !imagePreviewUrl && (
                      <div className="border rounded-lg p-4 bg-gray-50 text-center">
                        <p className="text-sm text-muted-foreground">Loading preview...</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No files attached</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Decision</CardTitle>
          <CardDescription>Provide feedback and approve or reject this submission</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Feedback (Required)</label>
            <Textarea
              placeholder="Provide detailed feedback about your decision..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={handleReject}
              className="flex-1"
              disabled={submitting || !feedback.trim() || submission.verificationStatus !== 'pending'}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {submitting ? 'Processing...' : 'Reject Submission'}
            </Button>
            <Button
              onClick={handleApprove}
              className="flex-1"
              disabled={submitting || !feedback.trim() || submission.verificationStatus !== 'pending'}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {submitting ? 'Processing...' : 'Approve & Release Funds'}
            </Button>
          </div>
          {submission.verificationStatus !== 'pending' && (
            <p className="text-sm text-muted-foreground mt-2">
              This submission has already been {submission.verificationStatus}. No further action required.
            </p>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
};

export default VerificationDetail;
