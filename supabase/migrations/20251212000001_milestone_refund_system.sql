-- =====================================================
-- MILESTONE REFUND SYSTEM MIGRATION
-- =====================================================
-- This migration implements the rejected milestone revenue flow feature
-- Allows donors to choose refund, redirect, or donate to platform when milestones are rejected
--
-- Created: 2025-12-12
-- Author: ClearCause Development Team
-- =====================================================

-- =====================================================
-- STEP 1: CREATE ENUMS
-- =====================================================

-- Refund request status enum
CREATE TYPE refund_request_status AS ENUM (
  'pending_donor_decision',
  'processing',
  'completed',
  'partially_completed',
  'cancelled'
);

COMMENT ON TYPE refund_request_status IS 'Status of milestone refund request workflow';

-- Donor decision type enum
CREATE TYPE donor_decision_type AS ENUM (
  'refund',
  'redirect_campaign',
  'donate_platform'
);

COMMENT ON TYPE donor_decision_type IS 'Type of decision donor makes for rejected milestone funds';

-- Donor decision status enum
CREATE TYPE donor_decision_status AS ENUM (
  'pending',
  'decided',
  'processing',
  'completed',
  'failed',
  'auto_refunded'
);

COMMENT ON TYPE donor_decision_status IS 'Processing status of individual donor refund decision';

-- =====================================================
-- STEP 2: CREATE TABLES
-- =====================================================

-- Table 1: Milestone Fund Allocations
-- Tracks proportional distribution of donations across milestones
CREATE TABLE IF NOT EXISTS public.milestone_fund_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  donation_id UUID NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  allocated_amount NUMERIC NOT NULL CHECK (allocated_amount >= 0),
  allocation_percentage NUMERIC NOT NULL CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
  is_released BOOLEAN DEFAULT FALSE,
  released_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE (milestone_id, donation_id)
);

COMMENT ON TABLE public.milestone_fund_allocations IS 'Tracks proportional allocation of donations to milestones';
COMMENT ON COLUMN public.milestone_fund_allocations.allocated_amount IS 'Amount of donation allocated to this milestone';
COMMENT ON COLUMN public.milestone_fund_allocations.allocation_percentage IS 'Percentage of donation allocated (for auditing)';
COMMENT ON COLUMN public.milestone_fund_allocations.is_released IS 'Whether funds were released to charity for this milestone';

-- Table 2: Milestone Refund Requests
-- Master record for each milestone rejection refund workflow
CREATE TABLE IF NOT EXISTS public.milestone_refund_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE UNIQUE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
  milestone_proof_id UUID REFERENCES public.milestone_proofs(id) ON DELETE SET NULL,

  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  total_donors_count INTEGER DEFAULT 0 CHECK (total_donors_count >= 0),
  status refund_request_status DEFAULT 'pending_donor_decision',

  decision_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  first_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  final_reminder_sent_at TIMESTAMP WITH TIME ZONE,

  rejection_reason TEXT,
  admin_notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.milestone_refund_requests IS 'Master record for milestone rejection refund workflow';
COMMENT ON COLUMN public.milestone_refund_requests.total_amount IS 'Total amount to be refunded across all donors';
COMMENT ON COLUMN public.milestone_refund_requests.decision_deadline IS 'Deadline for donors to make their decision';

-- Table 3: Donor Refund Decisions
-- Individual donor choices for each refund
CREATE TABLE IF NOT EXISTS public.donor_refund_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  refund_request_id UUID NOT NULL REFERENCES public.milestone_refund_requests(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  donation_id UUID NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,

  refund_amount NUMERIC NOT NULL CHECK (refund_amount >= 0),
  decision_type donor_decision_type,
  redirect_campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  status donor_decision_status DEFAULT 'pending',

  decided_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  refund_transaction_id TEXT,
  new_donation_id UUID REFERENCES public.donations(id) ON DELETE SET NULL,
  processing_error TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE (refund_request_id, donor_id, donation_id)
);

COMMENT ON TABLE public.donor_refund_decisions IS 'Individual donor decisions for rejected milestone funds';
COMMENT ON COLUMN public.donor_refund_decisions.refund_amount IS 'Amount this donor gets to decide about';
COMMENT ON COLUMN public.donor_refund_decisions.decision_type IS 'What donor chose: refund, redirect, or donate to platform';
COMMENT ON COLUMN public.donor_refund_decisions.redirect_campaign_id IS 'Campaign selected if decision_type is redirect_campaign';
COMMENT ON COLUMN public.donor_refund_decisions.new_donation_id IS 'New donation record if redirected to another campaign';

-- =====================================================
-- STEP 3: ADD COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add refund tracking to milestones
ALTER TABLE public.milestones
  ADD COLUMN IF NOT EXISTS refund_initiated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refund_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS refund_initiated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.milestones.refund_initiated IS 'Whether refund process has been initiated for this rejected milestone';
COMMENT ON COLUMN public.milestones.refund_completed IS 'Whether all refund decisions have been processed';

-- Add refund tracking to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS total_refunded NUMERIC DEFAULT 0 CHECK (total_refunded >= 0),
  ADD COLUMN IF NOT EXISTS milestone_refund_count INTEGER DEFAULT 0 CHECK (milestone_refund_count >= 0);

COMMENT ON COLUMN public.campaigns.total_refunded IS 'Total amount refunded due to rejected milestones';
COMMENT ON COLUMN public.campaigns.milestone_refund_count IS 'Number of milestones that triggered refunds';

-- =====================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for milestone_fund_allocations
CREATE INDEX IF NOT EXISTS idx_mfa_milestone_id ON public.milestone_fund_allocations(milestone_id);
CREATE INDEX IF NOT EXISTS idx_mfa_donation_id ON public.milestone_fund_allocations(donation_id);
CREATE INDEX IF NOT EXISTS idx_mfa_campaign_id ON public.milestone_fund_allocations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mfa_donor_id ON public.milestone_fund_allocations(donor_id);
CREATE INDEX IF NOT EXISTS idx_mfa_is_released ON public.milestone_fund_allocations(is_released);
CREATE INDEX IF NOT EXISTS idx_mfa_created_at ON public.milestone_fund_allocations(created_at DESC);

-- Indexes for milestone_refund_requests
CREATE INDEX IF NOT EXISTS idx_mrr_milestone_id ON public.milestone_refund_requests(milestone_id);
CREATE INDEX IF NOT EXISTS idx_mrr_campaign_id ON public.milestone_refund_requests(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mrr_charity_id ON public.milestone_refund_requests(charity_id);
CREATE INDEX IF NOT EXISTS idx_mrr_status ON public.milestone_refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_mrr_decision_deadline ON public.milestone_refund_requests(decision_deadline);
CREATE INDEX IF NOT EXISTS idx_mrr_created_at ON public.milestone_refund_requests(created_at DESC);

-- Indexes for donor_refund_decisions
CREATE INDEX IF NOT EXISTS idx_drd_refund_request_id ON public.donor_refund_decisions(refund_request_id);
CREATE INDEX IF NOT EXISTS idx_drd_donor_id ON public.donor_refund_decisions(donor_id);
CREATE INDEX IF NOT EXISTS idx_drd_donation_id ON public.donor_refund_decisions(donation_id);
CREATE INDEX IF NOT EXISTS idx_drd_status ON public.donor_refund_decisions(status);
CREATE INDEX IF NOT EXISTS idx_drd_decision_type ON public.donor_refund_decisions(decision_type);
CREATE INDEX IF NOT EXISTS idx_drd_created_at ON public.donor_refund_decisions(created_at DESC);

-- Composite index for donor's pending decisions query
CREATE INDEX IF NOT EXISTS idx_drd_donor_status ON public.donor_refund_decisions(donor_id, status) WHERE status = 'pending';

-- =====================================================
-- STEP 5: CREATE DATABASE FUNCTIONS
-- =====================================================

-- Function 1: Allocate donation to milestones proportionally
CREATE OR REPLACE FUNCTION public.allocate_donation_to_milestones(
  p_donation_id UUID,
  p_campaign_id UUID,
  p_amount NUMERIC,
  p_donor_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_milestone RECORD;
  v_total_target NUMERIC := 0;
  v_allocated_amount NUMERIC;
  v_allocation_percentage NUMERIC;
BEGIN
  -- Get total of all non-verified milestone targets
  SELECT COALESCE(SUM(target_amount), 0) INTO v_total_target
  FROM public.milestones
  WHERE campaign_id = p_campaign_id
    AND status != 'verified'
    AND COALESCE(funds_released, FALSE) = FALSE;

  -- If no milestones or all verified, nothing to allocate
  IF v_total_target IS NULL OR v_total_target = 0 THEN
    RAISE NOTICE 'No pending milestones found for campaign %. Skipping allocation.', p_campaign_id;
    RETURN;
  END IF;

  -- Allocate proportionally to each pending milestone
  FOR v_milestone IN
    SELECT id, target_amount
    FROM public.milestones
    WHERE campaign_id = p_campaign_id
      AND status != 'verified'
      AND COALESCE(funds_released, FALSE) = FALSE
    ORDER BY created_at ASC
  LOOP
    -- Calculate percentage and amount for this milestone
    v_allocation_percentage := (v_milestone.target_amount / v_total_target) * 100;
    v_allocated_amount := (p_amount * v_allocation_percentage) / 100;

    -- Insert allocation record
    INSERT INTO public.milestone_fund_allocations (
      milestone_id,
      donation_id,
      campaign_id,
      donor_id,
      allocated_amount,
      allocation_percentage,
      is_released,
      created_at,
      updated_at
    ) VALUES (
      v_milestone.id,
      p_donation_id,
      p_campaign_id,
      p_donor_id,
      v_allocated_amount,
      v_allocation_percentage,
      FALSE,
      NOW(),
      NOW()
    )
    ON CONFLICT (milestone_id, donation_id) DO NOTHING;

  END LOOP;

  RAISE NOTICE 'Allocated donation % (₱%) across % milestones for campaign %',
    p_donation_id, p_amount, (SELECT COUNT(*) FROM public.milestones WHERE campaign_id = p_campaign_id AND status != 'verified'), p_campaign_id;

END;
$$;

COMMENT ON FUNCTION public.allocate_donation_to_milestones IS 'Allocates a completed donation proportionally across all pending campaign milestones';

-- Function 2: Get refundable amount for a milestone
CREATE OR REPLACE FUNCTION public.get_milestone_refundable_amount(
  p_milestone_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(SUM(allocated_amount), 0)
  FROM public.milestone_fund_allocations
  WHERE milestone_id = p_milestone_id
    AND is_released = FALSE;
$$;

COMMENT ON FUNCTION public.get_milestone_refundable_amount IS 'Returns total unreleased amount allocated to a milestone';

-- Function 3: Auto-process expired refund decisions
CREATE OR REPLACE FUNCTION public.auto_process_expired_refund_decisions()
RETURNS TABLE (
  decision_id UUID,
  donor_id UUID,
  refund_amount NUMERIC,
  original_decision_type donor_decision_type
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.donor_refund_decisions drd
  SET
    decision_type = 'refund',
    status = 'auto_refunded',
    decided_at = NOW(),
    updated_at = NOW(),
    metadata = jsonb_set(
      COALESCE(drd.metadata, '{}'::jsonb),
      '{auto_processed}',
      'true'::jsonb
    )
  FROM public.milestone_refund_requests mrr
  WHERE drd.refund_request_id = mrr.id
    AND drd.status = 'pending'
    AND mrr.decision_deadline < NOW()
  RETURNING drd.id, drd.donor_id, drd.refund_amount, drd.decision_type;
END;
$$;

COMMENT ON FUNCTION public.auto_process_expired_refund_decisions IS 'Auto-processes expired pending decisions by defaulting to refund';

-- =====================================================
-- STEP 6: CREATE TRIGGERS
-- =====================================================

-- Trigger for updated_at on milestone_fund_allocations
CREATE TRIGGER update_milestone_fund_allocations_updated_at
  BEFORE UPDATE ON public.milestone_fund_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on milestone_refund_requests
CREATE TRIGGER update_milestone_refund_requests_updated_at
  BEFORE UPDATE ON public.milestone_refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on donor_refund_decisions
CREATE TRIGGER update_donor_refund_decisions_updated_at
  BEFORE UPDATE ON public.donor_refund_decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STEP 7: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.milestone_fund_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_refund_decisions ENABLE ROW LEVEL SECURITY;

-- Policies for milestone_fund_allocations

-- Donors can view their own allocations
CREATE POLICY "Donors can view their own allocations"
  ON public.milestone_fund_allocations
  FOR SELECT
  TO authenticated
  USING (donor_id = auth.uid());

-- Charities can view allocations for their campaigns
CREATE POLICY "Charities can view allocations for their campaigns"
  ON public.milestone_fund_allocations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      JOIN public.charities ch ON c.charity_id = ch.id
      WHERE c.id = milestone_fund_allocations.campaign_id
        AND ch.user_id = auth.uid()
    )
  );

-- Admins can view all allocations
CREATE POLICY "Admins can view all allocations"
  ON public.milestone_fund_allocations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only service role can insert/update allocations (via functions)
CREATE POLICY "Service role can manage allocations"
  ON public.milestone_fund_allocations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies for milestone_refund_requests

-- Donors can view refund requests for campaigns they donated to
CREATE POLICY "Donors can view refund requests for their donations"
  ON public.milestone_refund_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.donor_refund_decisions drd
      WHERE drd.refund_request_id = milestone_refund_requests.id
        AND drd.donor_id = auth.uid()
    )
  );

-- Charities can view refund requests for their campaigns
CREATE POLICY "Charities can view their campaign refund requests"
  ON public.milestone_refund_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.charities
      WHERE id = milestone_refund_requests.charity_id
        AND user_id = auth.uid()
    )
  );

-- Admins can manage all refund requests
CREATE POLICY "Admins can manage all refund requests"
  ON public.milestone_refund_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for donor_refund_decisions

-- Donors can view and update their own decisions
CREATE POLICY "Donors can view their own refund decisions"
  ON public.donor_refund_decisions
  FOR SELECT
  TO authenticated
  USING (donor_id = auth.uid());

CREATE POLICY "Donors can update their own pending decisions"
  ON public.donor_refund_decisions
  FOR UPDATE
  TO authenticated
  USING (donor_id = auth.uid() AND status = 'pending')
  WITH CHECK (donor_id = auth.uid());

-- Charities can view decisions for their campaigns
CREATE POLICY "Charities can view decisions for their campaigns"
  ON public.donor_refund_decisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.milestone_refund_requests mrr
      JOIN public.charities ch ON mrr.charity_id = ch.id
      WHERE mrr.id = donor_refund_decisions.refund_request_id
        AND ch.user_id = auth.uid()
    )
  );

-- Admins can manage all decisions
CREATE POLICY "Admins can manage all refund decisions"
  ON public.donor_refund_decisions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can manage decisions (for processing)
CREATE POLICY "Service role can manage decisions"
  ON public.donor_refund_decisions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- STEP 8: BACKFILL HISTORICAL DONATIONS
-- =====================================================

-- Backfill allocations for all existing completed donations
-- This ensures fairness for donors who donated before this feature existed
DO $$
DECLARE
  v_donation RECORD;
  v_backfilled_count INTEGER := 0;
  v_error_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting backfill of historical donation allocations...';

  -- Process all completed donations that don't have allocations yet
  FOR v_donation IN
    SELECT DISTINCT d.id, d.campaign_id, d.amount, d.user_id
    FROM public.donations d
    WHERE d.status = 'completed'
      AND NOT EXISTS (
        SELECT 1 FROM public.milestone_fund_allocations mfa
        WHERE mfa.donation_id = d.id
      )
    ORDER BY d.donated_at ASC
  LOOP
    BEGIN
      -- Call allocation function for this donation
      PERFORM public.allocate_donation_to_milestones(
        v_donation.id,
        v_donation.campaign_id,
        v_donation.amount,
        v_donation.user_id
      );

      v_backfilled_count := v_backfilled_count + 1;

      -- Log progress every 100 donations
      IF v_backfilled_count % 100 = 0 THEN
        RAISE NOTICE 'Backfilled % donations...', v_backfilled_count;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      RAISE WARNING 'Error backfilling donation %: %', v_donation.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Backfill complete! Successfully allocated % donations. Errors: %', v_backfilled_count, v_error_count;
END;
$$;

-- =====================================================
-- STEP 9: COMPLETION LOG
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Milestone Refund System Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  - 3 new enums';
  RAISE NOTICE '  - 3 new tables';
  RAISE NOTICE '  - 4 new columns on existing tables';
  RAISE NOTICE '  - 16 indexes for performance';
  RAISE NOTICE '  - 3 database functions';
  RAISE NOTICE '  - 3 triggers';
  RAISE NOTICE '  - 11 RLS policies';
  RAISE NOTICE '  - Backfilled historical donations';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Deploy refundService.ts';
  RAISE NOTICE '  2. Update donationService.ts';
  RAISE NOTICE '  3. Update milestoneService.ts';
  RAISE NOTICE '  4. Test with feature flag OFF';
  RAISE NOTICE '========================================';
END;
$$;
