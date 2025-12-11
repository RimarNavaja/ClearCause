import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  Heart,
  AlertCircle,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import * as campaignService from "@/services/campaignService";
import * as donationService from "@/services/donationService";
import { Campaign } from "@/lib/types";
import { formatCurrency, calculateDaysLeft } from "@/utils/helpers";
import { calculateFees, getSuggestedTips, validateDonationAmount, setPlatformFeeRate, setMinimumDonation } from "@/utils/feeCalculator";
import { usePlatformSettings } from "@/contexts/PlatformSettingsContext";

const BASE_PRESET_AMOUNTS = [500, 1000, 2500, 5000];

const Donate: React.FC = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { platformFeePercentage, minimumDonationAmount } = usePlatformSettings();

  // Campaign data
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  // Donation form state
  const [amount, setAmount] = useState<number>(location.state?.amount || 1000);
  const [customAmount, setCustomAmount] = useState<string>(() => {
    const passedAmount = location.state?.amount;
    if (passedAmount && !BASE_PRESET_AMOUNTS.includes(passedAmount)) {
      return passedAmount.toString();
    }
    return "";
  });
  const [paymentMethod, setPaymentMethod] = useState<
    "gcash" | "paymaya" | "card" | "bank"
  >("gcash");
  const [message, setMessage] = useState<string>("");
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState<boolean>(false);
  const [coverFees, setCoverFees] = useState<boolean>(true); // Default: checked (80% of donors)

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation state for custom amount
  const [customAmountError, setCustomAmountError] = useState<string | null>(null);

  // Calculate fees in real-time
  const feeBreakdown = useMemo(() => {
    return calculateFees(amount, tipAmount, coverFees, platformFeePercentage);
  }, [amount, tipAmount, coverFees, platformFeePercentage]);

  // Filter preset amounts based on dynamic minimum donation
  const validPresets = useMemo(() => {
    return BASE_PRESET_AMOUNTS.filter(preset => preset >= minimumDonationAmount);
  }, [minimumDonationAmount]);

  const presetAmounts = validPresets.length > 0
    ? validPresets
    : [
        minimumDonationAmount,
        minimumDonationAmount * 2,
        minimumDonationAmount * 5,
        minimumDonationAmount * 10
      ];

  /**
   * Validate custom amount input in real-time
   * Called on blur and on change (debounced)
   */
  const validateCustomAmount = useCallback((value: string) => {
    // Clear error if empty (user is still typing)
    if (!value || value.trim() === '') {
      setCustomAmountError(null);
      return;
    }

    const numValue = parseFloat(value);

    // Check if valid number
    if (isNaN(numValue) || numValue <= 0) {
      setCustomAmountError('Please enter a valid amount');
      return;
    }

    // Check minimum donation
    if (numValue < minimumDonationAmount) {
      setCustomAmountError(
        `Amount must be at least ₱${minimumDonationAmount.toLocaleString()}. You entered ₱${numValue.toLocaleString()}.`
      );
      return;
    }

    // Check with fee calculations
    const validation = validateDonationAmount(numValue, tipAmount, coverFees, platformFeePercentage);
    if (!validation.valid) {
      // Parse validation error to make it more specific
      if (validation.error?.includes('Charity must receive at least')) {
        const fees = calculateFees(numValue, tipAmount, coverFees, platformFeePercentage);
        setCustomAmountError(
          `With fees, charity receives only ₱${fees.netAmount.toFixed(2)}. ` +
          `Minimum to charity is ₱50. Try ₱${Math.ceil(minimumDonationAmount * 1.15)} or more.`
        );
      } else if (validation.error?.includes('GCash limit')) {
        setCustomAmountError(
          `Amount too large. Maximum is ₱100,000. You entered ₱${numValue.toLocaleString()}.`
        );
      } else {
        setCustomAmountError(validation.error || 'Invalid amount');
      }
      return;
    }

    // Valid!
    setCustomAmountError(null);
  }, [minimumDonationAmount, tipAmount, coverFees, platformFeePercentage]);

  // Update fee calculator when settings change
  useEffect(() => {
    console.log('💰 [Donate] Updating fee calculator:', {
      platformFeePercentage,
      minimumDonationAmount
    });
    setPlatformFeeRate(platformFeePercentage);
    setMinimumDonation(minimumDonationAmount);
  }, [platformFeePercentage, minimumDonationAmount]);

  // Re-validate when fees change
  useEffect(() => {
    if (customAmount && customAmount.trim() !== '') {
      validateCustomAmount(customAmount);
    }
  }, [validateCustomAmount, customAmount]);

  // Load campaign data
  useEffect(() => {
    const loadCampaign = async () => {
      if (!campaignId) {
        setCampaignError("No campaign ID provided");
        setCampaignLoading(false);
        return;
      }

      try {
        setCampaignLoading(true);
        setCampaignError(null);

        const result = await campaignService.getCampaignById(campaignId, true);

        if (result.success && result.data) {
          setCampaign(result.data);

          // Check if campaign is active
          if (result.data.status !== "active") {
            setCampaignError(
              "This campaign is not currently accepting donations."
            );
          }

          // Check if campaign has ended
          const daysLeft = calculateDaysLeft(result.data.endDate);
          if (daysLeft <= 0) {
            setCampaignError(
              "This campaign has ended and is no longer accepting donations."
            );
          }

          // Check if goal is reached
          if (result.data.currentAmount >= result.data.goalAmount) {
            setCampaignError("This campaign has already reached its goal.");
          }
        } else {
          setCampaignError(result.error || "Campaign not found");
        }
      } catch (err) {
        console.error("Error loading campaign:", err);
        setCampaignError("Failed to load campaign details");
      } finally {
        setCampaignLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId]);

  const handleAmountClick = (value: number) => {
    setAmount(value);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    setAmount(parseFloat(value) || 0);

    // Validate immediately (for live feedback as user types)
    // Only show error if they've entered a complete number
    if (value && !value.endsWith('.')) {
      validateCustomAmount(value);
    } else {
      // Clear error while typing decimal
      setCustomAmountError(null);
    }
  };

  const handleProceedToPayment = async () => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?redirect=/donate/${campaignId}`);
      return;
    }

    if (!campaignId || !campaign) {
      setError("Campaign information is missing");
      return;
    }

    // Validate donation amount with fees
    const validation = validateDonationAmount(amount, tipAmount, coverFees, platformFeePercentage);
    if (!validation.valid) {
      let errorMsg = validation.error || "Invalid donation amount";

      if (amount < minimumDonationAmount) {
        errorMsg = `Your donation of ₱${amount.toLocaleString()} is below the minimum of ₱${minimumDonationAmount.toLocaleString()}. Please enter at least ₱${minimumDonationAmount.toLocaleString()}.`;
      }

      setError(errorMsg);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const donationData = {
        campaignId,
        amount,
        paymentMethod,
        message: message.trim() || undefined,
        isAnonymous,
      };

      // Step 1: Create donation record
      const result = await donationService.createDonation(
        donationData,
        user.id
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create donation");
      }

      const donation = result.data;

      // Step 2: Create payment session based on payment method
      if (paymentMethod === "gcash") {
        const paymentResult = await donationService.createGCashPayment(
          donation.id,
          amount,
          tipAmount,
          coverFees,
          user.id
        );

        if (paymentResult.success && paymentResult.data?.checkoutUrl) {
          // Redirect to GCash payment page
          window.location.href = paymentResult.data.checkoutUrl;
        } else {
          throw new Error(
            paymentResult.error || "Failed to create payment session"
          );
        }
      } else {
        // Other payment methods not yet implemented
        throw new Error(
          `Payment method "${paymentMethod}" is not yet supported. Please use GCash.`
        );
      }
    } catch (err: any) {
      console.error("Donation error:", err);

      let errorMessage = "An unexpected error occurred. Please try again.";

      if (err.message) {
        errorMessage = err.message;

        if (err.message.includes('INVALID_AMOUNT')) {
          errorMessage = `Your donation amount is invalid. Please ensure it meets the minimum of ₱${minimumDonationAmount.toLocaleString()}.`;
        }
      }

      setError(errorMessage);

      // Navigate to error page for serious errors
      navigate("/donate/error", {
        state: {
          error: errorMessage,
          campaignId,
          campaignTitle: campaign?.title,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (authLoading || campaignLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-clearcause-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-clearcause-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading campaign details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (campaignError || !campaign) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-clearcause-background">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {campaignError || "Campaign not found"}
              </AlertDescription>
            </Alert>
            <div className="mt-6 text-center font-redhatbold">
              <Link to="/campaigns">
                <Button variant="outline" className="bg-blue-700 hover:bg-blue-600 text-white">
                  <ArrowLeft className="h-4 w-4 mr-2 " />
                  Browse Other Campaigns
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const progressPercentage = Math.min(
    (campaign.currentAmount / campaign.goalAmount) * 100,
    100
  );
  const daysLeft = calculateDaysLeft(campaign.endDate);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow bg-clearcause-background">
        {/* Breadcrumb */}
        <div className="pt-3">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              to={`/campaigns/${campaignId}`}
              className="text-clearcause-primary hover:text-clearcause-secondary flex items-center text-sm font-redhatregular font-bold"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Return to Campaign
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* Campaign Context Header */}
            <div className="bg-blue-700 text-white px-6 py-6">
              <div className="flex items-center gap-4">
                {campaign.imageUrl && (
                  <img
                    src={campaign.imageUrl}
                    alt={campaign.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                )}
                <div className="grid gap-1 flex-1 ">
                  <h1 className="text-xl font-normal mb-1">Donate to</h1>
                  <p className="text-white/90 text-lg font-bold">
                    <span>" {campaign.title} "</span>
                  </p>
                  <p className="text-white/80 text-sm">
                    {campaign.charity?.organizationName}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-white/90 mb-2">
                  <span>{formatCurrency(campaign.currentAmount)} raised</span>
                  <span>of {formatCurrency(campaign.goalAmount)}</span>
                </div>
                <div className="w-full bg-white/40 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/70 mt-1">
                  <span>{progressPercentage.toFixed(0)}% funded</span>
                  <span>
                    {daysLeft > 0 ? `${daysLeft} days left` : "Ended"}
                  </span>
                </div>
              </div>
            </div>

            {/* Login Notice (if not logged in) */}
            {!user && (
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm text-blue-900">
                    <span className="font-medium">Log in or sign up</span> to
                    complete your donation and track your impact.
                  </p>
                  <div className="flex gap-2">
                    <Link to={`/login?redirect=/donate/${campaignId}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-600 text-blue-600 hover:bg-blue-50"
                      >
                        Log In
                      </Button>
                    </Link>
                    <Link to={`/signup?redirect=/donate/${campaignId}`}>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Donation Form */}
            <div className="p-6 space-y-6">
              {/* Select Amount */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Select Donation Amount
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAmountClick(preset)}
                      className={`rounded-lg py-3 px-4 text-center font-medium transition-all ${
                        amount === preset && customAmount === ""
                          ? "bg-clearcause-primary text-white shadow-md"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                      }`}
                    >
                      ₱{preset.toLocaleString()}
                    </button>
                  ))}
                </div>

                {validPresets.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Preset amounts updated to match minimum donation of ₱{minimumDonationAmount.toLocaleString()}
                  </p>
                )}

                <div className="pt-2">
                  <Label
                    htmlFor="custom-amount"
                    className="text-sm font-medium"
                  >
                    Custom Amount (PHP)
                  </Label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 font-medium">₱</span>
                    </div>
                    <Input
                      type="number"
                      id="custom-amount"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      onBlur={(e) => validateCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      min={minimumDonationAmount}
                      className={`pl-8 text-base ${customAmountError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                  </div>
                  {customAmountError && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {customAmountError}
                    </p>
                  )}
                  {!customAmountError && (
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum donation: ₱{minimumDonationAmount.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Select Payment Method
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("gcash")}
                    className={`rounded-lg py-4 px-3 border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      paymentMethod === "gcash"
                        ? "border-clearcause-primary bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="p-2">
                      <img src="/gcash.svg" alt="" className="h-8 w-8" />
                    </div>
                    <span className="text-sm font-medium">GCash</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("paymaya")}
                    className={`rounded-lg py-4 px-3 border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      paymentMethod === "paymaya"
                        ? "border-clearcause-primary bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div>
                      <img src="/paymaya.svg" alt="" className="h-12 w-12" />
                    </div>
                    <span className="text-sm font-medium">PayMaya</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`rounded-lg py-4 px-3 border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      paymentMethod === "card"
                        ? "border-clearcause-primary bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div>
                      <img src="/creditCard.svg" alt="" className="h-10 w-10" />
                    </div>
                    <span className="text-sm font-medium">Credit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("bank")}
                    className={`rounded-lg py-4 px-3 border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      paymentMethod === "bank"
                        ? "border-clearcause-primary bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div>
                      <img
                        src="/bankTransfer.svg"
                        alt=""
                        className="h-10 w-10"
                      />
                    </div>
                    <span className="text-sm font-medium">Bank Transfer</span>
                  </button>
                </div>
              </div>

              {/* Message (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm font-medium">
                  Message (Optional)
                </Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Leave a message of support..."
                  rows={3}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500">
                  {message.length}/500 characters
                </p>
              </div>

              {/* Anonymous Donation */}
              <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) =>
                    setIsAnonymous(checked as boolean)
                  }
                />
                <label
                  htmlFor="anonymous"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Make this donation anonymous
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Tip Section */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      Support ClearCause (Optional)
                    </h4>
                    <p className="text-sm text-gray-600">
                      Your tip helps us maintain the platform and verify charities. 100% of your donation goes to the campaign.
                    </p>
                  </div>
                </div>

                {/* Tip Amount Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {getSuggestedTips(amount).map((suggestedTip, index) => {
                    const percentage = index === 0 ? 0 : index * 5;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setTipAmount(suggestedTip)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          tipAmount === suggestedTip
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {percentage === 0 ? 'No tip' : `${percentage}%`}
                        {percentage > 0 && (
                          <div className="text-xs mt-0.5">₱{suggestedTip}</div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Tip Input */}
                <div>
                  <Label className="text-sm text-gray-600 mb-1">Custom tip amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="10"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(Number(e.target.value) || 0)}
                    placeholder="Enter custom amount"
                    className="w-full"
                  />
                </div>
              </div>

              {/* Donor Covers Fees Checkbox */}
              <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={coverFees}
                    onChange={(e) => setCoverFees(e.target.checked)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">
                        Cover transaction fees
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {coverFees ? (
                        <>
                          100% of your <span className="font-semibold">₱{amount.toLocaleString()}</span> donation
                          will go directly to <span className="font-semibold">{campaign?.title}</span>.
                          You'll pay <span className="font-semibold">₱{feeBreakdown.totalCharge.toLocaleString()}</span> total
                          (includes ₱{(feeBreakdown.totalCharge - amount - tipAmount).toFixed(2)} in fees).
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">₱{feeBreakdown.netAmount.toFixed(2)}</span> will go to
                          the charity after fees. You'll pay <span className="font-semibold">₱{feeBreakdown.totalCharge.toLocaleString()}</span>.
                        </>
                      )}
                    </p>
                  </div>
                </label>
              </div>

              {/* Fee Breakdown (Collapsible) */}
              <div className="bg-gray-50 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowFeeBreakdown(!showFeeBreakdown)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                >
                  <span className="font-medium text-gray-900">Fee Breakdown</span>
                  {showFeeBreakdown ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {showFeeBreakdown && (
                  <div className="px-4 pb-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-700">
                      <span>Your donation:</span>
                      <span className="font-medium">₱{feeBreakdown.grossAmount.toLocaleString()}</span>
                    </div>
                    {tipAmount > 0 && (
                      <div className="flex justify-between text-blue-600">
                        <span>Your tip to ClearCause:</span>
                        <span className="font-medium">+₱{tipAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {coverFees ? (
                      <>
                        <div className="flex justify-between text-green-600">
                          <span>Platform fee you're covering ({platformFeePercentage}%):</span>
                          <span className="font-medium">+₱{feeBreakdown.platformFee.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between text-gray-500">
                          <span>Platform fee ({platformFeePercentage}%):</span>
                          <span>-₱{feeBreakdown.platformFee.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                    <div className="border-t border-gray-300 pt-2 mt-2 flex justify-between font-semibold text-green-700 bg-green-50 -mx-4 px-4 py-2 rounded">
                      <span>Charity receives:</span>
                      <span>₱{feeBreakdown.netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-5 border border-blue-100">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Payment Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Donation amount:</span>
                    <span className="font-semibold text-gray-900">
                      ₱{amount.toLocaleString()}
                    </span>
                  </div>
                  {tipAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tip to ClearCause:</span>
                      <span className="font-semibold text-blue-600">
                        ₱{tipAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment method:</span>
                    <span className="font-medium text-gray-900">
                      {paymentMethod === "gcash" && "GCash"}
                      {paymentMethod === "paymaya" && "PayMaya"}
                      {paymentMethod === "card" && "Credit Card"}
                      {paymentMethod === "bank" && "Bank Transfer"}
                    </span>
                  </div>
                  {isAnonymous && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Donation type:</span>
                      <span className="font-medium text-gray-900">
                        Anonymous
                      </span>
                    </div>
                  )}
                  <div className="border-t border-blue-200 mt-3 pt-3 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total charge:</span>
                    <span className="font-bold text-2xl text-clearcause-primary">
                      ₱{feeBreakdown.totalCharge.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 text-center mt-2">
                    Charity receives ₱{feeBreakdown.netAmount.toFixed(2)} after fees
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleProceedToPayment}
                className="w-full py-6 bg-blue-500 hover:bg-blue-500/80 text-lg font-redhatbold tracking-wide shadow-lg"
                disabled={amount <= 0 || isSubmitting || !campaign || customAmountError !== null}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Proceed to Payment • ₱${feeBreakdown.totalCharge.toLocaleString()}`
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center leading-relaxed">
                By proceeding, you agree to ClearCause's{" "}
                <Link
                  to="/terms"
                  className="text-clearcause-primary hover:underline"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  className="text-clearcause-primary hover:underline"
                >
                  Privacy Policy
                </Link>
                . Your donation will be processed securely.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Donate;
