-- Campaign Reviews Migration
-- Adds donor feedback and rating system

-- Create review status enum
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');

-- Campaign Reviews table
CREATE TABLE public.campaign_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status review_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure a user can only review a campaign once
  UNIQUE(campaign_id, user_id)
);

-- Add index for faster queries
CREATE INDEX idx_campaign_reviews_campaign_id ON public.campaign_reviews(campaign_id);
CREATE INDEX idx_campaign_reviews_user_id ON public.campaign_reviews(user_id);
CREATE INDEX idx_campaign_reviews_status ON public.campaign_reviews(status);

-- Add average rating field to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;

-- Create function to update campaign rating stats
CREATE OR REPLACE FUNCTION update_campaign_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update campaign's average rating and review count
  UPDATE public.campaigns
  SET
    average_rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM public.campaign_reviews
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
        AND status = 'approved'
    ),
    reviews_count = (
      SELECT COUNT(*)
      FROM public.campaign_reviews
      WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
        AND status = 'approved'
    )
  WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update campaign stats when review is added/updated/deleted
CREATE TRIGGER trigger_update_campaign_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.campaign_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_rating_stats();

-- Create function to update charity transparency score based on reviews
CREATE OR REPLACE FUNCTION update_charity_transparency_score()
RETURNS TRIGGER AS $$
DECLARE
  charity_id_var UUID;
  avg_rating DECIMAL;
  total_campaigns INTEGER;
  completed_campaigns INTEGER;
  verified_milestones INTEGER;
  total_milestones INTEGER;
  score INTEGER;
BEGIN
  -- Get the charity_id from the campaign
  SELECT charity_id INTO charity_id_var
  FROM public.campaigns
  WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);

  -- Calculate average rating across all charity's campaigns
  SELECT COALESCE(AVG(c.average_rating), 0) INTO avg_rating
  FROM public.campaigns c
  WHERE c.charity_id = charity_id_var;

  -- Get campaign completion stats
  SELECT COUNT(*) INTO total_campaigns
  FROM public.campaigns
  WHERE charity_id = charity_id_var;

  SELECT COUNT(*) INTO completed_campaigns
  FROM public.campaigns
  WHERE charity_id = charity_id_var AND status = 'completed';

  -- Get milestone verification stats
  SELECT COUNT(*) INTO total_milestones
  FROM public.milestones m
  JOIN public.campaigns c ON m.campaign_id = c.id
  WHERE c.charity_id = charity_id_var;

  SELECT COUNT(*) INTO verified_milestones
  FROM public.milestones m
  JOIN public.campaigns c ON m.campaign_id = c.id
  WHERE c.charity_id = charity_id_var AND m.status = 'verified';

  -- Calculate transparency score (0-100)
  -- Formula: 40% avg rating (0-20) + 30% completion rate (0-30) + 30% milestone verification (0-30) + 20 base points
  score := ROUND(
    (avg_rating * 4) + -- Max 20 points from ratings (5 stars * 4)
    (CASE WHEN total_campaigns > 0 THEN (completed_campaigns::DECIMAL / total_campaigns) * 30 ELSE 0 END) + -- Max 30 points from completion rate
    (CASE WHEN total_milestones > 0 THEN (verified_milestones::DECIMAL / total_milestones) * 30 ELSE 0 END) + -- Max 30 points from milestone verification
    20 -- Base 20 points for being verified
  );

  -- Update charity transparency score
  UPDATE public.charities
  SET transparency_score = LEAST(score, 100) -- Cap at 100
  WHERE id = charity_id_var;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update charity score when reviews change
CREATE TRIGGER trigger_update_charity_score_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.campaign_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_charity_transparency_score();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.campaign_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON public.campaign_reviews
  FOR SELECT
  USING (status = 'approved');

-- Policy: Donors can view their own reviews (any status)
CREATE POLICY "Donors can view their own reviews"
  ON public.campaign_reviews
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Donors can create reviews for campaigns they donated to
CREATE POLICY "Donors can create reviews"
  ON public.campaign_reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.donations
      WHERE user_id = auth.uid()
        AND campaign_id = campaign_reviews.campaign_id
        AND status = 'completed'
    )
  );

-- Policy: Donors can update their own pending reviews
CREATE POLICY "Donors can update their own pending reviews"
  ON public.campaign_reviews
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Policy: Donors can delete their own pending reviews
CREATE POLICY "Donors can delete their own pending reviews"
  ON public.campaign_reviews
  FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Policy: Admins can view all reviews
CREATE POLICY "Admins can view all reviews"
  ON public.campaign_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update any review (for moderation)
CREATE POLICY "Admins can moderate reviews"
  ON public.campaign_reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete any review
CREATE POLICY "Admins can delete reviews"
  ON public.campaign_reviews
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER set_updated_at_campaign_reviews
  BEFORE UPDATE ON public.campaign_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for review statistics
CREATE OR REPLACE VIEW campaign_review_stats AS
SELECT
  c.id as campaign_id,
  c.title as campaign_title,
  COUNT(cr.id) as total_reviews,
  COUNT(CASE WHEN cr.status = 'approved' THEN 1 END) as approved_reviews,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_reviews,
  COALESCE(AVG(CASE WHEN cr.status = 'approved' THEN cr.rating END), 0) as average_rating,
  COUNT(CASE WHEN cr.rating = 5 THEN 1 END) as five_stars,
  COUNT(CASE WHEN cr.rating = 4 THEN 1 END) as four_stars,
  COUNT(CASE WHEN cr.rating = 3 THEN 1 END) as three_stars,
  COUNT(CASE WHEN cr.rating = 2 THEN 1 END) as two_stars,
  COUNT(CASE WHEN cr.rating = 1 THEN 1 END) as one_star
FROM public.campaigns c
LEFT JOIN public.campaign_reviews cr ON c.id = cr.campaign_id
GROUP BY c.id, c.title;

-- Grant access to view
GRANT SELECT ON campaign_review_stats TO authenticated;

COMMENT ON TABLE public.campaign_reviews IS 'Stores donor reviews and ratings for campaigns';
COMMENT ON COLUMN public.campaign_reviews.rating IS 'Rating from 1-5 stars';
COMMENT ON COLUMN public.campaign_reviews.status IS 'Review moderation status (pending, approved, rejected)';
