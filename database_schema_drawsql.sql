-- =============================================
-- CLEARCAUSE Database Schema (DrawSQL Compatible)
-- =============================================

-- =============================================
-- CORE TABLES
-- =============================================

-- User profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'donor',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Charities table
CREATE TABLE charities (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    organization_name TEXT NOT NULL,
    organization_type TEXT,
    description TEXT,
    website_url TEXT,
    logo_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    verification_status VARCHAR(30) DEFAULT 'pending',
    verification_notes TEXT,
    transparency_score NUMERIC,
    total_raised NUMERIC DEFAULT 0,
    available_balance NUMERIC DEFAULT 0,
    total_received NUMERIC DEFAULT 0,
    total_withdrawn NUMERIC DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Campaign categories table
CREATE TABLE campaign_categories (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY,
    charity_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    goal_amount NUMERIC NOT NULL,
    current_amount NUMERIC DEFAULT 0,
    donors_count INTEGER DEFAULT 0,
    category TEXT,
    location TEXT,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    average_rating NUMERIC DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    seed_amount_released NUMERIC DEFAULT 0,
    milestone_amount_released NUMERIC DEFAULT 0,
    total_released NUMERIC DEFAULT 0,
    seed_released_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (charity_id) REFERENCES charities(id)
);

-- Donations table
CREATE TABLE donations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_id TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    donated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    provider VARCHAR(50),
    provider_payment_id TEXT,
    payment_session_id UUID,
    failure_reason TEXT,
    metadata TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
);

-- Payment sessions table
CREATE TABLE payment_sessions (
    id UUID PRIMARY KEY,
    donation_id UUID NOT NULL,
    user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_session_id TEXT NOT NULL,
    provider_source_id TEXT,
    amount NUMERIC NOT NULL,
    currency VARCHAR(10) DEFAULT 'PHP',
    payment_method VARCHAR(50) NOT NULL,
    checkout_url TEXT,
    success_url TEXT,
    cancel_url TEXT,
    status VARCHAR(20) DEFAULT 'created',
    metadata TEXT,
    expires_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id),
    FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Milestones table
CREATE TABLE milestones (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_amount NUMERIC NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    due_date TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by UUID,
    funds_released BOOLEAN DEFAULT FALSE,
    released_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (verified_by) REFERENCES profiles(id)
);

-- Milestone proofs table
CREATE TABLE milestone_proofs (
    id UUID PRIMARY KEY,
    milestone_id UUID NOT NULL,
    proof_url TEXT NOT NULL,
    description TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID,
    verification_status VARCHAR(30) DEFAULT 'pending',
    verification_notes TEXT,
    verified_at TIMESTAMP,
    FOREIGN KEY (milestone_id) REFERENCES milestones(id),
    FOREIGN KEY (verified_by) REFERENCES profiles(id)
);

-- Campaign approvals table
CREATE TABLE campaign_approvals (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    admin_id UUID NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    suggestions TEXT,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    requested_at TIMESTAMP,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (admin_id) REFERENCES profiles(id)
);

-- Campaign reviews table
CREATE TABLE campaign_reviews (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    user_id UUID NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (user_id) REFERENCES profiles(id),
    FOREIGN KEY (reviewed_by) REFERENCES profiles(id)
);

-- Campaign updates table
CREATE TABLE campaign_updates (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    charity_id UUID NOT NULL,
    created_by UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    update_type TEXT NOT NULL,
    milestone_id UUID,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (charity_id) REFERENCES charities(id),
    FOREIGN KEY (created_by) REFERENCES profiles(id),
    FOREIGN KEY (milestone_id) REFERENCES milestones(id)
);

-- Fund disbursements table
CREATE TABLE fund_disbursements (
    id UUID PRIMARY KEY,
    campaign_id UUID NOT NULL,
    charity_id UUID NOT NULL,
    milestone_id UUID,
    amount NUMERIC NOT NULL,
    disbursement_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    approved_by UUID,
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_reference TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (charity_id) REFERENCES charities(id),
    FOREIGN KEY (milestone_id) REFERENCES milestones(id),
    FOREIGN KEY (approved_by) REFERENCES profiles(id)
);

-- Withdrawal transactions table
CREATE TABLE withdrawal_transactions (
    id UUID PRIMARY KEY,
    charity_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    bank_name TEXT NOT NULL,
    bank_account_last4 TEXT NOT NULL,
    transaction_reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'completed',
    processed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (charity_id) REFERENCES charities(id)
);

-- Charity verifications table
CREATE TABLE charity_verifications (
    id UUID PRIMARY KEY,
    charity_id UUID NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
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
    admin_id UUID,
    admin_notes TEXT,
    rejection_reason TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (charity_id) REFERENCES profiles(id),
    FOREIGN KEY (admin_id) REFERENCES profiles(id)
);

-- Verification documents table
CREATE TABLE verification_documents (
    id UUID PRIMARY KEY,
    verification_id UUID NOT NULL,
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    FOREIGN KEY (verification_id) REFERENCES charity_verifications(id)
);

-- =============================================
-- NOTIFICATION & COMMUNICATION TABLES
-- =============================================

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unread',
    campaign_id UUID,
    donation_id UUID,
    milestone_id UUID,
    action_url TEXT,
    metadata TEXT,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    email_opened BOOLEAN DEFAULT FALSE,
    email_opened_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY (donation_id) REFERENCES donations(id),
    FOREIGN KEY (milestone_id) REFERENCES milestones(id)
);

-- Notification preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
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
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Email templates table
CREATE TABLE email_templates (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    html_body TEXT NOT NULL,
    text_body TEXT NOT NULL,
    variables TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ACHIEVEMENT & GAMIFICATION TABLES
-- =============================================

-- Achievements table
CREATE TABLE achievements (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon_url TEXT,
    category VARCHAR(50) NOT NULL,
    criteria TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Donor achievements table
CREATE TABLE donor_achievements (
    id UUID PRIMARY KEY,
    donor_id UUID NOT NULL,
    achievement_id UUID NOT NULL,
    earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    context TEXT,
    FOREIGN KEY (donor_id) REFERENCES profiles(id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

-- =============================================
-- AUDIT & LOGGING TABLES
-- =============================================

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Webhook events table
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payment_session_id UUID,
    donation_id UUID,
    payload TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_session_id) REFERENCES payment_sessions(id),
    FOREIGN KEY (donation_id) REFERENCES donations(id)
);

-- =============================================
-- PLATFORM CONFIGURATION TABLES
-- =============================================

-- Platform settings table
CREATE TABLE platform_settings (
    id UUID PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES profiles(id)
);
