import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, AlertTriangle, Calendar, DollarSign, Users, MapPin, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import * as campaignService from '@/services/campaignService';
import { Campaign } from '@/lib/types';
import { formatCurrency, getRelativeTime } from '@/utils/helpers';

const CampaignReview = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'revision' | null;
  }>({ open: false, type: null });
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      const result = await campaignService.getCampaignById(campaignId, true);

      if (result.success && result.data) {
        setCampaign(result.data);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load campaign details',
          variant: 'destructive',
        });
        navigate('/admin/campaigns');
      }
    } catch (error) {
      console.error('Failed to load campaign:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while loading the campaign',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (type: 'approve' | 'reject' | 'revision') => {
    setActionDialog({ open: true, type });
    setActionReason('');
  };

  const executeAction = async () => {
    if (!campaign || !actionDialog.type || !user) return;

    try {
      setActionLoading(true);
      let result;

      switch (actionDialog.type) {
        case 'approve':
          result = await campaignService.approveCampaign(
            campaign.id,
            user.id,
            {
              reason: actionReason || 'Campaign approved by administrator',
              sendNotification: true,
              autoActivate: true,
            }
          );
          break;
        case 'reject':
          if (!actionReason.trim()) {
            toast({
              title: 'Reason Required',
              description: 'Please provide a reason for rejection',
              variant: 'destructive',
            });
            return;
          }
          result = await campaignService.rejectCampaign(
            campaign.id,
            user.id,
            {
              reason: actionReason,
              allowResubmission: true,
              sendNotification: true,
            }
          );
          break;
        case 'revision':
          if (!actionReason.trim()) {
            toast({
              title: 'Reason Required',
              description: 'Please provide details about what needs revision',
              variant: 'destructive',
            });
            return;
          }
          result = await campaignService.requestCampaignRevision(
            campaign.id,
            user.id,
            {
              reason: actionReason,
              sendNotification: true,
            }
          );
          break;
      }

      if (result?.success) {
        toast({
          title: 'Success',
          description: `Campaign ${actionDialog.type === 'approve' ? 'approved' : actionDialog.type === 'reject' ? 'rejected' : 'sent for revision'} successfully`,
        });
        setActionDialog({ open: false, type: null });
        navigate('/admin/campaigns');
      } else {
        toast({
          title: 'Error',
          description: result?.error || 'Action failed',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Action failed:', error);
      toast({
        title: 'Error',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Campaign Review">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading campaign details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!campaign) {
    return (
      <AdminLayout title="Campaign Review">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Campaign not found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Campaign Review">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/campaigns')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Review Campaign</h1>
              <p className="text-muted-foreground">Review and approve or reject this campaign</p>
            </div>
          </div>

          {campaign.status === 'pending' && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleAction('revision')}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Request Revision
              </Button>
              <Button variant="destructive" onClick={() => handleAction('reject')}>
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button onClick={() => handleAction('approve')}>
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Image */}
            {campaign.imageUrl && (
              <Card>
                <CardContent className="p-0">
                  <img
                    src={campaign.imageUrl}
                    alt={campaign.title}
                    className="w-full h-[400px] object-cover rounded-t-lg"
                  />
                </CardContent>
              </Card>
            )}

            {/* Campaign Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{campaign.title}</CardTitle>
                    <div className="mt-2">
                      <Badge variant={campaign.status === 'draft' ? 'secondary' : 'default'}>
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{campaign.description}</p>
                </div>

                {/* Campaign Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Goal Amount</p>
                      <p className="font-semibold">{formatCurrency(campaign.goalAmount)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Amount</p>
                      <p className="font-semibold">{formatCurrency(campaign.currentAmount)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Donors</p>
                      <p className="font-semibold">{campaign.donorsCount || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-semibold capitalize">{campaign.category || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-semibold">{campaign.location || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-semibold">{getRelativeTime(campaign.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                {(campaign.startDate || campaign.endDate) && (
                  <div>
                    <h3 className="font-semibold mb-3">Campaign Duration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {campaign.startDate && (
                        <div>
                          <p className="text-sm text-muted-foreground">Start Date</p>
                          <p className="font-medium">{new Date(campaign.startDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {campaign.endDate && (
                        <div>
                          <p className="text-sm text-muted-foreground">End Date</p>
                          <p className="font-medium">{new Date(campaign.endDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Milestones */}
                {campaign.milestones && campaign.milestones.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Campaign Milestones</h3>
                    <div className="space-y-3">
                      {campaign.milestones.map((milestone, index) => (
                        <div
                          key={milestone.id}
                          className="border rounded-lg p-4 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{milestone.title}</h4>
                              {milestone.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {milestone.description}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={
                                milestone.status === 'completed' || milestone.status === 'verified'
                                  ? 'default'
                                  : milestone.status === 'in_progress'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {milestone.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Target: {formatCurrency(milestone.targetAmount)}
                            </span>
                            {milestone.dueDate && (
                              <span className="text-muted-foreground">
                                Due: {new Date(milestone.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Charity Info */}
            <Card>
              <CardHeader>
                <CardTitle>Charity Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-semibold">{campaign.charity?.organizationName || 'N/A'}</p>
                  {campaign.charity?.verificationStatus && (
                    <Badge variant="outline" className="mt-2">
                      {campaign.charity.verificationStatus}
                    </Badge>
                  )}
                </div>
                {campaign.charity?.description && (
                  <p className="text-sm text-muted-foreground">{campaign.charity.description}</p>
                )}
              </CardContent>
            </Card>

            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Funding Progress</span>
                    <span className="text-sm font-medium">
                      {((campaign.currentAmount / campaign.goalAmount) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((campaign.currentAmount / campaign.goalAmount) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(campaign.currentAmount)}</p>
                    <p className="text-xs text-muted-foreground">Raised</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(campaign.goalAmount)}</p>
                    <p className="text-xs text-muted-foreground">Goal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timestamps */}
            <Card>
              <CardHeader>
                <CardTitle>Timestamps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{new Date(campaign.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">{new Date(campaign.updatedAt).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => {
        if (!open) {
          setActionDialog({ open: false, type: null });
          setActionReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Approve Campaign'}
              {actionDialog.type === 'reject' && 'Reject Campaign'}
              {actionDialog.type === 'revision' && 'Request Campaign Revision'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' && 'This will make the campaign active and visible to donors.'}
              {actionDialog.type === 'reject' && 'This will reject the campaign. Please provide a reason.'}
              {actionDialog.type === 'revision' && 'This will send the campaign back for revisions. Please specify what needs to be changed.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">
                Reason {actionDialog.type !== 'approve' && <span className="text-destructive">*</span>}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  actionDialog.type === 'approve'
                    ? 'Optional approval notes...'
                    : actionDialog.type === 'reject'
                    ? 'Explain why this campaign is being rejected...'
                    : 'Describe what changes are needed...'
                }
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, type: null })}>
              Cancel
            </Button>
            <Button
              onClick={executeAction}
              disabled={actionLoading}
              variant={actionDialog.type === 'reject' ? 'destructive' : 'default'}
            >
              {actionLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default CampaignReview;
