-- Migration: Create campaign_updates table and related objects
-- Description: Adds campaign updates/impact feed functionality for charities to post progress updates

-- Create campaign_updates table
CREATE TABLE IF NOT EXISTS public.campaign_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  charity_id UUID NOT NULL REFERENCES public.charities(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  update_type TEXT NOT NULL CHECK (update_type IN ('milestone', 'impact', 'general')),
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_campaign_updates_campaign_id ON public.campaign_updates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_charity_id ON public.campaign_updates(charity_id);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_created_by ON public.campaign_updates(created_by);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_status ON public.campaign_updates(status);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_update_type ON public.campaign_updates(update_type);
CREATE INDEX IF NOT EXISTS idx_campaign_updates_created_at ON public.campaign_updates(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_campaign_updates_updated_at
  BEFORE UPDATE ON public.campaign_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.campaign_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view published updates
CREATE POLICY "Anyone can view published campaign updates"
  ON public.campaign_updates
  FOR SELECT
  USING (status = 'published');

-- RLS Policy: Charities can view their own updates (any status)
CREATE POLICY "Charities can view their own campaign updates"
  ON public.campaign_updates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.charities c
      WHERE c.id = campaign_updates.charity_id
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policy: Charities can create updates for their own campaigns
CREATE POLICY "Charities can create campaign updates"
  ON public.campaign_updates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.charities c
      WHERE c.id = campaign_updates.charity_id
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policy: Charities can update their own campaign updates
CREATE POLICY "Charities can update their own campaign updates"
  ON public.campaign_updates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.charities c
      WHERE c.id = campaign_updates.charity_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.charities c
      WHERE c.id = campaign_updates.charity_id
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policy: Charities can delete their own campaign updates
CREATE POLICY "Charities can delete their own campaign updates"
  ON public.campaign_updates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.charities c
      WHERE c.id = campaign_updates.charity_id
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policy: Admins can view all updates
CREATE POLICY "Admins can view all campaign updates"
  ON public.campaign_updates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- RLS Policy: Admins can update any campaign update
CREATE POLICY "Admins can update campaign updates"
  ON public.campaign_updates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- RLS Policy: Admins can delete any campaign update
CREATE POLICY "Admins can delete campaign updates"
  ON public.campaign_updates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Add comment to table
COMMENT ON TABLE public.campaign_updates IS 'Stores campaign updates, progress reports, and impact stories posted by charities';
COMMENT ON COLUMN public.campaign_updates.update_type IS 'Type of update: milestone (linked to a milestone), impact (impact story), or general (general news)';
COMMENT ON COLUMN public.campaign_updates.status IS 'Status of the update: draft, published, or archived';
