import React, { useState } from "react";
import { Clock } from "lucide-react";
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
import { toast } from "sonner";
import * as campaignService from "@/services/campaignService";
import { useAuth } from "@/hooks/useAuth";
import { TooltipContent } from "@/components/ui/tooltip";

interface ExtendDeadlineDialogProps {
  campaignId: string;
  currentEndDate: string | null;
  campaignTitle: string;
  onSuccess?: () => void;
}

export const ExtendDeadlineDialog: React.FC<ExtendDeadlineDialogProps> = ({
  campaignId,
  currentEndDate,
  campaignTitle,
  onSuccess,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newEndDate, setNewEndDate] = useState<string>("");
  const { user } = useAuth();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && currentEndDate) {
      try {
        setNewEndDate(new Date(currentEndDate).toISOString().split("T")[0]);
      } catch (e) {
        setNewEndDate("");
      }
    } else if (newOpen) {
      setNewEndDate("");
    }
  };

  const handleExtend = async () => {
    if (!user) return;
    if (!newEndDate) {
      toast.error("Please select a new end date.");
      return;
    }

    setLoading(true);
    try {
      const result = await campaignService.updateCampaign(
        campaignId,
        { endDate: new Date(newEndDate).toISOString() },
        user.id
      );

      if (result.success) {
        toast.success("The campaign deadline has been successfully updated.");
        setOpen(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || "Failed to extend deadline.");
      }
    } catch (error: any) {
      console.error("Failed to extend deadline:", error);
      toast.error(error.message || "Failed to extend deadline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-redhatbold text-red-500"
        >
          <Clock className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-robotobold">
            Extend Campaign Deadline
          </DialogTitle>
          <DialogDescription className="font-poppinsregular">
            Set a new end date for{" "}
            <strong className="font-robotobold">"{campaignTitle}"</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2 font-poppinsregular">
            <Label htmlFor="new-date">New End Date</Label>
            <Input
              id="new-date"
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="bg-red-700 hover:bg-red-600 text-white"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExtend}
            className="bg-blue-700 hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? "Updating..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
