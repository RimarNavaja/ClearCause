-- Create Platform Settings Table
-- This table stores configurable platform settings with audit trail support
-- Each setting update tracks who made the change (updated_by) and when (updated_at)

-- ============================================================================
-- 1. CREATE PLATFORM_SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Setting identification
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  
  -- Documentation
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  
  -- Audit trail fields
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX idx_platform_settings_key ON public.platform_settings(key);
CREATE INDEX idx_platform_settings_category ON public.platform_settings(category);
CREATE INDEX idx_platform_settings_updated_by ON public.platform_settings(updated_by);
CREATE INDEX idx_platform_settings_updated_at ON public.platform_settings(updated_at DESC);

-- ============================================================================
-- 3. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_platform_settings_timestamp
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_settings_updated_at();

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage all platform settings
CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Authenticated users can read settings (for platform configuration)
CREATE POLICY "Authenticated users can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Service role can manage all settings
CREATE POLICY "Service role can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- 5. SEED INITIAL SETTINGS
-- ============================================================================

INSERT INTO public.platform_settings (key, value, description, category) VALUES
  (
    'platform_fee_percentage',
    '0.5'::jsonb,
    'Percentage fee charged on each donation (0-20%)',
    'payment'
  ),
  (
    'minimum_donation_amount',
    '100'::jsonb,
    'Minimum donation amount in PHP (₱100-₱10,000)',
    'payment'
  ),
  (
    'max_campaign_duration_days',
    '365'::jsonb,
    'Maximum campaign duration in days',
    'campaigns'
  ),
  (
    'charity_verification_required',
    'true'::jsonb,
    'Whether charity verification is required before campaign creation',
    'verification'
  ),
  (
    'enable_milestone_tracking',
    'true'::jsonb,
    'Enable milestone tracking for campaigns',
    'features'
  )
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 6. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

-- ============================================================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.platform_settings IS 'Stores configurable platform settings with audit trail support';
COMMENT ON COLUMN public.platform_settings.key IS 'Unique identifier for the setting';
COMMENT ON COLUMN public.platform_settings.value IS 'Setting value stored as JSONB for flexibility';
COMMENT ON COLUMN public.platform_settings.updated_by IS 'Admin user who last updated this setting (for audit trail)';
COMMENT ON COLUMN public.platform_settings.updated_at IS 'Timestamp of last update (for audit trail)';
