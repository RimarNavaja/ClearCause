-- Create RPC for fetching charity-specific audit logs
-- This function allows charities to see actions related to their account (campaigns, withdrawals, verifications)
-- regardless of who performed the action (e.g. Admin approving a campaign)

CREATE OR REPLACE FUNCTION public.get_charity_audit_logs(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ,
  actor_email TEXT, -- Admin who performed the action (or system)
  actor_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator to bypass restrictive audit_logs RLS
AS $$
DECLARE
  v_charity_id UUID;
BEGIN
  -- Get charity_id for current user
  SELECT id INTO v_charity_id FROM public.charities WHERE user_id = auth.uid();
  
  -- If user is not a charity, return empty result
  IF v_charity_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.entity_type,
    al.entity_id,
    al.details,
    al.created_at,
    -- Mask actor email if it's not the user themselves (e.g. show 'Admin' instead of specific email if desired, 
    -- but for accountability (Charity viewing Admin action), showing the email is often required.
    -- The prompt says "Tracks exactly who approved or rejected". So we show specific info.)
    CASE 
      WHEN p.id = auth.uid() THEN p.email -- It's me
      WHEN p.role = 'admin' THEN p.email -- It's an admin (accountability)
      ELSE 'System' -- Fallback
    END as actor_email,
    p.role::text as actor_role
  FROM public.audit_logs al
  LEFT JOIN public.profiles p ON al.user_id = p.id
  WHERE 
    -- 1. Actions on the Charity entity directly (e.g. Verification updates)
    (al.entity_type = 'charity' AND al.entity_id = v_charity_id)
    OR
    -- 1b. Actions on Charity Verification requests (e.g. Approval/Rejection)
    (al.entity_type = 'charity_verification' AND al.entity_id IN (
      SELECT id FROM public.charity_verifications WHERE charity_id = v_charity_id
    ))
    OR
    -- 2. Actions on Campaigns owned by this Charity (e.g. Status Override, Approval)
    (al.entity_type = 'campaign' AND al.entity_id IN (
      SELECT id FROM public.campaigns WHERE charity_id = v_charity_id
    ))
    OR
    -- 3. Actions on Withdrawals for this Charity (e.g. Processed)
    (al.entity_type = 'withdrawal_transaction' AND al.entity_id IN (
      SELECT id FROM public.withdrawal_transactions WHERE charity_id = v_charity_id
    ))
    OR
    -- 4. Explicitly actions performed BY the charity user (fallback for other types)
    (al.user_id = auth.uid())
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users (logic handles role check)
GRANT EXECUTE ON FUNCTION public.get_charity_audit_logs(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.get_charity_audit_logs IS 'Fetches audit logs relevant to the authenticated charity user, including admin actions on their entities.';
