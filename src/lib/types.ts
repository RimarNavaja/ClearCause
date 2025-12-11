/**
 * Core TypeScript definitions for ClearCause platform
 * This file contains all database types, API types, and business logic types
 */

// ===== ENUMS =====
export type UserRole = 'admin' | 'charity' | 'donor';
export type CampaignStatus = 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';
export type DonationStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type VerificationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'resubmission_required';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'verified';
export type PaymentProvider = 'paymongo' | 'xendit' | 'maya';
export type PaymentSessionStatus = 'created' | 'pending' | 'succeeded' | 'failed' | 'expired' | 'cancelled';
export type AchievementCategory = 'donation_milestones' | 'donation_frequency' | 'campaign_diversity' | 'platform_engagement';

// ===== DATABASE TYPES =====
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          phone: string | null;
          role: UserRole;
          is_verified: boolean;
          is_active: boolean;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: UserRole;
          is_verified?: boolean;
          is_active?: boolean;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          phone?: string | null;
          role?: UserRole;
          is_verified?: boolean;
          is_active?: boolean;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      charities: {
        Row: {
          id: string;
          user_id: string;
          organization_name: string;
          organization_type: string | null;
          description: string | null;
          website_url: string | null;
          logo_url: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          address: string | null;
          verification_status: VerificationStatus;
          verification_notes: string | null;
          transparency_score: number | null;
          total_raised: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_name: string;
          organization_type?: string | null;
          description?: string | null;
          website_url?: string | null;
          logo_url?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          address?: string | null;
          verification_status?: VerificationStatus;
          verification_notes?: string | null;
          transparency_score?: number | null;
          total_raised?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_name?: string;
          organization_type?: string | null;
          description?: string | null;
          website_url?: string | null;
          logo_url?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          address?: string | null;
          verification_status?: VerificationStatus;
          verification_notes?: string | null;
          transparency_score?: number | null;
          total_raised?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          charity_id: string;
          title: string;
          description: string;
          goal_amount: number;
          current_amount: number;
          donors_count: number;
          category: string | null;
          location: string | null;
          image_url: string | null;
          status: CampaignStatus;
          start_date: string | null;
          end_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          charity_id: string;
          title: string;
          description: string;
          goal_amount: number;
          current_amount?: number;
          donors_count?: number;
          category?: string | null;
          location?: string | null;
          image_url?: string | null;
          status?: CampaignStatus;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          charity_id?: string;
          title?: string;
          description?: string;
          goal_amount?: number;
          current_amount?: number;
          donors_count?: number;
          category?: string | null;
          location?: string | null;
          image_url?: string | null;
          status?: CampaignStatus;
          start_date?: string | null;
          end_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      donations: {
        Row: {
          id: string;
          user_id: string;
          campaign_id: string;
          amount: number;
          payment_method: string;
          transaction_id: string | null;
          status: DonationStatus;
          donated_at: string;
          message: string | null;
          is_anonymous: boolean;
          updated_at: string | null;
          provider: string | null;
          provider_payment_id: string | null;
          payment_session_id: string | null;
          failure_reason: string | null;
          metadata: Record<string, any> | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          campaign_id: string;
          amount: number;
          payment_method: string;
          transaction_id?: string | null;
          status?: DonationStatus;
          donated_at?: string;
          message?: string | null;
          is_anonymous?: boolean;
          updated_at?: string | null;
          provider?: string | null;
          provider_payment_id?: string | null;
          payment_session_id?: string | null;
          failure_reason?: string | null;
          metadata?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          campaign_id?: string;
          amount?: number;
          payment_method?: string;
          transaction_id?: string | null;
          status?: DonationStatus;
          donated_at?: string;
          message?: string | null;
          is_anonymous?: boolean;
          updated_at?: string | null;
          provider?: string | null;
          provider_payment_id?: string | null;
          payment_session_id?: string | null;
          failure_reason?: string | null;
          metadata?: Record<string, any> | null;
        };
      };
      payment_sessions: {
        Row: {
          id: string;
          donation_id: string;
          user_id: string;
          provider: PaymentProvider;
          provider_session_id: string;
          provider_source_id: string | null;
          amount: number;
          currency: string;
          payment_method: string;
          checkout_url: string | null;
          success_url: string | null;
          cancel_url: string | null;
          status: PaymentSessionStatus;
          metadata: Record<string, any> | null;
          expires_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          donation_id: string;
          user_id: string;
          provider: PaymentProvider;
          provider_session_id: string;
          provider_source_id?: string | null;
          amount: number;
          currency?: string;
          payment_method: string;
          checkout_url?: string | null;
          success_url?: string | null;
          cancel_url?: string | null;
          status?: PaymentSessionStatus;
          metadata?: Record<string, any> | null;
          expires_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          donation_id?: string;
          user_id?: string;
          provider?: PaymentProvider;
          provider_session_id?: string;
          provider_source_id?: string | null;
          amount?: number;
          currency?: string;
          payment_method?: string;
          checkout_url?: string | null;
          success_url?: string | null;
          cancel_url?: string | null;
          status?: PaymentSessionStatus;
          metadata?: Record<string, any> | null;
          expires_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      webhook_events: {
        Row: {
          id: string;
          provider: PaymentProvider;
          event_id: string;
          event_type: string;
          payment_session_id: string | null;
          donation_id: string | null;
          payload: Record<string, any>;
          processed: boolean;
          processed_at: string | null;
          error_message: string | null;
          retry_count: number;
          received_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          provider: PaymentProvider;
          event_id: string;
          event_type: string;
          payment_session_id?: string | null;
          donation_id?: string | null;
          payload: Record<string, any>;
          processed?: boolean;
          processed_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          received_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          provider?: PaymentProvider;
          event_id?: string;
          event_type?: string;
          payment_session_id?: string | null;
          donation_id?: string | null;
          payload?: Record<string, any>;
          processed?: boolean;
          processed_at?: string | null;
          error_message?: string | null;
          retry_count?: number;
          received_at?: string;
          created_at?: string;
        };
      };
      milestones: {
        Row: {
          id: string;
          campaign_id: string;
          title: string;
          description: string | null;
          target_amount: number;
          status: MilestoneStatus;
          due_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          title: string;
          description?: string | null;
          target_amount: number;
          status?: MilestoneStatus;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          title?: string;
          description?: string | null;
          target_amount?: number;
          status?: MilestoneStatus;
          due_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      milestone_proofs: {
        Row: {
          id: string;
          milestone_id: string;
          proof_url: string;
          description: string | null;
          submitted_at: string;
          verified_by: string | null;
          verification_status: VerificationStatus;
          verification_notes: string | null;
        };
        Insert: {
          id?: string;
          milestone_id: string;
          proof_url: string;
          description?: string | null;
          submitted_at?: string;
          verified_by?: string | null;
          verification_status?: VerificationStatus;
          verification_notes?: string | null;
        };
        Update: {
          id?: string;
          milestone_id?: string;
          proof_url?: string;
          description?: string | null;
          submitted_at?: string;
          verified_by?: string | null;
          verification_status?: VerificationStatus;
          verification_notes?: string | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Record<string, any> | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Record<string, any> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          details?: Record<string, any> | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      platform_settings: {
        Row: {
          id: string;
          key: string;
          value: any;
          description: string | null;
          category: string;
          updated_by: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: any;
          description?: string | null;
          category?: string;
          updated_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: any;
          description?: string | null;
          category?: string;
          updated_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
      };
      achievements: {
        Row: Achievement;
        Insert: Omit<Achievement, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Achievement, 'id' | 'created_at' | 'updated_at'>>;
      };
      donor_achievements: {
        Row: DonorAchievement;
        Insert: {
          donor_id: string;
          achievement_id: string;
          earned_at?: string;
          context?: Record<string, any>;
        };
        Update: never;
      };
      charity_feedback: {
        Row: {
          id: string;
          charity_id: string;
          donor_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          charity_id: string;
          donor_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          charity_id?: string;
          donor_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      campaign_status: CampaignStatus;
      donation_status: DonationStatus;
      verification_status: VerificationStatus;
      milestone_status: MilestoneStatus;
      achievement_category: AchievementCategory;
    };
  };
}

// ===== API TYPES =====
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== BUSINESS LOGIC TYPES =====
export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  phone: string | null;
  isVerified: boolean;
  isActive: boolean;
  onboardingCompleted: boolean;
  provider?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharityOrganization {
  id: string;
  userId: string;
  organizationName: string;
  organizationType: string | null;
  description: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
  transparencyScore: number | null;
  totalRaised: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface Campaign {
  id: string;
  charityId: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  donorsCount: number;
  category: string | null;
  location: string | null;
  imageUrl: string | null;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  charity?: CharityOrganization;
  milestones?: Milestone[];
  donations?: Donation[];
  progress?: number;
}

export interface Donation {
  id: string;
  userId: string;
  campaignId: string;
  amount: number;                    // Gross amount (base donation)
  paymentMethod: string;
  transactionId: string | null;
  status: DonationStatus;
  donatedAt: string;
  message: string | null;
  isAnonymous: boolean;
  updatedAt: string | null;
  provider: string | null;
  providerPaymentId: string | null;
  paymentSessionId: string | null;
  failureReason: string | null;
  metadata: Record<string, any> | null;

  // Fee breakdown (stored in metadata.fees)
  grossAmount?: number;
  platformFee?: number;
  tipAmount?: number;
  netAmount?: number;               // What charity receives after fees
  totalCharge?: number;             // What donor actually paid (including fees if covered)
  coverFees?: boolean;              // Whether donor chose to cover fees

  donor?: User;
  campaign?: Campaign;
  paymentSession?: PaymentSession;
}

export interface PaymentSession {
  id: string;
  donationId: string;
  userId: string;
  provider: PaymentProvider;
  providerSessionId: string;
  providerSourceId: string | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  checkoutUrl: string | null;
  successUrl: string | null;
  cancelUrl: string | null;
  status: PaymentSessionStatus;
  metadata: Record<string, any> | null;
  expiresAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  paymentSessionId: string | null;
  donationId: string | null;
  payload: Record<string, any>;
  processed: boolean;
  processedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  receivedAt: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  campaignId: string;
  title: string;
  description: string | null;
  targetAmount: number;
  status: MilestoneStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  campaign?: Campaign;
  proofs?: MilestoneProof[];
  // Proof submission tracking
  verificationStatus?: string | null;
  proofSubmittedAt?: string | null;
}

export interface MilestoneProof {
  id: string;
  milestoneId: string;
  proofUrl: string;
  description: string | null;
  submittedAt: string;
  verifiedBy: string | null;
  verificationStatus: VerificationStatus;
  verificationNotes: string | null;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: User;
}

// ===== ACHIEVEMENT TYPES =====

export interface Achievement {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url: string | null;
  category: AchievementCategory;
  criteria: Record<string, any>;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DonorAchievement {
  id: string;
  donor_id: string;
  achievement_id: string;
  earned_at: string;
  context: Record<string, any> | null;
  achievement?: Achievement;
}

export interface AchievementProgress {
  achievement: Achievement;
  earned: boolean;
  earned_at?: string;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  category: string;
  updatedAt: string;
  updatedBy: string | null;
  createdAt: string;
}

export interface CampaignCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformStatistics {
  totalUsers: number;
  totalCharities: number;
  totalCampaigns: number;
  totalDonations: number;
  totalAmountRaised: number;
  activeUsers: number;
  activeCampaigns: number;
  pendingVerifications: number;
  // Growth metrics
  newUsersThisMonth: number;
  newCampaignsThisMonth: number;
  donationsThisMonth: number;
  amountRaisedThisMonth: number;
  // Performance metrics
  averageDonationAmount: number;
  completedCampaigns: number;
  failedDonations: number;
  // Campaign status breakdown
  draftCampaigns: number;
  pausedCampaigns: number;
  completedCampaignsList: number;
}

// ===== FORM TYPES =====
export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export interface SignInData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface CharityRegistrationData {
  organizationName: string;
  description: string;
  websiteUrl?: string;
  phone?: string;
  address?: string;
  registrationNumber?: string;
  verificationDocuments?: File[];
}

export interface CampaignCreateData {
  title: string;
  description: string;
  goalAmount: number;
  imageFile?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  location?: string;
  milestones?: {
    title: string;
    description: string;
    targetAmount: number;
    evidenceDescription?: string;
  }[];
}

export interface DonationCreateData {
  campaignId: string;
  amount: number;
  paymentMethod: string;
  message?: string;
  isAnonymous?: boolean;
}

// ===== FILTER TYPES =====
export interface CampaignFilters {
  status?: CampaignStatus[];
  category?: string[];
  location?: string[];
  minGoal?: number;
  maxGoal?: number;
  search?: string;
}

export interface DonationFilters {
  status?: DonationStatus[];
  search?: string;
  campaignId?: string;
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;
  dateTo?: string;
}

// ===== ERROR TYPES =====
export interface AppError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

export class ClearCauseError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(code: string, message: string, statusCode: number = 400, details?: any) {
    super(message);
    this.name = 'ClearCauseError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// ===== ADMIN TYPES =====
export interface PlatformStatistics {
  totalUsers: number;
  totalCharities: number;
  totalCampaigns: number;
  totalDonations: number;
  totalAmountRaised: number;
  activeUsers: number;
  activeCampaigns: number;
  pendingVerifications: number;
  // Growth metrics
  newUsersThisMonth: number;
  newCampaignsThisMonth: number;
  donationsThisMonth: number;
  amountRaisedThisMonth: number;
  // Performance metrics
  averageDonationAmount: number;
  completedCampaigns: number;
  failedDonations: number;
  // Campaign status breakdown
  draftCampaigns: number;
  pausedCampaigns: number;
  completedCampaignsList: number;
}

export interface RecentActivity {
  id: string;
  type: 'user_signup' | 'donation' | 'campaign_created' | 'verification' | 'other';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}

// Activity Log Types (Audit Trail)
export interface ActivityLogEntry {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  // Joined user data
  user?: {
    id: string;
    email: string;
    fullName: string | null;
    role: UserRole;
  };
}

export interface ActivityLogFilters {
  userId?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// ===== REFUND SYSTEM TYPES =====
export type RefundRequestStatus =
  | 'pending_donor_decision'
  | 'processing'
  | 'completed'
  | 'partially_completed'
  | 'cancelled';

export type DonorDecisionType = 'refund' | 'redirect_campaign' | 'donate_platform';

export type DonorDecisionStatus =
  | 'pending'
  | 'decided'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'auto_refunded';

export interface MilestoneFundAllocation {
  id: string;
  milestoneId: string;
  donationId: string;
  campaignId: string;
  donorId: string;
  allocatedAmount: number;
  allocationPercentage: number;
  isReleased: boolean;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneRefundRequest {
  id: string;
  milestoneId: string;
  campaignId: string;
  charityId: string;
  milestoneProofId: string | null;
  totalAmount: number;
  totalDonorsCount: number;
  status: RefundRequestStatus;
  decisionDeadline: string;
  firstReminderSentAt: string | null;
  finalReminderSentAt: string | null;
  rejectionReason: string | null;
  adminNotes: string | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
}

export interface DonorRefundDecision {
  id: string;
  refundRequestId: string;
  donorId: string;
  donationId: string;
  milestoneId: string;
  refundAmount: number;
  decisionType: DonorDecisionType | null;
  redirectCampaignId: string | null;
  status: DonorDecisionStatus;
  decidedAt: string | null;
  processedAt: string | null;
  refundTransactionId: string | null;
  newDonationId: string | null;
  processingError: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ===== CHARITY FEEDBACK TYPES =====
export interface CharityFeedback {
  id: string;
  charityId: string;
  donorId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  donor?: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  charity?: {
    id: string;
    organizationName: string;
    logoUrl: string | null;
  };
}

export interface CharityFeedbackStats {
  totalFeedback: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  feedbackWithComments: number;
}

// ===== UTILITY TYPES =====
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// ===== REAL-TIME TYPES =====
export interface RealtimePayload<T = any> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T | null;
  old: T | null;
}

export interface SubscriptionOptions {
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  table?: string;
  filter?: string;
}
