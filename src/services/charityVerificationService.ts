/**
 * Charity Verification Service
 * Handles charity verification workflow and application management
 */

import { supabase } from '../lib/supabase';
import { 
  ApiResponse, 
  ClearCauseError,
  VerificationStatus 
} from '../lib/types';
import { validateData } from '../utils/validation';
import { withErrorHandling, handleSupabaseError, createSuccessResponse } from '../utils/errors';
import { logAuditEvent } from './adminService';
import { z } from 'zod';

// =========================================
// VALIDATION SCHEMAS
// =========================================

const charityVerificationSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  organizationType: z.string().optional(),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  websiteUrl: z.string().url('Invalid website URL').optional().or(z.literal('')),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().min(8, 'Phone number must be at least 8 digits').optional(),
  
  // Address
  addressLine1: z.string().min(5, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  stateProvince: z.string().min(2, 'State/Province is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(2, 'Country is required'),
  
  // Registration details
  registrationNumber: z.string().min(3, 'Registration number is required'),
  taxId: z.string().optional(),
  dateEstablished: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed < new Date();
  }, 'Invalid establishment date'),
});

const documentUploadSchema = z.object({
  verificationId: z.string().uuid('Invalid verification ID'),
  documentType: z.enum([
    'business_registration',
    'tax_exemption', 
    'board_resolution',
    'financial_statement',
    'organizational_chart',
    'program_documentation',
    'bank_certification',
    'other'
  ]),
  documentName: z.string().min(1, 'Document name is required'),
  fileUrl: z.string().url('Invalid file URL'),
  fileSize: z.number().positive('File size must be positive').optional(),
  mimeType: z.string().optional()
});

// =========================================
// TYPES
// =========================================

export interface CharityVerificationData {
  organizationName: string;
  organizationType?: string;
  description: string;
  websiteUrl?: string;
  contactEmail: string;
  contactPhone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  registrationNumber: string;
  taxId?: string;
  dateEstablished: string;
}

export interface DocumentUploadData {
  verificationId: string;
  documentType: string;
  documentName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
}

export interface CharityVerification {
  id: string;
  charityId: string;
  adminId?: string;
  status: VerificationStatus;
  organizationName: string;
  organizationType?: string;
  description?: string;
  websiteUrl?: string;
  contactEmail: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  registrationNumber?: string;
  taxId?: string;
  dateEstablished?: string;
  documents: any[];
  adminNotes?: string;
  rejectionReason?: string;
  internalNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// =========================================
// CHARITY VERIFICATION FUNCTIONS
// =========================================

/**
 * Submit charity verification application
 */
export const submitCharityVerification = withErrorHandling(async (
  verificationData: CharityVerificationData,
  currentUserId: string
): Promise<ApiResponse<CharityVerification>> => {
  // Validate input data
  const validatedData = validateData(charityVerificationSchema, verificationData);

  // Check if user has charity role
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', currentUserId)
    .single();

  if (userError) {
    throw handleSupabaseError(userError);
  }

  if (currentUser?.role !== 'charity') {
    throw new ClearCauseError('FORBIDDEN', 'Only charity users can submit verification applications', 403);
  }

  // Check if user already has a verification application
  const { data: existingVerification, error: existingError } = await supabase
    .from('charity_verifications')
    .select('id, status')
    .eq('charity_id', currentUserId)
    .maybeSingle();

  if (existingError) {
    throw handleSupabaseError(existingError);
  }

  if (existingVerification && existingVerification.status === 'pending') {
    throw new ClearCauseError('CONFLICT', 'You already have a pending verification application', 409);
  }

  if (existingVerification && existingVerification.status === 'approved') {
    throw new ClearCauseError('CONFLICT', 'Your charity is already verified', 409);
  }

  // Create new verification record
  const { data: verification, error: insertError } = await supabase
    .from('charity_verifications')
    .insert({
      charity_id: currentUserId,
      status: 'pending',
      organization_name: validatedData.organizationName,
      organization_type: validatedData.organizationType,
      description: validatedData.description,
      website_url: validatedData.websiteUrl || null,
      contact_email: validatedData.contactEmail,
      contact_phone: validatedData.contactPhone,
      address_line1: validatedData.addressLine1,
      address_line2: validatedData.addressLine2,
      city: validatedData.city,
      state_province: validatedData.stateProvince,
      postal_code: validatedData.postalCode,
      country: validatedData.country,
      registration_number: validatedData.registrationNumber,
      tax_id: validatedData.taxId,
      date_established: validatedData.dateEstablished,
    })
    .select()
    .single();

  if (insertError) {
    throw handleSupabaseError(insertError);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId, 
    'CHARITY_VERIFICATION_SUBMITTED', 
    'charity_verification', 
    verification.id,
    {
      organization_name: validatedData.organizationName,
      contact_email: validatedData.contactEmail
    }
  );

  return createSuccessResponse(verification, 'Verification application submitted successfully');
});

/**
 * Update charity verification application
 */
export const updateCharityVerification = withErrorHandling(async (
  verificationId: string,
  verificationData: Partial<CharityVerificationData>,
  currentUserId: string
): Promise<ApiResponse<CharityVerification>> => {
  // Get existing verification
  const { data: existingVerification, error: existingError } = await supabase
    .from('charity_verifications')
    .select('*')
    .eq('id', verificationId)
    .eq('charity_id', currentUserId)
    .single();

  if (existingError) {
    if (existingError.code === 'PGRST116') {
      throw new ClearCauseError('NOT_FOUND', 'Verification application not found', 404);
    }
    throw handleSupabaseError(existingError);
  }

  // Check if verification can be updated
  if (!['pending', 'resubmission_required'].includes(existingVerification.status)) {
    throw new ClearCauseError('FORBIDDEN', 'Cannot update verification in current status', 403);
  }

  // Validate update data (partial validation)
  const updateData: any = {};
  
  if (verificationData.organizationName) {
    updateData.organization_name = verificationData.organizationName;
  }
  if (verificationData.organizationType !== undefined) {
    updateData.organization_type = verificationData.organizationType;
  }
  if (verificationData.description) {
    updateData.description = verificationData.description;
  }
  if (verificationData.websiteUrl !== undefined) {
    updateData.website_url = verificationData.websiteUrl || null;
  }
  if (verificationData.contactEmail) {
    updateData.contact_email = verificationData.contactEmail;
  }
  if (verificationData.contactPhone !== undefined) {
    updateData.contact_phone = verificationData.contactPhone;
  }
  if (verificationData.addressLine1) {
    updateData.address_line1 = verificationData.addressLine1;
  }
  if (verificationData.addressLine2 !== undefined) {
    updateData.address_line2 = verificationData.addressLine2;
  }
  if (verificationData.city) {
    updateData.city = verificationData.city;
  }
  if (verificationData.stateProvince) {
    updateData.state_province = verificationData.stateProvince;
  }
  if (verificationData.postalCode) {
    updateData.postal_code = verificationData.postalCode;
  }
  if (verificationData.country) {
    updateData.country = verificationData.country;
  }
  if (verificationData.registrationNumber) {
    updateData.registration_number = verificationData.registrationNumber;
  }
  if (verificationData.taxId !== undefined) {
    updateData.tax_id = verificationData.taxId;
  }
  if (verificationData.dateEstablished) {
    updateData.date_established = verificationData.dateEstablished;
  }

  // Reset status to pending if it was resubmission_required
  if (existingVerification.status === 'resubmission_required') {
    updateData.status = 'pending';
    updateData.rejection_reason = null;
  }

  // Update verification
  const { data: updatedVerification, error: updateError } = await supabase
    .from('charity_verifications')
    .update(updateData)
    .eq('id', verificationId)
    .select()
    .single();

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'CHARITY_VERIFICATION_UPDATED',
    'charity_verification',
    verificationId,
    { updated_fields: Object.keys(updateData) }
  );

  return createSuccessResponse(updatedVerification, 'Verification application updated successfully');
});

/**
 * Upload verification document
 */
export const uploadVerificationDocument = withErrorHandling(async (
  documentData: DocumentUploadData,
  currentUserId: string
): Promise<ApiResponse<any>> => {
  // Validate input data
  const validatedData = validateData(documentUploadSchema, documentData);

  // Check if verification belongs to current user
  const { data: verification, error: verificationError } = await supabase
    .from('charity_verifications')
    .select('id, status')
    .eq('id', validatedData.verificationId)
    .eq('charity_id', currentUserId)
    .single();

  if (verificationError) {
    if (verificationError.code === 'PGRST116') {
      throw new ClearCauseError('NOT_FOUND', 'Verification application not found', 404);
    }
    throw handleSupabaseError(verificationError);
  }

  // Check if verification allows document uploads
  if (!['pending', 'resubmission_required', 'under_review'].includes(verification.status)) {
    throw new ClearCauseError('FORBIDDEN', 'Cannot upload documents in current verification status', 403);
  }

  // Insert document record
  const { data: document, error: documentError } = await supabase
    .from('verification_documents')
    .insert({
      verification_id: validatedData.verificationId,
      document_type: validatedData.documentType,
      document_name: validatedData.documentName,
      file_url: validatedData.fileUrl,
      file_size: validatedData.fileSize,
      mime_type: validatedData.mimeType,
    })
    .select()
    .single();

  if (documentError) {
    throw handleSupabaseError(documentError);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'VERIFICATION_DOCUMENT_UPLOADED',
    'verification_document',
    document.id,
    {
      verification_id: validatedData.verificationId,
      document_type: validatedData.documentType,
      document_name: validatedData.documentName
    }
  );

  return createSuccessResponse(document, 'Document uploaded successfully');
});

/**
 * Get charity verification status
 */
export const getCharityVerificationStatus = withErrorHandling(async (
  currentUserId: string
): Promise<ApiResponse<CharityVerification | null>> => {
  // Check if user has charity role
  const { data: currentUser, error: userError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', currentUserId)
    .single();

  if (userError) {
    throw handleSupabaseError(userError);
  }

  if (currentUser?.role !== 'charity') {
    throw new ClearCauseError('FORBIDDEN', 'Only charity users can access verification status', 403);
  }

  // Get verification status
  const { data: verification, error: verificationError } = await supabase
    .from('charity_verifications')
    .select(`
      *,
      documents:verification_documents (
        id,
        document_type,
        document_name,
        file_url,
        file_size,
        mime_type,
        uploaded_at,
        is_verified,
        admin_notes
      ),
      history:admin_verification_history (
        id,
        action,
        previous_status,
        new_status,
        notes,
        created_at,
        admin:profiles!admin_id (
          full_name,
          email
        )
      )
    `)
    .eq('charity_id', currentUserId)
    .maybeSingle();

  if (verificationError) {
    throw handleSupabaseError(verificationError);
  }

  return createSuccessResponse(verification, verification ? 'Verification status retrieved' : 'No verification application found');
});

/**
 * Delete verification document
 */
export const deleteVerificationDocument = withErrorHandling(async (
  documentId: string,
  currentUserId: string
): Promise<ApiResponse<void>> => {
  // Check if document belongs to current user's verification
  const { data: document, error: documentError } = await supabase
    .from('verification_documents')
    .select(`
      id,
      document_name,
      verification_id,
      verification:charity_verifications!verification_id (
        charity_id,
        status
      )
    `)
    .eq('id', documentId)
    .single();

  if (documentError) {
    if (documentError.code === 'PGRST116') {
      throw new ClearCauseError('NOT_FOUND', 'Document not found', 404);
    }
    throw handleSupabaseError(documentError);
  }

  // Check ownership and permissions
  if (document.verification?.charity_id !== currentUserId) {
    throw new ClearCauseError('FORBIDDEN', 'You can only delete your own documents', 403);
  }

  if (!['pending', 'resubmission_required'].includes(document.verification?.status)) {
    throw new ClearCauseError('FORBIDDEN', 'Cannot delete documents in current verification status', 403);
  }

  // Delete document
  const { error: deleteError } = await supabase
    .from('verification_documents')
    .delete()
    .eq('id', documentId);

  if (deleteError) {
    throw handleSupabaseError(deleteError);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'VERIFICATION_DOCUMENT_DELETED',
    'verification_document',
    documentId,
    {
      verification_id: document.verification_id,
      document_name: document.document_name
    }
  );

  return createSuccessResponse(undefined, 'Document deleted successfully');
});

/**
 * Resubmit verification application
 */
export const resubmitCharityVerification = withErrorHandling(async (
  verificationId: string,
  currentUserId: string
): Promise<ApiResponse<void>> => {
  // Get existing verification
  const { data: verification, error: verificationError } = await supabase
    .from('charity_verifications')
    .select('status, charity_id')
    .eq('id', verificationId)
    .eq('charity_id', currentUserId)
    .single();

  if (verificationError) {
    if (verificationError.code === 'PGRST116') {
      throw new ClearCauseError('NOT_FOUND', 'Verification application not found', 404);
    }
    throw handleSupabaseError(verificationError);
  }

  // Check if resubmission is allowed
  if (verification.status !== 'resubmission_required') {
    throw new ClearCauseError('FORBIDDEN', 'Verification is not in resubmission required status', 403);
  }

  // Update status to pending
  const { error: updateError } = await supabase
    .from('charity_verifications')
    .update({
      status: 'pending',
      rejection_reason: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', verificationId);

  if (updateError) {
    throw handleSupabaseError(updateError);
  }

  // Log audit event
  await logAuditEvent(
    currentUserId,
    'CHARITY_VERIFICATION_RESUBMITTED',
    'charity_verification',
    verificationId
  );

  return createSuccessResponse(undefined, 'Verification application resubmitted successfully');
});

/**
 * Get verification document types
 */
export const getDocumentTypes = (): ApiResponse<Array<{value: string, label: string, required: boolean}>> => {
  const documentTypes = [
    { value: 'business_registration', label: 'Business Registration Certificate', required: true },
    { value: 'tax_exemption', label: 'Tax Exemption Certificate', required: true },
    { value: 'board_resolution', label: 'Board Resolution', required: false },
    { value: 'financial_statement', label: 'Financial Statement', required: true },
    { value: 'organizational_chart', label: 'Organizational Chart', required: false },
    { value: 'program_documentation', label: 'Program Documentation', required: false },
    { value: 'bank_certification', label: 'Bank Account Certification', required: true },
    { value: 'other', label: 'Other Supporting Documents', required: false }
  ];

  return createSuccessResponse(documentTypes, 'Document types retrieved successfully');
};

// =========================================
// UTILITY FUNCTIONS
// =========================================

/**
 * Check if charity can submit verification
 */
export const canSubmitVerification = withErrorHandling(async (
  currentUserId: string
): Promise<ApiResponse<{ canSubmit: boolean, reason?: string }>> => {
  // Check user role
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('role, is_verified')
    .eq('id', currentUserId)
    .single();

  if (userError) {
    throw handleSupabaseError(userError);
  }

  if (user.role !== 'charity') {
    return createSuccessResponse({ 
      canSubmit: false, 
      reason: 'Only charity users can submit verification applications' 
    });
  }

  if (user.is_verified) {
    return createSuccessResponse({ 
      canSubmit: false, 
      reason: 'Your charity is already verified' 
    });
  }

  // Check for existing applications
  const { data: existingVerification } = await supabase
    .from('charity_verifications')
    .select('status')
    .eq('charity_id', currentUserId)
    .maybeSingle();

  if (existingVerification) {
    switch (existingVerification.status) {
      case 'pending':
        return createSuccessResponse({ 
          canSubmit: false, 
          reason: 'You already have a pending verification application' 
        });
      case 'under_review':
        return createSuccessResponse({ 
          canSubmit: false, 
          reason: 'Your verification application is currently under review' 
        });
      case 'approved':
        return createSuccessResponse({ 
          canSubmit: false, 
          reason: 'Your charity is already verified' 
        });
      case 'resubmission_required':
        return createSuccessResponse({ 
          canSubmit: true, 
          reason: 'You can update and resubmit your application' 
        });
      case 'rejected':
        return createSuccessResponse({ 
          canSubmit: true, 
          reason: 'You can submit a new verification application' 
        });
    }
  }

  return createSuccessResponse({ canSubmit: true });
});