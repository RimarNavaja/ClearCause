-- Migration: Enable instant review publishing without moderation
-- Description: Updates RLS policies to allow donors to edit/delete approved reviews
-- Date: 2024-12-13

-- Drop old policies that required 'pending' status
DROP POLICY IF EXISTS "Donors can update their own pending reviews" ON public.campaign_reviews;
DROP POLICY IF EXISTS "Donors can delete their own pending reviews" ON public.campaign_reviews;

-- Create new policies that allow donors to manage their own reviews (any status)
CREATE POLICY "Donors can update their own reviews"
  ON public.campaign_reviews
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'approved');

CREATE POLICY "Donors can delete their own reviews"
  ON public.campaign_reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Update comments to reflect instant publishing
COMMENT ON COLUMN public.campaign_reviews.status IS 'Review status (approved by default, admins can moderate if needed)';
