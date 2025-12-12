-- TEMPORARY DEBUG: Allow unrestricted access to milestone_refund_requests to isolate RLS issue
DROP POLICY IF EXISTS "Donors can view refund requests for their donations" ON public.milestone_refund_requests;

CREATE POLICY "Donors can view refund requests for their donations"
ON public.milestone_refund_requests
FOR SELECT
USING (true);
