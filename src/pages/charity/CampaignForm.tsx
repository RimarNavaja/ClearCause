
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Upload, Check, Info, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import CharityLayout from '@/components/layout/CharityLayout';
import * as campaignService from '@/services/campaignService';
import { CampaignCreateData } from '@/lib/types';

// TypeScript interfaces
interface Milestone {
  id: string;
  title: string;
  amount: number;
  evidenceDescription: string;
}

const CampaignForm: React.FC = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditMode = !!campaignId;
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignImage, setCampaignImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [campaignDetails, setCampaignDetails] = useState({
    title: '',
    description: '',
    category: '',
    goal: '',
    endDate: '',
  });
  
  const [milestones, setMilestones] = useState<Milestone[]>([
    { id: '1', title: '', amount: 0, evidenceDescription: '' }
  ]);

  // For edit mode, fetch existing campaign data
  useEffect(() => {
    const loadCampaignData = async () => {
      if (isEditMode && campaignId && user) {
        try {
          setLoading(true);
          const result = await campaignService.getCampaignById(campaignId, true);

          if (result.success && result.data) {
            const campaign = result.data;

            setCampaignDetails({
              title: campaign.title,
              description: campaign.description,
              category: campaign.category || '',
              goal: campaign.goalAmount.toString(),
              endDate: campaign.endDate || '',
            });

            if (campaign.milestones) {
              setMilestones(campaign.milestones.map((milestone, index) => ({
                id: milestone.id || (index + 1).toString(),
                title: milestone.title,
                amount: milestone.targetAmount,
                evidenceDescription: milestone.evidenceDescription || '',
              })));
            }

            if (campaign.imageUrl) {
              setImagePreview(campaign.imageUrl);
            }
          }
        } catch (error) {
          console.error('Failed to load campaign data:', error);
          toast({
            title: "Error",
            description: "Failed to load campaign data. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    loadCampaignData();
  }, [isEditMode, campaignId, user, toast]);

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCampaignDetails(prev => ({ ...prev, [name]: value }));
  };

  // Handle milestone changes
  const handleMilestoneChange = (index: number, field: keyof Milestone, value: string | number) => {
    const updatedMilestones = [...milestones];
    updatedMilestones[index] = { ...updatedMilestones[index], [field]: value };
    setMilestones(updatedMilestones);
  };

  // Add a new milestone
  const addMilestone = () => {
    setMilestones([...milestones, { id: Date.now().toString(), title: '', amount: 0, evidenceDescription: '' }]);
  };

  // Remove a milestone
  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      const updatedMilestones = [...milestones];
      updatedMilestones.splice(index, 1);
      setMilestones(updatedMilestones);
    }
  };

  // Handle campaign image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCampaignImage(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (isDraft: boolean = false) => {
    setLoading(true);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Map form data to API format
      const campaignData: CampaignCreateData = {
        title: campaignDetails.title,
        description: campaignDetails.description,
        goalAmount: Number(campaignDetails.goal),
        imageFile: campaignImage || undefined,
        endDate: campaignDetails.endDate || undefined,
        category: campaignDetails.category || undefined,
        milestones: milestones.map(milestone => ({
          title: milestone.title,
          description: milestone.evidenceDescription,
          targetAmount: Number(milestone.amount),
          evidenceDescription: milestone.evidenceDescription,
        })),
      };

      if (isEditMode) {
        // Update existing campaign
        const result = await campaignService.updateCampaign(
          campaignId!,
          { ...campaignData, status: isDraft ? 'draft' : 'active' },
          user.id
        );

        if (result.success) {
          toast({
            title: "Campaign Updated",
            description: "Your campaign has been updated successfully.",
          });
          navigate('/charity/campaigns');
        }
      } else {
        // Create new campaign
        const result = await campaignService.createCampaign(campaignData, user.id);

        if (result.success) {
          toast({
            title: isDraft ? "Draft Saved" : "Campaign Created",
            description: isDraft
              ? "Your campaign draft has been saved."
              : "Your campaign has been submitted for review.",
          });
          navigate('/charity/campaigns');
        }
      }
    } catch (error) {
      console.error('Campaign submission error:', error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to save campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Navigate between form steps
  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // Calculate total milestone amount
  const totalMilestoneAmount = milestones.reduce((sum, milestone) => sum + Number(milestone.amount), 0);
  const goalAmount = Number(campaignDetails.goal) || 0;
  const milestoneAmountError = goalAmount > 0 && totalMilestoneAmount !== goalAmount;

  return (
    <CharityLayout title={isEditMode ? "Edit Campaign" : "Create New Campaign"}>
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex flex-col items-center">
              <div 
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep === step 
                    ? 'border-clearcause-primary bg-clearcause-primary text-white' 
                    : currentStep > step 
                      ? 'border-clearcause-primary text-clearcause-primary'
                      : 'border-gray-300 text-gray-400'
                }`}
              >
                {currentStep > step ? <Check className="w-5 h-5" /> : step}
              </div>
              <span className={`text-xs mt-2 ${currentStep >= step ? 'text-gray-700' : 'text-gray-400'}`}>
                {step === 1 && 'Campaign Details'}
                {step === 2 && 'Funding Goal'}
                {step === 3 && 'Define Milestones'}
                {step === 4 && 'Evidence Requirements'}
              </span>
            </div>
          ))}
        </div>
        <div className="relative mt-2">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-full">
            <div 
              className="h-1 bg-clearcause-primary rounded-full transition-all"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Step 1: Campaign Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Campaign Details</h2>
              <p className="text-gray-600">Provide the basic information about your campaign.</p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Title*
                  </label>
                  <Input 
                    id="title" 
                    name="title" 
                    value={campaignDetails.title} 
                    onChange={handleInputChange} 
                    placeholder="Enter a compelling title for your campaign"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Description*
                  </label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    value={campaignDetails.description} 
                    onChange={handleInputChange} 
                    placeholder="Describe your campaign's purpose, impact, and why people should donate"
                    rows={6}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Category*
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={campaignDetails.category}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:outline-none focus:ring-clearcause-primary focus:border-clearcause-primary sm:text-sm"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="education">Education</option>
                    <option value="health">Healthcare</option>
                    <option value="environment">Environment</option>
                    <option value="disaster">Disaster Relief</option>
                    <option value="community">Community Development</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Image/Video*
                  </label>
                  <div className="mt-1 border-2 border-dashed border-gray-300 rounded-md px-6 pt-5 pb-6">
                    <div className="space-y-1 text-center">
                      {imagePreview ? (
                        <div className="mb-4">
                          <img 
                            src={imagePreview} 
                            alt="Campaign preview" 
                            className="mx-auto h-64 object-cover rounded-md"
                          />
                        </div>
                      ) : (
                        <div className="flex justify-center">
                          <Upload className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      <div className="flex text-sm text-gray-600 justify-center">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md bg-white font-medium text-clearcause-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-clearcause-primary focus-within:ring-offset-2 hover:text-clearcause-secondary"
                        >
                          <span>{imagePreview ? 'Replace image' : 'Upload an image'}</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 5MB (1200x800px recommended)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Funding Goal */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Funding Goal</h2>
              <p className="text-gray-600">Set your campaign's financial target and timeline.</p>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">
                    Target Funding Amount (PHP)*
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">₱</span>
                    </div>
                    <Input
                      type="number"
                      name="goal"
                      id="goal"
                      className="pl-8"
                      value={campaignDetails.goal}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      step="1000"
                      required
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    This is the total amount you aim to raise for your project.
                  </p>
                </div>
                
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign End Date (Optional)
                  </label>
                  <Input
                    type="date"
                    name="endDate"
                    id="endDate"
                    value={campaignDetails.endDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    If not set, your campaign will run until you manually close it.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Define Milestones */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Define Milestones</h2>
              <p className="text-gray-600">Break down your project into verifiable steps. The sum of milestone amounts should equal your total funding goal.</p>
              
              {milestoneAmountError && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
                  <div className="flex">
                    <Info className="h-5 w-5 text-yellow-400 mr-2" />
                    <span>
                      The sum of milestone amounts ({new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalMilestoneAmount)}) 
                      doesn't match your total funding goal ({new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(goalAmount)}).
                    </span>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                {milestones.map((milestone, index) => (
                  <div key={milestone.id} className="border rounded-md p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">Milestone {index + 1}</h3>
                      {milestones.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeMilestone(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Milestone Title/Description*
                        </label>
                        <Input
                          value={milestone.title}
                          onChange={(e) => handleMilestoneChange(index, 'title', e.target.value)}
                          placeholder="e.g., Initial Assessment, Purchase Equipment"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount for this Milestone (PHP)*
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">₱</span>
                          </div>
                          <Input
                            type="number"
                            className="pl-8"
                            value={milestone.amount}
                            onChange={(e) => handleMilestoneChange(index, 'amount', Number(e.target.value))}
                            placeholder="0.00"
                            min="0"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMilestone}
                  className="w-full py-2"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Another Milestone
                </Button>
                
                <div className="flex justify-between items-center py-2 border-t">
                  <span className="font-medium">Total:</span>
                  <span className={`font-bold ${milestoneAmountError ? 'text-yellow-600' : 'text-green-600'}`}>
                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalMilestoneAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 4: Set Evidence Requirements */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Set Evidence Requirements</h2>
              <p className="text-gray-600">Specify what proof will be required for ClearCause to verify each milestone. Clear requirements help build donor trust.</p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800 mb-6">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
                  <span>
                    Good evidence examples include: receipts, photographs, official documents, videos of completed work, beneficiary testimonials, etc.
                  </span>
                </div>
              </div>
              
              <div className="space-y-6">
                {milestones.map((milestone, index) => (
                  <div key={milestone.id} className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">Milestone {index + 1}: {milestone.title || 'Untitled'}</h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Required Evidence Description*
                      </label>
                      <Textarea
                        value={milestone.evidenceDescription}
                        onChange={(e) => handleMilestoneChange(index, 'evidenceDescription', e.target.value)}
                        placeholder="Describe what evidence you will provide to verify this milestone was completed (e.g., receipts, photos, documents)"
                        rows={3}
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-5 border-t">
            {currentStep > 1 ? (
              <Button type="button" variant="outline" onClick={goToPreviousStep}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Previous Step
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => navigate('/charity/campaigns')}>
                Cancel
              </Button>
            )}
            
            <div className="space-x-2">
              {currentStep < 4 ? (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                  >
                    Save as Draft
                  </Button>
                  <Button 
                    type="button" 
                    onClick={goToNextStep}
                  >
                    Next Step <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                  >
                    Save as Draft
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => handleSubmit(false)}
                    disabled={loading || milestoneAmountError}
                    className="bg-clearcause-accent hover:bg-clearcause-accent/90"
                  >
                    {loading ? 'Submitting...' : isEditMode ? 'Update Campaign' : 'Submit Campaign for Review'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </CharityLayout>
  );
};

export default CampaignForm;
