-- Fix ambiguous column reference in update_charity_balance_on_milestone_approval
-- The error "column reference available_balance is ambiguous" occurs because PL/pgSQL
-- cannot distinguish between the column name and a potential variable if not qualified.

DROP FUNCTION IF EXISTS public.update_charity_balance_on_milestone_approval(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.update_charity_balance_on_milestone_approval(
  p_charity_id UUID,
  p_release_amount NUMERIC
)
RETURNS TABLE (
  new_balance NUMERIC,
  new_total_received NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS if needed for update
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.charities c
  SET
    available_balance = COALESCE(c.available_balance, 0) + p_release_amount,
    total_received = COALESCE(c.total_received, 0) + p_release_amount,
    updated_at = NOW()
  WHERE c.id = p_charity_id
  RETURNING c.available_balance, c.total_received;
END;
$$;

COMMENT ON FUNCTION public.update_charity_balance_on_milestone_approval IS 'Updates charity available balance and total received amount when a milestone is approved';
