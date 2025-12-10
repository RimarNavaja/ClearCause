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
  Loader2,
  TrendingUp,
  Wallet,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { downloadTransactionsCSV } from '@/utils/transactionExport';
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
import * as withdrawalService from '@/services/withdrawalService';
import { formatCurrency } from '@/utils/helpers';
import { waitForAuthReady } from '@/utils/authHelper';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const [availableBalance, setAvailableBalance] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [disbursements, setDisbursements] = useState<any[]>([]);

  // Withdrawal state
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);

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
        setTotalRaised(statsResult.data.totalRaised || 0);
      }

      // Get charity fund balances from new columns
      console.log('[FundsManagement] Loading fund balances...');
      const fundsResult = await charityService.getCharityFunds(charity.id, user.id);
      if (fundsResult.success && fundsResult.data) {
        setAvailableBalance(fundsResult.data.availableBalance || 0);
        setTotalReceived(fundsResult.data.totalReceived || 0);
        setTotalWithdrawn(fundsResult.data.totalWithdrawn || 0);
      }

      // Load disbursement history
      console.log('[FundsManagement] Loading disbursements...');
      const disbursementsResult = await charityService.getCharityDisbursements(
        charity.id,
        user.id,
        { limit: 50, offset: 0 }
      );

      if (disbursementsResult.success && disbursementsResult.data) {
        setDisbursements(disbursementsResult.data);

        // Convert disbursements to transaction format for the table
        const disbursementTransactions: Transaction[] = disbursementsResult.data.map((d: any) => ({
          id: d.id,
          date: new Date(d.created_at),
          type: d.disbursement_type === 'seed' ? 'Seed Funding Released' :
                d.disbursement_type === 'milestone' ? 'Milestone Funds Released' :
                d.disbursement_type === 'final' ? 'Final Release' : 'Manual Release',
          campaignTitle: d.campaigns?.title || 'Unknown Campaign',
          amount: d.amount,
          status: d.status === 'completed' ? 'Released' :
                  d.status === 'pending' ? 'Pending' :
                  d.status === 'failed' ? 'Failed' : 'Cancelled',
          reference: `DIS-${d.id.substring(0, 8).toUpperCase()}`
        }));

        setTransactions(disbursementTransactions);
      }

      // Load withdrawal history
      console.log('[FundsManagement] Loading withdrawal history...');
      const withdrawalResult = await withdrawalService.getWithdrawalHistory(charity.id, user.id);
      if (withdrawalResult.success && withdrawalResult.data) {
        setWithdrawalHistory(withdrawalResult.data);
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

  // Handle withdrawal processing
  const handleWithdrawal = async () => {
    if (!charityData || !user) return;

    const amount = parseFloat(withdrawalAmount);

    // Validation
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < 100) {
      toast.error('Minimum withdrawal amount is ₱100');
      return;
    }

    if (amount > availableBalance) {
      toast.error(`Insufficient balance. Available: ${formatCurrency(availableBalance)}`);
      return;
    }

    if (!bankDetails.bankName || !bankDetails.accountNumber) {
      toast.error('Please add your bank details first');
      return;
    }

    try {
      setProcessingWithdrawal(true);

      const result = await withdrawalService.processWithdrawal(
        charityData.id,
        amount,
        {
          bankName: bankDetails.bankName,
          accountNumber: bankDetails.accountNumber,
        },
        user.id
      );

      if (result.success && result.data) {
        toast.success('Withdrawal processed successfully!', {
          description: `Transaction reference: ${result.data.transactionReference}`,
        });

        // Reset and close modal
        setWithdrawalAmount('');
        setShowWithdrawalModal(false);

        // Reload data to show updated balance and new withdrawal
        await loadFundsData();
      } else {
        toast.error(result.error?.message || 'Failed to process withdrawal');
      }
    } catch (err: any) {
      console.error('Error processing withdrawal:', err);
      toast.error(err.message || 'Failed to process withdrawal');
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    try {
      // Check if there are transactions to export
      if (transactions.length === 0) {
        toast.error('No transactions to export');
        return;
      }

      // Get charity name for filename
      const charityName = charityData?.organizationName || 'Organization';

      // Download CSV
      downloadTransactionsCSV(transactions, charityName);

      // Success feedback
      toast.success('Transactions exported successfully!');
    } catch (error: any) {
      console.error('Error exporting transactions:', error);
      toast.error(error.message || 'Failed to export transactions');
    }
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Total Raised
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalRaised)}</p>
              <p className="text-sm text-gray-500">From all donations</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(availableBalance)}</p>
              <p className="text-sm text-green-700 font-medium mb-3">Ready for withdrawal</p>
              <Button
                onClick={() => setShowWithdrawalModal(true)}
                disabled={availableBalance <= 0}
                className="w-full bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Withdraw Funds
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Total Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalReceived)}</p>
              <p className="text-sm text-gray-500">Funds released to date</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Release
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(Math.max(0, totalRaised - totalReceived))}</p>
              <p className="text-sm text-gray-500">Awaiting verification</p>
            </CardContent>
          </Card>
        </div>

        {/* Fund Breakdown Section */}
        {disbursements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Fund Release Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm text-gray-500 mb-2 block">Seed Funding (25% Initial Release)</Label>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency(
                      disbursements
                        .filter(d => d.disbursement_type === 'seed' && d.status === 'completed')
                        .reduce((sum, d) => sum + Number(d.amount), 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Released when campaigns activated
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 mb-2 block">Milestone Releases (75% Verified)</Label>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(
                      disbursements
                        .filter(d => d.disbursement_type === 'milestone' && d.status === 'completed')
                        .reduce((sum, d) => sum + Number(d.amount), 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Released after admin verification
                  </p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Disbursements</span>
                  <span className="font-semibold">{disbursements.filter(d => d.status === 'completed').length} releases</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  {transactions.map((transaction) => {
                    const isReleased = transaction.status === 'Released';
                    const isSeed = transaction.type === 'Seed Funding Released';
                    const isMilestone = transaction.type === 'Milestone Funds Released';

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">{format(transaction.date, 'MMM d, yyyy h:mm a')}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isSeed ? 'text-blue-600 border-blue-200 bg-blue-50' :
                              isMilestone ? 'text-purple-600 border-purple-200 bg-purple-50' :
                              'text-green-600 border-green-200 bg-green-50'
                            }
                          >
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <p className="truncate font-medium">{transaction.campaignTitle}</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-lg font-bold text-green-600">
                            +{formatCurrency(transaction.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isReleased ? 'default' : 'outline'}
                            className={
                              isReleased ? 'bg-green-500 hover:bg-green-600' :
                              transaction.status === 'Pending' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                              transaction.status === 'Failed' ? 'text-red-600 border-red-200 bg-red-50' :
                              'text-gray-600 border-gray-200 bg-gray-50'
                            }
                          >
                            {isReleased && <CheckCircle className="h-3 w-3 mr-1 inline" />}
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-gray-500">{transaction.reference}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        {withdrawalHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Withdrawal History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Account</TableHead>
                    <TableHead>Transaction Reference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalHistory.map((withdrawal: any) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell>{format(new Date(withdrawal.processedAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(withdrawal.amount)}</TableCell>
                      <TableCell className="text-sm">
                        {withdrawal.bankName}<br />
                        ****{withdrawal.bankAccountLast4}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-600">{withdrawal.transactionReference}</TableCell>
                      <TableCell>
                        <Badge variant={withdrawal.status === 'completed' ? 'default' : 'destructive'}>
                          {withdrawal.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1 inline" />}
                          {withdrawal.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Withdrawal Modal */}
      <Dialog open={showWithdrawalModal} onOpenChange={setShowWithdrawalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Process instant withdrawal from your available balance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Available Balance</Label>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(availableBalance)}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawal-amount">Withdrawal Amount</Label>
              <Input
                id="withdrawal-amount"
                type="number"
                placeholder="Enter amount"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                min="100"
                max={availableBalance}
                step="0.01"
              />
              <p className="text-sm text-muted-foreground">
                Minimum: ₱100 | Maximum: {formatCurrency(availableBalance)}
              </p>
            </div>

            <div className="space-y-2 p-3 bg-gray-50 rounded-md">
              <Label className="text-sm font-medium">Bank Details</Label>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Bank:</span> {bankDetails.bankName || 'Not set'}</p>
                <p><span className="text-muted-foreground">Account:</span> {bankDetails.accountNumber ? `****${bankDetails.accountNumber.slice(-4)}` : 'Not set'}</p>
                <p><span className="text-muted-foreground">Holder:</span> {bankDetails.accountHolder || 'Not set'}</p>
              </div>
              {(!bankDetails.bankName || !bankDetails.accountNumber) && (
                <p className="text-sm text-amber-600 mt-2">
                  ⚠️ Please add your bank details first
                </p>
              )}
            </div>

            <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-md">
              <p className="font-medium text-blue-900 mb-1">Instant Processing</p>
              <p>Funds will be deducted immediately and a transaction reference will be generated.</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowWithdrawalModal(false);
                setWithdrawalAmount('');
              }}
              disabled={processingWithdrawal}
            >
              Cancel
            </Button>
            <Button
              onClick={handleWithdrawal}
              disabled={processingWithdrawal || !withdrawalAmount || parseFloat(withdrawalAmount) < 100}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingWithdrawal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Process Withdrawal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CharityLayout>
  );
};

export default FundsManagement;
