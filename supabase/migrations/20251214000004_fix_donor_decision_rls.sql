-- Fix RLS policy to allow donors to update their decisions during immediate processing
-- Previously restricted to 'pending' only, which blocked the transition from 'decided' to 'completed'

DROP POLICY IF EXISTS "Donors can update their own pending decisions" ON public.donor_refund_decisions;

CREATE POLICY "Donors can update their own decisions"
  ON public.donor_refund_decisions
  FOR UPDATE
  TO authenticated
  USING (
    donor_id = auth.uid() 
    AND status IN ('pending', 'decided') -- Allow updating 'decided' records too
  )
  WITH CHECK (donor_id = auth.uid());
