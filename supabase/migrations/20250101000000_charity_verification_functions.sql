-- =====================================================
-- CHARITY VERIFICATION WORKFLOW FUNCTIONS
-- =====================================================
-- This migration adds the missing RPC functions for the charity verification workflow
-- Created: 2025-01-01

-- =====================================================
-- 1. APPROVE CHARITY VERIFICATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.approve_charity_verification(
  verification_id UUID,
  admin_id UUID,
  admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_verification RECORD;
  v_charity_id UUID;
  v_result JSON;
BEGIN
  -- Get the verification record
  SELECT * INTO v_verification
  FROM charity_verifications
  WHERE id = verification_id;

  -- Check if verification exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found';
  END IF;

  -- Check if already approved
  IF v_verification.status = 'approved' THEN
    RAISE EXCEPTION 'Verification already approved';
  END IF;

  -- Update verification status
  UPDATE charity_verifications
  SET
    status = 'approved',
    admin_id = approve_charity_verification.admin_id,
    admin_notes = approve_charity_verification.admin_notes,
    reviewed_at = NOW(),
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = verification_id;

  -- Check if charity record already exists
  SELECT id INTO v_charity_id
  FROM charities
  WHERE user_id = v_verification.charity_id;

  -- Create or update charity record
  IF v_charity_id IS NULL THEN
    -- Create new charity record
    INSERT INTO charities (
      user_id,
      organization_name,
      organization_type,
      description,
      website_url,
      contact_email,
      contact_phone,
      address,
      verification_status,
      created_at,
      updated_at
    ) VALUES (
      v_verification.charity_id,
      v_verification.organization_name,
      v_verification.organization_type,
      v_verification.description,
      v_verification.website_url,
      v_verification.contact_email,
      v_verification.contact_phone,
      CONCAT_WS(', ',
        v_verification.address_line1,
        v_verification.address_line2,
        v_verification.city,
        v_verification.state_province,
        v_verification.postal_code,
        v_verification.country
      ),
      'approved',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_charity_id;
  ELSE
    -- Update existing charity record
    UPDATE charities
    SET
      organization_name = v_verification.organization_name,
      organization_type = v_verification.organization_type,
      description = v_verification.description,
      website_url = v_verification.website_url,
      contact_email = v_verification.contact_email,
      contact_phone = v_verification.contact_phone,
      address = CONCAT_WS(', ',
        v_verification.address_line1,
        v_verification.address_line2,
        v_verification.city,
        v_verification.state_province,
        v_verification.postal_code,
        v_verification.country
      ),
      verification_status = 'approved',
      updated_at = NOW()
    WHERE id = v_charity_id;
  END IF;

  -- Update user profile verification status
  UPDATE profiles
  SET
    is_verified = TRUE,
    updated_at = NOW()
  WHERE id = v_verification.charity_id;

  -- Return success result
  SELECT json_build_object(
    'success', true,
    'verification_id', verification_id,
    'charity_id', v_charity_id,
    'status', 'approved'
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================================================
-- 2. REJECT CHARITY VERIFICATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.reject_charity_verification(
  verification_id UUID,
  admin_id UUID,
  rejection_reason TEXT,
  admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_verification RECORD;
  v_result JSON;
BEGIN
  -- Get the verification record
  SELECT * INTO v_verification
  FROM charity_verifications
  WHERE id = verification_id;

  -- Check if verification exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found';
  END IF;

  -- Check if already processed
  IF v_verification.status IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Verification already processed';
  END IF;

  -- Validate rejection reason
  IF rejection_reason IS NULL OR TRIM(rejection_reason) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- Update verification status
  UPDATE charity_verifications
  SET
    status = 'rejected',
    admin_id = reject_charity_verification.admin_id,
    rejection_reason = reject_charity_verification.rejection_reason,
    admin_notes = reject_charity_verification.admin_notes,
    reviewed_at = NOW(),
    rejected_at = NOW(),
    updated_at = NOW()
  WHERE id = verification_id;

  -- Return success result
  SELECT json_build_object(
    'success', true,
    'verification_id', verification_id,
    'status', 'rejected',
    'rejection_reason', rejection_reason
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================================================
-- 3. REQUEST VERIFICATION RESUBMISSION
-- =====================================================

CREATE OR REPLACE FUNCTION public.request_verification_resubmission(
  verification_id UUID,
  admin_id UUID,
  resubmission_reason TEXT,
  admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_verification RECORD;
  v_result JSON;
BEGIN
  -- Get the verification record
  SELECT * INTO v_verification
  FROM charity_verifications
  WHERE id = verification_id;

  -- Check if verification exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification not found';
  END IF;

  -- Check if already approved
  IF v_verification.status = 'approved' THEN
    RAISE EXCEPTION 'Cannot request resubmission for approved verification';
  END IF;

  -- Validate resubmission reason
  IF resubmission_reason IS NULL OR TRIM(resubmission_reason) = '' THEN
    RAISE EXCEPTION 'Resubmission reason is required';
  END IF;

  -- Update verification status
  UPDATE charity_verifications
  SET
    status = 'resubmission_required',
    admin_id = request_verification_resubmission.admin_id,
    rejection_reason = resubmission_reason,
    admin_notes = request_verification_resubmission.admin_notes,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = verification_id;

  -- Return success result
  SELECT json_build_object(
    'success', true,
    'verification_id', verification_id,
    'status', 'resubmission_required',
    'resubmission_reason', resubmission_reason
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_charity_verification TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_charity_verification TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_verification_resubmission TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.approve_charity_verification IS
  'Approves a charity verification application and creates/updates the charity record';

COMMENT ON FUNCTION public.reject_charity_verification IS
  'Rejects a charity verification application with a reason';

COMMENT ON FUNCTION public.request_verification_resubmission IS
  'Requests resubmission of a charity verification application with specific requirements';

-- =====================================================
-- COMPLETION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Charity verification functions created successfully!';
  RAISE NOTICE 'Functions available:';
  RAISE NOTICE '  - approve_charity_verification(verification_id, admin_id, admin_notes)';
  RAISE NOTICE '  - reject_charity_verification(verification_id, admin_id, rejection_reason, admin_notes)';
  RAISE NOTICE '  - request_verification_resubmission(verification_id, admin_id, resubmission_reason, admin_notes)';
END $$;
