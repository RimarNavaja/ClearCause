import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  FileText,
  Building2,
  Mail,
  MapPin,
  Hash,
  ShieldCheck,
  Link as LinkIcon,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import CharityLayout from "@/components/layout/CharityLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  submitCharityVerification,
  uploadVerificationDocument,
  charityVerificationSchema,
} from "@/services/charityVerificationService";
import { REGIONS, PROVINCES, CITIES } from "@/lib/ph-locations";
import { z } from "zod";

interface DocumentUpload {
  type: string;
  label: string;
  description: string;
  required: boolean;
  file: File | null;
  preview: string | null;
}

const OrganizationVerificationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    organizationName: "",
    organizationType: "",
    description: "",
    contactEmail: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    stateProvince: "",
    postalCode: "",
    country: "Philippines",
    dateEstablished: "",

    // Enhanced Validation Fields
    secRegistrationNumber: "",
    birRegistrationNumber: "",
    dswdLicenseNumber: "",
    dswdLicenseExpiry: "",
    pcncAccreditationNumber: "",
  });

  // Regulatory Documents State
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    {
      type: "sec_certificate",
      label: "SEC Certificate of Incorporation",
      description: "Proof of legal existence (SEC Reg. No).",
      required: true,
      file: null,
      preview: null,
    },
    {
      type: "bir_registration",
      label: "BIR Certificate (Form 2303)",
      description: "Proof of tax registration.",
      required: true,
      file: null,
      preview: null,
    },
    {
      type: "dswd_license",
      label: "DSWD License to Operate",
      description: "Required for Social Welfare Agencies (RA 10847).",
      required: false,
      file: null,
      preview: null,
    },
    {
      type: "pcnc_accreditation",
      label: "PCNC Accreditation",
      description: "Council for NGO Certification (Seal of Good Housekeeping).",
      required: false,
      file: null,
      preview: null,
    },
    {
      type: "representative_id",
      label: "Authorized Representative ID",
      description: "Government-issued ID of the person applying.",
      required: true,
      file: null,
      preview: null,
    },
  ]);

  const validateForm = () => {
    try {
      // Create a temporary object that excludes empty optional strings to handle them correctly with Zod's .optional()
      // or ensure the schema handles empty strings. The current schema handles optional().or(z.literal('')) for some.
      // We'll trust the schema's definitions.
      charityVerificationSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);

        // Toast for visibility
        toast({
          title: "Validation Error",
          description: "Please check the form for errors.",
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Restriction for Postal Code: Allow only numbers
    if (name === 'postalCode' && !/^\d*$/.test(value)) {
      return; 
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (index: number, file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Max 5MB per file",
        variant: "destructive",
      });
      return;
    }
    const newDocuments = [...documents];
    newDocuments[index].file = file;
    newDocuments[index].preview = URL.createObjectURL(file);
    setDocuments(newDocuments);
  };

  const uploadFileToStorage = async (
    file: File,
    docType: string,
    verificationId: string
  ) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${verificationId}/${docType}_${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from("verification-documents")
      .upload(fileName, file);
    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from("verification-documents").getPublicUrl(data.path);
    return { path: data.path, fullPath: data.fullPath, publicUrl };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Run Zod validation
    if (!validateForm()) {
      return;
    }

    // Validate Required Documents
    const missingDocs = documents.filter((d) => d.required && !d.file);
    if (missingDocs.length > 0) {
      toast({
        title: "Missing Documents",
        description: `Please upload: ${missingDocs
          .map((d) => d.label)
          .join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Validate DSWD Logic: If License Number is provided, File is required (and vice versa)
    const dswdDoc = documents.find((d) => d.type === "dswd_license");
    if (formData.dswdLicenseNumber && !dswdDoc?.file) {
      toast({
        title: "Missing DSWD Document",
        description: "You provided a DSWD License Number but no document.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Submit Data
      const { data: verification, error } = await submitCharityVerification(
        formData,
        user.id
      );
      if (error || !verification) throw error;

      // 2. Upload Documents
      for (const doc of documents) {
        if (doc.file) {
          const { publicUrl } = await uploadFileToStorage(
            doc.file,
            doc.type,
            verification.id
          );

          await uploadVerificationDocument(
            {
              verificationId: verification.id,
              documentType: doc.type,
              documentName: doc.file.name,
              fileUrl: publicUrl,
              fileSize: doc.file.size,
              mimeType: doc.file.type,
            },
            user.id
          );
        }
      }

      toast({
        title: "Application Submitted",
        description: "Your application is under strict compliance review.",
      });
      navigate("/charity/verification/status");
    } catch (error: any) {
      console.error("Submission Error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CharityLayout title="Verification">
      <div className="max-w-7xl mx-auto space-y-6 pb-10">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTitle className="text-blue-800 font-poppinsregular">
            Compliance & Transparency
          </AlertTitle>
          <AlertDescription className="text-blue-700">
            ClearCause enforces strict validation. We cross-reference your
            submissions with
            <strong> SEC, DSWD, and PCNC</strong>. Please ensure all licenses
            are valid and not expired.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 1. Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 font-robotobold">
                {" "}
                Organization Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Organization Name *</Label>
                <Input
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  required
                  className={errors.organizationName ? "border-red-500" : ""}
                />
                {errors.organizationName && (
                  <p className="text-xs text-red-500">
                    {errors.organizationName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Organization Type</Label>
                <Select
                  onValueChange={(val) =>
                    handleSelectChange("organizationType", val)
                  }
                  value={formData.organizationType}
                >
                  <SelectTrigger
                    className={errors.organizationType ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_profit_corp">
                      Non-Stock Non-Profit Corp (SEC)
                    </SelectItem>
                    <SelectItem value="foundation">Foundation</SelectItem>
                    <SelectItem value="cooperative">Cooperative</SelectItem>
                    <SelectItem value="association">Association</SelectItem>
                  </SelectContent>
                </Select>
                {errors.organizationType && (
                  <p className="text-xs text-red-500">
                    {errors.organizationType}
                  </p>
                )}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Mission Statement</Label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && (
                  <p className="text-xs text-red-500">{errors.description}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Contact Email *</Label>
                <Input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  required
                  className={errors.contactEmail ? "border-red-500" : ""}
                />
                {errors.contactEmail && (
                  <p className="text-xs text-red-500">{errors.contactEmail}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Date Established</Label>
                <Input
                  type="date"
                  name="dateEstablished"
                  value={formData.dateEstablished}
                  onChange={handleInputChange}
                  required
                  className={errors.dateEstablished ? "border-red-500" : ""}
                />
                {errors.dateEstablished && (
                  <p className="text-xs text-red-500">
                    {errors.dateEstablished}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Regulatory Compliance (ENHANCED) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 font-robotobold">
                Regulatory Compliance
              </CardTitle>
              <CardDescription>
                Enter your registration details for automatic validity checks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* SEC & BIR */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>SEC Registration No. *</Label>
                  <Input
                    name="secRegistrationNumber"
                    placeholder="e.g., CN202312345"
                    value={formData.secRegistrationNumber}
                    onChange={handleInputChange}
                    required
                    className={
                      errors.secRegistrationNumber ? "border-red-500" : ""
                    }
                  />
                  {errors.secRegistrationNumber && (
                    <p className="text-xs text-red-500">
                      {errors.secRegistrationNumber}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Found on your Certificate of Incorporation
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>BIR Certificate No. (Tax ID) *</Label>
                  <Input
                    name="birRegistrationNumber"
                    placeholder="e.g., 000-123-456-000"
                    value={formData.birRegistrationNumber}
                    onChange={handleInputChange}
                    required
                    className={
                      errors.birRegistrationNumber ? "border-red-500" : ""
                    }
                  />
                  {errors.birRegistrationNumber && (
                    <p className="text-xs text-red-500">
                      {errors.birRegistrationNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* DSWD & PCNC */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    DSWD License No.
                    <span className="text-xs font-normal text-muted-foreground">
                      (If applicable)
                    </span>
                  </Label>
                  <Input
                    name="dswdLicenseNumber"
                    placeholder="e.g., DSWD-SB-L-000123"
                    value={formData.dswdLicenseNumber}
                    onChange={handleInputChange}
                    className={errors.dswdLicenseNumber ? "border-red-500" : ""}
                  />
                  {errors.dswdLicenseNumber && (
                    <p className="text-xs text-red-500">
                      {errors.dswdLicenseNumber}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>DSWD License Expiry</Label>
                  <Input
                    type="date"
                    name="dswdLicenseExpiry"
                    value={formData.dswdLicenseExpiry}
                    onChange={handleInputChange}
                    className={errors.dswdLicenseExpiry ? "border-red-500" : ""}
                  />
                  {errors.dswdLicenseExpiry && (
                    <p className="text-xs text-red-500">
                      {errors.dswdLicenseExpiry}
                    </p>
                  )}

                  {/* <p className="text-xs text-orange-600">We track this to ensure you stay compliant.</p> */}
                </div>

                <div className="space-y-2">
                  <Label>PCNC Accreditation No.</Label>
                  <Input
                    name="pcncAccreditationNumber"
                    placeholder="Optional"
                    value={formData.pcncAccreditationNumber}
                    onChange={handleInputChange}
                    className={
                      errors.pcncAccreditationNumber ? "border-red-500" : ""
                    }
                  />
                  {errors.pcncAccreditationNumber && (
                    <p className="text-xs text-red-500">
                      {errors.pcncAccreditationNumber}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 font-robotobold">
                {" "}
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="col-span-2 space-y-2">
                <Label>Street Address</Label>
                <Input
                  name="addressLine1"
                  placeholder="Street Address *"
                  value={formData.addressLine1}
                  onChange={handleInputChange}
                  required
                  className={errors.addressLine1 ? "border-red-500" : ""}
                />
                {errors.addressLine1 && (
                  <p className="text-xs text-red-500">{errors.addressLine1}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Region</Label>
                <Select
                  onValueChange={(val) => {
                    setFormData((prev) => ({
                      ...prev,
                      region: val,
                      stateProvince: "",
                      city: "",
                    }));
                    if (errors.region)
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.region;
                        return n;
                      });
                  }}
                  value={formData.region}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Province</Label>
                <Select
                  disabled={!formData.region}
                  onValueChange={(val) => {
                    setFormData((prev) => ({
                      ...prev,
                      stateProvince: val,
                      city: "",
                    }));
                    if (errors.stateProvince)
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.stateProvince;
                        return n;
                      });
                  }}
                  value={formData.stateProvince}
                >
                  <SelectTrigger
                    className={errors.stateProvince ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select Province" />
                  </SelectTrigger>
                  <SelectContent>
                    {(PROVINCES[formData.region] || []).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.stateProvince && (
                  <p className="text-xs text-red-500">{errors.stateProvince}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>City / Municipality</Label>
                {CITIES[formData.stateProvince] ? (
                  <Select
                    onValueChange={(val) => {
                      setFormData((prev) => ({ ...prev, city: val }));
                      if (errors.city)
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.city;
                          return n;
                        });
                    }}
                    value={formData.city}
                  >
                    <SelectTrigger
                      className={errors.city ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES[formData.stateProvince].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    name="city"
                    placeholder="City *"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    disabled={!formData.stateProvince}
                    className={errors.city ? "border-red-500" : ""}
                  />
                )}
                {errors.city && (
                  <p className="text-xs text-red-500">{errors.city}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Postal Code</Label>
                <Input
                  name="postalCode"
                  placeholder="Zip Code *"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  required
                  className={errors.postalCode ? "border-red-500" : ""}
                />
                {errors.postalCode && (
                  <p className="text-xs text-red-500">{errors.postalCode}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Country</Label>
                <Input name="country" disabled value="Philippines" />
              </div>
            </CardContent>
          </Card>

          {/* 4. Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 font-robotobold">
                {" "}
                Evidence Upload
              </CardTitle>
              <CardDescription>
                Upload clear scans (PDF/JPG). Max 5MB each.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {documents.map((doc, idx) => (
                <div
                  key={doc.type}
                  className="flex flex-col sm:flex-row gap-4 items-start border-b pb-4 last:border-0"
                >
                  <div className="flex-1 space-y-1">
                    <Label className="text-base font-medium">
                      {doc.label}{" "}
                      {doc.required && <span className="text-red-500">*</span>}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {doc.description}
                    </p>
                  </div>
                  <div className="w-full sm:w-1/2">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) =>
                        handleFileChange(idx, e.target.files?.[0] || null)
                      }
                    />
                    {doc.file && (
                      <p className="text-xs text-green-600 mt-1 truncate">
                        ✓ Selected: {doc.file.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate("/charity/dashboard")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-700 hover:bg-blue-600"
            >
              {isSubmitting
                ? "Submitting Compliance Check..."
                : "Submit for Verification"}
            </Button>
          </div>
        </form>
      </div>
    </CharityLayout>
  );
};

export default OrganizationVerificationForm;
