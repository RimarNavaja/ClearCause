# Charity Verification Testing Guide

## ✅ Compilation Status
- **Dev Server**: Running on http://localhost:8081
- **TypeScript Compilation**: No errors detected
- **All Components**: Successfully created and imported

## 🧪 Testing Checklist

### 1. Charity Application Flow (CauseCreators)

#### Step 1: Access Application Form
- [ ] Log in as a charity user
- [ ] Navigate to `/charity/verification/apply` or click "Complete Verification" button from dashboard
- [ ] Verify form loads without errors

#### Step 2: Fill Out Application Form
- [ ] **Organization Information**:
  - [ ] Enter organization name (required)
  - [ ] Select organization type from dropdown (required)
  - [ ] Enter mission statement (required)
  - [ ] Enter website URL (optional)
  - [ ] Select date established (optional)

- [ ] **Contact Information**:
  - [ ] Enter contact email (required)
  - [ ] Enter contact phone (optional)

- [ ] **Address Information**:
  - [ ] Enter address line 1 (required)
  - [ ] Enter address line 2 (optional)
  - [ ] Enter city (required)
  - [ ] Enter state/province (required)
  - [ ] Enter postal code (required)
  - [ ] Enter country (required)

- [ ] **Legal Information**:
  - [ ] Enter registration number (required)
  - [ ] Enter tax ID (optional)

- [ ] **Document Uploads**:
  - [ ] Upload Registration Certificate (required) - Test PDF
  - [ ] Upload Tax Exemption Document (optional) - Test JPEG
  - [ ] Upload Representative ID (required) - Test PNG
  - [ ] Upload Proof of Address (optional) - Test PDF
  - [ ] Verify file size validation (max 5MB)
  - [ ] Verify file type validation (PDF, JPEG, PNG only)

#### Step 3: Submit Application
- [ ] Click "Submit for Verification"
- [ ] Verify loading state appears
- [ ] Verify success toast message
- [ ] Verify redirect to verification status page or dashboard

#### Step 4: Check Verification Status
- [ ] Navigate to `/charity/verification/status`
- [ ] Verify status shows as "Pending Review" with ⏳ badge
- [ ] Verify all submitted information displays correctly
- [ ] Verify all uploaded documents appear in the table
- [ ] Verify can download/view uploaded documents
- [ ] Verify submission history timeline shows submission date

### 2. Admin Review Flow (Verifiers)

#### Step 1: Access Verification Queue
- [ ] Log in as an admin user
- [ ] Click "Charity Verifications" in admin sidebar
- [ ] Verify `/admin/charity-verifications` page loads
- [ ] Verify statistics cards display (Pending, Under Review, Approved, etc.)

#### Step 2: Browse Applications
- [ ] Verify all submitted applications appear in table
- [ ] Test search by organization name
- [ ] Test search by email
- [ ] Test filter by status (All, Pending, Under Review, Approved, Rejected)
- [ ] Test sort by newest, oldest, name
- [ ] Verify document count shows for each application

#### Step 3: Review Application
- [ ] Click "Review" button on a pending application
- [ ] Verify redirect to `/admin/verifications/charity/[id]`
- [ ] Verify all organization details display correctly
- [ ] Verify all documents are viewable/downloadable
- [ ] Verify status badge shows current status

#### Step 4: Take Action on Application

**Test Approval:**
- [ ] Enter admin notes (optional)
- [ ] Click "Approve" button
- [ ] Verify loading state
- [ ] Verify success toast
- [ ] Verify redirect back to queue
- [ ] Go back to queue and verify status changed to "Approved" ✅

**Test Rejection:**
- [ ] Click "Reject" button
- [ ] Verify rejection form appears
- [ ] Try submitting without reason - should show validation error
- [ ] Enter rejection reason (required)
- [ ] Click "Confirm Rejection"
- [ ] Verify status changed to "Rejected" ❌

**Test Request Resubmission:**
- [ ] Click "Request Changes" button
- [ ] Enter reason for changes needed
- [ ] Submit
- [ ] Verify status changed to "Resubmission Required" ⚠️

#### Step 5: Verify Charity Receives Feedback
- [ ] Log back in as the charity
- [ ] Navigate to verification status page
- [ ] Verify rejection reason or feedback displays
- [ ] Verify "Resubmit" button appears if rejected
- [ ] Test clicking resubmit redirects to application form

### 3. Donor View (HopeGivers)

#### Step 1: Browse Campaigns
- [ ] Navigate to `/campaigns`
- [ ] Verify verification badges appear on campaign cards
- [ ] Verify ✅ badge for verified charities
- [ ] Verify ⏳ badge for pending charities
- [ ] Verify ❌ badge for rejected charities

#### Step 2: Filter Verified Campaigns
- [ ] Toggle "Verified Only" filter
- [ ] Verify only approved charities' campaigns show
- [ ] Verify filter works with search and category filters

#### Step 3: Check Donation History
- [ ] Log in as a donor
- [ ] Navigate to `/donor/donations`
- [ ] Verify verification badges appear next to charity names
- [ ] Verify badge shows correct status for each charity

### 4. Navigation & Routes Testing

#### Charity Routes:
- [ ] `/charity/verification/apply` - Application form
- [ ] `/charity/verification/status` - Status page
- [ ] `/charity/verifications` - Milestone verification status (existing)

#### Admin Routes:
- [ ] `/admin/charity-verifications` - Verification queue
- [ ] `/admin/verifications/charity/[id]` - Review detail page

#### Donor Routes:
- [ ] `/campaigns` - With verification badges
- [ ] `/donor/donations` - With verification badges

### 5. Sidebar Navigation

#### Charity Sidebar:
- [ ] Verify "Verification Status" link exists (if using old route)
- [ ] Or verify appropriate navigation to verification pages

#### Admin Sidebar:
- [ ] Verify "Charity Verifications" link in Verification section
- [ ] Verify links to Milestone Proofs
- [ ] Verify links to Fund Releases

### 6. Component Testing

#### VerificationBadge Component:
- [ ] Test with status="pending" - should show blue ⏳
- [ ] Test with status="under_review" - should show yellow
- [ ] Test with status="approved" - should show green ✅
- [ ] Test with status="rejected" - should show red ❌
- [ ] Test with status="resubmission_required" - should show orange ⚠️
- [ ] Test different sizes (sm, md, lg)
- [ ] Test with and without icons

### 7. Database Integration

#### Supabase Tables:
- [ ] Verify `charity_verifications` table receives new records
- [ ] Verify `verification_documents` table stores document info
- [ ] Verify file uploads to `verification-documents` storage bucket
- [ ] Verify status updates correctly when admin approves/rejects

#### Storage:
- [ ] Verify documents upload to Supabase storage
- [ ] Verify public URLs are generated correctly
- [ ] Verify documents are accessible via public URL

### 8. Error Handling

#### Form Validation:
- [ ] Try submitting form without required fields
- [ ] Try uploading file larger than 5MB
- [ ] Try uploading invalid file type (.txt, .exe)
- [ ] Try submitting without required documents

#### Network Errors:
- [ ] Test behavior when database query fails
- [ ] Test behavior when file upload fails
- [ ] Verify error messages display to user

### 9. Edge Cases

#### Multiple Submissions:
- [ ] Test submitting multiple applications for same charity
- [ ] Verify only latest application displays
- [ ] Test resubmitting after rejection

#### Concurrent Admin Reviews:
- [ ] Test what happens if two admins review same application
- [ ] Verify status updates correctly

#### Missing Data:
- [ ] Test viewing application with missing optional fields
- [ ] Test viewing application with no documents uploaded

## 📊 Expected Results Summary

### For Charities:
1. Can submit verification application with documents ✓
2. Can view application status at any time ✓
3. Receive clear feedback if rejected ✓
4. Can resubmit if needed ✓

### For Admins:
1. See all pending applications in queue ✓
2. Can review all details and documents ✓
3. Can approve, reject, or request changes ✓
4. Actions update status immediately ✓

### For Donors:
1. See verification badges on all campaigns ✓
2. Can filter to show only verified campaigns ✓
3. See verification status in donation history ✓

## 🐛 Known Issues to Watch For

1. **File Upload Issues**: Verify Supabase storage bucket exists and has correct permissions
2. **Badge Display**: Check if badges render correctly on different screen sizes
3. **Route Protection**: Ensure charity routes require charity role
4. **Admin Permissions**: Ensure only admins can access verification queue

## 🚀 Quick Start Testing

1. Start server: `npm run dev` (Running on port 8081)
2. Open browser: `http://localhost:8081`
3. Sign in as charity user
4. Navigate to verification application
5. Submit test application
6. Log in as admin
7. Review and approve/reject
8. Verify badges appear on campaigns

---

**Note**: Server is running successfully on http://localhost:8081
All TypeScript compilation completed without errors ✅
