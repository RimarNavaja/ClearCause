-- Campaign Full-Text Search Migration
-- Adds full-text search capabilities to campaigns using PostgreSQL's tsvector

-- Add tsvector column for full-text search
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_campaigns_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS trigger_update_campaigns_search_vector ON campaigns;
CREATE TRIGGER trigger_update_campaigns_search_vector
  BEFORE INSERT OR UPDATE OF title, description, location
  ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_search_vector();

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_campaigns_search_vector ON campaigns USING GIN(search_vector);

-- Update existing campaigns to populate search_vector
UPDATE campaigns SET search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(location, '')), 'C');

-- Create a function for search with ranking
CREATE OR REPLACE FUNCTION search_campaigns(
  search_query TEXT,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.description,
    ts_rank(c.search_vector, websearch_to_tsquery('english', search_query)) AS rank
  FROM campaigns c
  WHERE c.search_vector @@ websearch_to_tsquery('english', search_query)
  ORDER BY rank DESC, c.created_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comments
COMMENT ON COLUMN campaigns.search_vector IS 'Full-text search vector for campaign title, description, and location';
COMMENT ON FUNCTION search_campaigns IS 'Searches campaigns using full-text search with ranking';
