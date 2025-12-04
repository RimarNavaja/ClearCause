-- =============================================
-- CLEARCAUSE Database Schema
-- Generated for ERD Diagram Creation
-- =============================================

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CUSTOM ENUM TYPES
-- =============================================

-- User role enumeration
CREATE TYPE user_role AS ENUM (
    'admin',
    'charity',
    'donor'
);

-- Verification status enumeration
CREATE TYPE verification_status AS ENUM (
    'pending',
    'under_review',
    'approved',
    'rejected',
    'resubmission_required'
);

-- Campaign status enumeration
CREATE TYPE campaign_status AS ENUM (
    'draft',
    'pending',
    'active',
    'paused',
    'completed',
    'cancelled'
);

-- Donation status enumeration
CREATE TYPE donation_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);

-- Milestone status enumeration
CREATE TYPE milestone_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'verified'
);

-- Notification type enumeration
CREATE TYPE notification_type AS ENUM (
    'donation_received',
    'donation_confirmed',
    'campaign_update',
    'milestone_completed',
    'milestone_verified',
    'fund_released',
    'review_approved',
    'review_rejected',
    'campaign_approved',
    'campaign_rejected',
    'charity_verified',
    'charity_rejected',
    'thank_you_message',
    'system_announcement'
);

-- Notification status enumeration
CREATE TYPE notification_status AS ENUM (
    'unread',
    'read',
    'archived'
);

-- Review status enumeration
CREATE TYPE review_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);

-- Achievement category enumeration
CREATE TYPE achievement_category AS ENUM (
    'donation_milestones',
    'donation_frequency',
    'campaign_diversity',
    'platform_engagement'
);

-- =============================================
-- CORE TABLES
-- =============================================

-- User profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'donor',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Charities table
CREATE TABLE charities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id),
    organization_name TEXT NOT NULL,
    organization_type TEXT,
    description TEXT,
    website_url TEXT,
    logo_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    verification_status verification_status DEFAULT 'pending',
    verification_notes TEXT,
    transparency_score NUMERIC CHECK (transparency_score >= 0 AND transparency_score <= 100),
    total_raised NUMERIC DEFAULT 0 CHECK (total_raised >= 0),
    available_balance NUMERIC DEFAULT 0 CHECK (available_balance >= 0),
    total_received NUMERIC DEFAULT 0 CHECK (total_received >= 0),
    total_withdrawn NUMERIC DEFAULT 0 CHECK (total_withdrawn >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Campaign categories table
CREATE TABLE campaign_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color VARCHAR,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charity_id UUID NOT NULL REFERENCES charities(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    goal_amount NUMERIC NOT NULL CHECK (goal_amount > 0),
    current_amount NUMERIC DEFAULT 0 CHECK (current_amount >= 0),
    donors_count INTEGER DEFAULT 0 CHECK (donors_count >= 0),
    category TEXT,
    location TEXT,
    image_url TEXT,
    status campaign_status DEFAULT 'draft',
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    average_rating NUMERIC DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    search_vector TSVECTOR,
    seed_amount_released NUMERIC DEFAULT 0 CHECK (seed_amount_released >= 0),
    milestone_amount_released NUMERIC DEFAULT 0 CHECK (milestone_amount_released >= 0),
    total_released NUMERIC GENERATED ALWAYS AS (seed_amount_released + milestone_amount_released) STORED,
    seed_released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Donations table
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL,
    transaction_id TEXT,
    status donation_status DEFAULT 'pending',
    donated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    message TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    provider VARCHAR,
    provider_payment_id TEXT,
    payment_session_id UUID,
    failure_reason TEXT,
    metadata JSONB,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Payment sessions table
CREATE TABLE payment_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donation_id UUID NOT NULL REFERENCES donations(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    provider VARCHAR NOT NULL CHECK (provider IN ('paymongo', 'xendit', 'maya')),
    provider_session_id TEXT NOT NULL,
    provider_source_id TEXT,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    currency VARCHAR DEFAULT 'PHP',
    payment_method VARCHAR NOT NULL,
    checkout_url TEXT,
    success_url TEXT,
    cancel_url TEXT,
    status VARCHAR DEFAULT 'created' CHECK (status IN ('created', 'pending', 'succeeded', 'failed', 'expired', 'cancelled')),
    metadata JSONB,
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key to donations table for payment_session_id
ALTER TABLE donations
    ADD CONSTRAINT donations_payment_session_id_fkey
    FOREIGN KEY (payment_session_id) REFERENCES payment_sessions(id);

-- Milestones table
CREATE TABLE milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    title TEXT NOT NULL,
    description TEXT,
    target_amount NUMERIC NOT NULL CHECK (target_amount > 0),
    status milestone_status DEFAULT 'pending',
    due_date TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id),
    funds_released BOOLEAN DEFAULT FALSE,
    released_amount NUMERIC DEFAULT 0 CHECK (released_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Milestone proofs table
CREATE TABLE milestone_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    milestone_id UUID NOT NULL REFERENCES milestones(id),
    proof_url TEXT NOT NULL,
    description TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    verified_by UUID REFERENCES profiles(id),
    verification_status verification_status DEFAULT 'pending',
    verification_notes TEXT,
    verified_at TIMESTAMPTZ
);

-- Campaign approvals table
CREATE TABLE campaign_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'revision_requested')),
    reason TEXT,
    suggestions TEXT,
    approved_at TIMESTAMPTZ DEFAULT now(),
    requested_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign reviews table
CREATE TABLE campaign_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status review_status NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Campaign updates table
CREATE TABLE campaign_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    charity_id UUID NOT NULL REFERENCES charities(id),
    created_by UUID NOT NULL REFERENCES profiles(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    update_type TEXT NOT NULL CHECK (update_type IN ('milestone', 'impact', 'general')),
    milestone_id UUID REFERENCES milestones(id),
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fund disbursements table
CREATE TABLE fund_disbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    charity_id UUID NOT NULL REFERENCES charities(id),
    milestone_id UUID REFERENCES milestones(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    disbursement_type TEXT NOT NULL CHECK (disbursement_type IN ('seed', 'milestone', 'final', 'manual')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    approved_by UUID REFERENCES profiles(id),
    approved_at TIMESTAMPTZ DEFAULT now(),
    transaction_reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Withdrawal transactions table
CREATE TABLE withdrawal_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charity_id UUID NOT NULL REFERENCES charities(id),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    bank_name TEXT NOT NULL,
    bank_account_last4 TEXT NOT NULL,
    transaction_reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed')),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Charity verifications table
CREATE TABLE charity_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charity_id UUID NOT NULL REFERENCES profiles(id),
    status verification_status DEFAULT 'pending',
    organization_name TEXT NOT NULL,
    organization_type TEXT,
    description TEXT,
    website_url TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state_province TEXT,
    postal_code TEXT,
    country TEXT,
    registration_number TEXT,
    tax_id TEXT,
    date_established DATE,
    admin_id UUID REFERENCES profiles(id),
    admin_notes TEXT,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Verification documents table
CREATE TABLE verification_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_id UUID NOT NULL REFERENCES charity_verifications(id),
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    is_verified BOOLEAN DEFAULT FALSE,
    admin_notes TEXT
);

-- =============================================
-- NOTIFICATION & COMMUNICATION TABLES
-- =============================================

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status notification_status NOT NULL DEFAULT 'unread',
    campaign_id UUID REFERENCES campaigns(id),
    donation_id UUID REFERENCES donations(id),
    milestone_id UUID REFERENCES milestones(id),
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    email_opened BOOLEAN DEFAULT FALSE,
    email_opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Notification preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id),
    email_enabled BOOLEAN DEFAULT TRUE,
    email_donation_received BOOLEAN DEFAULT TRUE,
    email_donation_confirmed BOOLEAN DEFAULT TRUE,
    email_campaign_update BOOLEAN DEFAULT TRUE,
    email_milestone_completed BOOLEAN DEFAULT TRUE,
    email_milestone_verified BOOLEAN DEFAULT TRUE,
    email_fund_released BOOLEAN DEFAULT TRUE,
    email_review_moderated BOOLEAN DEFAULT TRUE,
    email_campaign_moderated BOOLEAN DEFAULT TRUE,
    email_charity_verified BOOLEAN DEFAULT TRUE,
    email_thank_you BOOLEAN DEFAULT TRUE,
    email_system_announcements BOOLEAN DEFAULT TRUE,
    inapp_enabled BOOLEAN DEFAULT TRUE,
    inapp_donation_received BOOLEAN DEFAULT TRUE,
    inapp_donation_confirmed BOOLEAN DEFAULT TRUE,
    inapp_campaign_update BOOLEAN DEFAULT TRUE,
    inapp_milestone_completed BOOLEAN DEFAULT TRUE,
    inapp_milestone_verified BOOLEAN DEFAULT TRUE,
    inapp_fund_released BOOLEAN DEFAULT TRUE,
    inapp_review_moderated BOOLEAN DEFAULT TRUE,
    inapp_campaign_moderated BOOLEAN DEFAULT TRUE,
    inapp_charity_verified BOOLEAN DEFAULT TRUE,
    inapp_thank_you BOOLEAN DEFAULT TRUE,
    inapp_system_announcements BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Email templates table
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type notification_type NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =============================================
-- ACHIEVEMENT & GAMIFICATION TABLES
-- =============================================

-- Achievements table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_url TEXT,
    category achievement_category NOT NULL,
    criteria JSONB NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Donor achievements table
CREATE TABLE donor_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_id UUID NOT NULL REFERENCES profiles(id),
    achievement_id UUID NOT NULL REFERENCES achievements(id),
    earned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    context JSONB
);

-- =============================================
-- AUDIT & LOGGING TABLES
-- =============================================

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Webhook events table
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR NOT NULL CHECK (provider IN ('paymongo', 'xendit', 'maya')),
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payment_session_id UUID REFERENCES payment_sessions(id),
    donation_id UUID REFERENCES donations(id),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    received_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PLATFORM CONFIGURATION TABLES
-- =============================================

-- Platform settings table
CREATE TABLE platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Campaigns indexes
CREATE INDEX idx_campaigns_charity_id ON campaigns(charity_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_category ON campaigns(category);
CREATE INDEX idx_campaigns_search_vector ON campaigns USING gin(search_vector);

-- Donations indexes
CREATE INDEX idx_donations_user_id ON donations(user_id);
CREATE INDEX idx_donations_campaign_id ON donations(campaign_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_donated_at ON donations(donated_at DESC);

-- Milestones indexes
CREATE INDEX idx_milestones_campaign_id ON milestones(campaign_id);
CREATE INDEX idx_milestones_status ON milestones(status);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE charities IS 'Registered charity organizations';
COMMENT ON TABLE campaigns IS 'Fundraising campaigns created by charities';
COMMENT ON TABLE donations IS 'Donation records from donors to campaigns';
COMMENT ON TABLE payment_sessions IS 'Payment gateway checkout sessions';
COMMENT ON TABLE milestones IS 'Campaign milestones for fund disbursement';
COMMENT ON TABLE milestone_proofs IS 'Proof submissions for milestone verification';
COMMENT ON TABLE campaign_approvals IS 'Admin approval/rejection records for campaigns';
COMMENT ON TABLE campaign_reviews IS 'Donor reviews and ratings for campaigns';
COMMENT ON TABLE campaign_updates IS 'Campaign progress updates by charities';
COMMENT ON TABLE fund_disbursements IS 'Fund release records to charities';
COMMENT ON TABLE withdrawal_transactions IS 'Charity fund withdrawal records';
COMMENT ON TABLE charity_verifications IS 'Charity verification applications';
COMMENT ON TABLE verification_documents IS 'Supporting documents for charity verification';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON TABLE notification_preferences IS 'User notification preferences';
COMMENT ON TABLE email_templates IS 'Email templates for notifications';
COMMENT ON TABLE achievements IS 'Donor achievement definitions';
COMMENT ON TABLE donor_achievements IS 'Earned achievements by donors';
COMMENT ON TABLE audit_logs IS 'System audit trail';
COMMENT ON TABLE webhook_events IS 'Payment gateway webhook events';
COMMENT ON TABLE platform_settings IS 'Platform configuration settings';
