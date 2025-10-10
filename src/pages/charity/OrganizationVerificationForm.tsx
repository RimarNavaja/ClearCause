import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Building2, Mail, Phone, MapPin, Calendar, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import CharityLayout from '@/components/layout/CharityLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface DocumentUpload {
  type: string;
  file: File | null;
  preview: string | null;
}

const OrganizationVerificationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: '',
    description: '',
    websiteUrl: '',
    contactEmail: '',
    contactPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateProvince: '',
    postalCode: '',
    country: '',
    registrationNumber: '',
    taxId: '',
    dateEstablished: '',
  });

  // Document uploads state
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { type: 'registration_certificate', file: null, preview: null },
    { type: 'tax_exemption', file: null, preview: null },
    { type: 'representative_id', file: null, preview: null },
    { type: 'proof_of_address', file: null, preview: null },
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (index: number, file: File | null) => {
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF, JPEG, or PNG file',
        variant: 'destructive',
      });
      return;
    }

    const newDocuments = [...documents];
    newDocuments[index].file = file;
    newDocuments[index].preview = URL.createObjectURL(file);
    setDocuments(newDocuments);
  };

  const uploadDocument = async (file: File, documentType: string, verificationId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${verificationId}/${documentType}_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('verification-documents')
      .upload(fileName, file);

    if (error) throw error;

    // Store the file path instead of public URL (bucket is private)
    return { fileName: data.path, fileUrl: data.path };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit verification',
        variant: 'destructive',
      });
      return;
    }

    // Validate required documents
    const requiredDocs = ['registration_certificate', 'representative_id'];
    const missingDocs = requiredDocs.filter(type => {
      const doc = documents.find(d => d.type === type);
      return !doc?.file;
    });

    if (missingDocs.length > 0) {
      toast({
        title: 'Missing required documents',
        description: 'Please upload Registration Certificate and Representative ID',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create verification record
      const { data: verification, error: verificationError } = await supabase
        .from('charity_verifications')
        .insert({
          charity_id: user.id,
          status: 'pending',
          organization_name: formData.organizationName,
          organization_type: formData.organizationType,
          description: formData.description,
          website_url: formData.websiteUrl,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          address_line1: formData.addressLine1,
          address_line2: formData.addressLine2,
          city: formData.city,
          state_province: formData.stateProvince,
          postal_code: formData.postalCode,
          country: formData.country,
          registration_number: formData.registrationNumber,
          tax_id: formData.taxId,
          date_established: formData.dateEstablished || null,
        })
        .select()
        .single();

      if (verificationError) throw verificationError;

      // Upload documents
      for (const doc of documents) {
        if (doc.file) {
          const { fileName, fileUrl } = await uploadDocument(
            doc.file,
            doc.type,
            verification.id
          );

          // Save document record
          await supabase.from('verification_documents').insert({
            verification_id: verification.id,
            document_type: doc.type,
            document_name: doc.file.name,
            file_url: fileUrl,
            file_size: doc.file.size,
            mime_type: doc.file.type,
          });
        }
      }

      toast({
        title: 'Verification submitted successfully',
        description: 'Your application is now pending review. We will notify you once it has been reviewed.',
      });

      navigate('/charity/verification/status');
    } catch (error: any) {
      console.error('Error submitting verification:', error);
      toast({
        title: 'Submission failed',
        description: error.message || 'Failed to submit verification application',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const documentLabels: Record<string, string> = {
    registration_certificate: 'Registration Certificate *',
    tax_exemption: 'Tax Exemption Document',
    representative_id: 'Representative ID *',
    proof_of_address: 'Proof of Address',
  };

  return (
    <CharityLayout title="Organization Verification">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Organization Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Information
              </CardTitle>
              <CardDescription>
                Provide detailed information about your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name *</Label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organizationType">Organization Type *</Label>
                  <Select
                    value={formData.organizationType}
                    onValueChange={(value) => handleSelectChange('organizationType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nonprofit">Non-Profit Organization</SelectItem>
                      <SelectItem value="ngo">NGO</SelectItem>
                      <SelectItem value="foundation">Foundation</SelectItem>
                      <SelectItem value="charity">Charity</SelectItem>
                      <SelectItem value="social_enterprise">Social Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Mission Statement *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    value={formData.websiteUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.org"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateEstablished">Date Established</Label>
                  <Input
                    id="dateEstablished"
                    name="dateEstablished"
                    type="date"
                    value={formData.dateEstablished}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stateProvince">State/Province *</Label>
                    <Input
                      id="stateProvince"
                      name="stateProvince"
                      value={formData.stateProvince}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code *</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Legal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number *</Label>
                  <Input
                    id="registrationNumber"
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / EIN</Label>
                  <Input
                    id="taxId"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Uploads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Required Documents
              </CardTitle>
              <CardDescription>
                Upload required verification documents (PDF, JPEG, or PNG, max 5MB each)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.map((doc, index) => (
                <div key={doc.type} className="space-y-2">
                  <Label htmlFor={`doc-${doc.type}`}>
                    {documentLabels[doc.type]}
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id={`doc-${doc.type}`}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                      className="flex-1"
                    />
                    {doc.file && (
                      <span className="text-sm text-gray-600">
                        {doc.file.name} ({(doc.file.size / 1024).toFixed(0)} KB)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/charity/dashboard')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit for Verification
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </CharityLayout>
  );
};

export default OrganizationVerificationForm;
