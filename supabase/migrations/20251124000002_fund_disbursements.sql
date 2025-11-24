-- Fund Disbursement System Migration
-- Creates tables and columns for tracking fund releases to charities

-- 1. Create fund_disbursements table (audit trail)
CREATE TABLE IF NOT EXISTS public.fund_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  disbursement_type TEXT NOT NULL CHECK (disbursement_type IN ('seed', 'milestone', 'final', 'manual')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transaction_reference TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.fund_disbursements IS 'Tracks all fund releases to charities (seed money, milestone-based, etc.)';
COMMENT ON COLUMN public.fund_disbursements.disbursement_type IS 'Type of disbursement: seed (initial 25%), milestone (after verification), final (last release), manual (admin discretion)';
COMMENT ON COLUMN public.fund_disbursements.status IS 'Status of the disbursement: completed (funds released), pending (processing), failed (error), cancelled (reversed)';

-- 2. Add fund tracking columns to campaigns
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS seed_amount_released NUMERIC DEFAULT 0 CHECK (seed_amount_released >= 0);
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS milestone_amount_released NUMERIC DEFAULT 0 CHECK (milestone_amount_released >= 0);
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS total_released NUMERIC GENERATED ALWAYS AS (seed_amount_released + milestone_amount_released) STORED;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS seed_released_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.campaigns.seed_amount_released IS 'Initial seed money released (25% of goal when campaign activates)';
COMMENT ON COLUMN public.campaigns.milestone_amount_released IS 'Total funds released after milestone verification';
COMMENT ON COLUMN public.campaigns.total_released IS 'Total funds released to charity (computed column)';

-- 3. Add fund tracking columns to charities
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS available_balance NUMERIC DEFAULT 0 CHECK (available_balance >= 0);
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS total_received NUMERIC DEFAULT 0 CHECK (total_received >= 0);
ALTER TABLE public.charities ADD COLUMN IF NOT EXISTS total_withdrawn NUMERIC DEFAULT 0 CHECK (total_withdrawn >= 0);

COMMENT ON COLUMN public.charities.available_balance IS 'Current available funds that charity can withdraw';
COMMENT ON COLUMN public.charities.total_received IS 'Total funds received from all campaigns (lifetime)';
COMMENT ON COLUMN public.charities.total_withdrawn IS 'Total funds withdrawn/transferred (for future feature)';

-- 4. Add verification tracking to milestones
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS funds_released BOOLEAN DEFAULT FALSE;
ALTER TABLE public.milestones ADD COLUMN IF NOT EXISTS released_amount NUMERIC DEFAULT 0 CHECK (released_amount >= 0);

COMMENT ON COLUMN public.milestones.verified_at IS 'Timestamp when admin verified this milestone';
COMMENT ON COLUMN public.milestones.verified_by IS 'Admin user who verified this milestone';
COMMENT ON COLUMN public.milestones.funds_released IS 'Whether funds were released for this milestone';
COMMENT ON COLUMN public.milestones.released_amount IS 'Amount of funds released for this milestone';

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fund_disbursements_campaign ON public.fund_disbursements(campaign_id);
CREATE INDEX IF NOT EXISTS idx_fund_disbursements_charity ON public.fund_disbursements(charity_id);
CREATE INDEX IF NOT EXISTS idx_fund_disbursements_milestone ON public.fund_disbursements(milestone_id);
CREATE INDEX IF NOT EXISTS idx_fund_disbursements_type ON public.fund_disbursements(disbursement_type);
CREATE INDEX IF NOT EXISTS idx_fund_disbursements_status ON public.fund_disbursements(status);
CREATE INDEX IF NOT EXISTS idx_fund_disbursements_created_at ON public.fund_disbursements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_verified_at ON public.milestones(verified_at);
CREATE INDEX IF NOT EXISTS idx_milestones_funds_released ON public.milestones(funds_released);

-- 6. Create RLS policies for fund_disbursements
ALTER TABLE public.fund_disbursements ENABLE ROW LEVEL SECURITY;

-- Admins can view all disbursements
CREATE POLICY "Admins can view all fund disbursements"
  ON public.fund_disbursements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Charities can view their own disbursements
CREATE POLICY "Charities can view their own fund disbursements"
  ON public.fund_disbursements
  FOR SELECT
  TO authenticated
  USING (
    charity_id IN (
      SELECT id FROM public.charities
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can insert disbursements (through functions)
CREATE POLICY "Only admins can create fund disbursements"
  ON public.fund_disbursements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update disbursements
CREATE POLICY "Only admins can update fund disbursements"
  ON public.fund_disbursements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 7. Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_fund_disbursements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fund_disbursements_updated_at
  BEFORE UPDATE ON public.fund_disbursements
  FOR EACH ROW
  EXECUTE FUNCTION update_fund_disbursements_updated_at();
