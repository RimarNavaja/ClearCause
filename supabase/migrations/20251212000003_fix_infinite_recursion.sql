-- Fix Infinite Recursion in RLS Policies
-- This migration resolves the circular dependency between milestone_refund_requests and donor_refund_decisions policies

-- 1. Drop the problematic policy causing recursion
DROP POLICY IF EXISTS "Charities can view decisions for their campaigns" ON public.donor_refund_decisions;

-- 2. Create a new, optimized policy that avoids querying milestone_refund_requests
-- Instead of: donor_refund_decisions -> milestone_refund_requests -> charities
-- We use: donor_refund_decisions -> milestones -> campaigns -> charities
-- This breaks the cycle because milestone_refund_requests is no longer involved in this check.

CREATE POLICY "Charities can view decisions for their campaigns"
  ON public.donor_refund_decisions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.milestones m
      JOIN public.campaigns c ON m.campaign_id = c.id
      JOIN public.charities ch ON c.charity_id = ch.id
      WHERE m.id = donor_refund_decisions.milestone_id
        AND ch.user_id = auth.uid()
    )
  );

-- 3. Add comment explaining the change
COMMENT ON POLICY "Charities can view decisions for their campaigns" ON public.donor_refund_decisions IS 
  'Allows charities to view decisions for their campaigns. Uses direct path through milestones->campaigns to avoid recursion with refund request policies.';
