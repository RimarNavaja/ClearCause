import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  ArrowRight,
  Share2,
  Heart,
  TrendingUp,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { verifyPayment, getDonationById } from "@/services/donationService";

interface LocationState {
  donationId?: string;
  amount?: number;
  campaignTitle?: string;
  campaignId?: string;
}

const DonateSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state as LocationState;

  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [donationDetails, setDonationDetails] = useState<any>(null);

  // Get donation details from navigation state or URL query params (from PayMongo redirect)
  const searchParams = new URLSearchParams(location.search);
  const donationId = state?.donationId || searchParams.get("donation_id") || "";

  // Use state details or fetched details
  const donationAmount = state?.amount || donationDetails?.amount || 0;
  const campaignTitle =
    state?.campaignTitle || donationDetails?.campaign?.title || "Campaign";
  const campaignId = state?.campaignId || donationDetails?.campaignId;

  // Verify payment when component mounts
  useEffect(() => {
    const verifyDonationPayment = async () => {
      if (!donationId) {
        setIsVerifying(false);
        return;
      }

      try {
        console.log("Verifying payment for donation:", donationId);
        const result = await verifyPayment(donationId);

        if (result.success) {
          console.log("Payment verification successful:", result.data);

          // If we don't have campaign details from state (e.g. redirect), fetch them
          if (!state?.campaignId && user) {
            try {
              const detailsResult = await getDonationById(donationId, user.id);
              if (detailsResult.success) {
                setDonationDetails(detailsResult.data);
              }
            } catch (err) {
              console.error("Failed to fetch donation details:", err);
            }
          }

          setIsVerifying(false);
        } else {
          console.error("Payment verification failed:", result);
          setVerificationError(
            "Payment verification failed. Please contact support if the issue persists."
          );
          setIsVerifying(false);
        }
      } catch (error) {
        console.error("Error verifying payment:", error);
        // Don't show error to user if verification fails - it might already be processed by webhook
        setIsVerifying(false);
      }
    };

    // Add a small delay to ensure the PayMongo redirect completed
    const timer = setTimeout(() => {
      verifyDonationPayment();
    }, 1000);

    return () => clearTimeout(timer);
  }, [donationId, user, state?.campaignId]);

  // Redirect if no donation data (only if donationId is completely missing)
  useEffect(() => {
    if (!donationId) {
      // If user navigated directly without donation data, redirect to campaigns
      const timer = setTimeout(() => {
        navigate("/campaigns");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [donationId, navigate]);

  // Get appropriate dashboard link based on user role
  const getDashboardLink = () => {
    if (!user) return "/login";
    if (user.role === "donor") return "/donor/donations";
    if (user.role === "charity") return "/charity/dashboard";
    if (user.role === "admin") return "/admin/dashboard";
    return "/campaigns";
  };

  // Share campaign function
  const handleShare = () => {
    const shareUrl = `${window.location.origin}/campaigns/${campaignId}`;
    const shareText = `I just donated to "${campaignTitle}" on ClearCause! Join me in making a difference.`;

    if (navigator.share) {
      navigator
        .share({
          title: campaignTitle,
          text: shareText,
          url: shareUrl,
        })
        .catch((err) => console.log("Error sharing:", err));
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      alert("Campaign link copied to clipboard!");
    }
  };

  // If verifying payment, show loading state
  if (isVerifying) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-clearcause-background flex items-center justify-center">
          <div className="max-w-md mx-auto px-4 text-center">
            <Loader2 className="h-16 w-16 text-clearcause-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying Your Payment
            </h1>
            <p className="text-gray-600">
              Please wait while we confirm your donation...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If no donation data, show a message
  if (!donationId || !campaignId) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow bg-clearcause-background flex items-center justify-center">
          <div className="max-w-md mx-auto px-4 text-center">
            <CheckCircle className="h-16 w-16 text-clearcause-success mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Thank You!
            </h1>
            <p className="text-gray-600 mb-4">
              Redirecting you to campaigns...
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen shadow-lg">
      <Navbar />

      <main className="flex-grow bg-clearcause-background font-poppinsregular">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          {/* Verification Error Alert */}
          {verificationError && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">{verificationError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-clearcause-primary to-clearcause-secondary text-white p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-white/20 p-4">
                  <CheckCircle className="h-16 w-16 text-white" />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-robotobold mb-2">
                Thank You for Your Generosity!
              </h1>
              <p className="text-lg text-white/90">
                Your donation is making a real difference
              </p>
            </div>

            {/* Donation Amount Highlight */}
            <div className="bg-clearcause-accent/10 border-b border-clearcause-accent/20 py-6 text-center">
              <p className="text-sm font-medium text-gray-600 mb-1">
                You Donated
              </p>
              <p className="text-4xl md:text-5xl font-bold text-clearcause-accent">
                ₱{donationAmount.toLocaleString()}
              </p>
            </div>

            {/* Donation Summary */}
            <div className="p-6 md:p-8">
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {/* <Heart className="h-5 w-5 text-clearcause-accent fill-current" /> */}
                  Donation Info
                </h2>

                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-sm text-gray-600">Campaign:</span>
                    <span className="font-medium text-right flex-1">
                      {campaignTitle}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="font-semibold text-lg text-clearcause-accent">
                      ₱{donationAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Donation ID:</span>
                    <span className="font-mono text-sm font-medium">
                      {donationId.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Date:
                    </span>
                    <span className="font-medium">
                      {new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600 text-center">
                    You can download your receipt anytime from your{" "}
                    <Link
                      to="/donor/donations"
                      className="text-clearcause-primary hover:underline font-medium"
                    >
                      donation history
                    </Link>
                    .
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Link to={`/campaigns/${campaignId}`} className="w-full">
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 py-6"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Track Campaign Progress
                  </Button>
                </Link>

                <Button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 py-6 bg-clearcause-primary hover:bg-clearcause-secondary"
                >
                  <Share2 className="h-4 w-4" />
                  Share This Campaign
                </Button>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 rounded-lg p-6 text-center border border-blue-100">
                <h3 className="font-semibold text-lg mb-2 text-gray-900">
                  What's Next?
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  We'll keep you updated on how your donation is making an
                  impact. Track this campaign's progress and view all your
                  donations in your dashboard.
                </p>
                <Link to={getDashboardLink()}>
                  <Button
                    variant="link"
                    className="text-clearcause-primary hover:text-clearcause-secondary font-semibold"
                  >
                    View Your Donations <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Impact Message */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Thank you for being a part of positive change. Together, we're
              building a better future.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DonateSuccess;
