import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Plus,
  Trash2,
  Upload,
  Check,
  Info,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  BadgeCheck,
  AlertCircle,
  Clock,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import CharityLayout from "@/components/layout/CharityLayout";
import * as campaignService from "@/services/campaignService";
import CampaignBanner from "@/components/ui/campaign/CampaignBanner";
import * as charityService from "@/services/charityService";
import { CampaignCreateData } from "@/lib/types";
import { getRelativeTime } from "@/utils/helpers";
import { waitForAuthReady } from "@/utils/authHelper";
import {
  uploadCampaignImage,
  validateFile,
  STORAGE_BUCKETS,
} from "@/services/fileUploadService";
import * as categoryService from "@/services/categoryService";

// Proof type options for milestone evidence
const PROOF_TYPE_OPTIONS = [
  { value: "receipts", label: "Official Receipts" },
  { value: "photos", label: "Photographs/Images" },
  { value: "videos", label: "Video Documentation" },
  { value: "certificates", label: "Certificates/Permits" },
  { value: "bank_statements", label: "Bank Statements" },
  { value: "invoices", label: "Invoices" },
  { value: "contracts", label: "Contracts/Agreements" },
  { value: "medical_records", label: "Medical Records" },
  { value: "progress_reports", label: "Progress Reports" },
  { value: "beneficiary_list", label: "Beneficiary List/Documentation" },
  { value: "other", label: "Other (Specify)" },
];

// TypeScript interfaces
interface Milestone {
  id: string;
  title: string;
  amount: number;
  evidenceDescription: string;
  customProof?: string; // For custom description when "other" is selected
}

const CampaignForm: React.FC = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditMode = !!campaignId;
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignImage, setCampaignImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null
  );
  const [checkingVerification, setCheckingVerification] = useState(true);
  const [approvalFeedback, setApprovalFeedback] = useState<any>(null);
  const [categories, setCategories] = useState<
    Array<{
      id: string;
      name: string;
      slug: string;
      icon?: string;
      color?: string;
    }>
  >([]);

  // Form state
  const [campaignDetails, setCampaignDetails] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    goal: "",
    endDate: "",
  });

  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: "1", title: "", amount: 0, evidenceDescription: "" },
  ]);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const result = await categoryService.getActiveCategories();
        if (result.success && result.data) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        // Use fallback categories if fetch fails
        setCategories([
          { id: "1", name: "Education", slug: "education", icon: "📚" },
          { id: "2", name: "Healthcare", slug: "health", icon: "🏥" },
          { id: "3", name: "Environment", slug: "environment", icon: "🌱" },
          { id: "4", name: "Disaster Relief", slug: "disaster", icon: "🆘" },
          {
            id: "5",
            name: "Community Development",
            slug: "community",
            icon: "🏘️",
          },
          { id: "6", name: "Other", slug: "other", icon: "🤝" },
        ]);
      }
    };

    fetchCategories();
  }, []);

  // Check charity verification status
  useEffect(() => {
    const checkVerification = async () => {
      if (!user) return;

      try {
        setCheckingVerification(true);

        // Wait for auth to be fully ready before making RLS-dependent queries
        console.log("[CampaignForm] Waiting for auth to be ready...");
        const authReady = await waitForAuthReady(5000); // Wait up to 5 seconds

        if (!authReady) {
          console.warn(
            "[CampaignForm] Auth not ready, retrying in 1 second..."
          );
          // If auth isn't ready, wait a bit and the retry logic in getCharityByUserId will handle it
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        console.log("[CampaignForm] Fetching charity verification status...");
        const charityResult = await charityService.getCharityByUserId(user.id);

        if (charityResult.success && charityResult.data) {
          console.log(
            "[CampaignForm] Charity verification status:",
            charityResult.data.verificationStatus
          );
          setVerificationStatus(charityResult.data.verificationStatus);
        } else {
          console.warn(
            "[CampaignForm] No charity data found, allowing creation"
          );
          // If we can't find charity data but no error, assume they can create
          // This prevents blocking legitimate users
          setVerificationStatus("approved");
        }
      } catch (error) {
        console.error("[CampaignForm] Error checking verification:", error);
        // On error, don't block - assume approved to prevent false negatives
        // The actual API will validate on submission anyway
        setVerificationStatus("approved");
      } finally {
        setCheckingVerification(false);
      }
    };

    checkVerification();
  }, [user]);

  // For edit mode, fetch existing campaign data
  useEffect(() => {
    const loadCampaignData = async () => {
      if (isEditMode && campaignId && user) {
        try {
          setLoading(true);
          const result = await campaignService.getCampaignById(
            campaignId,
            true
          );

          if (result.success && result.data) {
            const campaign = result.data;

            setCampaignDetails({
              title: campaign.title,
              description: campaign.description,
              category: campaign.category || "",
              location: campaign.location || "",
              goal: campaign.goalAmount.toString(),
              endDate: campaign.endDate || "",
            });

            if (campaign.milestones) {
              setMilestones(
                campaign.milestones.map((milestone, index) => ({
                  id: milestone.id || (index + 1).toString(),
                  title: milestone.title,
                  amount: milestone.targetAmount,
                  evidenceDescription: milestone.evidenceDescription || "",
                }))
              );
            }

            if (campaign.imageUrl) {
              setImagePreview(campaign.imageUrl);
              setExistingImageUrl(campaign.imageUrl);
            }

            // Load approval feedback if campaign is in draft status
            if (campaign.status === "draft") {
              const historyResult =
                await campaignService.getCampaignApprovalHistory(
                  campaignId,
                  user.id
                );
              if (
                historyResult.success &&
                historyResult.data &&
                historyResult.data.length > 0
              ) {
                // Get the most recent feedback
                setApprovalFeedback(historyResult.data[0]);
              }
            }
          }
        } catch (error) {
          console.error("Failed to load campaign data:", error);
          toast({
            title: "Error",
            description: "Failed to load campaign data. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    loadCampaignData();
  }, [isEditMode, campaignId, user, toast]);

  // Handle form field changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setCampaignDetails((prev) => ({ ...prev, [name]: value }));
  };

  // Handle milestone changes
  const handleMilestoneChange = (
    index: number,
    field: keyof Milestone,
    value: string | number
  ) => {
    const updatedMilestones = [...milestones];
    updatedMilestones[index] = { ...updatedMilestones[index], [field]: value };
    setMilestones(updatedMilestones);
  };

  // Add a new milestone
  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: Date.now().toString(),
        title: "",
        amount: 0,
        evidenceDescription: "",
      },
    ]);
  };

  // Remove a milestone
  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      const updatedMilestones = [...milestones];
      updatedMilestones.splice(index, 1);
      setMilestones(updatedMilestones);
    }
  };

  // Handle campaign image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file before setting
      const validation = validateFile(file, STORAGE_BUCKETS.CAMPAIGN_IMAGES);
      if (!validation.valid) {
        toast({
          title: "Invalid File",
          description: validation.error,
          variant: "destructive",
        });
        e.target.value = ""; // Reset file input
        return;
      }

      setCampaignImage(file);

      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (isDraft: boolean = false) => {
    // Validate image requirement (unless editing with existing image)
    if (!imagePreview && !existingImageUrl) {
      toast({
        title: "Image Required",
        description: "Please upload a campaign image before submitting",
        variant: "destructive",
      });
      setCurrentStep(1); // Go back to step 1 where image upload is
      return;
    }

    // Validate custom proof requirement
    const invalidMilestones = milestones.filter(
      (m) =>
        m.evidenceDescription === "other" &&
        (!m.customProof || m.customProof.trim() === "")
    );

    if (invalidMilestones.length > 0) {
      toast({
        title: "Validation Error",
        description:
          "Please provide a custom proof description for milestones with 'Other' evidence type.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Upload campaign image if a new one was selected
      let imageUrl = existingImageUrl; // Keep existing URL by default
      if (campaignImage) {
        setUploading(true);
        setUploadProgress(30);

        const uploadResult = await uploadCampaignImage(
          campaignImage,
          campaignId
        );

        setUploadProgress(70);

        if (uploadResult.success && uploadResult.data) {
          imageUrl = uploadResult.data.publicUrl;
          setUploadProgress(100);
        } else {
          throw new Error("Failed to upload campaign image");
        }

        setUploading(false);
      }

      // Convert date to ISO datetime string if provided
      let endDateISO: string | undefined = undefined;
      if (campaignDetails.endDate) {
        const endDate = new Date(campaignDetails.endDate);
        // Set to end of day (23:59:59) in local timezone
        endDate.setHours(23, 59, 59, 999);
        endDateISO = endDate.toISOString();
      }

      // Map form data to API format
      const campaignData: CampaignCreateData = {
        title: campaignDetails.title,
        description: campaignDetails.description,
        goalAmount: Number(campaignDetails.goal),
        imageUrl: imageUrl,
        endDate: endDateISO,
        category: campaignDetails.category || undefined,
        location: campaignDetails.location || undefined,
        status: isDraft ? "draft" : "pending",
        milestones: milestones.map((milestone) => {
          // Use custom proof description if "other" is selected, otherwise use the selected option label
          const evidenceDesc =
            milestone.evidenceDescription === "other"
              ? milestone.customProof || "Other"
              : PROOF_TYPE_OPTIONS.find(
                  (opt) => opt.value === milestone.evidenceDescription
                )?.label || milestone.evidenceDescription;

          return {
            title: milestone.title,
            description: null, // Don't use description for evidence anymore
            targetAmount: Number(milestone.amount),
            evidenceDescription: evidenceDesc,
          };
        }),
      };

      if (isEditMode) {
        // Update existing campaign
        // When resubmitting after revision, it should go back to 'pending' for admin review
        const result = await campaignService.updateCampaign(
          campaignId!,
          { ...campaignData, status: isDraft ? "draft" : "pending" },
          user.id
        );

        if (result.success) {
          toast({
            title: isDraft ? "Draft Saved" : "Campaign Resubmitted",
            description: isDraft
              ? "Your campaign draft has been saved."
              : "Your campaign has been resubmitted for admin review.",
          });
          navigate("/charity/campaigns");
        }
      } else {
        // Create new campaign
        const result = await campaignService.createCampaign(
          campaignData,
          user.id
        );

        if (result.success) {
          toast({
            title: isDraft ? "Draft Saved" : "Campaign Created",
            description: isDraft
              ? "Your campaign draft has been saved."
              : "Your campaign has been submitted for review.",
          });
          navigate("/charity/campaigns");
        }
      }
    } catch (error) {
      console.error("Campaign submission error:", error);

      // Extract user-friendly error message
      let errorMessage = "Failed to save campaign. Please try again.";

      if (error instanceof Error) {
        // Handle validation errors - extract the actual message
        errorMessage = error.message;

        // If it's a validation error with field prefix, clean it up
        if (errorMessage.includes(":")) {
          const parts = errorMessage.split(":");
          if (parts.length > 1) {
            errorMessage = parts.slice(1).join(":").trim();
          }
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Navigate between form steps
  const goToNextStep = () => {
    // Validate Step 1 before proceeding
    if (currentStep === 1) {
      if (!campaignDetails.title.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter a campaign title",
          variant: "destructive",
        });
        return;
      }
      if (campaignDetails.description.length < 10) {
        toast({
          title: "Validation Error",
          description: "Campaign description must be at least 10 characters",
          variant: "destructive",
        });
        return;
      }
      if (!campaignDetails.category) {
        toast({
          title: "Validation Error",
          description: "Please select a category",
          variant: "destructive",
        });
        return;
      }
      if (!campaignDetails.location.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter a project location",
          variant: "destructive",
        });
        return;
      }
      // Validate image requirement
      if (!imagePreview && !existingImageUrl) {
        toast({
          title: "Image Required",
          description: "Please upload a campaign image to continue",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // Calculate total milestone amount
  const totalMilestoneAmount = milestones.reduce(
    (sum, milestone) => sum + Number(milestone.amount),
    0
  );
  const goalAmount = Number(campaignDetails.goal) || 0;
  const milestoneAmountError =
    goalAmount > 0 && totalMilestoneAmount !== goalAmount;

  // Show loading state while checking verification
  if (checkingVerification) {
    return (
      <CharityLayout
        title={isEditMode ? "Edit Campaign" : "Create New Campaign"}
      >
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </CharityLayout>
    );
  }

  // Block campaign creation if charity is not verified
  if (!isEditMode && verificationStatus !== "approved") {
    return (
      <CharityLayout title="Create New Campaign">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-2xl px-4">
            <div className="bg-gradient-to-br from-orange-100 to-orange-50 p-6 rounded-full w-fit mx-auto mb-6 shadow-lg">
              <AlertTriangle className="h-16 w-16 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Verification Required
            </h3>
            <p className="text-base text-gray-600 mb-8 leading-relaxed">
              You must complete and be approved for organization verification
              before you can create campaigns. This ensures transparency and
              builds trust with potential donors.
            </p>
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <h4 className="font-semibold text-gray-900 mb-3">
                Current Status:
              </h4>
              <div className="flex items-center gap-2 text-gray-700">
                {verificationStatus === "pending" ||
                verificationStatus === "under_review" ? (
                  <>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>
                      Your verification is currently being reviewed by our team
                    </span>
                  </>
                ) : verificationStatus === "rejected" ||
                  verificationStatus === "resubmission_required" ? (
                  <>
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Your verification needs to be resubmitted</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span>
                      You haven't submitted a verification application yet
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" asChild className="text-base">
                <Link to="/charity/verification/apply">
                  <BadgeCheck className="mr-2 h-5 w-5" />
                  {verificationStatus
                    ? "View Verification Status"
                    : "Start Verification"}
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="text-base">
                <Link to="/charity/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title={isEditMode ? "Edit Campaign" : "Create New Campaign"}>
      {/* Admin Revision Feedback Banner */}
      {approvalFeedback && approvalFeedback.action === "revision_requested" && (
        <Alert className="mb-6 border-l-4 border-l-amber-500 bg-amber-50/80">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <AlertTitle className="text-lg font-semibold text-amber-900 mb-2">
                  ✏️ Admin Requested Changes
                </AlertTitle>
                <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                  {approvalFeedback.admin?.full_name && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {approvalFeedback.admin.full_name}
                    </span>
                  )}
                  {approvalFeedback.requested_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getRelativeTime(approvalFeedback.requested_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* What needs to be changed */}
              <div className="p-4 rounded-lg bg-amber-100/50 border border-amber-200">
                <p className="font-medium text-sm text-amber-900 mb-1">
                  What needs to be changed:
                </p>
                <p className="text-gray-700">{approvalFeedback.reason}</p>
              </div>

              {/* Suggestions */}
              {approvalFeedback.suggestions && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="font-medium text-sm text-blue-900 mb-1 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Admin Suggestions:
                  </p>
                  <p className="text-gray-700 text-sm">
                    {approvalFeedback.suggestions}
                  </p>
                </div>
              )}

              {/* Helper Text */}
              <AlertDescription className="text-sm text-gray-600 mt-3 flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  Please review and address the feedback above, then resubmit
                  your campaign for review.
                </span>
              </AlertDescription>
            </div>
          </div>
        </Alert>
      )}

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep === step
                    ? "border-clearcause-primary bg-clearcause-primary text-white"
                    : currentStep > step
                    ? "border-clearcause-primary text-clearcause-primary"
                    : "border-gray-300 text-gray-400"
                }`}
              >
                {currentStep > step ? <Check className="w-5 h-5" /> : step}
              </div>
              <span
                className={`text-xs mt-2 ${
                  currentStep >= step ? "text-gray-700" : "text-gray-400"
                }`}
              >
                {step === 1 && "Campaign Details"}
                {step === 2 && "Funding Goal"}
                {step === 3 && "Define Milestones"}
                {step === 4 && "Evidence Requirements"}
              </span>
            </div>
          ))}
        </div>
        <div className="relative mt-2">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-full">
            <div
              className="h-1 bg-clearcause-primary rounded-full transition-all"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 1: Campaign Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Campaign Details</h2>
              <p className="text-gray-600">
                Provide the basic information about your campaign.
              </p>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Campaign Title*
                  </label>
                  <Input
                    id="title"
                    name="title"
                    value={campaignDetails.title}
                    onChange={handleInputChange}
                    placeholder="Enter a compelling title for your campaign"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Campaign Description*
                  </label>
                  <Textarea
                    id="description"
                    name="description"
                    value={campaignDetails.description}
                    onChange={handleInputChange}
                    placeholder="Describe your campaign's purpose, impact, and why people should donate"
                    rows={6}
                    required
                    className={
                      campaignDetails.description.length > 0 &&
                      campaignDetails.description.length < 10
                        ? "border-red-500"
                        : ""
                    }
                  />
                  <p
                    className={`text-sm mt-1 ${
                      campaignDetails.description.length < 10
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                  >
                    {campaignDetails.description.length}/10 characters minimum
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Campaign Category*
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={campaignDetails.category}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary sm:text-sm"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.slug}>
                        {category.icon && `${category.icon} `}
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Project Location*
                  </label>
                  <Input
                    id="location"
                    name="location"
                    type="text"
                    value={campaignDetails.location}
                    onChange={handleInputChange}
                    placeholder="e.g., Cebu City, Philippines"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Specify where the campaign/project will take place
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="image"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Campaign Image*
                  </label>
                  <div
                    className={`mt-1 border-2 border-dashed rounded-md px-6 pt-5 pb-6 transition-colors ${
                      !imagePreview && !existingImageUrl
                        ? "border-red-300 bg-red-50/30"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <div className="space-y-1 text-center">
                      {imagePreview ? (
                        <div className="mb-4">
                          <div className="max-w-4xl mx-auto">
                            <CampaignBanner
                              bannerUrl={imagePreview}
                              title={
                                campaignDetails.title || "Campaign Preview"
                              }
                            />
                          </div>
                          {uploading && (
                            <div className="mt-3">
                              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-clearcause-primary transition-all duration-300"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Uploading... {uploadProgress}%
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <Upload className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className={`relative cursor-pointer rounded-md bg-white font-medium focus-within:outline-none focus-within:ring-2 focus-within:ring-clearcause-primary focus-within:ring-offset-2 ${
                            uploading
                              ? "text-gray-400 pointer-events-none"
                              : "text-clearcause-primary hover:text-clearcause-secondary"
                          }`}
                        >
                          <span>
                            {imagePreview ? "Replace image" : "Upload an image"}
                          </span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleImageUpload}
                            disabled={uploading}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, WEBP up to 5MB (1200x800px recommended)
                      </p>
                      {!imagePreview && !existingImageUrl && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ Campaign image is required to proceed to the next
                          step
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Funding Goal */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Funding Goal</h2>
              <p className="text-gray-600">
                Set your campaign's financial target and timeline.
              </p>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="goal"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Target Funding Amount (PHP)*
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₱</span>
                    </div>
                    <Input
                      type="number"
                      name="goal"
                      id="goal"
                      className="pl-8"
                      value={campaignDetails.goal}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="1000"
                      required
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    This is the total amount you aim to raise for your project.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Campaign End Date
                  </label>
                  <Input
                    type="date"
                    name="endDate"
                    id="endDate"
                    value={campaignDetails.endDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    If not set, your campaign will run until you manually close
                    it.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Define Milestones */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Define Milestones</h2>
              <p className="text-gray-600">
                Break down your project into verifiable steps. The sum of
                milestone amounts should equal your total funding goal.
              </p>

              {milestoneAmountError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
                  <div className="flex">
                    <Info className="h-5 w-5 text-yellow-400 mr-2" />
                    <span>
                      The sum of milestone amounts (
                      {new Intl.NumberFormat("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      }).format(totalMilestoneAmount)}
                      ) doesn't match your total funding goal (
                      {new Intl.NumberFormat("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      }).format(goalAmount)}
                      ).
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {milestones.map((milestone, index) => (
                  <div
                    key={milestone.id}
                    className="border rounded-md p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">Milestone {index + 1}</h3>
                      {milestones.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeMilestone(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Milestone Title/Description*
                        </label>
                        <Input
                          value={milestone.title}
                          onChange={(e) =>
                            handleMilestoneChange(
                              index,
                              "title",
                              e.target.value
                            )
                          }
                          placeholder="e.g., Initial Assessment, Purchase Equipment"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount for this Milestone (PHP)*
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">₱</span>
                          </div>
                          <Input
                            type="number"
                            className="pl-8"
                            value={
                              milestone.amount === 0 ? "" : milestone.amount
                            }
                            onChange={(e) =>
                              handleMilestoneChange(
                                index,
                                "amount",
                                e.target.value === ""
                                  ? 0
                                  : Number(e.target.value)
                              )
                            }
                            placeholder="0.00"
                            min="0"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addMilestone}
                  className="w-full py-2"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Another Milestone
                </Button>

                <div className="flex justify-between items-center py-2 border-t">
                  <span className="font-medium">Total:</span>
                  <span
                    className={`font-bold ${
                      milestoneAmountError
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {new Intl.NumberFormat("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    }).format(totalMilestoneAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Set Evidence Requirements */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">
                Set Evidence Requirements
              </h2>
              <p className="text-gray-600">
                Specify what proof will be required for ClearCause to verify
                each milestone. Clear requirements help build donor trust.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800 mb-6">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
                  <span>
                    Good evidence examples include: receipts, photographs,
                    official documents, videos of completed work, beneficiary
                    testimonials, etc.
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {milestones.map((milestone, index) => (
                  <div key={milestone.id} className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">
                      Milestone {index + 1}: {milestone.title || "Untitled"}
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Required Evidence Type*
                        </label>
                        <Select
                          value={milestone.evidenceDescription}
                          onValueChange={(value) =>
                            handleMilestoneChange(
                              index,
                              "evidenceDescription",
                              value
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select required proof type" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROOF_TYPE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Show custom input if "other" is selected */}
                      {milestone.evidenceDescription === "other" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Proof Description*
                          </label>
                          <Textarea
                            value={milestone.customProof || ""}
                            onChange={(e) =>
                              handleMilestoneChange(
                                index,
                                "customProof",
                                e.target.value
                              )
                            }
                            placeholder="Describe the specific evidence you will provide"
                            rows={3}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-5 border-t">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
              >
                <ChevronLeft className="h-4 w-4 mr-2" /> Previous Step
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/charity/campaigns")}
              >
                Cancel
              </Button>
            )}

            <div className="space-x-2">
              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={goToNextStep}
                  className="bg-blue-700 hover:bg-blue-600"
                >
                  Next Step <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSubmit(true)}
                    disabled={loading || uploading}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={loading || uploading || milestoneAmountError}
                    className="bg-clearcause-accent hover:bg-clearcause-accent/90"
                  >
                    {uploading
                      ? `Uploading... ${uploadProgress}%`
                      : loading
                      ? "Submitting..."
                      : isEditMode
                      ? "Update Campaign"
                      : "Submit Campaign for Review"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </CharityLayout>
  );
};

export default CampaignForm;
