
import React, { useState, useEffect } from 'react';
import {
  Building,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  Save,
  Upload,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import CharityLayout from '@/components/layout/CharityLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import ProfileImageUpload from '@/components/ui/ProfileImageUpload';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import * as charityService from '@/services/charityService';
import { CharityRegistrationData } from '@/lib/types';
import { charityProfileSchema } from '@/utils/validation';
import { getCharityVerificationData } from '@/services/charityService';

// Form schema
const formSchema = charityProfileSchema;
type FormData = z.infer<typeof formSchema>;

interface DocumentFile {
  id: string;
  name: string;
  type: string;
  uploadDate: Date;
  status: 'Verified' | 'Pending' | 'Expired';
  url: string;
}

const OrganizationProfile: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [charityId, setCharityId] = useState<string | null>(null);

  const [charityData, setCharityData] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [registrationNumber, setRegistrationNumber] = useState<string>('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationName: '',
      description: '',
      websiteUrl: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      registrationNumber: '',
      contactPersonName: '',
      contactPersonEmail: '',
      contactPersonPhone: '',
    },
  });

  // Load existing charity data
  useEffect(() => {
    const loadCharityData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Load charity data
        const result = await charityService.getCharityByUserId(user.id);

        if (result.success && result.data) {
          const charity = result.data;
          setCharityId(charity.id);
          setCharityData(charity);

          // Load verification data (registration number and documents)
          const verificationResult = await getCharityVerificationData(user.id);

          if (verificationResult.success && verificationResult.data) {
            const { registrationNumber: regNum, documents: verificationDocs } = verificationResult.data;
            setRegistrationNumber(regNum || '');
            setDocuments(verificationDocs || []);
          }

          form.reset({
            organizationName: charity.organizationName || '',
            description: charity.description || '',
            websiteUrl: charity.websiteUrl || '',
            contactEmail: charity.contactEmail || user.email || '',
            contactPhone: charity.contactPhone || '',
            address: charity.address || '',
            registrationNumber: verificationResult.data?.registrationNumber || '',
            contactPersonName: user.fullName || '',
            contactPersonEmail: charity.contactEmail || user.email || '',
            contactPersonPhone: charity.contactPhone || '',
          });
        }
      } catch (error) {
        console.error('Failed to load charity data:', error);
        toast({
          title: "Error",
          description: "Failed to load organization data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadCharityData();
  }, [user, toast, form]);

  const handleSaveChanges = async (data: FormData) => {
    if (!user || !charityId) {
      toast({
        title: "Error",
        description: "You must be logged in with a charity organization to save changes.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Map form data to API format
      const updateData: Partial<CharityRegistrationData> = {
        organizationName: data.organizationName,
        description: data.description,
        websiteUrl: data.websiteUrl,
        phone: data.contactPhone,
        address: data.address,
      };

      const result = await charityService.updateCharity(charityId, updateData, user.id);

      if (result.success) {
        setCharityData(result.data);
        toast({
          title: "Success",
          description: "Organization profile updated successfully.",
        });
      }
    } catch (error) {
      console.error('Failed to save organization profile:', error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to save organization profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!user || !charityId) {
      return { success: false, error: 'User not authenticated or charity not found' };
    }

    try {
      const result = await charityService.uploadCharityLogo(charityId, file, user.id);

      if (result.success && result.data) {
        // Update local charity state
        setCharityData((prev: any) => ({
          ...prev,
          logoUrl: result.data?.logoUrl,
        }));
        return { success: true, url: result.data.logoUrl };
      } else {
        return { success: false, error: result.error || 'Upload failed' };
      }
    } catch (error) {
      console.error('Logo upload error:', error);
      return { success: false, error: 'Upload failed' };
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newDoc: DocumentFile = {
        id: `new-${Date.now()}`,
        name: file.name,
        type: 'New Document', // This would typically be selected by the user
        uploadDate: new Date(),
        status: 'Pending',
        url: '#'
      };
      
      setDocuments(prev => [...prev, newDoc]);
      // Reset the file input
      e.target.value = '';
    }
  };
  
  if (loading && !charityData) {
    return (
      <CharityLayout title="Organization Profile">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clearcause-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading organization profile...</p>
          </div>
        </div>
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title="Organization Profile">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Logo Upload Section */}
        <div className="lg:col-span-1">
          <ProfileImageUpload
            currentImageUrl={charityData?.logoUrl}
            onImageUpload={handleLogoUpload}
            fallbackText={charityData?.organizationName ? charityData.organizationName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'ORG'}
            imageType="logo"
            size="lg"
          />
        </div>

        {/* Form Section */}
        <div className="lg:col-span-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveChanges)} className="space-y-8">
              {/* Organization Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Organization Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="organizationName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Organization Name"
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="registrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., SEC Registration Number"
                              disabled={true}
                              className="bg-gray-50"
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            This is from your verification documents and cannot be changed here.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Website</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., https://example.org"
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="e.g., info@example.org"
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Phone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="e.g., +63 2 8123 4567"
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mission Statement / About Us</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Describe your organization's mission and purpose"
                            rows={4}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complete Address</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Complete organization address (Street, City, Province, Postal Code)"
                            rows={3}
                            disabled={loading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
        </Card>
        
              {/* Primary Contact Person Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Primary Contact Person
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactPersonName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Contact Person's Name"
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPersonEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="Contact Person's Email"
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPersonPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Contact Person's Phone"
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
        
        {/* Verification Documents Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Verification Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                These documents were used during onboarding. Upload updated documents if necessary.
              </p>
              
              <div className="border rounded-md divide-y">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-start space-x-3">
                      <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{doc.type}</p>
                        <p className="text-xs text-gray-500">{doc.name} - Uploaded {format(doc.uploadDate, 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline" 
                        className={
                          doc.status === 'Verified' 
                            ? 'text-green-600 border-green-200 bg-green-50' 
                            : doc.status === 'Pending' 
                              ? 'text-amber-600 border-amber-200 bg-amber-50'
                              : 'text-red-600 border-red-200 bg-red-50'
                        }
                      >
                        {doc.status}
                      </Badge>
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">View</a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-2">
              <Label htmlFor="new-document" className="mb-2 block">Upload New/Updated Document</Label>
              <div className="flex gap-2">
                <Input 
                  id="new-document" 
                  type="file" 
                  className="max-w-sm" 
                  onChange={handleFileUpload}
                />
                <Button type="button" variant="outline">
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
              {/* Save Button */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={loading}
                >
                  Reset Changes
                </Button>
                <Button type="submit" className="min-w-[120px]" disabled={loading}>
                  <Save className="h-4 w-4 mr-1" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </CharityLayout>
  );
};

export default OrganizationProfile;
