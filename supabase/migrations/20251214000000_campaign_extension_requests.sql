-- ============================================================================
-- Campaign Extension Request System
-- ============================================================================
-- This migration adds the workflow for charities to request campaign deadline
-- extensions and for admins to approve or reject them.
--
-- Key Changes:
-- 1. Create extension_request_status enum
-- 2. Create campaign_extension_requests table
-- 3. Add RLS policies
-- 4. Add functions for requesting and resolving extensions
-- ============================================================================

-- 1. Create Enum
CREATE TYPE extension_request_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Create Table
CREATE TABLE IF NOT EXISTS campaign_extension_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    charity_id UUID NOT NULL REFERENCES charities(id),
    requested_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT NOT NULL,
    status extension_request_status DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cer_campaign_id ON campaign_extension_requests(campaign_id);
CREATE INDEX idx_cer_status ON campaign_extension_requests(status);
CREATE INDEX idx_cer_created_at ON campaign_extension_requests(created_at);

-- 3. RLS Policies
ALTER TABLE campaign_extension_requests ENABLE ROW LEVEL SECURITY;

-- Charity can view their own requests
CREATE POLICY "Charities can view own extension requests"
    ON campaign_extension_requests FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM charities WHERE id = charity_id
    ));

-- Charity can insert requests for their own campaigns
CREATE POLICY "Charities can create extension requests"
    ON campaign_extension_requests FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT user_id FROM charities WHERE id = charity_id
    ));

-- Admins can view all requests
CREATE POLICY "Admins can view all extension requests"
    ON campaign_extension_requests FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Admins can update requests
CREATE POLICY "Admins can update extension requests"
    ON campaign_extension_requests FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Database Functions

-- Function to submit a request
CREATE OR REPLACE FUNCTION request_campaign_extension(
    p_campaign_id UUID,
    p_requested_end_date TIMESTAMP WITH TIME ZONE,
    p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_charity_id UUID;
    v_campaign_record RECORD;
    v_request_id UUID;
BEGIN
    -- Get campaign and charity info
    SELECT * INTO v_campaign_record FROM campaigns WHERE id = p_campaign_id;
    
    IF v_campaign_record IS NULL THEN
        RAISE EXCEPTION 'Campaign not found';
    END IF;

    -- Verify ownership
    SELECT id INTO v_charity_id FROM charities WHERE user_id = auth.uid();
    
    IF v_charity_id IS NULL OR v_charity_id != v_campaign_record.charity_id THEN
        RAISE EXCEPTION 'Not authorized to request extension for this campaign';
    END IF;

    -- Validate campaign status
    IF v_campaign_record.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot extend completed or cancelled campaigns';
    END IF;

    -- Check if refund initiated
    IF v_campaign_record.expiration_refund_initiated THEN
        RAISE EXCEPTION 'Cannot extend campaign: Refund process already initiated';
    END IF;

    -- Check for pending requests
    IF EXISTS (
        SELECT 1 FROM campaign_extension_requests 
        WHERE campaign_id = p_campaign_id AND status = 'pending'
    ) THEN
        RAISE EXCEPTION 'A pending extension request already exists for this campaign';
    END IF;

    -- Validate date
    IF p_requested_end_date <= NOW() THEN
        RAISE EXCEPTION 'Requested end date must be in the future';
    END IF;

    -- Insert request
    INSERT INTO campaign_extension_requests (
        campaign_id,
        charity_id,
        requested_end_date,
        reason
    ) VALUES (
        p_campaign_id,
        v_charity_id,
        p_requested_end_date,
        p_reason
    ) RETURNING id INTO v_request_id;

    RETURN v_request_id;
END;
$$;

-- Function to resolve a request (Approve/Reject)
CREATE OR REPLACE FUNCTION resolve_campaign_extension_request(
    p_request_id UUID,
    p_status extension_request_status,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_request RECORD;
    v_campaign RECORD;
    v_admin_id UUID;
BEGIN
    -- Check admin permission
    v_admin_id := auth.uid();
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_admin_id AND role = 'admin') THEN
        RAISE EXCEPTION 'Only admins can resolve extension requests';
    END IF;

    -- Get request
    SELECT * INTO v_request FROM campaign_extension_requests WHERE id = p_request_id;
    
    IF v_request IS NULL THEN
        RAISE EXCEPTION 'Request not found';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Request is already resolved';
    END IF;

    -- Get campaign
    SELECT * INTO v_campaign FROM campaigns WHERE id = v_request.campaign_id;

    -- Check if refund initiated meanwhile
    IF v_campaign.expiration_refund_initiated THEN
        -- If refund started, we effectively reject even if admin tried to approve
        UPDATE campaign_extension_requests
        SET status = 'rejected',
            admin_notes = 'Automatically rejected: Refund process already initiated',
            reviewed_by = v_admin_id,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_request_id;
        
        RETURN FALSE;
    END IF;

    -- Process Decision
    IF p_status = 'approved' THEN
        -- Update campaign end date
        UPDATE campaigns
        SET end_date = v_request.requested_end_date,
            updated_at = NOW()
        WHERE id = v_request.campaign_id;

        -- Update request
        UPDATE campaign_extension_requests
        SET status = 'approved',
            admin_notes = p_admin_notes,
            reviewed_by = v_admin_id,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_request_id;

    ELSIF p_status = 'rejected' THEN
        -- Update request first
        UPDATE campaign_extension_requests
        SET status = 'rejected',
            admin_notes = p_admin_notes,
            reviewed_by = v_admin_id,
            reviewed_at = NOW(),
            updated_at = NOW()
        WHERE id = p_request_id;

        -- Trigger Instant Refund
        -- We call the existing initiate_campaign_expiration_refund function
        -- trigger_type: 'campaign_expiration' (closest fit)
        PERFORM initiate_campaign_expiration_refund(
            v_request.campaign_id,
            'campaign_expiration',
            v_admin_id,
            COALESCE(p_admin_notes, 'Extension request rejected')
        );
    ELSE
        RAISE EXCEPTION 'Invalid status. Must be approved or rejected.';
    END IF;

    RETURN TRUE;
END;
$$;
