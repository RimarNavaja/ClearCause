/**
 * Decision Confirmation Dialog
 * Confirms donor's refund decision before final submission
 */

import { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, DollarSign, Heart } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DonorDecisionType } from '@/lib/types';
import { Campaign } from '@/lib/types';

interface DecisionConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  decisionType: DonorDecisionType;
  refundAmount: number;
  selectedCampaign?: Campaign | null;
  loading?: boolean;
}

export function DecisionConfirmationDialog({
  open,
  onClose,
  onConfirm,
  decisionType,
  refundAmount,
  selectedCampaign,
  loading = false,
}: DecisionConfirmationDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  const getDecisionIcon = () => {
    switch (decisionType) {
      case 'refund':
        return <DollarSign className="h-8 w-8 text-blue-600" />;
      case 'redirect_campaign':
        return <ArrowRight className="h-8 w-8 text-green-600" />;
      case 'donate_platform':
        return <Heart className="h-8 w-8 text-pink-600" />;
      default:
        return null;
    }
  };

  const getDecisionTitle = () => {
    switch (decisionType) {
      case 'refund':
        return 'Confirm Refund to Payment Method';
      case 'redirect_campaign':
        return 'Confirm Donation Redirect';
      case 'donate_platform':
        return 'Confirm Platform Donation';
      default:
        return 'Confirm Decision';
    }
  };

  const getDecisionDescription = () => {
    switch (decisionType) {
      case 'refund':
        return 'Your contribution will be refunded to your original payment method.';
      case 'redirect_campaign':
        return 'Your contribution will be redirected to support another campaign.';
      case 'donate_platform':
        return 'Your contribution will support ClearCause operations and help us maintain transparency.';
      default:
        return '';
    }
  };

  const getProcessingTime = () => {
    switch (decisionType) {
      case 'refund':
        return '3-5 business days';
      case 'redirect_campaign':
        return 'Immediately';
      case 'donate_platform':
        return 'Immediately';
      default:
        return '';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {getDecisionIcon()}
            <AlertDialogTitle>{getDecisionTitle()}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {getDecisionDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-2xl font-bold">
                ₱{refundAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-muted-foreground">Processing Time</span>
              <Badge variant="outline">{getProcessingTime()}</Badge>
            </div>
          </div>

          {/* Campaign Details (for redirect) */}
          {decisionType === 'redirect_campaign' && selectedCampaign && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Destination Campaign</h4>
                <div className="border rounded-lg p-3">
                  <div className="font-medium">{selectedCampaign.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    by {selectedCampaign.charity?.organizationName}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {selectedCampaign.category && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedCampaign.category}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {Math.round(selectedCampaign.progress || 0)}% funded
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Refund Warning */}
          {decisionType === 'refund' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Refunds are processed through PayMongo and may take 3-5 business days to appear
                in your account. You'll receive an email confirmation once processed.
              </AlertDescription>
            </Alert>
          )}

          {/* Redirect Warning */}
          {decisionType === 'redirect_campaign' && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Your contribution will immediately support the selected campaign. You'll receive
                a donation receipt for tax purposes.
              </AlertDescription>
            </Alert>
          )}

          {/* Platform Donation Info */}
          {decisionType === 'donate_to_platform' && (
            <Alert>
              <Heart className="h-4 w-4" />
              <AlertDescription>
                Thank you for supporting ClearCause! Your contribution helps us maintain our
                platform, verify charities, and ensure transparency for all users.
              </AlertDescription>
            </Alert>
          )}

          {/* Finality Warning */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This decision is final and cannot be changed once confirmed.
            </AlertDescription>
          </Alert>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting || loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={submitting || loading}
            className="min-w-[120px]"
          >
            {submitting || loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              'Confirm Decision'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
