
import React, { useState } from 'react';
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
import CharityLayout from '@/components/layout/CharityLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface DocumentFile {
  id: string;
  name: string;
  type: string;
  uploadDate: Date;
  status: 'Verified' | 'Pending' | 'Expired';
  url: string;
}

const SAMPLE_DOCUMENTS: DocumentFile[] = [
  {
    id: '1',
    name: 'SEC_Registration_Certificate.pdf',
    type: 'SEC Registration Certificate',
    uploadDate: new Date('2023-01-15'),
    status: 'Verified',
    url: '#'
  },
  {
    id: '2',
    name: 'BIR_Certificate.pdf',
    type: 'BIR Certificate of Registration',
    uploadDate: new Date('2023-01-15'),
    status: 'Verified',
    url: '#'
  },
  {
    id: '3',
    name: 'Board_Resolution.pdf',
    type: 'Board Resolution',
    uploadDate: new Date('2023-03-10'),
    status: 'Verified',
    url: '#'
  },
  {
    id: '4',
    name: 'Financial_Statement_2023.pdf',
    type: 'Financial Statement',
    uploadDate: new Date('2023-07-20'),
    status: 'Pending',
    url: '#'
  }
];

const OrganizationProfile: React.FC = () => {
  const [orgInfo, setOrgInfo] = useState({
    name: 'Water For All Foundation',
    regNumber: 'SEC-123456789',
    taxId: 'TIN-987654321',
    mission: 'Water For All Foundation is committed to providing clean, safe drinking water to communities in need around the world. We believe that access to clean water is a fundamental human right that plays a critical role in public health, education, and economic development.',
    address: {
      street: '123 Clean Water St.',
      city: 'Makati City',
      province: 'Metro Manila',
      postalCode: '1200'
    },
    website: 'https://waterforall.org',
    email: 'info@waterforall.org',
    phone: '+63 2 8123 4567'
  });

  const [contactPerson, setContactPerson] = useState({
    name: 'Juan Dela Cruz',
    email: 'juan@waterforall.org',
    phone: '+63 917 123 4567'
  });
  
  const [documents, setDocuments] = useState<DocumentFile[]>(SAMPLE_DOCUMENTS);
  
  const handleOrgInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setOrgInfo(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as object,
          [child]: value
        }
      }));
    } else {
      setOrgInfo(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactPerson(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would submit the changes to the backend
    // TODO: Implement API call to save organization profile
    // Show success message
    alert('Profile changes saved successfully');
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
  
  return (
    <CharityLayout title="Organization Profile">
      <form onSubmit={handleSaveChanges} className="space-y-8">
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
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={orgInfo.name} 
                  onChange={handleOrgInfoChange} 
                  placeholder="Organization Name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="regNumber">Registration Number</Label>
                <Input 
                  id="regNumber" 
                  name="regNumber" 
                  value={orgInfo.regNumber} 
                  onChange={handleOrgInfoChange} 
                  placeholder="e.g., SEC Registration Number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax Identification Number</Label>
                <Input 
                  id="taxId" 
                  name="taxId" 
                  value={orgInfo.taxId} 
                  onChange={handleOrgInfoChange} 
                  placeholder="e.g., BIR TIN"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">Organization Website</Label>
                <Input 
                  id="website" 
                  name="website" 
                  value={orgInfo.website} 
                  onChange={handleOrgInfoChange} 
                  placeholder="e.g., https://example.org"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Organization Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={orgInfo.email} 
                  onChange={handleOrgInfoChange} 
                  placeholder="e.g., info@example.org"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Organization Phone</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={orgInfo.phone} 
                  onChange={handleOrgInfoChange} 
                  placeholder="e.g., +63 2 8123 4567"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mission">Mission Statement / About Us</Label>
              <Textarea 
                id="mission" 
                name="mission" 
                value={orgInfo.mission} 
                onChange={handleOrgInfoChange} 
                placeholder="Describe your organization's mission and purpose"
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address.street">Street Address</Label>
                <Input 
                  id="address.street" 
                  name="address.street" 
                  value={orgInfo.address.street} 
                  onChange={handleOrgInfoChange} 
                  placeholder="Street Address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address.city">City</Label>
                <Input 
                  id="address.city" 
                  name="address.city" 
                  value={orgInfo.address.city} 
                  onChange={handleOrgInfoChange} 
                  placeholder="City"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address.province">Province/Region</Label>
                <Input 
                  id="address.province" 
                  name="address.province" 
                  value={orgInfo.address.province} 
                  onChange={handleOrgInfoChange} 
                  placeholder="Province or Region"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address.postalCode">Postal Code</Label>
                <Input 
                  id="address.postalCode" 
                  name="address.postalCode" 
                  value={orgInfo.address.postalCode} 
                  onChange={handleOrgInfoChange} 
                  placeholder="Postal Code"
                />
              </div>
            </div>
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
              <div className="space-y-2">
                <Label htmlFor="contactName">Full Name</Label>
                <Input 
                  id="contactName" 
                  name="name" 
                  value={contactPerson.name} 
                  onChange={handleContactChange} 
                  placeholder="Contact Person's Name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email Address</Label>
                <Input 
                  id="contactEmail" 
                  name="email" 
                  type="email" 
                  value={contactPerson.email} 
                  onChange={handleContactChange} 
                  placeholder="Contact Person's Email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone Number</Label>
                <Input 
                  id="contactPhone" 
                  name="phone" 
                  value={contactPerson.phone} 
                  onChange={handleContactChange} 
                  placeholder="Contact Person's Phone"
                />
              </div>
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
        <div className="flex justify-end">
          <Button type="submit" className="min-w-[120px]">
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        </div>
      </form>
    </CharityLayout>
  );
};

export default OrganizationProfile;
