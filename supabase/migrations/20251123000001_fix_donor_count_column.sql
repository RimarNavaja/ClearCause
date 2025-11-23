-- ============================================================================
-- FIX: Update RPC functions to use correct column name 'donors_count'
-- ============================================================================
-- The campaigns table uses 'donors_count' but the RPC functions were using
-- 'donor_count' which causes errors. This migration fixes the mismatch.

-- Drop and recreate the increment function with correct column name
CREATE OR REPLACE FUNCTION increment_campaign_amount(
  p_campaign_id UUID,
  p_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET
    current_amount = COALESCE(current_amount, 0) + p_amount,
    donors_count = COALESCE(donors_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_campaign_id;

  -- Raise exception if campaign not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign with id % not found', p_campaign_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the decrement function with correct column name
CREATE OR REPLACE FUNCTION decrement_campaign_amount(
  p_campaign_id UUID,
  p_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET
    current_amount = GREATEST(COALESCE(current_amount, 0) - p_amount, 0),
    donors_count = GREATEST(COALESCE(donors_count, 0) - 1, 0),
    updated_at = NOW()
  WHERE id = p_campaign_id;

  -- Raise exception if campaign not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign with id % not found', p_campaign_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
