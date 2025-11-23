-- Payment Infrastructure Migration
-- Adds tables and functions required for PayMongo payment integration

-- ============================================================================
-- 1. CREATE PAYMENT_SESSIONS TABLE
-- ============================================================================
-- Tracks PayMongo checkout sessions for payments

CREATE TABLE IF NOT EXISTS payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Payment provider details
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('paymongo', 'xendit', 'maya')),
  provider_session_id TEXT NOT NULL,
  provider_source_id TEXT,

  -- Payment details
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) DEFAULT 'PHP',
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('gcash', 'paymaya', 'card', 'bank_transfer')),

  -- URLs
  checkout_url TEXT,
  success_url TEXT,
  cancel_url TEXT,

  -- Status tracking
  status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'pending', 'processing', 'completed', 'failed', 'expired')),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment_sessions
CREATE INDEX idx_payment_sessions_donation ON payment_sessions(donation_id);
CREATE INDEX idx_payment_sessions_user ON payment_sessions(user_id);
CREATE INDEX idx_payment_sessions_provider_session ON payment_sessions(provider, provider_session_id);
CREATE INDEX idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX idx_payment_sessions_created_at ON payment_sessions(created_at DESC);

-- ============================================================================
-- 2. CREATE WEBHOOK_EVENTS TABLE
-- ============================================================================
-- Logs all webhook events from PayMongo for debugging and audit trail

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Provider details
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('paymongo', 'xendit', 'maya')),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,

  -- Related records
  payment_session_id UUID REFERENCES payment_sessions(id) ON DELETE SET NULL,
  donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,

  -- Event data
  payload JSONB NOT NULL,

  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),

  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint on provider event_id to prevent duplicate processing
CREATE UNIQUE INDEX idx_webhook_events_provider_event ON webhook_events(provider, event_id);

-- Indexes for webhook_events
CREATE INDEX idx_webhook_events_payment_session ON webhook_events(payment_session_id);
CREATE INDEX idx_webhook_events_donation ON webhook_events(donation_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed, received_at DESC);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);

-- ============================================================================
-- 3. ADD MISSING COLUMNS TO DONATIONS TABLE
-- ============================================================================

DO $$
BEGIN
  -- Add provider column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donations' AND column_name = 'provider'
  ) THEN
    ALTER TABLE donations ADD COLUMN provider VARCHAR(20) CHECK (provider IN ('paymongo', 'xendit', 'maya'));
  END IF;

  -- Add provider_payment_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donations' AND column_name = 'provider_payment_id'
  ) THEN
    ALTER TABLE donations ADD COLUMN provider_payment_id TEXT;
  END IF;

  -- Add payment_session_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donations' AND column_name = 'payment_session_id'
  ) THEN
    ALTER TABLE donations ADD COLUMN payment_session_id UUID REFERENCES payment_sessions(id) ON DELETE SET NULL;
  END IF;

  -- Add failure_reason column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donations' AND column_name = 'failure_reason'
  ) THEN
    ALTER TABLE donations ADD COLUMN failure_reason TEXT;
  END IF;

  -- Add metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donations' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE donations ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add message column (donor message to charity)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donations' AND column_name = 'message'
  ) THEN
    ALTER TABLE donations ADD COLUMN message TEXT;
  END IF;

  -- Add is_anonymous column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donations' AND column_name = 'is_anonymous'
  ) THEN
    ALTER TABLE donations ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'donations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE donations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_donations_provider ON donations(provider, provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_donations_payment_session ON donations(payment_session_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);

-- ============================================================================
-- 4. CREATE RPC FUNCTION: INCREMENT_CAMPAIGN_AMOUNT
-- ============================================================================
-- Updates campaign current_amount and donor_count when a donation is completed

CREATE OR REPLACE FUNCTION increment_campaign_amount(
  p_campaign_id UUID,
  p_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET
    current_amount = COALESCE(current_amount, 0) + p_amount,
    donor_count = COALESCE(donor_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_campaign_id;

  -- Raise exception if campaign not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign with id % not found', p_campaign_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CREATE RPC FUNCTION: DECREMENT_CAMPAIGN_AMOUNT
-- ============================================================================
-- Decreases campaign current_amount and donor_count when a donation is refunded

CREATE OR REPLACE FUNCTION decrement_campaign_amount(
  p_campaign_id UUID,
  p_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET
    current_amount = GREATEST(COALESCE(current_amount, 0) - p_amount, 0),
    donor_count = GREATEST(COALESCE(donor_count, 0) - 1, 0),
    updated_at = NOW()
  WHERE id = p_campaign_id;

  -- Raise exception if campaign not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign with id % not found', p_campaign_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. CREATE TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ============================================================================

-- Trigger for payment_sessions
CREATE OR REPLACE FUNCTION update_payment_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payment_sessions_timestamp
  BEFORE UPDATE ON payment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_sessions_updated_at();

-- Trigger for donations (only if updated_at column exists)
CREATE OR REPLACE FUNCTION update_donations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_donations_timestamp ON donations;
CREATE TRIGGER trigger_update_donations_timestamp
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_donations_updated_at();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_sessions
-- Users can view their own payment sessions
CREATE POLICY "Users can view own payment sessions"
  ON payment_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own payment sessions (via service)
CREATE POLICY "Users can create own payment sessions"
  ON payment_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all payment sessions
CREATE POLICY "Service role can manage payment sessions"
  ON payment_sessions FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view all payment sessions
CREATE POLICY "Admins can view all payment sessions"
  ON payment_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for webhook_events
-- Only service role and admins can access webhook events
CREATE POLICY "Service role can manage webhook events"
  ON webhook_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Admins can view webhook events"
  ON webhook_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE ON payment_sessions TO authenticated;
GRANT SELECT, INSERT ON webhook_events TO authenticated;
GRANT SELECT, UPDATE ON donations TO authenticated;

-- Grant permissions to service role (for Edge Functions)
GRANT ALL ON payment_sessions TO service_role;
GRANT ALL ON webhook_events TO service_role;
GRANT ALL ON donations TO service_role;
GRANT ALL ON campaigns TO service_role;

-- ============================================================================
-- 9. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE payment_sessions IS 'Tracks PayMongo checkout sessions and payment processing';
COMMENT ON TABLE webhook_events IS 'Logs all webhook events from payment providers for audit and debugging';

COMMENT ON COLUMN donations.provider IS 'Payment provider used (paymongo, xendit, maya)';
COMMENT ON COLUMN donations.provider_payment_id IS 'Payment ID from the payment provider';
COMMENT ON COLUMN donations.payment_session_id IS 'Reference to the payment session';
COMMENT ON COLUMN donations.failure_reason IS 'Reason for payment failure if applicable';
COMMENT ON COLUMN donations.metadata IS 'Additional metadata about the donation';
COMMENT ON COLUMN donations.message IS 'Optional message from donor to charity';
COMMENT ON COLUMN donations.is_anonymous IS 'Whether the donation should be anonymous';

COMMENT ON FUNCTION increment_campaign_amount IS 'Increments campaign amount and donor count when donation completes';
COMMENT ON FUNCTION decrement_campaign_amount IS 'Decrements campaign amount and donor count when donation is refunded';
