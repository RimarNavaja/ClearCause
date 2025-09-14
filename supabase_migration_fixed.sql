-- ===================================================================
-- CLEARCAUSE SUPABASE MIGRATION SCRIPT - FIXED VERSION
-- ===================================================================
-- This script works with your existing database that has user_role enum
-- and proper foreign key relationships already set up
-- ===================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- 1. CHECK AND CREATE ENUM TYPES
-- ===================================================================

-- Create user_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'charity', 'donor');
    END IF;
END $$;

-- Create other enums if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
        CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'donation_status') THEN
        CREATE TYPE donation_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'milestone_status') THEN
        CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed', 'verified');
    END IF;
END $$;

-- ===================================================================
-- 2. ENSURE PROFILES TABLE IS COMPLETE
-- ===================================================================

-- The profiles table likely already exists, but let's ensure all required columns are present
DO $$
BEGIN
    -- Add missing columns to profiles table if they don't exist
    
    -- Add email column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
        -- Update email from auth.users
        UPDATE public.profiles SET email = (
            SELECT au.email FROM auth.users au WHERE au.id = profiles.id
        ) WHERE email IS NULL;
        -- Make email NOT NULL after populating
        ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
    END IF;
    
    -- Add full_name column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
    
    -- Add avatar_url column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
    
    -- Add phone column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;
    
    -- Add is_verified column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE public.profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add is_active column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON public.profiles(is_active);

-- ===================================================================
-- 3. ENSURE CHARITIES TABLE IS COMPLETE
-- ===================================================================

DO $$
BEGIN
    -- Add verification_status column if missing (this fixes your original error)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'charities' AND column_name = 'verification_status') THEN
        ALTER TABLE public.charities ADD COLUMN verification_status verification_status DEFAULT 'pending';
    END IF;
    
    -- Add verification_notes column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'charities' AND column_name = 'verification_notes') THEN
        ALTER TABLE public.charities ADD COLUMN verification_notes TEXT;
    END IF;
    
    -- Add transparency_score column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'charities' AND column_name = 'transparency_score') THEN
        ALTER TABLE public.charities ADD COLUMN transparency_score INTEGER DEFAULT 0;
    END IF;
    
    -- Add total_raised column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'charities' AND column_name = 'total_raised') THEN
        ALTER TABLE public.charities ADD COLUMN total_raised DECIMAL(15,2) DEFAULT 0.00;
    END IF;
    
    -- Add organization_type column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'charities' AND column_name = 'organization_type') THEN
        ALTER TABLE public.charities ADD COLUMN organization_type TEXT;
    END IF;
    
    -- Add logo_url column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'charities' AND column_name = 'logo_url') THEN
        ALTER TABLE public.charities ADD COLUMN logo_url TEXT;
    END IF;
    
    -- Add contact_email column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'charities' AND column_name = 'contact_email') THEN
        ALTER TABLE public.charities ADD COLUMN contact_email TEXT;
    END IF;
    
    -- Add contact_phone column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'charities' AND column_name = 'contact_phone') THEN
        ALTER TABLE public.charities ADD COLUMN contact_phone TEXT;
    END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS charities_user_id_idx ON public.charities(user_id);
CREATE INDEX IF NOT EXISTS charities_verification_status_idx ON public.charities(verification_status);

-- ===================================================================
-- 4. ENSURE CAMPAIGNS TABLE IS COMPLETE
-- ===================================================================

DO $$
BEGIN
    -- Add location column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'location') THEN
        ALTER TABLE public.campaigns ADD COLUMN location TEXT;
    END IF;
    
    -- Add donors_count column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'donors_count') THEN
        ALTER TABLE public.campaigns ADD COLUMN donors_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS campaigns_charity_id_idx ON public.campaigns(charity_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON public.campaigns(status);

-- ===================================================================
-- 5. CREATE AUTOMATIC PROFILE CREATION TRIGGER
-- ===================================================================

-- Function to automatically create profile when user signs up (fixed for user_role enum)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_verified, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'donor')::user_role, -- Cast to user_role enum
    COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    is_verified = COALESCE(EXCLUDED.is_verified, public.profiles.is_verified),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================================================================
-- 6. CREATE UPDATE TIMESTAMP TRIGGERS
-- ===================================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for all tables (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_charities_updated_at ON public.charities;
CREATE TRIGGER update_charities_updated_at
  BEFORE UPDATE ON public.charities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================================
-- 7. SET UP ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ===================================================================
-- PROFILES TABLE POLICIES
-- ===================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create new permissive policies (can be restricted later)
CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (TRUE); -- Allow viewing all profiles for now

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ===================================================================
-- CHARITIES TABLE POLICIES
-- ===================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Charities are viewable by everyone" ON public.charities;
DROP POLICY IF EXISTS "Users can insert own charity" ON public.charities;
DROP POLICY IF EXISTS "Users can update own charity" ON public.charities;
DROP POLICY IF EXISTS "Charities viewable by authenticated users" ON public.charities;

CREATE POLICY "Charities viewable by authenticated users"
  ON public.charities FOR SELECT
  TO authenticated
  USING (TRUE); -- Allow viewing all charities for now

CREATE POLICY "Users can insert own charity"
  ON public.charities FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own charity"
  ON public.charities FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ===================================================================
-- CAMPAIGNS TABLE POLICIES
-- ===================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Campaigns are viewable by everyone" ON public.campaigns;
DROP POLICY IF EXISTS "Charity users can insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Charity users can update own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Campaigns viewable by authenticated users" ON public.campaigns;

CREATE POLICY "Campaigns viewable by authenticated users"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING (TRUE); -- Allow viewing all campaigns for now

CREATE POLICY "Charity users can insert campaigns"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.charities WHERE id = charity_id AND user_id = auth.uid())
  );

CREATE POLICY "Charity users can update own campaigns"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.charities WHERE id = charity_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.charities WHERE id = charity_id AND user_id = auth.uid())
  );

-- ===================================================================
-- DONATIONS TABLE POLICIES
-- ===================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own donations" ON public.donations;
DROP POLICY IF EXISTS "Users can insert donations" ON public.donations;
DROP POLICY IF EXISTS "Users can update own donations" ON public.donations;
DROP POLICY IF EXISTS "Users can view relevant donations" ON public.donations;

CREATE POLICY "Users can view relevant donations"
  ON public.donations FOR SELECT
  TO authenticated
  USING (TRUE); -- Allow viewing for now

CREATE POLICY "Users can insert donations"
  ON public.donations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own donations"
  ON public.donations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ===================================================================
-- AUDIT_LOGS TABLE POLICIES
-- ===================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Admin can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (TRUE); -- Can be restricted to admin only later

-- ===================================================================
-- 8. GRANT NECESSARY PERMISSIONS
-- ===================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.donations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;

-- Grant permissions on milestones and milestone_proofs (since they exist)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestone_proofs TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ===================================================================
-- 9. FIX EXISTING DATA
-- ===================================================================

-- Create profiles for any existing auth users without profiles (fixed with enum casting)
INSERT INTO public.profiles (id, email, full_name, role, is_verified, is_active)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'role', 'donor')::user_role, -- Cast to user_role enum
  COALESCE(au.email_confirmed_at IS NOT NULL, FALSE),
  TRUE
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Update any profiles that are missing email addresses
UPDATE public.profiles 
SET email = (
  SELECT au.email 
  FROM auth.users au 
  WHERE au.id = profiles.id
)
WHERE email IS NULL OR email = '';

-- ===================================================================
-- SCRIPT COMPLETE
-- ===================================================================

SELECT 'Database migration completed successfully!' AS status;

-- Show table counts
SELECT 
  'profiles' AS table_name, 
  COUNT(*) AS row_count 
FROM public.profiles
UNION ALL
SELECT 
  'charities' AS table_name, 
  COUNT(*) AS row_count 
FROM public.charities
UNION ALL
SELECT 
  'campaigns' AS table_name, 
  COUNT(*) AS row_count 
FROM public.campaigns
UNION ALL  
SELECT 
  'donations' AS table_name, 
  COUNT(*) AS row_count 
FROM public.donations
UNION ALL
SELECT 
  'milestones' AS table_name, 
  COUNT(*) AS row_count 
FROM public.milestones
UNION ALL
SELECT 
  'milestone_proofs' AS table_name, 
  COUNT(*) AS row_count 
FROM public.milestone_proofs;