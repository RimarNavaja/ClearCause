import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Building2,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import VerificationBadge from '@/components/ui/VerificationBadge';
import AdminLayout from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

interface CharityVerification {
  id: string;
  organization_name: string;
  organization_type: string;
  contact_email: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'resubmission_required';
  submitted_at: string;
  documents: { id: string }[];
}

const CharityVerificationQueue = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifications, setVerifications] = useState<CharityVerification[]>([]);
  const [filteredVerifications, setFilteredVerifications] = useState<CharityVerification[]>([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    fetchVerifications();
  }, []);

  useEffect(() => {
    filterVerifications();
  }, [searchTerm, verifications, activeTab, sortBy]);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('charity_verifications')
        .select(`
          id,
          organization_name,
          organization_type,
          contact_email,
          status,
          submitted_at,
          documents:verification_documents(id)
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      setVerifications(data || []);
    } catch (error: any) {
      console.error('Error fetching verifications:', error);
      toast({
        title: 'Error loading verifications',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterVerifications = () => {
    let filtered = verifications;

    // Filter by status (tab)
    if (activeTab !== 'all') {
      filtered = filtered.filter((v) => v.status === activeTab);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (v) =>
          v.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.organization_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        case 'oldest':
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
        case 'name':
          return a.organization_name.localeCompare(b.organization_name);
        default:
          return 0;
      }
    });

    setFilteredVerifications(filtered);
  };

  const getStatusCounts = () => {
    return {
      all: verifications.length,
      pending: verifications.filter((v) => v.status === 'pending').length,
      under_review: verifications.filter((v) => v.status === 'under_review').length,
      approved: verifications.filter((v) => v.status === 'approved').length,
      rejected: verifications.filter((v) => v.status === 'rejected').length,
      resubmission_required: verifications.filter((v) => v.status === 'resubmission_required')
        .length,
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const counts = getStatusCounts();

  return (
    <AdminLayout title="Charity Verifications">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.pending}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.under_review}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts.approved}</div>
              <p className="text-xs text-muted-foreground">Verified charities</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Need Action</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {counts.rejected + counts.resubmission_required}
              </div>
              <p className="text-xs text-muted-foreground">Rejected or resubmission</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Verification Applications</CardTitle>
                <CardDescription>Review charity organization verification requests</CardDescription>
              </div>
              <Button onClick={fetchVerifications} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by organization name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
                <TabsTrigger value="under_review">
                  Under Review ({counts.under_review})
                </TabsTrigger>
                <TabsTrigger value="approved">Approved ({counts.approved})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredVerifications.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVerifications.map((verification) => (
                        <TableRow key={verification.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {verification.organization_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {verification.organization_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{verification.contact_email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              {verification.documents.length}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(verification.submitted_at)}
                          </TableCell>
                          <TableCell>
                            <VerificationBadge status={verification.status} size="sm" />
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/admin/verifications/charity/${verification.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                Review
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No verifications found</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm
                        ? 'Try adjusting your search criteria'
                        : 'No verification applications match the current filter'}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CharityVerificationQueue;
