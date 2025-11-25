-- Add RLS policy to allow admins to view all donations
-- This fixes the issue where admins couldn't see donations in the management page

-- Create policy for admin access to donations
CREATE POLICY "Admins can view all donations"
  ON public.donations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Admins can view all donations" ON public.donations IS
  'Allows users with admin role in profiles table to view all donations for management and reporting purposes';
