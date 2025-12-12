import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import * as adminService from '@/services/adminService';
import { ExtensionRequest, ExtensionRequestStatus } from '@/lib/types';
import { getRelativeTime } from '@/utils/helpers';

export const ExtensionRequestsTable = () => {
  const [requests, setRequests] = useState<ExtensionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | null;
    request: ExtensionRequest | null;
  }>({ open: false, type: null, request: null });
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await adminService.getCampaignExtensionRequests(
        { status: 'pending' as ExtensionRequestStatus },
        { page: 1, limit: 50 },
        user.id
      );
      if (result.success && result.data) {
        setRequests(result.data as ExtensionRequest[]);
      }
    } catch (error) {
      console.error('Failed to load extension requests:', error);
      toast.error('Failed to load extension requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [user, loadRequests]);

  const handleAction = (request: ExtensionRequest, type: 'approve' | 'reject') => {
    setActionDialog({
      open: true,
      type,
      request,
    });
    setAdminNotes('');
  };

  const executeAction = async () => {
    if (!actionDialog.request || !actionDialog.type || !user) return;
    
    setProcessing(true);
    try {
      const result = await adminService.resolveExtensionRequest(
        actionDialog.request.id,
        actionDialog.type === 'approve' ? 'approved' : 'rejected',
        adminNotes,
        user.id
      );

      if (result.success) {
        toast.success(`Request ${actionDialog.type}d successfully`);
        setActionDialog({ open: false, type: null, request: null });
        loadRequests();
      } else {
        toast.error(result.message || 'Failed to process request');
      }
    } catch (error: unknown) {
      console.error(`Failed to ${actionDialog.type} request:`, error);
      toast.error((error as Error).message || `Failed to ${actionDialog.type} request`);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading requests...</div>;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/10">
        <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-medium">No Pending Requests</h3>
        <p className="text-muted-foreground">There are no campaign extension requests pending review.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Charity</TableHead>
              <TableHead>Requested Date</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                  {request.campaign?.title || 'Unknown Campaign'}
                </TableCell>
                <TableCell>
                  {request.charity?.organizationName || 'Unknown Charity'}
                </TableCell>
                <TableCell>
                  {new Date(request.requestedEndDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="max-w-xs truncate" title={request.reason}>
                  {request.reason}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {getRelativeTime(request.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleAction(request, 'approve')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleAction(request, 'reject')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={actionDialog.open} onOpenChange={(open) => {
        if (!open) setActionDialog({ open: false, type: null, request: null });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' ? 'Approve Extension' : 'Reject Extension'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' 
                ? `Extend deadline for "${actionDialog.request?.campaign?.title}" to ${actionDialog.request ? new Date(actionDialog.request.requestedEndDate).toLocaleDateString() : ''}?`
                : `Reject extension for "${actionDialog.request?.campaign?.title}"? This will immediately trigger the refund process.`}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.type === 'reject' && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200 flex items-start gap-2 text-red-800 text-sm mb-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Warning: Rejecting this request will immediately initiate refunds for all donors. This action cannot be undone.</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="notes">Admin Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder={actionDialog.type === 'approve' ? "Add approval notes..." : "Reason for rejection..."}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog({ open: false, type: null, request: null })}>
              Cancel
            </Button>
            <Button 
              onClick={executeAction}
              disabled={processing}
              variant={actionDialog.type === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? 'Processing...' : (actionDialog.type === 'approve' ? 'Approve Extension' : 'Reject & Refund')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
