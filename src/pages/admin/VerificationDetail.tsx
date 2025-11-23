
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
import { approveSubmission, rejectSubmission } from '@/services/adminService';
import { getMilestoneProofById } from '@/services/milestoneService';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/helpers';

const VerificationDetail = () => {
  const { submissionId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState('');
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
      const result = await approveSubmission(submissionId, 'verification', feedback, user.id);
      if (result.success) {
        toast.success('Submission approved successfully');
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
      const result = await rejectSubmission(submissionId, 'verification', feedback, null, user.id);
      if (result.success) {
        toast.success('Submission rejected');
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
              <h3 className="font-semibold text-lg">{submission.campaign?.title || 'Unknown Campaign'}</h3>
              <p className="text-sm text-muted-foreground">{submission.campaign?.charity?.organization_name || 'Unknown Charity'}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Milestone {submission.milestone?.milestone_number || 'N/A'}</p>
              <p className="text-lg">{submission.milestone?.title || 'N/A'}</p>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Release Amount:</span>
              <span className="font-semibold">
                {submission.milestone?.target_amount ? formatCurrency(submission.milestone.target_amount) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Submitted:</span>
              <span>{submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={submission.status === 'approved' ? 'default' : submission.status === 'pending' ? 'secondary' : 'destructive'}>
                {submission.status}
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
          {submission.proof_files && submission.proof_files.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {submission.proof_files.map((fileUrl: string, index: number) => {
                const fileName = fileUrl.split('/').pop() || `file_${index + 1}`;
                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

                return (
                  <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg">
                    {isImage ?
                      <ImageIcon className="h-8 w-8 text-blue-500" /> :
                      <FileText className="h-8 w-8 text-gray-500" />
                    }
                    <div className="flex-1">
                      <p className="font-medium">{fileName}</p>
                      <p className="text-sm text-muted-foreground">{isImage ? 'Image' : 'Document'}</p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        View
                      </a>
                    </Button>
                  </div>
                );
              })}
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
              disabled={submitting || !feedback.trim() || submission.status !== 'pending'}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {submitting ? 'Processing...' : 'Reject Submission'}
            </Button>
            <Button
              onClick={handleApprove}
              className="flex-1"
              disabled={submitting || !feedback.trim() || submission.status !== 'pending'}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {submitting ? 'Processing...' : 'Approve & Release Funds'}
            </Button>
          </div>
          {submission.status !== 'pending' && (
            <p className="text-sm text-muted-foreground mt-2">
              This submission has already been {submission.status}. No further action required.
            </p>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
};

export default VerificationDetail;
