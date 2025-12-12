-- Fix get_campaign_audit_logs to format donor names
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
  user_email TEXT, -- Formatted name
  user_role USER_ROLE
)
LANGUAGE plpgsql
SECURITY DEFINER
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
      -- Check anonymity from details OR from donations table (safer for historical data)
      WHEN (al.details->>'is_anonymous')::boolean = true OR (al.entity_type = 'donation' AND d.is_anonymous = true) THEN 'Anonymous'
      WHEN p.role = 'donor' THEN 
        CASE
          WHEN p.full_name IS NULL OR p.full_name = '' THEN 'Donor'
          -- Format "First Last" -> "First L."
          -- Check if there is a space
          WHEN position(' ' in p.full_name) > 0 THEN 
            -- Get first word
            split_part(p.full_name, ' ', 1) || ' ' || 
            -- Get first char of second word
            substring(split_part(p.full_name, ' ', 2), 1, 1) || '.'
          ELSE p.full_name
        END
      ELSE p.full_name -- Show names for admins/charities
    END as user_email,
    p.role as user_role
  FROM public.audit_logs al
  LEFT JOIN public.profiles p ON al.user_id = p.id
  LEFT JOIN public.donations d ON al.entity_type = 'donation' AND al.entity_id = d.id
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

COMMENT ON FUNCTION public.get_campaign_audit_logs IS 'Securely fetches public audit logs for a specific campaign with formatted donor names';