-- Campaign Categories Migration
-- Adds a campaign_categories table with predefined categories and links campaigns to categories

-- Create campaign_categories table
CREATE TABLE IF NOT EXISTS campaign_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50), -- Icon name/emoji for UI
  color VARCHAR(20), -- Color code for UI theming
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for active categories
CREATE INDEX idx_campaign_categories_active ON campaign_categories(is_active);
CREATE INDEX idx_campaign_categories_order ON campaign_categories(display_order);

-- Insert default categories
INSERT INTO campaign_categories (name, slug, description, icon, color, display_order) VALUES
  ('Education', 'education', 'Support educational programs, scholarships, school supplies, and learning facilities', '📚', '#3B82F6', 1),
  ('Healthcare', 'health', 'Medical assistance, hospital bills, medicines, and healthcare programs', '🏥', '#EF4444', 2),
  ('Disaster Relief', 'disaster', 'Emergency response, disaster recovery, and humanitarian aid', '🆘', '#F59E0B', 3),
  ('Environment', 'environment', 'Environmental conservation, tree planting, and sustainability projects', '🌱', '#10B981', 4),
  ('Community Development', 'community', 'Infrastructure, facilities, and programs that benefit communities', '🏘️', '#8B5CF6', 5),
  ('Food Security', 'food', 'Feeding programs, food banks, and nutrition initiatives', '🍽️', '#EC4899', 6),
  ('Animal Welfare', 'animals', 'Animal rescue, shelters, and wildlife conservation', '🐾', '#14B8A6', 7),
  ('Children & Youth', 'children', 'Programs supporting children and youth development', '👶', '#F97316', 8),
  ('Elderly Care', 'elderly', 'Support for senior citizens and elderly care facilities', '👴', '#6366F1', 9),
  ('Water & Sanitation', 'water', 'Clean water access, sanitation facilities, and hygiene programs', '💧', '#0EA5E9', 10),
  ('Livelihood', 'livelihood', 'Skills training, job creation, and economic empowerment', '💼', '#84CC16', 11),
  ('Other', 'other', 'Other charitable causes and special projects', '🤝', '#6B7280', 12)
ON CONFLICT (slug) DO NOTHING;

-- Add category_id column to campaigns table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN category_id UUID REFERENCES campaign_categories(id);
  END IF;
END $$;

-- Migrate existing category data to the new structure
-- Map old text-based categories to new category IDs
UPDATE campaigns
SET category_id = (SELECT id FROM campaign_categories WHERE slug = 'education')
WHERE category = 'education';

UPDATE campaigns
SET category_id = (SELECT id FROM campaign_categories WHERE slug = 'health')
WHERE category IN ('health', 'healthcare');

UPDATE campaigns
SET category_id = (SELECT id FROM campaign_categories WHERE slug = 'environment')
WHERE category = 'environment';

UPDATE campaigns
SET category_id = (SELECT id FROM campaign_categories WHERE slug = 'disaster')
WHERE category IN ('disaster', 'disaster relief', 'disaster_relief');

UPDATE campaigns
SET category_id = (SELECT id FROM campaign_categories WHERE slug = 'community')
WHERE category IN ('community', 'community development', 'community_development');

UPDATE campaigns
SET category_id = (SELECT id FROM campaign_categories WHERE slug = 'other')
WHERE category = 'other' OR category_id IS NULL;

-- Add index for category lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaign_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_categories_timestamp
  BEFORE UPDATE ON campaign_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_categories_updated_at();

-- Enable RLS on campaign_categories
ALTER TABLE campaign_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_categories
-- Allow everyone to read active categories
CREATE POLICY "Anyone can view active categories"
  ON campaign_categories FOR SELECT
  USING (is_active = true);

-- Only admins can insert/update/delete categories
CREATE POLICY "Admins can manage categories"
  ON campaign_categories FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON TABLE campaign_categories IS 'Predefined categories for organizing campaigns';
COMMENT ON COLUMN campaigns.category_id IS 'Foreign key reference to campaign_categories table';
