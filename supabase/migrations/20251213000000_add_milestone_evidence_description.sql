
-- Add evidence_description column to milestones table
ALTER TABLE public.milestones 
ADD COLUMN IF NOT EXISTS evidence_description TEXT;
