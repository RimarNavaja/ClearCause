-- Add onboarding_completed column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Backfill existing profiles to true (assuming they are already onboarded)
UPDATE public.profiles SET onboarding_completed = true WHERE onboarding_completed IS FALSE;

-- Update handle_new_user function to respect metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_verified, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'donor')::user_role,
    NEW.email_confirmed_at IS NOT NULL,
    COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    is_verified = EXCLUDED.is_verified,
    onboarding_completed = COALESCE(EXCLUDED.onboarding_completed, profiles.onboarding_completed),
    updated_at = now();
  
  RETURN NEW;
END;
$$ language 'plpgsql' security definer;
