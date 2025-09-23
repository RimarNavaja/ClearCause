
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  Download,
  ArrowLeft,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { approveSubmission, rejectSubmission } from '@/services/adminService';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const VerificationDetail = () => {
  const { submissionId } = useParams();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');

  const submission = {
    id: submissionId,
    campaignTitle: "Clean Water for Rural Communities",
    milestoneNumber: 2,
    milestoneTitle: "Install 10 Water Pumps",
    charityName: "Water for Life Foundation",
    submissionDate: "2024-03-15",
    amount: "₱150,000",
    description: "Completed installation of 10 water pumps across 5 rural communities. All pumps are operational and serving approximately 2,500 residents.",
    files: [
      { name: "pump_receipt_1.pdf", type: "document", size: "2.5 MB" },
      { name: "installation_photo.jpg", type: "image", size: "1.8 MB" },
      { name: "contractor_invoice.pdf", type: "document", size: "1.2 MB" }
    ]
  };

  const handleApprove = async () => {
    if (!user?.id) return;

    try {
      const result = await approveSubmission('sample-submission-id', 'verification', null, user.id);
      if (result.success) {
        toast.success('Submission approved successfully');
        // Refresh the data or update state
      } else {
        toast.error(result.error || 'Failed to approve submission');
      }
    } catch (error) {
      console.error('Error approving submission:', error);
      toast.error('Failed to approve submission');
    }
  };

  const handleReject = async () => {
    if (!user?.id) return;

    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      const result = await rejectSubmission('sample-submission-id', 'verification', reason, null, user.id);
      if (result.success) {
        toast.success('Submission rejected');
        // Refresh the data or update state
      } else {
        toast.error(result.error || 'Failed to reject submission');
      }
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast.error('Failed to reject submission');
    }
  };

  return (
    <div className="space-y-6 p-6">
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
              <h3 className="font-semibold text-lg">{submission.campaignTitle}</h3>
              <p className="text-sm text-muted-foreground">{submission.charityName}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Milestone {submission.milestoneNumber}</p>
              <p className="text-lg">{submission.milestoneTitle}</p>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Release Amount:</span>
              <span className="font-semibold">{submission.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Submitted:</span>
              <span>{submission.submissionDate}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Proof Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{submission.description}</p>
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
          <div className="grid gap-4 md:grid-cols-2">
            {submission.files.map((file, index) => (
              <div key={index} className="flex items-center space-x-3 p-4 border rounded-lg">
                {file.type === 'image' ? 
                  <ImageIcon className="h-8 w-8 text-blue-500" /> : 
                  <FileText className="h-8 w-8 text-gray-500" />
                }
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{file.size}</p>
                </div>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
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
            <Button variant="outline" onClick={handleReject} className="flex-1">
              <XCircle className="h-4 w-4 mr-2" />
              Reject Submission
            </Button>
            <Button onClick={handleApprove} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve & Release Funds
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerificationDetail;
