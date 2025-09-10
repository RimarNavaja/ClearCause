
import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Download,
  FileText,
  Image as ImageIcon,
  Video,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const MilestoneVerification = () => {
  const [selectedProof, setSelectedProof] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  const proofSubmissions = [
    {
      id: 1,
      campaignTitle: "Clean Water for Rural Communities",
      milestoneNumber: 2,
      milestoneTitle: "Install 10 Water Pumps",
      charityName: "Water for Life Foundation",
      submissionDate: "2024-03-15",
      status: "pending",
      amount: "₱150,000",
      proofType: "receipt",
      description: "Receipts for water pump installation and materials",
      files: [
        { name: "pump_receipt_1.pdf", type: "document", size: "2.5 MB" },
        { name: "installation_photo.jpg", type: "image", size: "1.8 MB" },
        { name: "contractor_invoice.pdf", type: "document", size: "1.2 MB" }
      ]
    },
    {
      id: 2,
      campaignTitle: "Education Support Program",
      milestoneNumber: 1,
      milestoneTitle: "Distribute School Supplies",
      charityName: "Learn Together Foundation",
      submissionDate: "2024-03-14",
      status: "under_review",
      amount: "₱75,000",
      proofType: "photo",
      description: "Photos of school supply distribution event",
      files: [
        { name: "distribution_event.mp4", type: "video", size: "25.6 MB" },
        { name: "beneficiary_list.pdf", type: "document", size: "890 KB" }
      ]
    },
    {
      id: 3,
      campaignTitle: "Emergency Food Relief",
      milestoneNumber: 3,
      milestoneTitle: "Feed 500 Families",
      charityName: "Hope Kitchen",
      submissionDate: "2024-03-13",
      status: "needs_revision",
      amount: "₱200,000",
      proofType: "report",
      description: "Detailed report of food distribution activities",
      files: [
        { name: "food_distribution_report.pdf", type: "document", size: "3.1 MB" }
      ]
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, color: "bg-yellow-100 text-yellow-800", icon: Clock },
      under_review: { variant: "default" as const, color: "bg-blue-100 text-blue-800", icon: Eye },
      approved: { variant: "default" as const, color: "bg-green-100 text-green-800", icon: CheckCircle },
      needs_revision: { variant: "destructive" as const, color: "bg-red-100 text-red-800", icon: AlertCircle }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className={config.color}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleApprove = (proofId: number) => {
    // TODO: Implement API call to approve proof
    // Implementation for approval
  };

  const handleReject = (proofId: number) => {
    // TODO: Implement API call to reject proof
    // Implementation for rejection
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Milestone Verification</h1>
        <p className="text-muted-foreground">
          Review and verify milestone proof submissions for fund disbursement
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">+3 new submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">₱450,000 released</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Revision</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Require updates</p>
          </CardContent>
        </Card>
      </div>

      {/* Proof Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Proof Submissions</CardTitle>
          <CardDescription>Review milestone proof submissions and approve fund releases</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pending (15)</TabsTrigger>
              <TabsTrigger value="under_review">Under Review (8)</TabsTrigger>
              <TabsTrigger value="needs_revision">Needs Revision (5)</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {proofSubmissions.filter(p => p.status === 'pending' || p.status === 'under_review').map((proof) => (
                <Card key={proof.id} className="border-l-4 border-l-yellow-500">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{proof.campaignTitle}</h3>
                          {getStatusBadge(proof.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Milestone {proof.milestoneNumber}:</span> {proof.milestoneTitle}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Organization:</span> {proof.charityName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Amount:</span> {proof.amount}
                        </p>
                        <p className="text-sm">{proof.description}</p>
                        
                        {/* Files */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Attached Files:</h4>
                          <div className="grid gap-2 md:grid-cols-2">
                            {proof.files.map((file, index) => (
                              <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                                {getFileIcon(file.type)}
                                <span className="text-sm flex-1">{file.name}</span>
                                <span className="text-xs text-muted-foreground">{file.size}</span>
                                <Button size="sm" variant="ghost">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" onClick={() => setSelectedProof(proof)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Review Milestone Proof</DialogTitle>
                              <DialogDescription>
                                Carefully review the submitted proof materials before making a decision.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium">Campaign: {proof.campaignTitle}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Milestone {proof.milestoneNumber}: {proof.milestoneTitle}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Release Amount: {proof.amount}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Verification Notes</h4>
                                <Textarea
                                  placeholder="Add your verification notes here..."
                                  value={verificationNotes}
                                  onChange={(e) => setVerificationNotes(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter className="space-x-2">
                              <Button variant="outline" onClick={() => handleReject(proof.id)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                              <Button onClick={() => handleApprove(proof.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve & Release Funds
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MilestoneVerification;
