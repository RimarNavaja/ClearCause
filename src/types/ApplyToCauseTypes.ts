/**
 * TypeScript types for the Apply to Cause form
 */

export interface ApplyToCauseFormData {
  // Organization Information
  organizationName: string;
  registrationNumber: string;
  organizationType: string;

  // Contact Person
  contactFullName: string;
  contactEmail: string;
  contactPhone: string;

  // Organization Address
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;

  // Organization Mission
  missionStatement: string;

  // Account Credentials
  accountEmail: string;
  password: string;
  confirmPassword: string;

  // Terms
  acceptTerms: boolean;
}

export interface UploadedDocuments {
  secCertificate: File | null;
  birCertificate: File | null;
  supportingDocument: File | null;
}

export const organizationTypes = [
  { value: 'non-profit', label: 'Non-Profit Organization' },
  { value: 'ngo', label: 'Non-Governmental Organization (NGO)' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'religious', label: 'Religious Organization' },
  { value: 'educational', label: 'Educational Institution' },
  { value: 'health', label: 'Healthcare Organization' },
  { value: 'environmental', label: 'Environmental Group' },
  { value: 'community', label: 'Community Organization' },
  { value: 'other', label: 'Other' }
];