import React, { useState } from 'react';
import { Calendar, User, Milestone, Sparkles, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';

export interface CampaignUpdate {
  id: string;
  campaignId: string;
  charityId: string;
  title: string;
  content: string;
  updateType: 'milestone' | 'impact' | 'general';
  milestoneId?: string | null;
  imageUrl?: string | null;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  // Related data
  campaign?: {
    title: string;
    charities?: {
      organization_name: string;
    };
  };
  milestones?: {
    title: string;
  } | null;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface UpdateCardProps {
  update: CampaignUpdate;
  showCampaignInfo?: boolean;
  compact?: boolean;
}

const UpdateCard: React.FC<UpdateCardProps> = ({
  update,
  showCampaignInfo = false,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getUpdateTypeBadge = () => {
    switch (update.updateType) {
      case 'milestone':
        return (
          <Badge variant="default" className="bg-blue-600 text-white">
            <Milestone className="w-3 h-3 mr-1" />
            Milestone Update
          </Badge>
        );
      case 'impact':
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            <Sparkles className="w-3 h-3 mr-1" />
            Impact Story
          </Badge>
        );
      case 'general':
        return (
          <Badge variant="outline" className="border-gray-400 text-gray-700">
            <FileText className="w-3 h-3 mr-1" />
            General Update
          </Badge>
        );
      default:
        return null;
    }
  };

  const authorName = update.profiles?.full_name || update.campaign?.charities?.organization_name || 'Anonymous';
  const timeAgo = formatDistanceToNow(new Date(update.createdAt), { addSuffix: true });

  // Truncate content for non-expanded view
  const contentPreview = update.content.length > 200
    ? update.content.substring(0, 200) + '...'
    : update.content;
  const needsExpand = update.content.length > 200;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 font-poppinsregular">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getUpdateTypeBadge()}
              {update.milestones && (
                <Badge variant="secondary" className="text-xs">
                  {update.milestones.title}
                </Badge>
              )}
            </div>
            <h3 className="text-lg font-robotobold text-gray-900 line-clamp-2">
              {update.title}
            </h3>
          </div>
        </div>

        {/*Date */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{timeAgo}</span>
          </div>
        </div>

        {showCampaignInfo && update.campaign && (
          <div className="mt-2 text-sm text-gray-500">
            Campaign: <span className="font-medium">{update.campaign.title}</span>
          </div>
        )}
      </div>

      {/* Image */}
      {update.imageUrl && (
        <Dialog>
          <DialogTrigger asChild>
            <div className="relative w-full h-64 bg-gray-100 cursor-pointer group">
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse text-gray-400">Loading image...</div>
                </div>
              )}
              <img
                src={update.imageUrl}
                alt={update.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => {
                  setImageLoaded(true);
                  setImageError(false);
                }}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(false);
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
              {imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
                  <span className="text-sm">Image failed to load</span>
                </div>
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-0 overflow-hidden border-none bg-transparent shadow-none">
            <img 
              src={update.imageUrl} 
              alt={update.title} 
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg" 
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="text-gray-700 whitespace-pre-wrap">
          {isExpanded || !needsExpand ? update.content : contentPreview}
        </div>

        {needsExpand && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-blue-700 hover:text-blue-600 hover:bg-blue-700 hover:text-white transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Read More
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default UpdateCard;
