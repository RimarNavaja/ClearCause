/**
 * Campaign Selector Modal
 * Allows donors to select a campaign when redirecting rejected milestone funds
 */

import { useState, useEffect } from 'react';
import { Search, TrendingUp, Clock, Target, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Campaign } from '@/lib/types';
import { config } from '@/lib/config';

interface CampaignSelectorModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (campaignId: string) => void;
  refundAmount: number;
  excludeCampaignId?: string; // Original campaign to exclude
}

type SortOption = 'popular' | 'newest' | 'almost_funded' | 'ending_soon';

export function CampaignSelectorModal({
  open,
  onClose,
  onSelect,
  refundAmount,
  excludeCampaignId,
}: CampaignSelectorModalProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  // Load campaigns
  useEffect(() => {
    if (open) {
      loadCampaigns();
    }
  }, [open, searchQuery, selectedCategory, sortBy]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('campaigns')
        .select(`
          *,
          charities:charity_id (
            id,
            organization_name,
            logo_url
          )
        `)
        .eq('status', 'active');

      // Only exclude campaign if provided
      if (excludeCampaignId) {
        query = query.neq('id', excludeCampaignId);
      }

      // Filter by category
      if (selectedCategory && selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // Search by title
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }

      // Filter: Campaign must have at least 7 days remaining
      const minEndDate = new Date();
      minEndDate.setDate(minEndDate.getDate() + config.refund.minCampaignDaysRemaining);
      query = query.gte('end_date', minEndDate.toISOString());

      // Sort
      switch (sortBy) {
        case 'popular':
          query = query.order('donors_count', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'almost_funded':
          query = query.order('current_amount', { ascending: false });
          break;
        case 'ending_soon':
          query = query.order('end_date', { ascending: true });
          break;
      }

      query = query.limit(20);

      const { data, error } = await query;

      if (error) throw error;

      // Map to Campaign type
      const mappedCampaigns: Campaign[] = (data || [])
        .map((c: any) => ({
          id: c.id,
          charityId: c.charity_id,
          title: c.title,
          description: c.description,
          goalAmount: parseFloat(c.goal_amount),
          currentAmount: parseFloat(c.current_amount),
          donorsCount: c.donors_count,
          imageUrl: c.image_url,
          status: c.status,
          category: c.category,
          location: c.location,
          startDate: c.start_date,
          endDate: c.end_date,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          progress: (parseFloat(c.current_amount) / parseFloat(c.goal_amount)) * 100,
          charity: c.charities ? {
            id: c.charities.id,
            userId: '',
            organizationName: c.charities.organization_name,
            description: '',
            websiteUrl: null,
            logoUrl: c.charities.logo_url,
            phone: null,
            address: null,
            registrationNumber: null,
            verificationStatus: 'approved',
            verificationDocuments: null,
            createdAt: '',
            updatedAt: '',
          } : undefined,
        }))
        // Filter out fully funded campaigns
        .filter((c) => c.currentAmount < c.goalAmount);

      setCampaigns(mappedCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (selectedCampaign) {
      onSelect(selectedCampaign);
      onClose();
    }
  };

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose Campaign to Support</DialogTitle>
          <DialogDescription>
            Select an active campaign to redirect your ₱{refundAmount.toLocaleString()} contribution.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Category and Sort */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Environment">Environment</SelectItem>
                  <SelectItem value="Disaster Relief">Disaster Relief</SelectItem>
                  <SelectItem value="Community Development">Community Development</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Most Popular</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="newest">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Newest</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="almost_funded">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      <span>Almost Funded</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ending_soon">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Ending Soon</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Campaign List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No campaigns found matching your criteria.</p>
              <p className="text-sm mt-2">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            campaigns.map((campaign) => {
              const daysRemaining = getDaysRemaining(campaign.endDate);
              const isSelected = selectedCampaign === campaign.id;

              return (
                <Card
                  key={campaign.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedCampaign(campaign.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{campaign.title}</CardTitle>
                        <CardDescription className="mt-1">
                          by {campaign.charity?.organizationName}
                        </CardDescription>
                      </div>
                      {campaign.category && (
                        <Badge variant="outline" className="ml-2">
                          {campaign.category}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">
                          ₱{campaign.currentAmount.toLocaleString()} raised
                        </span>
                        <span className="text-muted-foreground">
                          of ₱{campaign.goalAmount.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={campaign.progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{Math.round(campaign.progress || 0)}% funded</span>
                        {daysRemaining !== null && (
                          <span>
                            {daysRemaining > 0
                              ? `${daysRemaining} days left`
                              : 'Ending soon'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {campaign.description}
                    </p>

                    {/* Donors */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{campaign.donorsCount || 0} donors</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedCampaign
              ? `₱${refundAmount.toLocaleString()} will be donated to the selected campaign`
              : 'Select a campaign to continue'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSelect} disabled={!selectedCampaign}>
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
