-- Fix increment_campaign_amount to match decrement style and update donors_count
-- Also standardizes parameter names to p_ prefix

DROP FUNCTION IF EXISTS increment_campaign_amount(UUID, NUMERIC);

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