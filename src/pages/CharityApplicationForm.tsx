
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Upload, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { submitCharityVerification, getDocumentTypes, uploadVerificationDocument, getCharityVerificationStatus } from '@/services/charityVerificationService';
import { uploadFile } from '@/lib/supabase';

// Stage 1+2 wizard: Organization info -> Documents -> Review & Submit

type Step = 'org' | 'docs' | 'review';

const CharityApplicationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('org');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Organization form state (Stage 2)
  const [org, setOrg] = useState({
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
    dateEstablished: ''
  });

  const [files, setFiles] = useState<Record<string, File | null>>({});
  const documentTypes = useMemo(() => getDocumentTypes().data || [], []);

  useEffect(() => {
    // If already has an application pending/approved, redirect to status page
    const checkStatus = async () => {
      if (!user?.id) return;
      try {
        const res = await getCharityVerificationStatus(user.id);
        if (res.success && res.data) {
          navigate('/signup/charity-application/status', { replace: true });
        }
      } catch {}
    };
    checkStatus();
  }, [user?.id, navigate]);

  const handleFileSelect = (docKey: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [docKey]: file }));
  };

  const next = () => setStep(prev => (prev === 'org' ? 'docs' : 'review'));
  const back = () => setStep(prev => (prev === 'review' ? 'docs' : 'org'));

  const submitApplication = async () => {
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      // 1) Submit verification metadata
      const result = await submitCharityVerification({
        organizationName: org.organizationName.trim(),
        organizationType: org.organizationType || undefined,
        description: org.description.trim(),
        websiteUrl: org.websiteUrl || undefined,
        contactEmail: org.contactEmail.trim(),
        contactPhone: org.contactPhone || undefined,
        addressLine1: org.addressLine1.trim(),
        addressLine2: org.addressLine2 || undefined,
        city: org.city.trim(),
        stateProvince: org.stateProvince.trim(),
        postalCode: org.postalCode.trim(),
        country: org.country.trim(),
        registrationNumber: org.registrationNumber.trim(),
        taxId: org.taxId || undefined,
        dateEstablished: org.dateEstablished,
      }, user.id);

      if (!result.success || !result.data) {
        toast.error(result.error || 'Failed to submit application');
        setIsSubmitting(false);
        return;
      }

      const verificationId = result.data.id;

      // 2) Upload documents to table (urls should be produced by storage uploader in your flow)
      for (const t of documentTypes) {
        const f = files[t.value];
        if (f) {
          // Upload to Supabase Storage 'documents' bucket
          const key = `charity-verifications/${user.id}/${Date.now()}-${encodeURIComponent(f.name)}`;
          const { url, error } = await uploadFile('documents', key, f, { upsert: false });
          if (error || !url) {
            toast.error(error || `Failed to upload: ${t.label}`);
            continue;
          }

          const docRes = await uploadVerificationDocument({
            verificationId,
            documentType: t.value,
            documentName: f.name,
            fileUrl: url,
            fileSize: f.size,
            mimeType: f.type,
          }, user.id);
          if (!docRes.success) {
            toast.error(docRes.error || `Failed to attach document: ${t.label}`);
          }
        } else if (t.required) {
          toast.warning(`Missing required document: ${t.label}`);
        }
      }

      toast.success('Application submitted! We will notify you after review.');
      navigate('/signup/charity-application/status', { replace: true });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow py-10 bg-clearcause-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 md:p-8">
              <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold">CauseCreator Application</h1>
                <p className="text-muted-foreground">Follow the steps to apply as an Organizer.</p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 text-sm mb-6">
                <span className={`px-2 py-1 rounded ${step==='org'?'bg-clearcause-light-blue text-clearcause-dark-blue':'bg-muted'}`}>1. Organization</span>
                <span className={`px-2 py-1 rounded ${step==='docs'?'bg-clearcause-light-blue text-clearcause-dark-blue':'bg-muted'}`}>2. Documents</span>
                <span className={`px-2 py-1 rounded ${step==='review'?'bg-clearcause-light-blue text-clearcause-dark-blue':'bg-muted'}`}>3. Review & Submit</span>
              </div>

              {step === 'org' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium">Organization Name*</label>
                      <Input value={org.organizationName} onChange={e=>setOrg({...org, organizationName:e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Organization Type</label>
                      <Input value={org.organizationType} onChange={e=>setOrg({...org, organizationType:e.target.value})} placeholder="Non-profit, Foundation, etc." />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium">Description (min 50 chars)*</label>
                      <Textarea rows={4} value={org.description} onChange={e=>setOrg({...org, description:e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Website URL</label>
                      <Input type="url" value={org.websiteUrl} onChange={e=>setOrg({...org, websiteUrl:e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Contact Email*</label>
                      <Input type="email" value={org.contactEmail} onChange={e=>setOrg({...org, contactEmail:e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Contact Phone</label>
                      <Input value={org.contactPhone} onChange={e=>setOrg({...org, contactPhone:e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Registration Number*</label>
                      <Input value={org.registrationNumber} onChange={e=>setOrg({...org, registrationNumber:e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Tax ID</label>
                      <Input value={org.taxId} onChange={e=>setOrg({...org, taxId:e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Date Established*</label>
                      <Input type="date" value={org.dateEstablished} onChange={e=>setOrg({...org, dateEstablished:e.target.value})} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium">Address Line 1*</label>
                      <Input value={org.addressLine1} onChange={e=>setOrg({...org, addressLine1:e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Address Line 2</label>
                      <Input value={org.addressLine2} onChange={e=>setOrg({...org, addressLine2:e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">City*</label>
                      <Input value={org.city} onChange={e=>setOrg({...org, city:e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">State/Province*</label>
                      <Input value={org.stateProvince} onChange={e=>setOrg({...org, stateProvince:e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Postal Code*</label>
                      <Input value={org.postalCode} onChange={e=>setOrg({...org, postalCode:e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Country*</label>
                      <Input value={org.country} onChange={e=>setOrg({...org, country:e.target.value})} required />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button onClick={next}>Continue</Button>
                  </div>
                </div>
              )}

              {step === 'docs' && (
                <div className="space-y-6">
                  <div className="bg-clearcause-muted p-3 rounded text-sm flex items-start gap-2">
                    <Info className="h-4 w-4 mt-0.5" />
                    <div>Upload the required organizational documents. You can add optional documents to speed up review.</div>
                  </div>

                  <div className="space-y-4">
                    {documentTypes.map((d) => (
                      <div key={d.value} className="border rounded p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{d.label}</p>
                            {d.required && <p className="text-xs text-red-600">Required</p>}
                          </div>
                          <label className="block">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleFileSelect(d.value, e.target.files?.[0] || null)}
                            />
                            <Button variant="outline">
                              <Upload className="h-4 w-4 mr-2" />
                              {files[d.value]?.name || 'Choose File'}
                            </Button>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={back}>Back</Button>
                    <Button onClick={next}>Review</Button>
                  </div>
                </div>
              )}

              {step === 'review' && (
                <div className="space-y-6">
                  <div className="border rounded p-4">
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <p className="text-sm text-muted-foreground">Please confirm your details before submitting.</p>
                  </div>

                  <div className="flex items-start gap-2">
                    <input id="terms" type="checkbox" className="mt-1 h-4 w-4" checked={agreeTerms} onChange={e=>setAgreeTerms(e.target.checked)} />
                    <label htmlFor="terms" className="text-sm text-muted-foreground">
                      I confirm the information is accurate and consent to verification.
                    </label>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={back}>Back</Button>
                    <Button onClick={submitApplication} disabled={!agreeTerms || isSubmitting}>
                      {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Submitting...</>) : 'Submit Application'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CharityApplicationForm;
