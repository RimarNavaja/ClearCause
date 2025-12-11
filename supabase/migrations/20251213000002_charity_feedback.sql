-- Migration: Add Charity Feedback System
-- Description: Allows donors to leave feedback and ratings for charity organizations
-- Date: 2024-12-13

-- Create charity_feedback table
CREATE TABLE IF NOT EXISTS public.charity_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
  donor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(charity_id, donor_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_charity_feedback_charity_id ON public.charity_feedback(charity_id);
CREATE INDEX IF NOT EXISTS idx_charity_feedback_donor_id ON public.charity_feedback(donor_id);
CREATE INDEX IF NOT EXISTS idx_charity_feedback_rating ON public.charity_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_charity_feedback_created_at ON public.charity_feedback(created_at DESC);

-- Add trigger for updated_at timestamp
CREATE TRIGGER update_charity_feedback_updated_at
  BEFORE UPDATE ON public.charity_feedback
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.charity_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view all charity feedback (no moderation)
CREATE POLICY "Anyone can view charity feedback"
  ON public.charity_feedback
  FOR SELECT
  USING (true);

-- RLS Policy: Authenticated users can insert feedback
CREATE POLICY "Authenticated users can insert charity feedback"
  ON public.charity_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = donor_id AND auth.uid() IS NOT NULL);

-- RLS Policy: Donors can update their own feedback
CREATE POLICY "Donors can update their own feedback"
  ON public.charity_feedback
  FOR UPDATE
  USING (auth.uid() = donor_id);

-- RLS Policy: Donors can delete their own feedback
CREATE POLICY "Donors can delete their own feedback"
  ON public.charity_feedback
  FOR DELETE
  USING (auth.uid() = donor_id);

-- RLS Policy: Admins can delete any feedback (emergency only)
CREATE POLICY "Admins can delete any charity feedback"
  ON public.charity_feedback
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE public.charity_feedback IS 'Stores donor feedback and ratings for charity organizations';
COMMENT ON COLUMN public.charity_feedback.rating IS 'Rating from 1-5 stars';
COMMENT ON COLUMN public.charity_feedback.comment IS 'Optional text feedback from donor';
COMMENT ON COLUMN public.charity_feedback.charity_id IS 'Reference to the charity being reviewed';
COMMENT ON COLUMN public.charity_feedback.donor_id IS 'Reference to the donor who submitted feedback';
