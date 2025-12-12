
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Image, X, Send, Type, FileText, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import CharityLayout from '@/components/layout/CharityLayout';
import { createCampaignUpdate, getCampaignById } from '@/services/campaignService';
import { getMilestones } from '@/services/milestoneService';

interface Campaign {
  id: string;
  title: string;
  description: string;
  organizationName: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  isCompleted: boolean;
}

const PostImpactUpdate: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data state
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [updateType, setUpdateType] = useState<'milestone' | 'impact' | 'general'>('general');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load campaign and milestone data
  useEffect(() => {
    const loadData = async () => {
      if (!campaignId || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Load campaign data
        const campaignResult = await getCampaignById(campaignId);
        console.log('[PostImpactUpdate] Campaign result:', campaignResult);

        if (campaignResult.success && campaignResult.data) {
          const charityName = campaignResult.data.charity?.organizationName || 'Unknown Organization';

          setCampaign({
            id: campaignResult.data.id,
            title: campaignResult.data.title,
            description: campaignResult.data.description,
            organizationName: charityName,
          });
        } else {
          console.error('[PostImpactUpdate] Failed to load campaign:', campaignResult.error);
          toast.error(campaignResult.error || 'Failed to load campaign');
        }

        // Load milestones
        const milestonesResult = await getMilestones(campaignId);
        if (milestonesResult.success && milestonesResult.data) {
          setMilestones(milestonesResult.data.map((m: any) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            targetAmount: m.targetAmount,
            isCompleted: m.isCompleted,
          })));
        }
      } catch (error) {
        console.error('[PostImpactUpdate] Error loading data:', error);
        toast.error('Failed to load campaign data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [campaignId, user?.id]);
  
  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Please select a JPEG, PNG, or WebP image');
        return;
      }

      setImageFile(file);

      // Create image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // Handle update type change
  const handleUpdateTypeChange = (type: 'milestone' | 'impact' | 'general') => {
    setUpdateType(type);
    if (type !== 'milestone') {
      setSelectedMilestoneId('');
    }
  };

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a title for your update');
      return;
    }

    if (!content.trim()) {
      toast.error('Please enter content for your update');
      return;
    }

    if (updateType === 'milestone' && !selectedMilestoneId) {
      toast.error('Please select a milestone for this update');
      return;
    }

    if (!campaignId || !user?.id) {
      toast.error('Unable to submit update. Please try again.');
      return;
    }

    try {
      setIsSubmitting(true);

      const updateData = {
        title: title.trim(),
        content: content.trim(),
        updateType,
        milestoneId: updateType === 'milestone' ? selectedMilestoneId : undefined,
        imageFile: imageFile || undefined,
      };

      const result = await createCampaignUpdate(campaignId, updateData, user.id);

      if (result.success) {
        toast.success('Update posted successfully!');
        navigate(`/campaigns/${campaignId}?tab=updates`);
      } else {
        toast.error(result.error || 'Failed to post update');
      }
    } catch (error) {
      console.error('Error posting update:', error);
      toast.error('Failed to post update. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <CharityLayout title="Post Impact Update">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-clearcause-primary mx-auto mb-4"></div>
            <p className="text-gray-500">Loading campaign data...</p>
          </div>
        </div>
      </CharityLayout>
    );
  }

  if (!campaign) {
    return (
      <CharityLayout title="Post Impact Update">
        <div className="text-center py-8">
          <p className="text-gray-500">Campaign not found</p>
          <Button
            onClick={() => navigate('/charity/campaigns')}
            className="mt-4"
          >
            Back to Campaigns
          </Button>
        </div>
      </CharityLayout>
    );
  }

  return (
    <CharityLayout title="Post Impact Update">
      {/* Back Button */}
      <Link
        to="/charity/campaigns"
        className="inline-flex items-center mb-6 text-sm font-medium text-gray-600 hover:text-clearcause-primary"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to Campaigns
      </Link>

      {/* Campaign Info */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-medium">{campaign.title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            by {campaign.organizationName}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Share progress and impact with donors. Updates appear on the campaign's public page.
          </p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Update Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              Update Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handleUpdateTypeChange('general')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  updateType === 'general'
                    ? 'border-clearcause-primary bg-clearcause-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className="h-6 w-6 mb-2 text-clearcause-primary" />
                <h3 className="font-medium">General Update</h3>
                <p className="text-sm text-gray-500">Share general progress or news</p>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateTypeChange('milestone')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  updateType === 'milestone'
                    ? 'border-clearcause-primary bg-clearcause-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Target className="h-6 w-6 mb-2 text-clearcause-primary" />
                <h3 className="font-medium">Milestone Update</h3>
                <p className="text-sm text-gray-500">Report on specific milestone progress</p>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateTypeChange('impact')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  updateType === 'impact'
                    ? 'border-clearcause-primary bg-clearcause-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Send className="h-6 w-6 mb-2 text-clearcause-primary" />
                <h3 className="font-medium">Impact Story</h3>
                <p className="text-sm text-gray-500">Share stories of impact and change</p>
              </button>
            </div>

            {/* Milestone Selection */}
            {updateType === 'milestone' && (
              <div className="mt-4">
                <Label htmlFor="milestone-select">Select Milestone</Label>
                <Select value={selectedMilestoneId} onValueChange={setSelectedMilestoneId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose which milestone this update is about" />
                  </SelectTrigger>
                  <SelectContent>
                    {milestones.map((milestone) => (
                      <SelectItem key={milestone.id} value={milestone.id}>
                        <div className="flex items-center gap-2">
                          <span>{milestone.title}</span>
                          {milestone.isCompleted && (
                            <Badge variant="secondary" className="text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Title */}
        <Card>
          <CardHeader>
            <CardTitle>Update Title</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Enter a title for your update..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              {title.length}/100 characters
            </p>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Update Content</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Share what's happening with the project, recent achievements, or how donor funds are making a difference..."
              className="min-h-[150px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              {content.length}/2000 characters
            </p>
          </CardContent>
        </Card>

        {/* Image Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Add an Image (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6">
                <div className="text-center">
                  <Image className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-2">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-clearcause-primary hover:text-clearcause-secondary">
                        Upload an image
                      </span>
                      <input
                        id="image-upload"
                        name="image-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={handleImageChange}
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      JPEG, PNG, or WebP up to 5MB
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-64 rounded-md mx-auto"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-gray-800 bg-opacity-70 rounded-full p-1 text-white hover:bg-opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Link to={`/charity/campaigns/${campaignId}`}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="bg-clearcause-primary hover:bg-clearcause-secondary"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Posting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Post Update
              </>
            )}
          </Button>
        </div>
      </form>
    </CharityLayout>
  );
};

export default PostImpactUpdate;
