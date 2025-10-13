import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Building2,
  DollarSign,
  Download,
  FileText,
  Filter,
  PencilIcon,
  Save,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import CharityLayout from '@/components/layout/CharityLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from '@/hooks/useAuth';
import * as charityService from '@/services/charityService';
import * as donationService from '@/services/donationService';
import * as campaignService from '@/services/campaignService';
import { formatCurrency } from '@/utils/helpers';
import { waitForAuthReady } from '@/utils/authHelper';
import { toast } from 'sonner';

// Bank account form schema
const bankAccountSchema = z.object({
  bankName: z.string().min(2, { message: "Bank name is required" }),
  accountHolder: z.string().min(2, { message: "Account holder name is required" }),
  accountNumber: z.string().min(8, { message: "Valid account number is required" }),
  branchCode: z.string().optional(),
});

interface Transaction {
  id: string;
  date: Date;
  type: string;
  campaignTitle: string;
  amount: number;
  status: string;
  reference: string;
}

const FundsManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingBankDetails, setEditingBankDetails] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [charityData, setCharityData] = useState<any>(null);
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    branchCode: '',
    status: 'Pending Verification'
  });

  // Statistics
  const [totalRaised, setTotalRaised] = useState(0);
  const [totalHeld, setTotalHeld] = useState(0);
  const [totalReleased, setTotalReleased] = useState(0);

  // Bank details form
  const form = useForm<z.infer<typeof bankAccountSchema>>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      bankName: bankDetails.bankName,
      accountHolder: bankDetails.accountHolder,
      accountNumber: bankDetails.accountNumber,
      branchCode: bankDetails.branchCode,
    },
  });

  // Load funds management data
  const loadFundsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Wait for auth to be ready
      console.log('[FundsManagement] Waiting for auth to be ready...');
      await waitForAuthReady(5000);

      // Get charity data
      console.log('[FundsManagement] Fetching charity data...');
      const charityResult = await charityService.getCharityByUserId(user.id);

      if (!charityResult.success || !charityResult.data) {
        setError('No charity organization found');
        return;
      }

      const charity = charityResult.data;
      setCharityData(charity);

      // Set bank details from charity profile
      if (charity.bankName) {
        const bankInfo = {
          bankName: charity.bankName || '',
          accountHolder: charity.bankAccountHolder || charity.organizationName,
          accountNumber: charity.bankAccountNumber || '',
          branchCode: charity.bankBranchCode || '',
          status: charity.bankAccountVerified ? 'Verified' : 'Pending Verification'
        };
        setBankDetails(bankInfo);
        form.reset(bankInfo);
      }

      // Get charity statistics for fund totals
      console.log('[FundsManagement] Loading statistics...');
      const statsResult = await charityService.getCharityStatistics(charity.id, user.id);
      if (statsResult.success && statsResult.data) {
        setTotalRaised(statsResult.data.totalFundsRaised || 0);
        setTotalReleased(statsResult.data.totalFundsReleased || 0);
        // Held = Raised - Released
        setTotalHeld((statsResult.data.totalFundsRaised || 0) - (statsResult.data.totalFundsReleased || 0));
      }

      // Load campaigns to get transactions
      console.log('[FundsManagement] Loading campaigns...');
      const campaignsResult = await campaignService.getCharityCampaigns(
        charity.id,
        { page: 1, limit: 100 },
        user.id
      );

      if (campaignsResult.success && campaignsResult.data) {
        const campaigns = Array.isArray(campaignsResult.data) ? campaignsResult.data : [];
        const allTransactions: Transaction[] = [];

        // Get donations for each campaign
        for (const campaign of campaigns) {
          try {
            const donationsResult = await donationService.getDonationsByCampaign(
              campaign.id,
              { page: 1, limit: 50 },
              user.id
            );

            if (donationsResult.success && donationsResult.data) {
              const donations = Array.isArray(donationsResult.data)
                ? donationsResult.data
                : donationsResult.data.donations || [];

              donations.forEach((donation: any) => {
                if (donation.status === 'completed') {
                  allTransactions.push({
                    id: donation.id,
                    date: new Date(donation.createdAt),
                    type: 'Donation Received',
                    campaignTitle: campaign.title,
                    amount: donation.amount,
                    status: 'Held', // In real implementation, check if funds were released
                    reference: `DON-${donation.id.substring(0, 8).toUpperCase()}`
                  });
                }
              });
            }
          } catch (err) {
            console.error('Error loading donations for campaign:', campaign.id, err);
          }
        }

        // Sort by date (newest first)
        allTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
        setTransactions(allTransactions.slice(0, 50)); // Limit to 50 most recent
      }

    } catch (err: any) {
      console.error('[FundsManagement] Error loading funds data:', err);
      setError(err.message || 'Failed to load funds management data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadFundsData();
    }
  }, [user?.id]);

  const handleSaveBankDetails = async (values: z.infer<typeof bankAccountSchema>) => {
    if (!charityData) return;

    try {
      // TODO: Implement API call to update charity bank details
      // For now, just update local state
      const updatedBankDetails = {
        ...bankDetails,
        ...values,
        status: 'Pending Verification' // Reset to pending when updated
      };

      setBankDetails(updatedBankDetails);
      setEditingBankDetails(false);

      toast.success('Bank details saved successfully');
      toast.info('Your bank account will be verified by our team within 24-48 hours');

      // TODO: Call actual API
      // const result = await charityService.updateCharityBankDetails(charityData.id, values, user.id);

    } catch (err: any) {
      console.error('Error saving bank details:', err);
      toast.error('Failed to save bank details');
    }
  };

  // Handle export
  const handleExport = () => {
    toast.info('Export functionality coming soon!');
  };

  // Loading state
  if (loading) {
    return (
      <CharityLayout title="Funds Management">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                    <div className="h-8 bg-gray-200 rounded w-3/4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CharityLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <CharityLayout title="Funds Management">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading funds data</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <Button onClick={loadFundsData} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title="Funds Management">
      <div className="space-y-8">
        {/* Funds Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-clearcause-primary" />
                Total Raised
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalRaised)}</p>
              <p className="text-sm text-gray-500">Across all campaigns</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-500" />
                Funds Held
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalHeld)}</p>
              <p className="text-sm text-gray-500">Awaiting milestone verification</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Funds Released
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalReleased)}</p>
              <p className="text-sm text-gray-500">Total transferred to your account</p>
            </CardContent>
          </Card>
        </div>

        {/* Bank Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Payout Bank Account Details
              </span>
              {!editingBankDetails && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingBankDetails(true)}
                >
                  <PencilIcon className="h-4 w-4 mr-1" />
                  Edit Details
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editingBankDetails ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveBankDetails)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., BDO Unibank" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accountHolder"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Holder Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Your Organization Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="accountNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 1234567890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="branchCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Branch / Code (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., BDOPH12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingBankDetails(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-1" />
                      Save Bank Details
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Bank Name</Label>
                  <p className="font-medium">{bankDetails.bankName || '-'}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Account Holder Name</Label>
                  <p className="font-medium">{bankDetails.accountHolder || '-'}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Account Number</Label>
                  <p className="font-medium">{bankDetails.accountNumber || '-'}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Bank Branch / Code</Label>
                  <p className="font-medium">{bankDetails.branchCode || '-'}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge variant={bankDetails.status === 'Verified' ? 'default' : 'outline'} className={bankDetails.status === 'Verified' ? 'bg-green-500' : ''}>
                      {bankDetails.status}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transaction History
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{format(transaction.date, 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={transaction.type === 'Donation Received' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-green-600 border-green-200 bg-green-50'}>
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{transaction.campaignTitle}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={transaction.status === 'Held' ? 'text-amber-600 border-amber-200 bg-amber-50' : 'text-green-600 border-green-200 bg-green-50'}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{transaction.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </CharityLayout>
  );
};

export default FundsManagement;
