-- Relax RLS policy further to ensure immediate processing works
-- Remove status restriction on the USING clause to prevent visibility issues during multi-step updates

DROP POLICY IF EXISTS "Donors can update their own decisions" ON public.donor_refund_decisions;

CREATE POLICY "Donors can update their own decisions"
  ON public.donor_refund_decisions
  FOR UPDATE
  TO authenticated
  USING (donor_id = auth.uid())
  WITH CHECK (donor_id = auth.uid());
