# Charity Verification Setup Instructions

## 📋 Prerequisites Checklist

Before testing the charity verification feature, ensure these setup steps are completed:

### 1. Supabase Storage Bucket

Create a storage bucket for verification documents:

```sql
-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', true);

-- Set up RLS policies for verification documents
CREATE POLICY "Anyone can view verification documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-documents');

CREATE POLICY "Authenticated users can upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own verification documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own verification documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'verification-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Alternative: Create via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Storage
3. Click "Create Bucket"
4. Name: `verification-documents`
5. Make it Public: Yes
6. Click "Create bucket"

### 2. Database Tables

Verify these tables exist (they should already be in your schema):

- ✅ `charity_verifications` - Stores verification applications
- ✅ `verification_documents` - Stores document metadata
- ✅ `profiles` - User profiles
- ✅ `charities` - Charity organization data

### 3. Database Functions

Ensure these functions exist for admin operations:

```sql
-- These should already be in your adminService.ts:
-- - approveCharityVerification()
-- - rejectCharityVerification()
-- - requestVerificationResubmission()
```

### 4. Test Data Setup

#### Create Test Users:

**Charity User:**
```sql
-- This should be done via signup form
-- Email: charity@test.com
-- Password: Test123!
-- Role: charity
```

**Admin User:**
```sql
-- This should be done via signup form or direct insert
-- Email: admin@test.com
-- Password: Admin123!
-- Role: admin
```

**Donor User:**
```sql
-- This should be done via signup form
-- Email: donor@test.com
-- Password: Donor123!
-- Role: donor
```

### 5. File Upload Requirements

Prepare test files for document upload:

- **Registration Certificate**: Sample PDF (< 5MB)
- **Tax Exemption**: Sample PDF or JPEG (< 5MB)
- **Representative ID**: Sample JPEG or PNG (< 5MB)
- **Proof of Address**: Sample PDF (< 5MB)

**Accepted formats**: PDF, JPEG, JPG, PNG
**Max file size**: 5MB per file

### 6. Environment Variables

Verify your `.env.local` or environment has:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 🚀 Quick Setup Commands

### Option 1: Manual Setup via Supabase Dashboard

1. **Create Storage Bucket**:
   - Dashboard → Storage → New Bucket
   - Name: `verification-documents`
   - Public: Yes

2. **Verify Tables Exist**:
   - Dashboard → Database → Tables
   - Check: charity_verifications, verification_documents

3. **Create Test Users**:
   - Use signup form at `/signup`
   - Create charity, admin, and donor accounts

### Option 2: SQL Script Setup

Run this complete setup script in Supabase SQL Editor:

```sql
-- 1. Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage policies
CREATE POLICY IF NOT EXISTS "Public verification documents read"
ON storage.objects FOR SELECT
USING (bucket_id = 'verification-documents');

CREATE POLICY IF NOT EXISTS "Authenticated upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-documents'
  AND auth.role() = 'authenticated'
);

-- 3. Verify tables exist (should already exist from schema)
-- charity_verifications
-- verification_documents
-- These should be created from your main schema file

-- 4. Create sample admin user (optional - or use signup)
-- INSERT INTO auth.users and profiles as needed
```

## ✅ Verification Checklist

Before running tests, verify:

- [ ] Storage bucket `verification-documents` exists
- [ ] Storage bucket is set to PUBLIC
- [ ] Tables `charity_verifications` and `verification_documents` exist
- [ ] You have at least one charity user account
- [ ] You have at least one admin user account
- [ ] Dev server is running (`npm run dev`)
- [ ] No TypeScript compilation errors
- [ ] Supabase connection is working

## 🧪 Testing Workflow

### Phase 1: Charity Submission
1. Log in as charity user
2. Navigate to `/charity/verification/apply`
3. Fill out all required fields
4. Upload at least 2 documents (registration + ID)
5. Submit application
6. Verify success message
7. Check status page shows "Pending"

### Phase 2: Admin Review
1. Log out and log in as admin
2. Navigate to `/admin/charity-verifications`
3. Verify application appears in queue
4. Click "Review"
5. Verify all information displays correctly
6. Download and check documents
7. Approve or reject application
8. Verify status updates

### Phase 3: Donor View
1. Log out and log in as donor
2. Navigate to `/campaigns`
3. Verify verification badges appear
4. Test "Verified Only" filter
5. Make a donation (if testing full flow)
6. Check donation history shows verification badge

## 🐛 Troubleshooting

### Storage Bucket Issues
**Error**: "Storage bucket not found"
**Solution**: Create the bucket via Supabase dashboard or SQL script above

### Upload Fails
**Error**: "Failed to upload document"
**Solution**:
- Check bucket permissions
- Verify file size < 5MB
- Verify file format (PDF, JPEG, PNG)
- Check Supabase storage quota

### Query Errors
**Error**: "Could not find table charity_verifications"
**Solution**: Run the main schema SQL file to create tables

### Permission Errors
**Error**: "Insufficient permissions"
**Solution**:
- Verify RLS policies are set correctly
- Check user role is correct (charity, admin, donor)
- Verify auth token is valid

## 📊 Expected Database Flow

1. **Application Submission**:
   - Insert into `charity_verifications` table
   - Upload files to `verification-documents` bucket
   - Insert metadata into `verification_documents` table
   - Status: "pending"

2. **Admin Review**:
   - Query from `charity_verifications` with joined `verification_documents`
   - Display all info and documents
   - Update status on approval/rejection

3. **Badge Display**:
   - Query campaigns with charity verification status
   - Display VerificationBadge component based on status
   - Filter campaigns by verification status if needed

## 🎯 Success Criteria

✅ **Application Submitted**: Record exists in database with status "pending"
✅ **Documents Uploaded**: Files exist in storage bucket
✅ **Admin Can Review**: Application appears in admin queue
✅ **Status Updates**: Approval/rejection changes status correctly
✅ **Badges Display**: Verification badges show on campaigns and donations
✅ **Filters Work**: Can filter campaigns by verified status

---

**Current Status**:
- ✅ Dev server running on http://localhost:8081
- ✅ No TypeScript errors
- ⚠️ **Action Required**: Create storage bucket `verification-documents` in Supabase
- ⚠️ **Action Required**: Create test users (charity, admin, donor)
