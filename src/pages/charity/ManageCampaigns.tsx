import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  Plus,
  Search,
  AlertCircle,
  BarChart3,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Edit,
  Clock,
  User,
  Info,
  Trash2,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CharityLayout from "@/components/layout/CharityLayout";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import * as campaignService from "@/services/campaignService";
import * as charityService from "@/services/charityService";
import { Campaign, CampaignStatus } from "@/lib/types";
import {
  formatCurrency,
  getRelativeTime,
  debounce,
  calculateDaysLeft,
} from "@/utils/helpers";
import { toast } from "sonner";
import { waitForAuthReady } from "@/utils/authHelper";
import { ExtendDeadlineDialog } from "@/components/charity/campaign/ExtendDeadlineDialog";

const STATUS_OPTIONS = [
  { value: "all", label: "All Campaigns" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending Review" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const ManageCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<any>(null);
  const [approvalFeedback, setApprovalFeedback] = useState<Record<string, any>>(
    {}
  );
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    campaignId: string | null;
    campaignTitle: string;
  }>({
    open: false,
    campaignId: null,
    campaignTitle: "",
  });

  const { user } = useAuth();

  // Debounced search
  const debouncedSearch = debounce((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, 500);

  // Load campaigns
  const loadCampaigns = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Wait for auth to be fully ready before making RLS-dependent queries
      console.log("[ManageCampaigns] Waiting for auth to be ready...");
      const authReady = await waitForAuthReady(5000); // Wait up to 5 seconds

      if (!authReady) {
        console.warn(
          "[ManageCampaigns] Auth not ready, retrying in 1 second..."
        );
        // If auth isn't ready, wait a bit and the retry logic in getCharityByUserId will handle it
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // First get charity ID from user ID
      console.log("[ManageCampaigns] Fetching charity data...");
      const charityResult = await charityService.getCharityByUserId(user.id);

      if (!charityResult.success || !charityResult.data) {
        setError("No charity organization found");
        setCampaigns([]);
        setLoading(false);
        return;
      }

      // Separate pagination params and filters
      const paginationParams = {
        page: currentPage,
        limit: 12,
      };

      const campaignFilters = {
        search: searchQuery || undefined,
        status:
          statusFilter !== "all" ? [statusFilter as CampaignStatus] : undefined,
      };

      // Pass charity ID, pagination params, user ID, and filters
      const result = await campaignService.getCharityCampaigns(
        charityResult.data.id,
        paginationParams,
        user.id,
        campaignFilters
      );

      if (result.success && result.data) {
        // PaginatedResponse returns data directly as an array, not in a campaigns property
        const campaignsData = Array.isArray(result.data)
          ? result.data
          : result.data.campaigns || [];
        setCampaigns(campaignsData);
        setTotalPages(result.pagination?.totalPages || 1);

        // Load approval feedback for draft campaigns
        const feedbackMap: Record<string, any> = {};
        await Promise.all(
          campaignsData.map(async (campaign) => {
            if (campaign.status === "draft") {
              const historyResult =
                await campaignService.getCampaignApprovalHistory(
                  campaign.id,
                  user.id
                );
              if (
                historyResult.success &&
                historyResult.data &&
                historyResult.data.length > 0
              ) {
                // Get the most recent feedback
                feedbackMap[campaign.id] = historyResult.data[0];
              }
            }
          })
        );
        setApprovalFeedback(feedbackMap);
      } else {
        setError(result.error || "Failed to load campaigns");
        setCampaigns([]);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      setCampaigns([]);
      console.error("Campaign loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscriptions
  useRealtime(
    "campaigns",
    (payload) => {
      if (user && payload.new && (payload.new as any).charity_id === user.id) {
        // Reload campaigns when there's a change
        loadCampaigns();
      }
    },
    {
      enabled: !!user,
      event: "*",
    }
  );

  // Load campaigns when filters change
  useEffect(() => {
    loadCampaigns();
  }, [user, searchQuery, statusFilter, currentPage]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    debouncedSearch(value);
  };

  // Handle delete campaign
  const handleDeleteCampaign = (campaignId: string, campaignTitle: string) => {
    setDeleteDialog({ open: true, campaignId, campaignTitle });
  };

  const confirmDeleteCampaign = async () => {
    if (!deleteDialog.campaignId || !user) return;

    try {
      const result = await campaignService.deleteCampaign(
        deleteDialog.campaignId,
        user.id
      );

      if (result.success) {
        toast.success("Campaign deleted successfully");
        setDeleteDialog({ open: false, campaignId: null, campaignTitle: "" });
        // Reload campaigns
        loadCampaigns();
      } else {
        toast.error(result.error || "Failed to delete campaign");
      }
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: CampaignStatus) => {
    switch (status) {
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "paused":
        return "outline";
      case "draft":
        return "outline";
      case "pending":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Get status display label
  const getStatusLabel = (status: CampaignStatus, feedback?: any) => {
    // If there's rejection feedback, show as Rejected
    if (status === "draft" && feedback?.action === "rejected") {
      return "Rejected";
    }
    // If there's revision feedback, show as Needs Revision
    if (status === "draft" && feedback?.action === "revision_requested") {
      return "Needs Revision";
    }

    switch (status) {
      case "draft":
        return "Draft";
      case "pending":
        return "Pending Review";
      case "active":
        return "Active";
      case "paused":
        return "Paused";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  // Get status badge variant with feedback awareness
  const getStatusBadgeVariantWithFeedback = (
    status: CampaignStatus,
    feedback?: any
  ) => {
    // If rejected, show destructive variant
    if (status === "draft" && feedback?.action === "rejected") {
      return "destructive";
    }
    // If needs revision, show warning variant
    if (status === "draft" && feedback?.action === "revision_requested") {
      return "secondary";
    }

    return getStatusBadgeVariant(status);
  };

  // Campaign table row
  const CampaignTableRow = ({ campaign }: { campaign: Campaign }) => {
    const amountRaised = campaign.currentAmount || 0;
    const goalAmount = campaign.goalAmount || 0;
    const progress = goalAmount > 0 ? (amountRaised / goalAmount) * 100 : 0;
    const daysLeft = calculateDaysLeft(campaign.endDate);
    const feedback = approvalFeedback[campaign.id];

    return (
      <Card
        className={`${feedback ? "border-l-4" : ""} ${
          feedback?.action === "rejected"
            ? "border-l-red-500 bg-red-50/30"
            : feedback?.action === "revision_requested"
            ? "border-l-amber-500 bg-amber-50/30"
            : feedback?.action === "approved"
            ? "border-l-green-500 bg-green-50/30"
            : ""
        }`}
      >
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Admin Feedback Section */}
            {feedback && (
              <div className="space-y-4 pb-4 border-b">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        feedback.action === "rejected"
                          ? "bg-red-100"
                          : feedback.action === "revision_requested"
                          ? "bg-amber-100"
                          : "bg-green-100"
                      }`}
                    >
                      {feedback.action === "rejected" && (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      {feedback.action === "revision_requested" && (
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      )}
                      {feedback.action === "approved" && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h3
                        className={`text-lg font-semibold ${
                          feedback.action === "rejected"
                            ? "text-red-900"
                            : feedback.action === "revision_requested"
                            ? "text-amber-900"
                            : "text-green-900"
                        }`}
                      >
                        {feedback.action === "rejected" &&
                          "❌ Campaign Rejected"}
                        {feedback.action === "revision_requested" &&
                          "✏️ Revision Requested"}
                        {feedback.action === "approved" &&
                          "✅ Campaign Approved"}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        {feedback.admin?.full_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {feedback.admin.full_name}
                          </span>
                        )}
                        {feedback.requested_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getRelativeTime(feedback.requested_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {feedback.action === "revision_requested" && (
                    <Button
                      asChild
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Link to={`/charity/campaigns/edit/${campaign.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Campaign
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Reason */}
                <div
                  className={`p-4 rounded-lg ${
                    feedback.action === "rejected"
                      ? "bg-red-100/50 border border-red-200"
                      : feedback.action === "revision_requested"
                      ? "bg-amber-100/50 border border-amber-200"
                      : "bg-green-100/50 border border-green-200"
                  }`}
                >
                  <p
                    className={`font-medium text-sm mb-1 ${
                      feedback.action === "rejected"
                        ? "text-red-900"
                        : feedback.action === "revision_requested"
                        ? "text-amber-900"
                        : "text-green-900"
                    }`}
                  >
                    {feedback.action === "rejected"
                      ? "Reason for rejection:"
                      : feedback.action === "revision_requested"
                      ? "What needs to be changed:"
                      : "Feedback:"}
                  </p>
                  <p className="text-gray-700">{feedback.reason}</p>
                </div>

                {/* Suggestions */}
                {feedback.suggestions && (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="font-medium text-sm text-blue-900 mb-1 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {feedback.action === "rejected"
                        ? "Additional Notes:"
                        : "Admin Suggestions:"}
                    </p>
                    <p className="text-gray-700 text-sm">
                      {feedback.suggestions}
                    </p>
                  </div>
                )}

                {/* Next Steps Info for Rejected */}
                {feedback.action === "rejected" && (
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <p className="font-medium text-sm text-gray-900 mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      What happens next?
                    </p>
                    <p className="text-sm text-gray-600">
                      This campaign application has been rejected and cannot be
                      resubmitted. You may create a new campaign that addresses
                      the feedback provided above.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {feedback.action === "revision_requested" && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      asChild
                      variant="default"
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      <Link to={`/charity/campaigns/edit/${campaign.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Make Changes Now
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to={`/campaigns/${campaign.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Campaign
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Action Buttons for Rejected */}
                {feedback.action === "rejected" && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button asChild variant="default">
                      <Link to={`/charity/campaigns/new`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Campaign
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        handleDeleteCampaign(campaign.id, campaign.title)
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Campaign
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Campaign Details Section */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 content-center">
              {/* Campaign Title and Created At */}
              <div className="md:col-span-2">
                <h3 className="font-medium text-gray-900">{campaign.title}</h3>
                <p className="text-sm text-gray-500">
                  Created {getRelativeTime(campaign.createdAt)}
                </p>
              </div>

              {/* Status Badge and Days Left */}

              <div className="md:col-span-2 flex flex-col items-center justify-center">
                <Badge
                  variant={
                    daysLeft <= 0 &&
                    campaign.status !== "completed" &&
                    campaign.status !== "cancelled"
                      ? "secondary"
                      : getStatusBadgeVariantWithFeedback(
                          campaign.status,
                          feedback
                        )
                  }
                >
                  {daysLeft <= 0 &&
                  campaign.status !== "completed" &&
                  campaign.status !== "cancelled"
                    ? "Ended"
                    : getStatusLabel(campaign.status, feedback)}
                </Badge>
                {daysLeft > 0 && campaign.status === "active" && (
                  <p className="text-xs text-gray-500 mt-1">
                    {daysLeft} days left
                  </p>
                )}
                {daysLeft <= 0 &&
                  campaign.status !== "completed" &&
                  campaign.status !== "cancelled" && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                      Campaign Ended
                    </p>
                  )}
              </div>
              {/* Amount Raised and Progress Bar */}
              <div className="md:col-span-4 ">
                <p className="text-sm font-medium">
                  {formatCurrency(amountRaised)}
                </p>
                <p className="text-xs text-gray-500">
                  of {formatCurrency(goalAmount)} ({progress.toFixed(1)}%)
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <div
                    className="bg-blue-600 h-1 rounded-full"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 md:col-span-4">
                {campaign.status === "active" && (
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="bg-clearcause-primary hover:bg-blue-600"
                  >
                    <Link to={`/charity/campaigns/${campaign.id}/updates`}>
                      
                      Post Update
                    </Link>
                  </Button>
                )}
                {(campaign.status === "active" ||
                  campaign.status === "paused") &&
                  calculateDaysLeft(campaign.endDate) <= 0 && (
                    <ExtendDeadlineDialog
                      campaignId={campaign.id}
                      currentEndDate={campaign.endDate || null}
                      campaignTitle={campaign.title}
                      expirationRefundInitiated={campaign.expirationRefundInitiated}
                      onSuccess={loadCampaigns}
                    />
                  )}
                {campaign.status === "draft" && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="border-blue-700 text-blue-700 hover:bg-blue-600 px-5"
                  >
                    <Link to={`/charity/campaigns/edit/${campaign.id}`}>
                      {/* <Edit className="mr-2 h-4 w-4" /> */}
                      Edit Draft
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/campaigns/${campaign.id}`}>
                    {/* <Eye className="mr-2 h-4 w-4" /> */}
                    View Details
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading && (!campaigns || campaigns.length === 0)) {
    return (
      <CharityLayout title="Manage Campaigns">
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
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title="Manage Campaigns">
      <div className="space-y-6">
        {/* Header with Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Campaigns</h1>
            <p className="text-gray-600">
              Create and manage your fundraising campaigns
            </p>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-600/90">
            <Link to="/charity/campaigns/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Campaigns
                    </p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active</p>
                    <p className="text-2xl font-bold">{stats.active}</p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <div className="h-3 w-3 bg-green-600 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Total Raised
                    </p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(stats.totalRaised)}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm font-bold">₱</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Avg. Success Rate
                    </p>
                    <p className="text-2xl font-bold">{stats.successRate}%</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
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
              placeholder="Search campaigns..."
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
              {STATUS_OPTIONS.map((option) => (
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
                    Error loading campaigns
                  </h3>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadCampaigns}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign Display - List View */}
        <div className="space-y-4">
          {campaigns &&
            campaigns.map((campaign) => (
              <CampaignTableRow key={campaign.id} campaign={campaign} />
            ))}
        </div>

        {/* Empty State */}
        {!loading && !error && campaigns && campaigns.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No campaigns found
              </h3>
              <p className="mt-2 text-gray-500">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Get started by creating your first campaign."}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button className="mt-4" asChild>
                  <Link to="/charity/campaigns/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Campaign
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

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

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteDialog.open}
          onOpenChange={(open) =>
            !open &&
            setDeleteDialog({
              open: false,
              campaignId: null,
              campaignTitle: "",
            })
          }
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>"{deleteDialog.campaignTitle}"</strong>? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteCampaign}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Campaign
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </CharityLayout>
  );
};

export default ManageCampaigns;
