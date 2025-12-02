
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, AlertTriangle, HelpCircle, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

interface LocationState {
  error?: string;
  campaignId?: string;
  campaignTitle?: string;
}

const DonateError: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  // Get error details from navigation state or URL query params (from PayMongo redirect)
  const searchParams = new URLSearchParams(location.search);
  const errorMessage = state?.error || searchParams.get('error') || 'An unexpected error occurred during the donation process';
  const campaignId = state?.campaignId || searchParams.get('campaign_id') || undefined;
  const campaignTitle = state?.campaignTitle;

  // Categorize error type for better user guidance
  const getErrorCategory = () => {
    const error = errorMessage.toLowerCase();

    if (error.includes('payment') || error.includes('card') || error.includes('insufficient')) {
      return 'payment';
    } else if (error.includes('connection') || error.includes('network') || error.includes('timeout')) {
      return 'connection';
    } else if (error.includes('campaign') || error.includes('inactive') || error.includes('ended')) {
      return 'campaign';
    } else if (error.includes('minimum') || error.includes('amount')) {
      return 'amount';
    } else {
      return 'unknown';
    }
  };

  const errorCategory = getErrorCategory();

  // Get helpful tips based on error category
  const getTroubleshootingTips = () => {
    switch (errorCategory) {
      case 'payment':
        return [
          'Check that your card has sufficient funds',
          'Verify your card details are correct',
          'Try using a different payment method',
          'Contact your bank if the issue persists',
        ];
      case 'connection':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a few moments and try again',
          'Use a different browser if the issue continues',
        ];
      case 'campaign':
        return [
          'The campaign may have ended or reached its goal',
          'Check the campaign status before donating',
          'Browse other active campaigns you can support',
        ];
      case 'amount':
        return [
          'Ensure your donation meets the minimum amount (₱100)',
          'Check that the amount is valid',
          'Try entering a different amount',
        ];
      default:
        return [
          'Try again in a few moments',
          'Clear your browser cache and cookies',
          'Try using a different browser',
          'Contact support if the problem persists',
        ];
    }
  };

  const handleTryAgain = () => {
    if (campaignId) {
      navigate(`/donate/${campaignId}`);
    } else {
      navigate('/campaigns');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow bg-clearcause-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 font-poppinsregular">
          {/* Error Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-white/20 p-4">
                  <XCircle className="h-16 w-16 text-white" />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 font-robotobold tracking-wide">Donation Unsuccessful</h1>
              <p className="text-lg text-white/90">
                We couldn't process your donation
              </p>
            </div>

            {/* Error Details */}
            <div className="p-6 md:p-8">
              {/* Error Message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">What went wrong?</h3>
                    <p className="text-sm text-red-800 mb-3">
                      {errorMessage}
                    </p>
                    <p className="text-sm text-red-700">
                      Don't worry - your payment was not completed, so you haven't been charged.
                    </p>
                  </div>
                </div>
              </div>

              {/* Campaign Info (if available) */}
              {campaignTitle && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600 mb-1">You were trying to donate to:</p>
                  <p className="font-semibold text-gray-900">{campaignTitle}</p>
                </div>
              )}

              {/* Troubleshooting Tips */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-3">Troubleshooting Tips</h3>
                    <ul className="space-y-2">
                      {getTroubleshootingTips().map((tip, index) => (
                        <li key={index} className="text-sm text-blue-800 flex items-start">
                          <span className="mr-2 mt-1">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <Button
                  onClick={handleTryAgain}
                  className="w-full flex items-center justify-center gap-2 py-6 bg-clearcause-primary hover:bg-clearcause-secondary"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>

                {campaignId ? (
                  <Link to={`/campaigns/${campaignId}`} className="w-full">
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 py-6"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Campaign
                    </Button>
                  </Link>
                ) : (
                  <Link to="/campaigns" className="w-full">
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 py-6"
                    >
                      <Home className="h-4 w-4" />
                      Browse Campaigns
                    </Button>
                  </Link>
                )}
              </div>

              {/* Support Section */}
              <div className="border-t pt-6 text-center">
                <h3 className="font-semibold text-lg mb-2 text-gray-900 font-robotobold">Still Having Issues?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Our support team is ready to help you complete your donation.
                  We're here to make sure your generosity reaches those who need it.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/contact">
                    <Button variant="link" className="text-clearcause-primary hover:text-clearcause-secondary font-semibold">
                      Contact Support
                    </Button>
                  </Link>
                  <span className="hidden sm:inline text-gray-400">•</span>
                  <Link to="/how-it-works">
                    <Button variant="link" className="text-clearcause-primary hover:text-clearcause-secondary font-semibold">
                      How Donations Work
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Alternative Actions */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm mb-4">
              While we work on fixing this, you can still make a difference by supporting other campaigns.
            </p>
            <Link to="/campaigns">
              <Button variant="outline" size="sm">
                Explore All Campaigns
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DonateError;
