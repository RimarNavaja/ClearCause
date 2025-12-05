import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Search,
  Download,
  Filter,
  ExternalLink,
  AlertCircle,
  Receipt,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VerificationBadge from "@/components/ui/VerificationBadge";
import DonorLayout from "@/components/layout/DonorLayout";
import ReceiptButton from "@/components/donor/ReceiptButton";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import * as donationService from "@/services/donationService";
import { formatCurrency, getRelativeTime, debounce } from "@/utils/helpers";

const STATUS_FILTERS = [
  { value: "all", label: "All Donations" },
  { value: "completed", label: "Completed" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "amount_high", label: "Highest Amount" },
  { value: "amount_low", label: "Lowest Amount" },
];

const DonorDonations: React.FC = () => {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  const [stats, setStats] = useState<any>(null);

  const { user } = useAuth();
  const { subscribe } = useRealtime();

  // Debounced search
  const debouncedSearch = debounce((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, 500);

  // Load donations
  const loadDonations = async () => {
    if (!user?.id || !user.email || typeof user.id !== "string") {
      console.log(
        "[DonorDonations] User not fully available yet, skipping donations load"
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: 10,
        sortBy:
          sortBy === "newest"
            ? "donated_at"
            : sortBy === "oldest"
            ? "donated_at"
            : sortBy === "amount_high"
            ? "amount"
            : sortBy === "amount_low"
            ? "amount"
            : "donated_at",
        sortOrder:
          sortBy === "oldest" || sortBy === "amount_low" ? "asc" : "desc",
      };

      const filters = {
        status: statusFilter !== "all" ? [statusFilter] : [],
        search: searchQuery || undefined,
      };

      const result = await donationService.getDonationsByDonor(
        user.id,
        params,
        user.id,
        filters
      );

      if (result.success && result.data) {
        setDonations(result.data);
        // Mock pagination and stats for now
        setTotalPages(Math.ceil(result.data.length / 10));
        setTotalAmount(
          result.data.reduce((sum: number, d: any) => sum + d.amount, 0)
        );
        setStats({
          totalAmount: result.data.reduce(
            (sum: number, d: any) => sum + d.amount,
            0
          ),
          totalCount: result.data.length,
          uniqueCampaigns: new Set(result.data.map((d: any) => d.campaign?.id))
            .size,
          averageAmount:
            result.data.length > 0
              ? result.data.reduce((sum: number, d: any) => sum + d.amount, 0) /
                result.data.length
              : 0,
        });
      } else {
        setError(result.error || "Failed to load donations");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Donations loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const unsubscribeFn = subscribe("donations", (payload) => {
      if (payload.new && payload.new.user_id === user.id) {
        // Update donation in list
        setDonations((prev) => {
          const existingIndex = prev.findIndex((d) => d.id === payload.new.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...payload.new,
            };
            return updated;
          }
          return prev;
        });
      }
    });

    return unsubscribeFn;
  }, [user, subscribe]);

  // Load donations when filters change
  useEffect(() => {
    loadDonations();
  }, [user, searchQuery, statusFilter, sortBy, currentPage]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Completed
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="text-blue-600">
            Processing
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "refunded":
        return (
          <Badge variant="outline" className="text-orange-600">
            Refunded
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get impact status
  const getImpactStatus = (donation: any) => {
    if (donation.campaign?.status === "completed") {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Goal Reached
        </Badge>
      );
    }
    if (donation.milestones?.some((m: any) => m.status === "verified")) {
      return (
        <Badge variant="outline" className="text-blue-600">
          Milestone Completed
        </Badge>
      );
    }
    if (donation.campaign?.status === "active") {
      return <Badge variant="outline">In Progress</Badge>;
    }
    return (
      <Badge variant="outline" className="text-gray-600">
        Pending
      </Badge>
    );
  };

  if (loading && donations.length === 0) {
    return (
      <DonorLayout title="My Donations">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-8 bg-gray-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DonorLayout>
    );
  }

  return (
    <DonorLayout title="My Donations">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-gray-600 text-base">
            Track your donations and their impact
          </p>
        </div>

        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Donated
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(stats.totalAmount)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-bold">₱</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Donations
                    </p>
                    <p className="text-2xl font-bold">{stats.totalCount}</p>
                  </div>
                  <Receipt className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Campaigns Supported
                    </p>
                    <p className="text-2xl font-bold">
                      {stats.uniqueCampaigns}
                    </p>
                  </div>
                  <CalendarDays className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Avg. Donation
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(stats.averageAmount)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-sm">~</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search donations or campaigns..."
              value={searchInput}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-medium text-red-800">
                    Error loading donations
                  </h3>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadDonations}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Donations List */}
        <Card>
          <CardHeader>
            <CardTitle>Donation History</CardTitle>
          </CardHeader>
          <CardContent>
            {donations.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {searchQuery || statusFilter !== "all"
                    ? "No donations found"
                    : "No donations yet"}
                </h3>
                <p className="mt-2 text-gray-500">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filter criteria."
                    : "Start making a difference by supporting campaigns you care about."}
                </p>
                {!searchQuery && statusFilter === "all" && (
                  <Button className="mt-4" asChild>
                    <Link to="/campaigns">Browse Campaigns</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-gray-900">
                            {donation.campaign?.title}
                          </h3>
                          <Link
                            to={`/campaigns/${donation.campaign?.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>

                        {donation.campaign?.charity?.organizationName && (
                          <p className="text-sm text-gray-600 mb-2">
                            by {donation.campaign.charity.organizationName}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span>{getRelativeTime(donation.createdAt)}</span>
                          <span>•</span>
                          <span className="font-semibold">
                            {formatCurrency(donation.amount)}
                          </span>
                          {donation.isAnonymous && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                Anonymous
                              </Badge>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusBadge(donation.status)}
                          {getImpactStatus(donation)}
                          {donation.campaign?.charity?.verificationStatus && (
                            <VerificationBadge
                              status={
                                donation.campaign.charity
                                  .verificationStatus as any
                              }
                              size="sm"
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <ReceiptButton donation={donation} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              Previous
            </Button>

            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    onClick={() => setCurrentPage(page)}
                    className="w-10 h-10 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </DonorLayout>
  );
};

export default DonorDonations;
