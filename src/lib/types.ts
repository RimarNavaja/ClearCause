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
  amount: number;
  paymentMethod: string;
  transactionId: string | null;
  status: DonationStatus;
  donatedAt: string;
  donor?: User;
  campaign?: Campaign;
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
  imageFile?: File;
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
