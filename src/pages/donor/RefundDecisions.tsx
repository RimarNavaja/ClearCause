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
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getDonorPendingRefundDecisions, submitDonorDecision } from '@/services/refundService';
import { getCampaignById } from '@/services/campaignService';
import { DonorRefundDecision, DonorDecisionType, Campaign } from '@/lib/types';
import { CampaignSelectorModal } from '@/components/donor/CampaignSelectorModal';
import { DecisionConfirmationDialog } from '@/components/donor/DecisionConfirmationDialog';
import { formatCurrency, getRelativeTime } from '@/utils/helpers';

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
      decisionType: 'redirect_campaign',
    });
    setCampaignSelectorOpen(true);
  };

  const handlePlatformClick = (decision: DonorRefundDecision) => {
    setCurrentDecision({
      decision,
      decisionType: 'donate_platform',
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
      case 'redirect_campaign':
        return 'Donation redirected successfully. You will receive a receipt via email.';
      case 'donate_platform':
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
      return <Badge variant="destructive" className="font-redhatbold">Expired</Badge>;
    } else if (daysRemaining <= 2) {
      return <Badge variant="destructive" className="font-redhatbold">{daysRemaining} days left</Badge>;
    } else if (daysRemaining <= 5) {
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-700 bg-orange-50 font-redhatbold">
          {daysRemaining} days left
        </Badge>
      );
    } else {
      return <Badge variant="outline" className="font-redhatbold bg-white text-gray-700">{daysRemaining} days left</Badge>;
    }
  };

  const getTriggerTypeInfo = (decision: DonorRefundDecision) => {
    const triggerType = decision.metadata?.trigger_type;

    if (triggerType === 'campaign_expiration') {
      return { label: 'Campaign Expired', icon: Clock, className: 'bg-orange-100 text-orange-700 border-orange-200' };
    }
    if (triggerType === 'campaign_cancellation') {
      return { label: 'Campaign Cancelled', icon: XCircle, className: 'bg-red-100 text-red-700 border-red-200' };
    }
    return { label: 'Milestone Rejected', icon: AlertCircle, className: 'bg-blue-100 text-blue-700 border-blue-200' };
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 font-poppinsregular">Loading your decisions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-poppinsregular">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 font-poppinsregular">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/donor/dashboard')}
          className="text-gray-600 hover:text-blue-600 pl-0 hover:bg-transparent"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-100">
          <h1 className="text-3xl font-robotobold text-gray-900 mb-2">Refund Decisions</h1>
          <p className="text-gray-600 max-w-3xl">
            You have control over your impact. When a milestone is rejected or a campaign stops, 
            you decide where your contribution goes next.
          </p>
        </div>
      </div>

      {/* No Decisions State */}
      {decisions.length === 0 ? (
        <Card className="border-dashed border-2 bg-gray-50/50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-robotobold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              You have no pending refund decisions. All your contributions are currently making an impact.
            </p>
            <Button
              onClick={() => navigate('/donor/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8"
            >
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary Alert */}
          <Alert className="bg-blue-50 border-blue-200 text-blue-900">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            <AlertTitle className="font-robotobold text-blue-800 ml-2">Action Required</AlertTitle>
            <AlertDescription className="ml-2 mt-1">
              You have <strong>{decisions.length}</strong> pending decision{decisions.length !== 1 ? 's' : ''} totaling{' '}
              <strong className="font-robotobold">
                {formatCurrency(decisions.reduce((sum, d) => sum + d.refundAmount, 0))}
              </strong>
              . Please review them below.
            </AlertDescription>
          </Alert>

          {/* Decisions Grid */}
          <div className="grid grid-cols-1 gap-6">
            {decisions.map((decision) => {
              const daysRemaining = getDaysRemaining(decision.decisionDeadline);
              const triggerInfo = getTriggerTypeInfo(decision);
              const TriggerIcon = triggerInfo.icon;

              return (
                <Card key={decision.id} className="overflow-hidden border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="border-b bg-gray-50/50 p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${triggerInfo.className}`}>
                            <TriggerIcon className="w-3.5 h-3.5" />
                            {triggerInfo.label}
                          </span>
                          {getUrgencyBadge(daysRemaining)}
                        </div>
                        <h3 className="text-xl font-robotobold text-gray-900">
                          {decision.milestone?.title
                            ? `Milestone: ${decision.milestone.title}`
                            : decision.campaign?.title || 'Campaign Refund'}
                        </h3>
                        <p className="text-gray-500 text-sm flex items-center gap-2">
                          <span>Campaign:</span>
                          <span className="font-medium text-gray-700">{decision.campaign?.title || 'Unknown Campaign'}</span>
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm text-gray-500">Refund Amount</span>
                        <span className="text-2xl font-robotobold text-blue-600 tracking-tight whitespace-nowrap">
                          {formatCurrency(decision.refundAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left Side: Context & Details */}
                      <div className="lg:col-span-7 space-y-6">
                        {/* Rejection/Reason Box */}
                        {decision.refundRequest?.rejectionReason && (
                          <div className="bg-red-50 border border-red-100 rounded-lg p-4 space-y-2">
                            <div className="flex items-center gap-2 text-red-800 font-medium">
                              <XCircle className="h-4 w-4" />
                              <span>Reason for {triggerInfo.label.split(' ')[1]}</span>
                            </div>
                            <p className="text-red-700/90 text-sm leading-relaxed pl-6">
                              "{decision.refundRequest.rejectionReason}"
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <div className="p-2 bg-gray-100 rounded-full">
                              <Clock className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Deadline</p>
                              <p className="font-medium">
                                {new Date(decision.decisionDeadline).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          
                          {daysRemaining > 0 && daysRemaining <= 5 && (
                            <div className="text-orange-600 text-xs flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-md border border-orange-100">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Auto-refund in {daysRemaining} days
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Actions */}
                      <div className="lg:col-span-5">
                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 h-full">
                          <h4 className="font-robotobold text-gray-900 mb-4 text-sm uppercase tracking-wider">
                            Choose an Action
                          </h4>
                          
                          <div className="space-y-3">
                            <Button
                              variant="outline"
                              className="w-full justify-start h-auto p-4 bg-white hover:bg-blue-50 hover:border-blue-300 group transition-all"
                              onClick={() => handleRefundClick(decision)}
                              disabled={daysRemaining <= 0}
                            >
                              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors mr-4">
                                <DollarSign className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="text-left">
                                <span className="block font-semibold text-gray-900 group-hover:text-blue-700">Refund to Me</span>
                                <span className="block text-xs text-gray-500 mt-0.5">Return funds to payment method</span>
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              className="w-full justify-start h-auto p-4 bg-white hover:bg-green-50 hover:border-green-300 group transition-all"
                              onClick={() => handleRedirectClick(decision)}
                              disabled={daysRemaining <= 0}
                            >
                              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors mr-4">
                                <ArrowRight className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="text-left">
                                <span className="block font-semibold text-gray-900 group-hover:text-green-700">Redirect Funds</span>
                                <span className="block text-xs text-gray-500 mt-0.5">Donate to another campaign</span>
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              className="w-full justify-start h-auto p-4 bg-white hover:bg-purple-50 hover:border-purple-300 group transition-all"
                              onClick={() => handlePlatformClick(decision)}
                              disabled={daysRemaining <= 0}
                            >
                              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors mr-4">
                                <Heart className="h-5 w-5 text-purple-600" />
                              </div>
                              <div className="text-left">
                                <span className="block font-semibold text-gray-900 group-hover:text-purple-700">Donate to Platform</span>
                                <span className="block text-xs text-gray-500 mt-0.5">Support ClearCause mission</span>
                              </div>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
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