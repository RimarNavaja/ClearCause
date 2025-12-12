import React, { useState } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import * as campaignService from "@/services/campaignService";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExtendDeadlineDialogProps {
  campaignId: string;
  currentEndDate: string | null;
  campaignTitle: string;
  expirationRefundInitiated?: boolean;
  onSuccess?: () => void;
}

export const ExtendDeadlineDialog: React.FC<ExtendDeadlineDialogProps> = ({
  campaignId,
  currentEndDate,
  campaignTitle,
  expirationRefundInitiated,
  onSuccess,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newEndDate, setNewEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const { user } = useAuth();

  const isRefundInitiated = expirationRefundInitiated === true;

  const handleOpenChange = (newOpen: boolean) => {
    if (isRefundInitiated && newOpen) return; // Should be blocked by disabled button, but safe check
    
    setOpen(newOpen);
    if (newOpen && currentEndDate) {
      try {
        const current = new Date(currentEndDate);
        const now = new Date();
        const start = current > now ? current : now;
        start.setDate(start.getDate() + 1); 
        setNewEndDate(start.toISOString().split("T")[0]);
      } catch (e) {
        setNewEndDate("");
      }
    } else if (newOpen) {
      setNewEndDate("");
      setReason("");
    }
  };

  const handleSubmitRequest = async () => {
    if (!user) return;
    if (!newEndDate) {
      toast.error("Please select a new end date.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please provide a reason for the extension.");
      return;
    }

    setLoading(true);
    try {
      const result = await campaignService.requestCampaignExtension(
        campaignId,
        new Date(newEndDate).toISOString(),
        reason,
        user.id
      );

      if (result.success) {
        toast.success("Extension request submitted successfully. Waiting for admin approval.");
        setOpen(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || "Failed to submit request.");
      }
    } catch (error: any) {
      console.error("Failed to request extension:", error);
      toast.error(error.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  if (isRefundInitiated) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}> {/* Span needed to wrap disabled button for tooltip to work */}
              <Button
                variant="outline"
                size="sm"
                className="font-redhatbold text-gray-400 border-gray-300 cursor-not-allowed"
                disabled
              >
                <Clock className="h-4 w-4 mr-2" />
                Extension Not Allowed
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refund process has been initiated for this campaign.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-redhatbold text-red-500 border-red-600 hover:bg-red-600 hover:text-white"
        >
          <Clock className="h-4 w-4 mr-2" />
          Request Extension
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-robotobold">
            Request Deadline Extension
          </DialogTitle>
          <DialogDescription className="font-poppinsregular">
            Submit a request to extend the deadline for <strong className="font-robotobold">"{campaignTitle}"</strong>.
            This requires admin approval.
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
             If your request is rejected, the campaign will immediately proceed to the refund process.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2 font-poppinsregular">
            <Label htmlFor="new-date">Requested End Date</Label>
            <Input
              id="new-date"
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <div className="grid gap-2 font-poppinsregular">
            <Label htmlFor="reason">Reason for Extension</Label>
            <Textarea
              id="reason"
              placeholder="Why do you need more time? Please provide details."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitRequest}
            className="bg-blue-700 hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
