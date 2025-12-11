-- Backfill Audit Logs for Historical Data
-- This migration creates audit log entries for existing campaigns, donations,
-- milestones, verifications, and other historical activities
-- ============================================================================

-- ============================================================================
-- 1. BACKFILL USER SIGNUP AUDIT LOGS
-- ============================================================================
-- Create audit logs for all existing user signups
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details, created_at)
SELECT 
  id as user_id,
  'USER_SIGNUP' as action,
  'user' as entity_type,
  id as entity_id,
  jsonb_build_object(
    'email', email,
    'role', role,
    'full_name', full_name
  ) as details,
  created_at
FROM public.profiles
WHERE id NOT IN (
  SELECT DISTINCT user_id 
  FROM public.audit_logs 
  WHERE action = 'USER_SIGNUP' AND entity_type = 'user'
);

-- ============================================================================
-- 2. BACKFILL CAMPAIGN CREATION AUDIT LOGS
-- ============================================================================
-- Create audit logs for all existing campaign creations
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details, created_at)
SELECT 
  ch.user_id as user_id,
  'CAMPAIGN_CREATED' as action,
  'campaign' as entity_type,
  c.id as entity_id,
  jsonb_build_object(
    'title', c.title,
    'goal_amount', c.goal_amount,
    'status', c.status,
    'category', c.category
  ) as details,
  c.created_at
FROM public.campaigns c
INNER JOIN public.charities ch ON c.charity_id = ch.id
INNER JOIN public.profiles p ON ch.user_id = p.id
WHERE c.id NOT IN (
  SELECT DISTINCT entity_id 
  FROM public.audit_logs 
  WHERE action = 'CAMPAIGN_CREATED' AND entity_type = 'campaign'
);

-- ============================================================================
-- 3. BACKFILL CAMPAIGN STATUS CHANGES
-- ============================================================================
-- Create audit logs for campaigns that went from draft to active
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details, created_at)
SELECT 
  ch.user_id as user_id,
  'CAMPAIGN_STATUS_UPDATED' as action,
  'campaign' as entity_type,
  c.id as entity_id,
  jsonb_build_object(
    'title', c.title,
    'old_status', 'draft',
    'new_status', c.status
  ) as details,
  COALESCE(c.start_date, c.created_at + interval '1 hour') as created_at
FROM public.campaigns c
INNER JOIN public.charities ch ON c.charity_id = ch.id
INNER JOIN public.profiles p ON ch.user_id = p.id
WHERE c.status IN ('active', 'completed', 'paused')
  AND c.id NOT IN (
    SELECT DISTINCT entity_id 
    FROM public.audit_logs 
    WHERE action = 'CAMPAIGN_STATUS_UPDATED' 
      AND entity_type = 'campaign'
      AND (details->>'new_status')::text IN ('active', 'completed', 'paused')
  );

-- ============================================================================
-- 4. BACKFILL DONATION AUDIT LOGS
-- ============================================================================
-- Create audit logs for all completed donations
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details, created_at)
SELECT 
  d.user_id as user_id,
  'DONATION_COMPLETED' as action,
  'donation' as entity_type,
  d.id as entity_id,
  jsonb_build_object(
    'campaign_id', d.campaign_id,
    'campaign_title', c.title,
    'amount', d.amount,
    'payment_method', d.payment_method,
    'is_anonymous', COALESCE(d.is_anonymous, false)
  ) as details,
  d.donated_at as created_at
FROM public.donations d
INNER JOIN public.campaigns c ON d.campaign_id = c.id
INNER JOIN public.profiles p ON d.user_id = p.id
WHERE d.status = 'completed'
  AND d.id NOT IN (
    SELECT DISTINCT entity_id 
    FROM public.audit_logs 
    WHERE action = 'DONATION_COMPLETED' AND entity_type = 'donation'
  );

-- ============================================================================
-- 5. BACKFILL MILESTONE VERIFICATION AUDIT LOGS
-- ============================================================================
-- Create audit logs for verified milestones
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details, created_at)
SELECT 
  COALESCE(mp.verified_by, c.charity_id) as user_id,
  'MILESTONE_VERIFIED' as action,
  'milestone' as entity_type,
  m.id as entity_id,
  jsonb_build_object(
    'milestone_title', m.title,
    'campaign_id', m.campaign_id,
    'campaign_title', c.title,
    'target_amount', m.target_amount,
    'verification_status', mp.verification_status
  ) as details,
  mp.submitted_at as created_at
FROM public.milestones m
JOIN public.campaigns c ON m.campaign_id = c.id
JOIN public.milestone_proofs mp ON m.id = mp.milestone_id
WHERE mp.verification_status = 'approved'
  AND m.id NOT IN (
    SELECT DISTINCT entity_id 
    FROM public.audit_logs 
    WHERE action = 'MILESTONE_VERIFIED' AND entity_type = 'milestone'
  );

-- ============================================================================
-- 6. BACKFILL CHARITY VERIFICATION AUDIT LOGS
-- ============================================================================
-- Create audit logs for verified charities
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details, created_at)
SELECT 
  ch.user_id as user_id,
  'CHARITY_VERIFICATION_UPDATE' as action,
  'charity' as entity_type,
  ch.id as entity_id,
  jsonb_build_object(
    'organization_name', ch.organization_name,
    'old_status', 'pending',
    'new_status', ch.verification_status,
    'admin_notes', ch.verification_notes
  ) as details,
  COALESCE(ch.updated_at, ch.created_at) as created_at
FROM public.charities ch
WHERE ch.verification_status IN ('approved', 'rejected')
  AND ch.id NOT IN (
    SELECT DISTINCT entity_id 
    FROM public.audit_logs 
    WHERE action = 'CHARITY_VERIFICATION_UPDATE' 
      AND entity_type = 'charity'
      AND (details->>'new_status')::text IN ('approved', 'rejected')
  );

-- ============================================================================
-- 7. BACKFILL FUND RELEASE AUDIT LOGS
-- ============================================================================
-- Create audit logs for fund disbursements/releases
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details, created_at)
SELECT 
  ch.user_id as user_id,
  'FUNDS_RELEASED' as action,
  'milestone' as entity_type,
  m.id as entity_id,
  jsonb_build_object(
    'milestone_title', m.title,
    'campaign_id', m.campaign_id,
    'campaign_title', c.title,
    'amount', m.target_amount
  ) as details,
  m.updated_at as created_at
FROM public.milestones m
INNER JOIN public.campaigns c ON m.campaign_id = c.id
INNER JOIN public.charities ch ON c.charity_id = ch.id
INNER JOIN public.profiles p ON ch.user_id = p.id
WHERE m.status = 'completed'
  AND m.id NOT IN (
    SELECT DISTINCT entity_id 
    FROM public.audit_logs 
    WHERE action = 'FUNDS_RELEASED' AND entity_type = 'milestone'
  );

-- ============================================================================
-- 8. BACKFILL CAMPAIGN REVIEW AUDIT LOGS
-- ============================================================================
-- Create audit logs for campaign reviews/ratings
INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details, created_at)
SELECT 
  cr.user_id as user_id,
  'CAMPAIGN_REVIEWED' as action,
  'campaign_review' as entity_type,
  cr.id as entity_id,
  jsonb_build_object(
    'campaign_id', cr.campaign_id,
    'rating', cr.rating,
    'has_comment', (cr.comment IS NOT NULL AND cr.comment != '')
  ) as details,
  cr.created_at
FROM public.campaign_reviews cr
INNER JOIN public.profiles p ON cr.user_id = p.id
WHERE cr.id NOT IN (
  SELECT DISTINCT entity_id 
  FROM public.audit_logs 
  WHERE action = 'CAMPAIGN_REVIEWED' AND entity_type = 'campaign_review'
);

-- ============================================================================
-- 9. CREATE INDEXES FOR BETTER AUDIT LOG PERFORMANCE
-- ============================================================================
-- These indexes help with filtering and searching audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================================
-- 10. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail of all system activities including user actions, campaign events, donations, and verifications';

-- ============================================================================
-- 11. OUTPUT SUMMARY
-- ============================================================================
DO $$
DECLARE
  user_signup_count INTEGER;
  campaign_created_count INTEGER;
  donation_count INTEGER;
  milestone_verified_count INTEGER;
  charity_verification_count INTEGER;
  total_audit_logs INTEGER;
BEGIN
  -- Count audit logs by type
  SELECT COUNT(*) INTO user_signup_count FROM public.audit_logs WHERE action = 'USER_SIGNUP';
  SELECT COUNT(*) INTO campaign_created_count FROM public.audit_logs WHERE action = 'CAMPAIGN_CREATED';
  SELECT COUNT(*) INTO donation_count FROM public.audit_logs WHERE action = 'DONATION_COMPLETED';
  SELECT COUNT(*) INTO milestone_verified_count FROM public.audit_logs WHERE action = 'MILESTONE_VERIFIED';
  SELECT COUNT(*) INTO charity_verification_count FROM public.audit_logs WHERE action = 'CHARITY_VERIFICATION_UPDATE';
  SELECT COUNT(*) INTO total_audit_logs FROM public.audit_logs;

  -- Output summary
  RAISE NOTICE '========================================';
  RAISE NOTICE 'AUDIT LOG BACKFILL SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User Signups: %', user_signup_count;
  RAISE NOTICE 'Campaign Creations: %', campaign_created_count;
  RAISE NOTICE 'Donations: %', donation_count;
  RAISE NOTICE 'Milestone Verifications: %', milestone_verified_count;
  RAISE NOTICE 'Charity Verifications: %', charity_verification_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total Audit Logs: %', total_audit_logs;
  RAISE NOTICE '========================================';
END $$;