import React, { useState, useEffect } from 'react';
import { Download, Eye, Search, Filter, DollarSign, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import * as donationService from '@/services/donationService';
import { formatCurrency } from '@/utils/helpers';
import { downloadReceipt, previewReceipt } from '@/utils/receiptGenerator';
import { toast } from 'sonner';

const DonationManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [donations, setDonations] = useState<any[]>([]);
  const [filteredDonations, setFilteredDonations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [statistics, setStatistics] = useState({
    totalDonations: 0,
    totalAmount: 0,
    completedCount: 0,
    completedAmount: 0,
  });

  useEffect(() => {
    if (user) {
      loadDonations();
    }
  }, [user]);

  useEffect(() => {
    filterDonations();
  }, [searchTerm, statusFilter, donations]);

  const loadDonations = async () => {
    if (!user?.id) {
      console.log('[DonationManagement] No user ID, aborting');
      return;
    }

    console.log('[DonationManagement] Loading donations for admin user:', {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role
    });

    try {
      setLoading(true);

      console.log('[DonationManagement] Calling listDonations with params:', {
        filters: {},
        pagination: { page: 1, limit: 100 },
        userId: user.id
      });

      // Load all donations with campaign and donor details
      const result = await donationService.listDonations(
        {}, // filters
        { page: 1, limit: 100 }, // pagination params (max allowed is 100)
        user.id // current user ID
      );

      console.log('[DonationManagement] listDonations result:', {
        success: result.success,
        dataExists: !!result.data,
        itemsCount: result.data?.length || 0,
        totalCount: result.pagination?.total || 0,
        error: result.error
      });

      if (result.success && result.data) {
        console.log('[DonationManagement] Setting donations:', result.data);
        setDonations(result.data || []);
        calculateStatistics(result.data || []);
      } else {
        console.error('[DonationManagement] Failed to load donations:', result.error);
      }
    } catch (error: any) {
      console.error('[DonationManagement] Exception loading donations:', {
        message: error.message,
        stack: error.stack,
        error
      });
      toast.error('Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (donationsList: any[]) => {
    const completed = donationsList.filter(d => d.status === 'completed');

    setStatistics({
      totalDonations: donationsList.length,
      totalAmount: donationsList.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0),
      completedCount: completed.length,
      completedAmount: completed.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0),
    });
  };

  const filterDonations = () => {
    let filtered = [...donations];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(d =>
        d.campaign?.title?.toLowerCase().includes(search) ||
        d.donor?.fullName?.toLowerCase().includes(search) ||
        d.donor?.email?.toLowerCase().includes(search) ||
        d.transactionId?.toLowerCase().includes(search)
      );
    }

    setFilteredDonations(filtered);
  };

  const handlePreviewReceipt = async (donation: any) => {
    try {
      // Transform donation data to ReceiptData format
      const receiptData = {
        donationId: donation.id,
        transactionId: donation.transactionId || 'N/A',
        amount: donation.amount,
        donatedAt: donation.createdAt,
        paymentMethod: donation.paymentMethod,
        status: donation.status,
        donorName: donation.isAnonymous ? 'Anonymous Donor' : (donation.donor?.fullName || 'N/A'),
        donorEmail: donation.isAnonymous ? '' : (donation.donor?.email || ''),
        isAnonymous: donation.isAnonymous,
        campaignTitle: donation.campaign?.title || 'N/A',
        charityName: donation.campaign?.charity?.organizationName || 'N/A',
        message: donation.message,
      };
      await previewReceipt(receiptData);
    } catch (error) {
      console.error('Error previewing receipt:', error);
      toast.error('Failed to preview receipt');
    }
  };

  const handleDownloadReceipt = async (donation: any) => {
    try {
      // Transform donation data to ReceiptData format
      const receiptData = {
        donationId: donation.id,
        transactionId: donation.transactionId || 'N/A',
        amount: donation.amount,
        donatedAt: donation.createdAt,
        paymentMethod: donation.paymentMethod,
        status: donation.status,
        donorName: donation.isAnonymous ? 'Anonymous Donor' : (donation.donor?.fullName || 'N/A'),
        donorEmail: donation.isAnonymous ? '' : (donation.donor?.email || ''),
        isAnonymous: donation.isAnonymous,
        campaignTitle: donation.campaign?.title || 'N/A',
        charityName: donation.campaign?.charity?.organizationName || 'N/A',
        message: donation.message,
      };
      await downloadReceipt(receiptData);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: { variant: any; label: string } } = {
      completed: { variant: 'default', label: 'Completed' },
      pending: { variant: 'secondary', label: 'Pending' },
      failed: { variant: 'destructive', label: 'Failed' },
      refunded: { variant: 'outline', label: 'Refunded' },
    };

    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodDisplay = (method: string) => {
    const methods: { [key: string]: string } = {
      gcash: 'GCash',
      paymaya: 'PayMaya',
      card: 'Credit/Debit Card',
      bank_transfer: 'Bank Transfer',
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading donations...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Donation Management</h1>
          <p className="text-muted-foreground">View all donations and generate receipts</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                Total Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalDonations}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Total Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(statistics.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">All donations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.completedCount}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(statistics.completedAmount)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.totalDonations > 0
                  ? Math.round((statistics.completedCount / statistics.totalDonations) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Completion rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by campaign, donor, email, or transaction ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Donations Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Donations ({filteredDonations.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Donor</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No donations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDonations.map((donation) => (
                      <TableRow key={donation.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(donation.createdAt), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          {donation.isAnonymous ? (
                            <span className="text-muted-foreground italic">Anonymous</span>
                          ) : (
                            <div>
                              <div className="font-medium">{donation.donor?.fullName || 'N/A'}</div>
                              <div className="text-xs text-muted-foreground">{donation.donor?.email}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">{donation.campaign?.title || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(donation.amount)}</TableCell>
                        <TableCell className="text-sm">{getPaymentMethodDisplay(donation.paymentMethod)}</TableCell>
                        <TableCell>{getStatusBadge(donation.status)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {donation.transactionId || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {donation.status === 'completed' && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePreviewReceipt(donation)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadReceipt(donation)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default DonationManagement;
