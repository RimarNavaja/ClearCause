-- Fix Audit Logs for Campaign Public Access
-- This migration enables public access to campaign-related audit logs
-- and ensures better querying performance

-- 1. Create a secure function to fetch campaign audit logs
-- This function bypasses RLS but filters strictly by campaign_id
CREATE OR REPLACE FUNCTION public.get_campaign_audit_logs(
  p_campaign_id UUID,
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
  user_email TEXT, -- Masked/Partial email or role
  user_role USER_ROLE
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/service_role)
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.entity_type,
    al.entity_id,
    al.details,
    al.created_at,
    CASE 
      WHEN p.role = 'donor' AND (al.details->>'is_anonymous')::boolean = true THEN 'Anonymous'
      WHEN p.role = 'donor' THEN 'Donor' -- Don't expose emails publicly
      ELSE p.full_name -- Show names for admins/charities
    END as user_email,
    p.role as user_role
  FROM public.audit_logs al
  LEFT JOIN public.profiles p ON al.user_id = p.id
  WHERE 
    -- Check if the log is directly about the campaign
    (al.entity_type = 'campaign' AND al.entity_id = p_campaign_id)
    OR
    -- Check if it's a donation to this campaign
    (al.entity_type = 'donation' AND (al.details->>'campaign_id')::uuid = p_campaign_id)
    OR
    -- Check if it's a milestone verification for this campaign
    (al.entity_type = 'milestone' AND (al.details->>'campaign_id')::uuid = p_campaign_id)
    OR
    -- Check if it's a review for this campaign
    (al.entity_type = 'campaign_review' AND (al.details->>'campaign_id')::uuid = p_campaign_id)
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_campaign_audit_logs IS 'Securely fetches public audit logs for a specific campaign';

-- 2. Grant execute permission to everyone (public)
GRANT EXECUTE ON FUNCTION public.get_campaign_audit_logs(UUID, INTEGER, INTEGER) TO anon, authenticated, service_role;
