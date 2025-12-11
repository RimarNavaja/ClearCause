-- ============================================================================
-- Campaign Expiration Refund System Migration
-- ============================================================================
-- This migration extends the existing milestone refund system to handle
-- campaign expiration and cancellation scenarios with donor decision workflow
--
-- Key Changes:
-- 1. Add refund_trigger_type enum (milestone_rejection, campaign_expiration, campaign_cancellation)
-- 2. Extend milestone_refund_requests table to support campaign-level refunds
-- 3. Extend campaigns table to track expiration refund status
-- 4. Add database functions for eligibility checking, initiation, and scheduled processing
-- ============================================================================

-- ============================================================================
-- 1. CREATE REFUND TRIGGER TYPE ENUM
-- ============================================================================

-- New enum to distinguish refund trigger sources
DO $$ BEGIN
    CREATE TYPE refund_trigger_type AS ENUM (
      'milestone_rejection',
      'campaign_expiration',
      'campaign_cancellation'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE refund_trigger_type IS 'Source that triggered the refund: milestone rejection, campaign expiration, or cancellation';

-- ============================================================================
-- 2. EXTEND MILESTONE_REFUND_REQUESTS TABLE
-- ============================================================================

-- Add new columns for campaign-level refunds
ALTER TABLE public.milestone_refund_requests
  ADD COLUMN IF NOT EXISTS trigger_type refund_trigger_type DEFAULT 'milestone_rejection',
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS auto_initiated BOOLEAN DEFAULT FALSE;

-- Make milestone_id nullable (NULL for campaign-level refunds)
ALTER TABLE public.milestone_refund_requests
  ALTER COLUMN milestone_id DROP NOT NULL;

-- Drop existing UNIQUE constraint on milestone_id (if exists)
ALTER TABLE public.milestone_refund_requests
  DROP CONSTRAINT IF EXISTS milestone_refund_requests_milestone_id_key;

-- Add conditional constraint: milestone_id required for milestone_rejection, NULL for campaign triggers
ALTER TABLE public.milestone_refund_requests
  ADD CONSTRAINT check_trigger_type_milestone CHECK (
    (trigger_type = 'milestone_rejection' AND milestone_id IS NOT NULL) OR
    (trigger_type IN ('campaign_expiration', 'campaign_cancellation') AND milestone_id IS NULL)
  );

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_mrr_trigger_type ON milestone_refund_requests(trigger_type);
CREATE INDEX IF NOT EXISTS idx_mrr_grace_period ON milestone_refund_requests(grace_period_ends_at);

-- Add comments
COMMENT ON COLUMN milestone_refund_requests.trigger_type IS 'Source that triggered the refund: milestone rejection, campaign expiration, or cancellation';
COMMENT ON COLUMN milestone_refund_requests.grace_period_ends_at IS 'End of grace period (for expiration triggers)';
COMMENT ON COLUMN milestone_refund_requests.auto_initiated IS 'Whether refund was auto-initiated by scheduled job';

-- ============================================================================
-- 3. EXTEND CAMPAIGNS TABLE
-- ============================================================================

-- Track campaign expiration refund status
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS expiration_refund_initiated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS expiration_refund_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP WITH TIME ZONE;

-- Index for scheduled job efficiency (check expired campaigns)
CREATE INDEX IF NOT EXISTS idx_campaigns_expiration_check
  ON campaigns(end_date, status, current_amount, goal_amount)
  WHERE status IN ('active', 'paused') AND expiration_refund_initiated = FALSE;

-- Comments
COMMENT ON COLUMN campaigns.expiration_refund_initiated IS 'Whether expiration/cancellation refund has been initiated';
COMMENT ON COLUMN campaigns.expiration_refund_completed IS 'Whether all refund decisions have been processed';
COMMENT ON COLUMN campaigns.grace_period_ends_at IS 'Calculated end of grace period (end_date + 7 days)';

-- ============================================================================
-- 4. DATABASE FUNCTION: CHECK CAMPAIGN ELIGIBILITY
-- ============================================================================

CREATE OR REPLACE FUNCTION check_campaign_expiration_eligibility(
  p_campaign_id UUID
)
RETURNS TABLE (
  is_eligible BOOLEAN,
  trigger_type refund_trigger_type,
  grace_period_ends TIMESTAMP WITH TIME ZONE,
  refundable_amount NUMERIC,
  affected_donors INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign RECORD;
  v_amount NUMERIC;
  v_donors INTEGER;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;

  -- Skip if already initiated
  IF v_campaign.expiration_refund_initiated THEN
    RETURN QUERY SELECT FALSE, NULL::refund_trigger_type, NULL::TIMESTAMP WITH TIME ZONE, 0::NUMERIC, 0;
    RETURN;
  END IF;

  -- Calculate refundable amount (completed donations)
  SELECT COALESCE(SUM(amount), 0), COUNT(DISTINCT user_id)
  INTO v_amount, v_donors
  FROM donations
  WHERE campaign_id = p_campaign_id AND status = 'completed';

  -- Scenario 1: Cancelled campaign
  IF v_campaign.status = 'cancelled' AND v_amount > 0 THEN
    RETURN QUERY SELECT
      TRUE,
      'campaign_cancellation'::refund_trigger_type,
      NOW() + INTERVAL '7 days',
      v_amount,
      v_donors;
    RETURN;
  END IF;

  -- Scenario 2: Expired campaign (end_date + 7 days passed, underfunded)
  IF v_campaign.end_date IS NOT NULL
     AND NOW() > (v_campaign.end_date + INTERVAL '7 days')
     AND v_campaign.current_amount < v_campaign.goal_amount
     AND v_campaign.status IN ('active', 'paused')
     AND v_amount > 0 THEN
    RETURN QUERY SELECT
      TRUE,
      'campaign_expiration'::refund_trigger_type,
      v_campaign.end_date + INTERVAL '7 days',
      v_amount,
      v_donors;
    RETURN;
  END IF;

  -- Not eligible
  RETURN QUERY SELECT FALSE, NULL::refund_trigger_type, NULL::TIMESTAMP WITH TIME ZONE, 0::NUMERIC, 0;
END;
$$;

COMMENT ON FUNCTION check_campaign_expiration_eligibility IS 'Checks if campaign is eligible for expiration/cancellation refund';

-- ============================================================================
-- 5. DATABASE FUNCTION: INITIATE CAMPAIGN REFUND
-- ============================================================================

CREATE OR REPLACE FUNCTION initiate_campaign_expiration_refund(
  p_campaign_id UUID,
  p_trigger_type refund_trigger_type,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  refund_request_id UUID,
  total_amount NUMERIC,
  affected_donors INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign RECORD;
  v_total_amount NUMERIC;
  v_donors_count INTEGER;
  v_decision_deadline TIMESTAMP WITH TIME ZONE;
  v_refund_request_id UUID;
  v_grace_period_ends TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get campaign
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id;

  IF v_campaign.expiration_refund_initiated THEN
    RAISE EXCEPTION 'Refund already initiated for this campaign';
  END IF;

  -- Calculate totals from completed donations
  SELECT COALESCE(SUM(amount), 0), COUNT(DISTINCT user_id)
  INTO v_total_amount, v_donors_count
  FROM donations
  WHERE campaign_id = p_campaign_id AND status = 'completed';

  IF v_total_amount = 0 THEN
    RAISE EXCEPTION 'No donations to refund';
  END IF;

  -- Calculate grace period end
  IF p_trigger_type = 'campaign_expiration' AND v_campaign.end_date IS NOT NULL THEN
    v_grace_period_ends := v_campaign.end_date + INTERVAL '7 days';
  ELSE
    v_grace_period_ends := NOW() + INTERVAL '7 days';
  END IF;

  -- Create refund request (milestone_id = NULL for campaign-level)
  v_decision_deadline := NOW() + INTERVAL '14 days';

  INSERT INTO milestone_refund_requests (
    milestone_id, campaign_id, charity_id,
    total_amount, total_donors_count,
    status, decision_deadline,
    trigger_type, auto_initiated, grace_period_ends_at,
    rejection_reason, created_by
  ) VALUES (
    NULL, p_campaign_id, v_campaign.charity_id,
    v_total_amount, v_donors_count,
    'pending_donor_decision', v_decision_deadline,
    p_trigger_type, TRUE, v_grace_period_ends,
    p_reason, p_admin_id
  )
  RETURNING id INTO v_refund_request_id;

  -- Create donor decision records (one per unique donor)
  INSERT INTO donor_refund_decisions (
    refund_request_id, donor_id, donation_id,
    milestone_id, refund_amount, status, metadata
  )
  SELECT
    v_refund_request_id,
    d.user_id,
    -- Get most recent donation for this donor (for notification purposes)
    (SELECT id FROM donations WHERE user_id = d.user_id AND campaign_id = p_campaign_id AND status = 'completed' ORDER BY donated_at DESC LIMIT 1),
    NULL, -- milestone_id is NULL for campaign-level refunds
    SUM(d.amount), -- Total donated by this donor
    'pending',
    jsonb_build_object(
      'trigger_type', p_trigger_type,
      'donation_count', COUNT(d.id)
    )
  FROM donations d
  WHERE d.campaign_id = p_campaign_id AND d.status = 'completed'
  GROUP BY d.user_id;

  -- Mark campaign
  UPDATE campaigns
  SET
    expiration_refund_initiated = TRUE,
    grace_period_ends_at = v_grace_period_ends,
    updated_at = NOW()
  WHERE id = p_campaign_id;

  RETURN QUERY SELECT v_refund_request_id, v_total_amount, v_donors_count;
END;
$$;

COMMENT ON FUNCTION initiate_campaign_expiration_refund IS 'Initiates campaign expiration/cancellation refund process';

-- ============================================================================
-- 6. DATABASE FUNCTION: PROCESS EXPIRED CAMPAIGNS (SCHEDULED JOB)
-- ============================================================================

CREATE OR REPLACE FUNCTION process_expired_campaigns()
RETURNS TABLE (
  campaign_id UUID,
  campaign_title TEXT,
  trigger_type refund_trigger_type,
  refund_request_id UUID,
  total_amount NUMERIC,
  affected_donors INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign RECORD;
  v_result RECORD;
  v_system_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
  -- Process expired campaigns (end_date + 7 days passed, underfunded)
  FOR v_campaign IN
    SELECT c.id, c.title, c.end_date, c.goal_amount, c.current_amount
    FROM campaigns c
    WHERE c.expiration_refund_initiated = FALSE
      AND c.current_amount > 0
      AND c.current_amount < c.goal_amount
      AND c.end_date IS NOT NULL
      AND NOW() > (c.end_date + INTERVAL '7 days')
      AND c.status IN ('active', 'paused')
    ORDER BY c.end_date ASC
    LIMIT 50 -- Process in batches
  LOOP
    BEGIN
      SELECT * INTO v_result
      FROM initiate_campaign_expiration_refund(
        v_campaign.id,
        'campaign_expiration'::refund_trigger_type,
        v_system_user_id,
        'Campaign expired without reaching funding goal'
      );

      RETURN QUERY SELECT
        v_campaign.id,
        v_campaign.title,
        'campaign_expiration'::refund_trigger_type,
        v_result.refund_request_id,
        v_result.total_amount,
        v_result.affected_donors;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing expired campaign %: %', v_campaign.id, SQLERRM;
    END;
  END LOOP;

  -- Process cancelled campaigns
  FOR v_campaign IN
    SELECT c.id, c.title, c.current_amount
    FROM campaigns c
    WHERE c.expiration_refund_initiated = FALSE
      AND c.current_amount > 0
      AND c.status = 'cancelled'
    ORDER BY c.updated_at DESC
    LIMIT 50
  LOOP
    BEGIN
      SELECT * INTO v_result
      FROM initiate_campaign_expiration_refund(
        v_campaign.id,
        'campaign_cancellation'::refund_trigger_type,
        v_system_user_id,
        'Campaign was cancelled'
      );

      RETURN QUERY SELECT
        v_campaign.id,
        v_campaign.title,
        'campaign_cancellation'::refund_trigger_type,
        v_result.refund_request_id,
        v_result.total_amount,
        v_result.affected_donors;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing cancelled campaign %: %', v_campaign.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION process_expired_campaigns IS 'Scheduled job to auto-initiate refunds for expired/cancelled campaigns';
