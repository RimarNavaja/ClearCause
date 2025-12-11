
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Upload, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import CharityLayout from '@/components/layout/CharityLayout';
import { useAuth } from '@/hooks/useAuth';
import * as milestoneService from '@/services/milestoneService';
import { uploadFile } from '@/lib/supabase';
import { toast as sonnerToast } from 'sonner';

const SubmitProofForm: React.FC = () => {
  const { campaignId, milestoneId } = useParams<{ campaignId: string; milestoneId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // State for milestone and campaign data
  const [milestone, setMilestone] = useState<any>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State for file uploads
  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load milestone and campaign data
  useEffect(() => {
    const loadData = async () => {
      if (!milestoneId) return;

      try {
        setLoading(true);
        const result = await milestoneService.getMilestoneById(milestoneId);

        if (result.success && result.data) {
          setMilestone(result.data);
          // Campaign data should be in milestone.campaign if properly populated
          if (result.data.campaign) {
            setCampaign(result.data.campaign);
          }
        }
      } catch (error) {
        console.error('Error loading milestone:', error);
        sonnerToast.error('Failed to load milestone data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [milestoneId]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  // Remove a file from the list
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!milestoneId) {
      sonnerToast.error('Milestone ID is missing');
      return;
    }

    if (files.length === 0) {
      toast({
        title: "Error",
        description: "Please upload at least one file as proof.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload the first file to Supabase storage
      const file = files[0];
      const fileName = `milestone-proof-${milestoneId}-${Date.now()}-${file.name}`;

      console.log('[SubmitProof] Uploading file:', fileName);
      const uploadResult = await uploadFile('milestone-proofs', fileName, file);

      if (uploadResult.error || !uploadResult.url) {
        throw new Error(uploadResult.error || 'File upload failed');
      }

      console.log('[SubmitProof] File uploaded successfully:', uploadResult.url);

      // Submit the milestone proof with the uploaded file URL
      const result = await milestoneService.submitMilestoneProof(milestoneId, {
        proofUrl: uploadResult.url,
        description: notes || `Proof submission for milestone: ${milestone?.title || 'N/A'}`,
      });

      if (result.success) {
        sonnerToast.success('Proof submitted successfully!', {
          description: 'Your proof has been submitted for admin verification.',
        });
        navigate(`/charity/milestones`);
      } else {
        throw new Error(result.error?.message || 'Submission failed');
      }
    } catch (error: any) {
      console.error('[SubmitProof] Error submitting proof:', error);
      sonnerToast.error('Failed to submit proof', {
        description: error.message || 'An error occurred while submitting your proof.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CharityLayout title="Submit Milestone Proof">
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </div>
      </CharityLayout>
    );
  }

  if (!milestone) {
    return (
      <CharityLayout title="Submit Milestone Proof">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Milestone not found</p>
        </div>
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title="Submit Milestone Proof">
      {/* Back Button */}
      <Link
        to={`/charity/milestones`}
        className="inline-flex items-center mb-6 text-sm font-medium text-gray-600 hover:text-clearcause-primary"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Milestones
      </Link>

      <Card className="mb-6">
        <CardContent className="p-6 font-poppinsregular">
          <h2 className="text-xl font-robotobold">{campaign?.title || 'Campaign'}</h2>
          <p className="text-sm text-gray-500 mt-1">Submitting proof for milestone</p>

          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="font-robotobold">{milestone.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
          </div>

          <div className="mt-6">
            <h3 className="font-medium text-gray-800">Required Evidence:</h3>
            {/* <p className="text-sm text-gray-600 mt-1">
              {milestone.evidenceDescription || milestone.description || "Upload photos, receipts, or documents proving completion of this milestone."}
            </p> */}
          </div>
        </CardContent>
      </Card>
      
      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-800 mb-4">Upload Proof Documents</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 mb-4">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-2">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-clearcause-primary">
                      Upload files
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      multiple
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    Accepted file types: PNG, JPG, PDF, DOC, DOCX up to 10MB each
                  </p>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Or drag and drop files here
                </p>
              </div>
            </div>
            
            {files.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Selected Files</h4>
                <ul className="space-y-2">
                  {files.map((file, index) => (
                    <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <File className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-medium text-gray-800 mb-4">Additional Notes (Optional)</h3>
            <Textarea
              placeholder="Add any context or explanation for the verification team..."
              className="min-h-[100px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-4">
          <Link to={`/charity/milestones`}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting || files.length === 0}>
            {isSubmitting ? 'Uploading & Submitting...' : 'Submit Proof for Verification'}
          </Button>
        </div>
      </form>
    </CharityLayout>
  );
};

export default SubmitProofForm;
