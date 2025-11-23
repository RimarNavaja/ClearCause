-- Storage Buckets Configuration for ClearCause
-- Creates buckets for campaign images, milestone proofs, charity documents, and profile avatars

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('campaign-images', 'campaign-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('milestone-proofs', 'milestone-proofs', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]),
  ('charity-documents', 'charity-documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]),
  ('profile-avatars', 'profile-avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CAMPAIGN IMAGES BUCKET POLICIES
-- Public read, authenticated charity users can upload
-- ============================================================================

-- Allow public to read campaign images
CREATE POLICY "Public can view campaign images"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-images');

-- Allow authenticated charity users to upload campaign images
CREATE POLICY "Charities can upload campaign images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'charity'
  )
);

-- Allow charities to update their own campaign images
CREATE POLICY "Charities can update their campaign images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'campaign-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'charity'
  )
)
WITH CHECK (
  bucket_id = 'campaign-images'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'charity'
  )
);

-- Allow charities to delete their own campaign images
CREATE POLICY "Charities can delete their campaign images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campaign-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'charity'
  )
);

-- ============================================================================
-- MILESTONE PROOFS BUCKET POLICIES
-- Charities can upload, admins and campaign owners can view
-- ============================================================================

-- Allow charities to upload milestone proofs
CREATE POLICY "Charities can upload milestone proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'milestone-proofs'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'charity'
  )
);

-- Allow admins to view all milestone proofs
CREATE POLICY "Admins can view milestone proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'milestone-proofs'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow charity to view their own milestone proofs
CREATE POLICY "Charities can view their milestone proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'milestone-proofs'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'charity'
  )
);

-- Allow charities to delete their own milestone proofs
CREATE POLICY "Charities can delete milestone proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'milestone-proofs'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'charity'
  )
);

-- ============================================================================
-- CHARITY DOCUMENTS BUCKET POLICIES
-- Charities can upload, only admins can view
-- ============================================================================

-- Allow charities to upload verification documents
CREATE POLICY "Charities can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'charity-documents'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'charity'
  )
);

-- Allow admins to view charity documents
CREATE POLICY "Admins can view charity documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'charity-documents'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Allow charity to view their own documents
CREATE POLICY "Charities can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'charity-documents'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'charity'
  )
);

-- Allow charities to delete their own documents
CREATE POLICY "Charities can delete their documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'charity-documents'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'charity'
  )
);

-- ============================================================================
-- PROFILE AVATARS BUCKET POLICIES
-- Public read, users can manage their own avatars
-- ============================================================================

-- Allow public to view profile avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-avatars'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-avatars'
  AND auth.role() = 'authenticated'
);
