-- Fix potential RLS recursion on milestone_refund_requests
-- Using a SECURITY DEFINER function to check access breaks the recursion cycle

CREATE OR REPLACE FUNCTION public.can_view_refund_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.donor_refund_decisions drd
    WHERE drd.refund_request_id = request_id
    AND drd.donor_id = auth.uid()
  );
$$;

-- Drop existing policy
DROP POLICY IF EXISTS "Donors can view refund requests for their donations" ON public.milestone_refund_requests;

-- Create new policy using the function
CREATE POLICY "Donors can view refund requests for their donations"
ON public.milestone_refund_requests
FOR SELECT
USING (
  public.can_view_refund_request(id)
);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_view_refund_request(UUID) TO authenticated;
