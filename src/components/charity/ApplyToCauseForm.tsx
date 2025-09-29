import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ApplyToCauseFormData, UploadedDocuments, organizationTypes } from '@/types/ApplyToCauseTypes';
import * as charityService from '@/services/charityService';
import * as authService from '@/lib/auth';
import './ApplyToCauseForm.css';

// Form validation schema
const applyToCauseSchema = z.object({
  organizationName: z.string().min(1, 'Organization name is required'),
  registrationNumber: z.string().min(1, 'Registration number is required'),
  organizationType: z.string().min(1, 'Organization type is required'),
  contactFullName: z.string().min(1, 'Full name is required'),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().min(1, 'Phone number is required'),
  streetAddress: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province/Region is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  missionStatement: z.string().min(50, 'Mission statement must be at least 50 characters'),
  accountEmail: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must agree to the terms and conditions')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

const ApplyToCauseForm: React.FC = () => {
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocuments>({
    secCertificate: null,
    birCertificate: null,
    supportingDocument: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ApplyToCauseFormData>({
    resolver: zodResolver(applyToCauseSchema)
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleFileUpload = (field: keyof UploadedDocuments, file: File | null) => {
    setUploadedDocuments(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const onSubmit = async (data: ApplyToCauseFormData) => {
    try {
      setIsSubmitting(true);

      // Validate required documents
      if (!uploadedDocuments.secCertificate) {
        toast({
          title: 'Required Document Missing',
          description: 'SEC Registration Certificate is required',
          variant: 'destructive'
        });
        return;
      }

      if (!uploadedDocuments.birCertificate) {
        toast({
          title: 'Required Document Missing',
          description: 'BIR Certificate of Registration is required',
          variant: 'destructive'
        });
        return;
      }

      // Step 1: Create account
      const signUpResult = await authService.signUp({
        email: data.accountEmail,
        password: data.password,
        fullName: data.contactFullName,
        role: 'charity'
      });

      if (!signUpResult.success || !signUpResult.data?.user) {
        throw new Error(signUpResult.error || 'Failed to create account');
      }

      const userId = signUpResult.data.user.id;

      // Step 2: Register charity organization
      const charityData = {
        organizationName: data.organizationName,
        description: data.missionStatement,
        registrationNumber: data.registrationNumber,
        address: `${data.streetAddress}, ${data.city}, ${data.province} ${data.postalCode}`,
        websiteUrl: '',
        phone: data.contactPhone,
        verificationDocuments: [
          uploadedDocuments.secCertificate!,
          uploadedDocuments.birCertificate!,
          ...(uploadedDocuments.supportingDocument ? [uploadedDocuments.supportingDocument] : [])
        ]
      };

      const charityResult = await charityService.registerCharity(charityData, userId);

      if (!charityResult.success) {
        throw new Error(charityResult.error || 'Failed to register charity');
      }

      toast({
        title: 'Application Submitted Successfully!',
        description: 'Your charity application has been submitted. You will receive an email confirmation within 3-5 business days.',
      });

      navigate('/charity/application-success');

    } catch (error) {
      console.error('Application submission error:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Failed to submit application. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="apply-to-cause-container">
      <div className="form-header">
        <h1>Apply to Cause</h1>
        <p>Please complete this application to register your organization. Our team will review your submission and contact you within 3-5 business days.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="apply-form">
        <OrganizationInformationSection register={register} errors={errors} />
        <ContactPersonSection register={register} errors={errors} />
        <OrganizationAddressSection register={register} errors={errors} />
        <OrganizationMissionSection register={register} errors={errors} />
        <AccountCredentialsSection register={register} errors={errors} watch={watch} />
        <VerificationDocumentsSection
          uploadedDocuments={uploadedDocuments}
          onFileUpload={handleFileUpload}
        />
        <FormFooter register={register} errors={errors} isSubmitting={isSubmitting} />
      </form>
    </div>
  );
};

// Organization Information Section Component
const OrganizationInformationSection: React.FC<{
  register: any;
  errors: any;
}> = ({ register, errors }) => (
  <div className="form-section">
    <h2>Organization Information</h2>

    <div className="field-group">
      <label>Organization Name*</label>
      <input
        {...register('organizationName')}
        className="form-input"
        placeholder="Enter your organization name"
      />
      {errors.organizationName && <span className="error">{errors.organizationName.message}</span>}
    </div>

    <div className="field-group">
      <label>Registration Number (SEC/BIR)*</label>
      <input
        {...register('registrationNumber')}
        className="form-input"
        placeholder="Enter registration number"
      />
      {errors.registrationNumber && <span className="error">{errors.registrationNumber.message}</span>}
    </div>

    <div className="field-group">
      <label>Organization Type*</label>
      <select
        {...register('organizationType')}
        className="form-select"
      >
        <option value="">Select Organization Type</option>
        {organizationTypes.map(type => (
          <option key={type.value} value={type.value}>{type.label}</option>
        ))}
      </select>
      {errors.organizationType && <span className="error">{errors.organizationType.message}</span>}
    </div>
  </div>
);

// Contact Person Section Component
const ContactPersonSection: React.FC<{
  register: any;
  errors: any;
}> = ({ register, errors }) => (
  <div className="form-section">
    <h2>Contact Person</h2>

    <div className="field-group">
      <label>Full Name*</label>
      <input
        {...register('contactFullName')}
        className="form-input"
        placeholder="Enter full name"
      />
      {errors.contactFullName && <span className="error">{errors.contactFullName.message}</span>}
    </div>

    <div className="field-group">
      <label>Email Address*</label>
      <input
        type="email"
        {...register('contactEmail')}
        className="form-input"
        placeholder="Enter email address"
      />
      {errors.contactEmail && <span className="error">{errors.contactEmail.message}</span>}
    </div>

    <div className="field-group">
      <label>Phone Number*</label>
      <input
        type="tel"
        {...register('contactPhone')}
        className="form-input"
        placeholder="Enter phone number"
      />
      {errors.contactPhone && <span className="error">{errors.contactPhone.message}</span>}
    </div>
  </div>
);

// Organization Address Section Component
const OrganizationAddressSection: React.FC<{
  register: any;
  errors: any;
}> = ({ register, errors }) => (
  <div className="form-section">
    <h2>Organization Address</h2>

    <div className="field-group">
      <label>Street Address*</label>
      <input
        {...register('streetAddress')}
        className="form-input"
        placeholder="Enter street address"
      />
      {errors.streetAddress && <span className="error">{errors.streetAddress.message}</span>}
    </div>

    <div className="field-row">
      <div className="field-group half-width">
        <label>City*</label>
        <input
          {...register('city')}
          className="form-input"
          placeholder="Enter city"
        />
        {errors.city && <span className="error">{errors.city.message}</span>}
      </div>

      <div className="field-group half-width">
        <label>Province/Region*</label>
        <input
          {...register('province')}
          className="form-input"
          placeholder="Enter province/region"
        />
        {errors.province && <span className="error">{errors.province.message}</span>}
      </div>
    </div>

    <div className="field-group">
      <label>Postal Code*</label>
      <input
        {...register('postalCode')}
        className="form-input"
        placeholder="Enter postal code"
      />
      {errors.postalCode && <span className="error">{errors.postalCode.message}</span>}
    </div>
  </div>
);

// Organization Mission Section Component
const OrganizationMissionSection: React.FC<{
  register: any;
  errors: any;
}> = ({ register, errors }) => (
  <div className="form-section">
    <h2>Organization Mission</h2>

    <div className="field-group">
      <label>Describe your organization's mission and purpose*</label>
      <textarea
        {...register('missionStatement')}
        className="form-textarea"
        rows={6}
        placeholder="Describe your organization's mission, goals, and the impact you aim to create..."
      />
      {errors.missionStatement && <span className="error">{errors.missionStatement.message}</span>}
    </div>
  </div>
);

// Account Credentials Section Component
const AccountCredentialsSection: React.FC<{
  register: any;
  errors: any;
  watch: any;
}> = ({ register, errors, watch }) => {
  return (
    <div className="form-section">
      <h2>Account Credentials</h2>

      <div className="field-group">
        <label>Account Email* (used for login)</label>
        <input
          type="email"
          {...register('accountEmail')}
          className="form-input"
          placeholder="Enter account email"
        />
        {errors.accountEmail && <span className="error">{errors.accountEmail.message}</span>}
      </div>

      <div className="field-group">
        <label>Password*</label>
        <input
          type="password"
          {...register('password')}
          className="form-input"
          placeholder="Enter password"
        />
        <small className="field-note">Must be at least 8 characters long</small>
        {errors.password && <span className="error">{errors.password.message}</span>}
      </div>

      <div className="field-group">
        <label>Confirm Password*</label>
        <input
          type="password"
          {...register('confirmPassword')}
          className="form-input"
          placeholder="Confirm password"
        />
        {errors.confirmPassword && <span className="error">{errors.confirmPassword.message}</span>}
      </div>
    </div>
  );
};

// Verification Documents Section Component
const VerificationDocumentsSection: React.FC<{
  uploadedDocuments: UploadedDocuments;
  onFileUpload: (field: keyof UploadedDocuments, file: File | null) => void;
}> = ({ uploadedDocuments, onFileUpload }) => (
  <div className="form-section">
    <h2>Verification Documents</h2>
    <p className="section-description">Please upload the following documents to verify your organization's legitimacy</p>

    <div className="document-upload-group">
      <label>SEC Registration Certificate*</label>
      <div className="file-upload-container">
        <input
          type="file"
          id="secCertificate"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) => onFileUpload('secCertificate', e.target.files?.[0] || null)}
          className="file-input"
        />
        <label htmlFor="secCertificate" className="file-upload-button">
          Choose File
        </label>
        <span className="file-status">
          {uploadedDocuments.secCertificate ? uploadedDocuments.secCertificate.name : 'No file chosen'}
        </span>
      </div>
    </div>

    <div className="document-upload-group">
      <label>BIR Certificate of Registration*</label>
      <div className="file-upload-container">
        <input
          type="file"
          id="birCertificate"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) => onFileUpload('birCertificate', e.target.files?.[0] || null)}
          className="file-input"
        />
        <label htmlFor="birCertificate" className="file-upload-button">
          Choose File
        </label>
        <span className="file-status">
          {uploadedDocuments.birCertificate ? uploadedDocuments.birCertificate.name : 'No file chosen'}
        </span>
      </div>
    </div>

    <div className="document-upload-group">
      <label>Other Supporting Document (Optional)</label>
      <div className="file-upload-container">
        <input
          type="file"
          id="supportingDocument"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) => onFileUpload('supportingDocument', e.target.files?.[0] || null)}
          className="file-input"
        />
        <label htmlFor="supportingDocument" className="file-upload-button">
          Choose File
        </label>
        <span className="file-status">
          {uploadedDocuments.supportingDocument ? uploadedDocuments.supportingDocument.name : 'No file chosen'}
        </span>
      </div>
    </div>
  </div>
);

// Form Footer Component
const FormFooter: React.FC<{
  register: any;
  errors: any;
  isSubmitting: boolean;
}> = ({ register, errors, isSubmitting }) => (
  <div className="form-footer">
    <div className="terms-checkbox">
      <label className="checkbox-label">
        <input
          type="checkbox"
          {...register('acceptTerms')}
          className="checkbox-input"
        />
        <span className="checkmark"></span>
        I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</a> and consent to the verification of the provided information.
      </label>
      {errors.acceptTerms && <span className="error">{errors.acceptTerms.message}</span>}
    </div>

    <button type="submit" className="submit-button" disabled={isSubmitting}>
      {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
    </button>

    <div className="what-happens-next">
      <h4>What happens next?</h4>
      <p>After submission, our team will review your application within 3-5 business days. You'll receive an email confirmation once your charity account is approved and activated.</p>
    </div>

    <a href="/login" className="skip-link">Skip for now</a>
  </div>
);

export default ApplyToCauseForm;