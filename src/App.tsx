
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { 
  ProtectedRoute, 
  AdminRoute, 
  CharityRoute, 
  DonorRoute, 
  GuestRoute 
} from "./middleware/auth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Campaigns from "./pages/Campaigns";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import ForCharities from "./pages/ForCharities";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import CampaignDetail from "./pages/CampaignDetail";
import CharityProfile from "./pages/CharityProfile";
import Donate from "./pages/Donate";
import DonateSuccess from "./pages/DonateSuccess";
import DonateError from "./pages/DonateError";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AuthCallback from "./pages/AuthCallback";
import DonorDashboard from "./pages/donor/DonorDashboard";
import DonorCampaigns from "./pages/donor/DonorCampaigns";
import DonorDonations from "./pages/donor/DonorDonations";
import DonorProfile from "./pages/donor/DonorProfile";
import DonorSettings from "./pages/donor/DonorSettings";
import TrackCampaigns from "./pages/donor/TrackCampaigns";
import DonorFeedback from "./pages/donor/DonorFeedback";
import DonorAchievements from "./pages/donor/DonorAchievements";
import CharityApplicationForm from "./pages/CharityApplicationForm";
import CharityApplicationStatus from "./pages/CharityApplicationStatus";
import CharityDashboard from "./pages/charity/CharityDashboard";
import ManageCampaigns from "./pages/charity/ManageCampaigns";
import CampaignForm from "./pages/charity/CampaignForm";
import ManageMilestones from "./pages/charity/ManageMilestones";
import SubmitProofForm from "./pages/charity/SubmitProofForm";
import PostImpactUpdate from "./pages/charity/PostImpactUpdate";
import VerificationStatus from "./pages/charity/VerificationStatus";
import OrganizationVerificationForm from "./pages/charity/OrganizationVerificationForm";
import OrganizationVerificationStatus from "./pages/charity/OrganizationVerificationStatus";
import FundsManagement from "./pages/charity/FundsManagement";
import OrganizationProfile from "./pages/charity/OrganizationProfile";
import CharitySettings from "./pages/charity/CharitySettings";
import CharityMilestones from "./pages/charity/CharityMilestones";
import CharityAnalytics from "./pages/charity/CharityAnalytics";
import AdminDashboard from "./pages/admin/AdminDashboard";
import VerificationQueue from "./pages/admin/VerificationQueue";
import VerificationDetail from "./pages/admin/VerificationDetail";
import CharityVerificationDetail from "./pages/admin/CharityVerificationDetail";
import CharityVerificationQueue from "./pages/admin/CharityVerificationQueue";
import FundReleaseManagement from "./pages/admin/FundReleaseManagement";
import CharityManagement from "./pages/admin/CharityManagement";
import CharityApplicationReview from "./pages/admin/CharityApplicationReview";
import DonorManagement from "./pages/admin/DonorManagement";
import DonationManagement from "./pages/admin/DonationManagement";
import CampaignManagement from "./pages/admin/CampaignManagement";
import CampaignReview from "./pages/admin/CampaignReview";
import ScorecardManagement from "./pages/admin/ScorecardManagement";
import PlatformSettings from "./pages/admin/PlatformSettings";
import AuditLogs from "./pages/admin/AuditLogs";
import AdminProfile from "./pages/admin/AdminProfile";
import ActivityMonitor from "./pages/admin/ActivityMonitor";
import UserManagement from "./pages/admin/UserManagement";
import ReviewModeration from "./pages/admin/ReviewModeration";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <div className="min-h-screen">
          <Routes>
          {/* Public routes */}
          <Route path="/" element={<Index />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:campaignId" element={<CampaignDetail />} />
          <Route path="/charities/:charityId" element={<CharityProfile />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<About />} />
          <Route path="/for-charities" element={<ForCharities />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          
          {/* Guest only routes (redirect if authenticated) */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Auth callback route */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected donation routes */}
          <Route path="/donate/:campaignId" element={
            <ProtectedRoute>
              <Donate />
            </ProtectedRoute>
          } />
          <Route path="/donate/success" element={
            <ProtectedRoute>
              <DonateSuccess />
            </ProtectedRoute>
          } />
          <Route path="/donate/error" element={
            <ProtectedRoute>
              <DonateError />
            </ProtectedRoute>
          } />

          {/* Charity application (open to authenticated users) */}
<Route path="/signup/charity-application" element={
            <ProtectedRoute>
              <CharityApplicationForm />
            </ProtectedRoute>
          } />
          <Route path="/signup/charity-application/status" element={
            <ProtectedRoute>
              <CharityApplicationStatus />
            </ProtectedRoute>
          } />


          {/* Donor routes */}
          <Route path="/donor/dashboard" element={
            <DonorRoute>
              <DonorDashboard />
            </DonorRoute>
          } />
          <Route path="/donor/campaigns" element={
            <DonorRoute>
              <DonorCampaigns />
            </DonorRoute>
          } />
          <Route path="/donor/donations" element={
            <DonorRoute>
              <DonorDonations />
            </DonorRoute>
          } />
          <Route path="/donor/profile" element={
            <DonorRoute>
              <DonorProfile />
            </DonorRoute>
          } />
          <Route path="/donor/settings" element={
            <DonorRoute>
              <DonorSettings />
            </DonorRoute>
          } />
          <Route path="/donor/track-campaigns" element={
            <DonorRoute>
              <TrackCampaigns />
            </DonorRoute>
          } />
          <Route path="/donor/feedback" element={
            <DonorRoute>
              <DonorFeedback />
            </DonorRoute>
          } />
          <Route path="/donor/achievements" element={
            <DonorRoute>
              <DonorAchievements />
            </DonorRoute>
          } />

          {/* Charity routes */}
          <Route path="/charity/dashboard" element={
            <CharityRoute>
              <CharityDashboard />
            </CharityRoute>
          } />
          <Route path="/charity/campaigns" element={
            <CharityRoute>
              <ManageCampaigns />
            </CharityRoute>
          } />
          <Route path="/charity/campaigns/new" element={
            <CharityRoute>
              <CampaignForm />
            </CharityRoute>
          } />
          <Route path="/charity/campaigns/edit/:campaignId" element={
            <CharityRoute>
              <CampaignForm />
            </CharityRoute>
          } />
          <Route path="/charity/campaigns/:campaignId/milestones" element={
            <CharityRoute>
              <ManageMilestones />
            </CharityRoute>
          } />
          <Route path="/charity/campaigns/:campaignId/milestones/:milestoneId/submit" element={
            <CharityRoute>
              <SubmitProofForm />
            </CharityRoute>
          } />
          <Route path="/charity/campaigns/:campaignId/updates" element={
            <CharityRoute>
              <PostImpactUpdate />
            </CharityRoute>
          } />
          <Route path="/charity/verifications" element={
            <CharityRoute>
              <VerificationStatus />
            </CharityRoute>
          } />
          <Route path="/charity/verification/apply" element={
            <CharityRoute>
              <OrganizationVerificationForm />
            </CharityRoute>
          } />
          <Route path="/charity/verification/status" element={
            <CharityRoute>
              <OrganizationVerificationStatus />
            </CharityRoute>
          } />
          <Route path="/charity/funds" element={
            <CharityRoute>
              <FundsManagement />
            </CharityRoute>
          } />
          <Route path="/charity/profile" element={
            <CharityRoute>
              <OrganizationProfile />
            </CharityRoute>
          } />
          <Route path="/charity/settings" element={
            <CharityRoute>
              <CharitySettings />
            </CharityRoute>
          } />
          <Route path="/charity/milestones" element={
            <CharityRoute>
              <CharityMilestones />
            </CharityRoute>
          } />
          <Route path="/charity/analytics" element={
            <CharityRoute>
              <CharityAnalytics />
            </CharityRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/verifications" element={
            <AdminRoute>
              <VerificationQueue />
            </AdminRoute>
          } />
          <Route path="/admin/verifications/:submissionId" element={
            <AdminRoute>
              <VerificationDetail />
            </AdminRoute>
          } />
          <Route path="/admin/charity-verifications" element={
            <AdminRoute>
              <CharityVerificationQueue />
            </AdminRoute>
          } />
          <Route path="/admin/verifications/charity/:verificationId" element={
            <AdminRoute>
              <CharityVerificationDetail />
            </AdminRoute>
          } />
          <Route path="/admin/payouts" element={
            <AdminRoute>
              <FundReleaseManagement />
            </AdminRoute>
          } />
          <Route path="/admin/charities" element={
            <AdminRoute>
              <CharityManagement />
            </AdminRoute>
          } />
          <Route path="/admin/applications" element={
            <AdminRoute>
              <CharityApplicationReview />
            </AdminRoute>
          } />
          <Route path="/admin/donors" element={
            <AdminRoute>
              <DonorManagement />
            </AdminRoute>
          } />
          <Route path="/admin/donations" element={
            <AdminRoute>
              <DonationManagement />
            </AdminRoute>
          } />
          <Route path="/admin/campaigns" element={
            <AdminRoute>
              <CampaignManagement />
            </AdminRoute>
          } />
          <Route path="/admin/campaigns/:campaignId" element={
            <AdminRoute>
              <CampaignReview />
            </AdminRoute>
          } />
          <Route path="/admin/scorecards" element={
            <AdminRoute>
              <ScorecardManagement />
            </AdminRoute>
          } />
          <Route path="/admin/reviews" element={
            <AdminRoute>
              <ReviewModeration />
            </AdminRoute>
          } />
          <Route path="/admin/settings" element={
            <AdminRoute>
              <PlatformSettings />
            </AdminRoute>
          } />
          <Route path="/admin/logs" element={
            <AdminRoute>
              <AuditLogs />
            </AdminRoute>
          } />
          <Route path="/admin/profile" element={
            <AdminRoute>
              <AdminProfile />
            </AdminRoute>
          } />
          <Route path="/admin/activity" element={
            <AdminRoute>
              <ActivityMonitor />
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          } />

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
      <Toaster />
      <Sonner />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
