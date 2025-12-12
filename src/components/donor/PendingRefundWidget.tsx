/**
 * Pending Refund Widget
 * Dashboard widget showing pending refund decisions for donors
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, DollarSign, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getDonorPendingRefundDecisions } from '@/services/refundService';
import { DonorRefundDecision } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

export function PendingRefundWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<DonorRefundDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[PendingRefundWidget] Effect triggered. User:', user?.id);
    loadPendingDecisions();
  }, [user]);

  const loadPendingDecisions = async () => {
    if (!user?.id) {
      console.log('[PendingRefundWidget] No user ID, skipping load');
      return;
    }

    console.log('[PendingRefundWidget] Loading decisions for user:', user.id);
    setLoading(true);
    setError(null);

    try {
      const result = await getDonorPendingRefundDecisions(user.id);
      console.log('[PendingRefundWidget] API Result:', result);

      if (result.success && result.data) {
        console.log('[PendingRefundWidget] Decisions loaded:', result.data.length);
        setDecisions(result.data);
      } else {
        console.error('[PendingRefundWidget] API Error:', result.error);
        setError(result.error || 'Failed to load pending decisions');
      }
    } catch (err: any) {
      console.error('[PendingRefundWidget] Exception:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    return decisions.reduce((sum, decision) => sum + decision.refundAmount, 0);
  };

  const getMostUrgentDeadline = () => {
    if (decisions.length === 0) return null;

    const now = new Date();
    const deadlines = decisions.map(decision => {
      const deadline = new Date(decision.decisionDeadline);
      const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysRemaining;
    });

    return Math.min(...deadlines);
  };

  const getUrgencyBadge = (daysRemaining: number | null) => {
    if (daysRemaining === null) return null;

    if (daysRemaining <= 2) {
      return <Badge variant="destructive">Urgent - {daysRemaining} days left</Badge>;
    } else if (daysRemaining <= 5) {
      return <Badge variant="outline" className="border-orange-500 text-orange-700">
        {daysRemaining} days left
      </Badge>;
    } else {
      return <Badge variant="outline">{daysRemaining} days left</Badge>;
    }
  };

  // Don't show widget if no pending decisions
  if (!loading && decisions.length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-yellow-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Action Required: Refund Decisions
            </CardTitle>
            <CardDescription className="mt-1">
              You have pending decisions for rejected milestones
            </CardDescription>
          </div>
          {!loading && getMostUrgentDeadline() !== null && (
            <div>{getUrgencyBadge(getMostUrgentDeadline())}</div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Total Amount</span>
                </div>
                <div className="text-2xl font-bold">
                  ₱{getTotalAmount().toLocaleString()}
                </div>
              </div>

              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                  <Clock className="h-4 w-4" />
                  <span>Pending Decisions</span>
                </div>
                <div className="text-2xl font-bold">
                  {decisions.length}
                </div>
              </div>
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {decisions.length === 1 ? (
                  <>
                    One milestone was rejected. Choose to get a refund, redirect to another
                    campaign, or donate to ClearCause.
                  </>
                ) : (
                  <>
                    {decisions.length} milestones were rejected. For each, choose to get a refund,
                    redirect to another campaign, or donate to ClearCause.
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* CTA Button */}
            <Button
              onClick={() => navigate('/donor/refund-decisions')}
              className="w-full"
              size="lg"
            >
              Make Your Decisions
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>

            {/* Warning for urgent deadlines */}
            {getMostUrgentDeadline() !== null && getMostUrgentDeadline()! <= 2 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Urgent:</strong> If you don't make a decision by the deadline, your
                  funds will be automatically refunded to your payment method.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
