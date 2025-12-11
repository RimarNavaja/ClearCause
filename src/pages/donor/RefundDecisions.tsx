/**
 * Refund Decisions Page
 * Allows donors to make decisions on rejected milestone refunds
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  DollarSign,
  Heart,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getDonorPendingRefundDecisions, submitDonorDecision } from '@/services/refundService';
import { getCampaignById } from '@/services/campaignService';
import { DonorRefundDecision, DonorDecisionType, Campaign } from '@/lib/types';
import { CampaignSelectorModal } from '@/components/donor/CampaignSelectorModal';
import { DecisionConfirmationDialog } from '@/components/donor/DecisionConfirmationDialog';

interface DecisionState {
  decision: DonorRefundDecision;
  selectedCampaign?: Campaign | null;
  decisionType?: DonorDecisionType;
}

export default function RefundDecisions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [decisions, setDecisions] = useState<DonorRefundDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [campaignSelectorOpen, setCampaignSelectorOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [currentDecision, setCurrentDecision] = useState<DecisionState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPendingDecisions();
  }, [user]);

  const loadPendingDecisions = async () => {
    if (!user?.id) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getDonorPendingRefundDecisions(user.id);

      if (result.success && result.data) {
        setDecisions(result.data);
      } else {
        setError(result.error || 'Failed to load pending decisions');
      }
    } catch (err: any) {
      console.error('Error loading pending decisions:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRefundClick = (decision: DonorRefundDecision) => {
    setCurrentDecision({
      decision,
      decisionType: 'refund',
    });
    setConfirmationOpen(true);
  };

  const handleRedirectClick = (decision: DonorRefundDecision) => {
    setCurrentDecision({
      decision,
      decisionType: 'redirect_to_campaign',
    });
    setCampaignSelectorOpen(true);
  };

  const handlePlatformClick = (decision: DonorRefundDecision) => {
    setCurrentDecision({
      decision,
      decisionType: 'donate_to_platform',
    });
    setConfirmationOpen(true);
  };

  const handleCampaignSelected = async (campaignId: string) => {
    setCampaignSelectorOpen(false);

    if (!currentDecision) return;

    try {
      // Load campaign details
      const result = await getCampaignById(campaignId);
      if (result.success && result.data) {
        setCurrentDecision({
          ...currentDecision,
          selectedCampaign: result.data,
        });
        setConfirmationOpen(true);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load campaign details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast({
        title: 'Error',
        description: 'Failed to load campaign details',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmDecision = async () => {
    if (!currentDecision || !currentDecision.decisionType || !user?.id) return;

    setSubmitting(true);

    try {
      const result = await submitDonorDecision(
        currentDecision.decision.id,
        user.id,
        {
          type: currentDecision.decisionType,
          redirectCampaignId: currentDecision.selectedCampaign?.id,
        }
      );

      if (result.success) {
        toast({
          title: 'Success',
          description: getSuccessMessage(currentDecision.decisionType),
        });

        // Refresh decisions list
        await loadPendingDecisions();

        // Close dialogs and reset state
        setConfirmationOpen(false);
        setCurrentDecision(null);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to submit decision',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error submitting decision:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit decision',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getSuccessMessage = (type: DonorDecisionType) => {
    switch (type) {
      case 'refund':
        return 'Refund initiated. You will receive the funds in 3-5 business days.';
      case 'redirect_to_campaign':
        return 'Donation redirected successfully. You will receive a receipt via email.';
      case 'donate_to_platform':
        return 'Thank you for supporting ClearCause! You will receive a receipt via email.';
      default:
        return 'Decision submitted successfully.';
    }
  };

  const getDaysRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    return Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUrgencyBadge = (daysRemaining: number) => {
    if (daysRemaining <= 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysRemaining <= 2) {
      return <Badge variant="destructive">{daysRemaining} days left</Badge>;
    } else if (daysRemaining <= 5) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-700">
          {daysRemaining} days left
        </Badge>
      );
    } else {
      return <Badge variant="outline">{daysRemaining} days left</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/donor/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold">Refund Decisions</h1>
        <p className="text-muted-foreground mt-2">
          Make decisions on your contributions from rejected milestones
        </p>
      </div>

      {/* No Decisions */}
      {decisions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You have no pending refund decisions at this time.
            </p>
            <Button
              onClick={() => navigate('/donor/dashboard')}
              className="mt-6"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Alert */}
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have <strong>{decisions.length}</strong> pending decision
              {decisions.length !== 1 ? 's' : ''} totaling{' '}
              <strong>
                ₱
                {decisions
                  .reduce((sum, d) => sum + d.refundAmount, 0)
                  .toLocaleString()}
              </strong>
              . Please make your decisions before the deadline to avoid automatic refunds.
            </AlertDescription>
          </Alert>

          {/* Decisions List */}
          <div className="space-y-6">
            {decisions.map((decision) => {
              const daysRemaining = getDaysRemaining(decision.decisionDeadline);

              return (
                <Card key={decision.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          Rejected Milestone: {decision.milestone?.title || 'Milestone'}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Campaign: {decision.campaign?.title || 'Unknown Campaign'}
                        </CardDescription>
                      </div>
                      {getUrgencyBadge(daysRemaining)}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6">
                    {/* Amount and Deadline */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-primary/5 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Refund Amount</span>
                        </div>
                        <div className="text-2xl font-bold">
                          ₱{decision.refundAmount.toLocaleString()}
                        </div>
                      </div>

                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <Clock className="h-4 w-4" />
                          <span>Decision Deadline</span>
                        </div>
                        <div className="text-xl font-semibold">
                          {new Date(decision.decisionDeadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {daysRemaining > 0
                            ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                            : 'Expired'}
                        </div>
                      </div>
                    </div>

                    {/* Rejection Reason */}
                    {decision.refundRequest?.rejectionReason && (
                      <Alert className="mb-6">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Rejection Reason:</strong>{' '}
                          {decision.refundRequest.rejectionReason}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Separator className="mb-6" />

                    {/* Decision Options */}
                    <div>
                      <h4 className="font-semibold mb-4">Choose what to do with your funds:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Refund Option */}
                        <Button
                          variant="outline"
                          className="h-auto flex-col items-start p-4 hover:border-blue-600 hover:bg-blue-50"
                          onClick={() => handleRefundClick(decision)}
                          disabled={daysRemaining <= 0}
                        >
                          <DollarSign className="h-6 w-6 text-blue-600 mb-2" />
                          <div className="text-left">
                            <div className="font-semibold mb-1">Refund to Payment Method</div>
                            <div className="text-xs text-muted-foreground">
                              Receive money back in 3-5 business days
                            </div>
                          </div>
                        </Button>

                        {/* Redirect Option */}
                        <Button
                          variant="outline"
                          className="h-auto flex-col items-start p-4 hover:border-green-600 hover:bg-green-50"
                          onClick={() => handleRedirectClick(decision)}
                          disabled={daysRemaining <= 0}
                        >
                          <ArrowRight className="h-6 w-6 text-green-600 mb-2" />
                          <div className="text-left">
                            <div className="font-semibold mb-1">Redirect to Another Campaign</div>
                            <div className="text-xs text-muted-foreground">
                              Support a different cause immediately
                            </div>
                          </div>
                        </Button>

                        {/* Platform Donation Option */}
                        <Button
                          variant="outline"
                          className="h-auto flex-col items-start p-4 hover:border-pink-600 hover:bg-pink-50"
                          onClick={() => handlePlatformClick(decision)}
                          disabled={daysRemaining <= 0}
                        >
                          <Heart className="h-6 w-6 text-pink-600 mb-2" />
                          <div className="text-left">
                            <div className="font-semibold mb-1">Donate to ClearCause</div>
                            <div className="text-xs text-muted-foreground">
                              Help us maintain transparency
                            </div>
                          </div>
                        </Button>
                      </div>
                    </div>

                    {/* Auto-refund warning */}
                    {daysRemaining > 0 && daysRemaining <= 5 && (
                      <Alert variant="destructive" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          If you don't make a decision by{' '}
                          {new Date(decision.decisionDeadline).toLocaleDateString()}, your funds
                          will be automatically refunded to your payment method.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Campaign Selector Modal */}
      <CampaignSelectorModal
        open={campaignSelectorOpen}
        onClose={() => {
          setCampaignSelectorOpen(false);
          setCurrentDecision(null);
        }}
        onSelect={handleCampaignSelected}
        refundAmount={currentDecision?.decision.refundAmount || 0}
        excludeCampaignId={currentDecision?.decision.campaignId}
      />

      {/* Confirmation Dialog */}
      {currentDecision && currentDecision.decisionType && (
        <DecisionConfirmationDialog
          open={confirmationOpen}
          onClose={() => {
            setConfirmationOpen(false);
            setCurrentDecision(null);
          }}
          onConfirm={handleConfirmDecision}
          decisionType={currentDecision.decisionType}
          refundAmount={currentDecision.decision.refundAmount}
          selectedCampaign={currentDecision.selectedCampaign}
          loading={submitting}
        />
      )}
    </div>
  );
}
