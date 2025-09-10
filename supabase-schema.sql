-- ClearCause Database Schema for Supabase
-- Run this script in your Supabase SQL Editor to set up the complete database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'charity', 'donor');

-- Campaign status enum  
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');

-- Donation status enum
CREATE TYPE donation_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Verification status enum
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Milestone status enum
CREATE TYPE milestone_status AS ENUM ('pending', 'in_progress', 'completed', 'verified');

-- =====================================================
-- TABLES
-- =====================================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'donor',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Charities table
CREATE TABLE public.charities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_name TEXT NOT NULL,
  organization_type TEXT,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  tax_id TEXT,
  registration_number TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_date TIMESTAMP WITH TIME ZONE,
  verification_notes TEXT,
  transparency_score INTEGER DEFAULT 0,
  total_raised DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  charity_id UUID REFERENCES public.charities(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  donors_count INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  image_url TEXT,
  status campaign_status NOT NULL DEFAULT 'draft',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Donations table
CREATE TABLE public.donations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status donation_status NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_provider TEXT,
  payment_id TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  donated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Milestones table
CREATE TABLE public.milestones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(12,2) NOT NULL,
  status milestone_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  verification_status verification_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Milestone proofs table
CREATE TABLE public.milestone_proofs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  proof_type TEXT NOT NULL,
  file_url TEXT,
  status verification_status NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  verification_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_is_verified ON public.profiles(is_verified);

-- Charities indexes
CREATE INDEX idx_charities_user_id ON public.charities(user_id);
CREATE INDEX idx_charities_is_verified ON public.charities(is_verified);
CREATE INDEX idx_charities_organization_name ON public.charities(organization_name);

-- Campaigns indexes
CREATE INDEX idx_campaigns_charity_id ON public.campaigns(charity_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_category ON public.campaigns(category);
CREATE INDEX idx_campaigns_end_date ON public.campaigns(end_date);

-- Donations indexes
CREATE INDEX idx_donations_user_id ON public.donations(user_id);
CREATE INDEX idx_donations_campaign_id ON public.donations(campaign_id);
CREATE INDEX idx_donations_status ON public.donations(status);
CREATE INDEX idx_donations_donated_at ON public.donations(donated_at);

-- Milestones indexes
CREATE INDEX idx_milestones_campaign_id ON public.milestones(campaign_id);
CREATE INDEX idx_milestones_status ON public.milestones(status);
CREATE INDEX idx_milestones_due_date ON public.milestones(due_date);

-- Milestone proofs indexes
CREATE INDEX idx_milestone_proofs_milestone_id ON public.milestone_proofs(milestone_id);
CREATE INDEX idx_milestone_proofs_status ON public.milestone_proofs(status);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'donor')::user_role,
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role = EXCLUDED.role,
    is_verified = EXCLUDED.is_verified,
    updated_at = now();
  
  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Function to handle email confirmation
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if email_confirmed_at changed from NULL to non-NULL
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles 
    SET is_verified = true, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger for email confirmation
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_email_confirmed();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_charities_updated_at BEFORE UPDATE ON public.charities FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON public.donations FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_milestone_proofs_updated_at BEFORE UPDATE ON public.milestone_proofs FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- Charities policies
CREATE POLICY "Charities can manage their own organization" ON public.charities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public can view verified charities" ON public.charities FOR SELECT USING (is_verified = true);

-- Campaigns policies
CREATE POLICY "Public can view active campaigns" ON public.campaigns FOR SELECT USING (status = 'active');
CREATE POLICY "Charities can manage their own campaigns" ON public.campaigns FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.charities 
    WHERE charities.id = campaigns.charity_id 
    AND charities.user_id = auth.uid()
  )
);

-- Donations policies
CREATE POLICY "Users can view their own donations" ON public.donations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create donations" ON public.donations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Charities can view donations to their campaigns" ON public.donations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    JOIN public.charities ON campaigns.charity_id = charities.id
    WHERE campaigns.id = donations.campaign_id 
    AND charities.user_id = auth.uid()
  )
);

-- Milestones policies
CREATE POLICY "Public can view milestones for active campaigns" ON public.milestones FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = milestones.campaign_id 
    AND campaigns.status = 'active'
  )
);
CREATE POLICY "Charities can manage milestones for their campaigns" ON public.milestones FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    JOIN public.charities ON campaigns.charity_id = charities.id
    WHERE campaigns.id = milestones.campaign_id 
    AND charities.user_id = auth.uid()
  )
);

-- Milestone proofs policies
CREATE POLICY "Charities can manage proofs for their milestones" ON public.milestone_proofs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.milestones 
    JOIN public.campaigns ON milestones.campaign_id = campaigns.id
    JOIN public.charities ON campaigns.charity_id = charities.id
    WHERE milestones.id = milestone_proofs.milestone_id 
    AND charities.user_id = auth.uid()
  )
);

-- Audit logs policies
CREATE POLICY "Users can view their own audit logs" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- =====================================================
-- SAMPLE DATA (Optional - Remove in production)
-- =====================================================

-- Insert a sample admin user (you can remove this in production)
-- Note: You'll need to create this user through Supabase Auth first, then update their profile
-- INSERT INTO public.profiles (id, email, full_name, role, is_verified, is_active)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'admin@clearcause.com', 'Admin User', 'admin', true, true);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'ClearCause database schema setup completed successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create your first admin user through Supabase Auth';
  RAISE NOTICE '2. Update their profile role to "admin" in the profiles table';
  RAISE NOTICE '3. Test the authentication flow in your application';
END $$;
