import React, { useState } from 'react';
import { FileText, Download, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadReceipt, previewReceipt, ReceiptData } from '@/utils/receiptGenerator';
import { useToast } from '@/hooks/use-toast';
import { Donation } from '@/lib/types';

interface ReceiptButtonProps {
  donation: Donation;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export const ReceiptButton: React.FC<ReceiptButtonProps> = ({
  donation,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getReceiptData = (): ReceiptData => {
    return {
      donationId: donation.id,
      transactionId: donation.transactionId || 'N/A',
      amount: donation.amount,
      donatedAt: donation.createdAt,
      paymentMethod: donation.paymentMethod,
      status: donation.status,
      donorName: donation.donor?.fullName || 'Anonymous Donor',
      donorEmail: donation.donor?.email || '',
      isAnonymous: donation.isAnonymous,
      campaignTitle: donation.campaign?.title || 'Unknown Campaign',
      charityName: donation.campaign?.charity?.organizationName || 'Unknown Organization',
      message: donation.message || undefined,
    };
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      const receiptData = getReceiptData();
      await downloadReceipt(receiptData);
      toast({
        title: 'Receipt Downloaded',
        description: 'Your donation receipt has been downloaded successfully.',
      });
    } catch (error: any) {
      console.error('Error downloading receipt:', error);
      toast({
        title: 'Download Failed',
        description: error.message || 'Failed to download receipt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      setLoading(true);
      const receiptData = getReceiptData();
      await previewReceipt(receiptData);
    } catch (error: any) {
      console.error('Error previewing receipt:', error);
      toast({
        title: 'Preview Failed',
        description: error.message || 'Failed to preview receipt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Only show receipt for completed donations
  if (donation.status !== 'completed') {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {showLabel && <span className="ml-2">Receipt</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePreview}>
          <Eye className="w-4 h-4 mr-2" />
          Preview Receipt
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ReceiptButton;
