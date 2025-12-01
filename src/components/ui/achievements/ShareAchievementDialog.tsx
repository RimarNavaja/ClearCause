import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Achievement } from '@/lib/types';
import {
  shareOnFacebook,
  shareOnTwitter,
  shareOnLinkedIn,
  shareViaEmail,
  copyShareLink,
  shareViaWebShareAPI,
  generateShareText,
} from '@/utils/socialShare';
import {
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Link,
  Share2,
  Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AchievementBadge } from './AchievementBadge';

interface ShareAchievementDialogProps {
  achievement: Achievement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  donorName?: string;
  earnedAt?: string;
}

export const ShareAchievementDialog: React.FC<ShareAchievementDialogProps> = ({
  achievement,
  open,
  onOpenChange,
  donorName,
  earnedAt,
}) => {
  const { toast } = useToast();
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const defaultMessage = generateShareText({ achievement, donorName });

  const handleShare = async (platform: string) => {
    const shareOptions = {
      achievement,
      donorName,
      customMessage: customMessage.trim() || undefined,
    };

    try {
      switch (platform) {
        case 'facebook':
          shareOnFacebook(shareOptions);
          break;
        case 'twitter':
          shareOnTwitter(shareOptions);
          break;
        case 'linkedin':
          shareOnLinkedIn(shareOptions);
          break;
        case 'email':
          shareViaEmail(shareOptions);
          break;
        case 'copy':
          const success = await copyShareLink(shareOptions);
          if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({
              title: 'Copied!',
              description: 'Share link copied to clipboard',
            });
          } else {
            toast({
              title: 'Failed to copy',
              description: 'Please try again',
              variant: 'destructive',
            });
          }
          break;
        case 'native':
          const shared = await shareViaWebShareAPI(shareOptions);
          if (!shared) {
            toast({
              title: 'Sharing not available',
              description: 'Please use one of the other sharing options',
              variant: 'destructive',
            });
          }
          break;
      }
    } catch (error) {
      console.error('Share error:', error);
      toast({
        title: 'Sharing failed',
        description: 'An error occurred while sharing',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-robotobold">Share Your Achievement</DialogTitle>
         
        </DialogHeader>

        <div className="space-y-6 font-poppinsregular">
          {/* Achievement Preview */}
          <div className="flex flex-col items-center space-y-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
            <AchievementBadge
              achievement={achievement}
              earned={true}
              earnedAt={earnedAt}
              size="lg"
              showLabel={false}
            />
            <div className="text-center">
              <h3 className="font-semibold text-lg font-robotobold">{achievement.name}</h3>
              <p className="text-sm text-gray-600">{achievement.description}</p>
              {earnedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Earned on {new Date(earnedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Custom Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Customize your message (optional)
            </label>
            <Textarea
              placeholder={defaultMessage}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-gray-500">
              Leave blank to use the default message
            </p>
          </div>

          {/* Share Buttons */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Share on:</p>

            <div className="grid grid-cols-2 gap-3">
              {/* Facebook */}
              <Button
                variant="outline"
                className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-600"
                onClick={() => handleShare('facebook')}
              >
                <Facebook className="h-4 w-4 text-blue-700" />
                Facebook
              </Button>

              {/* Twitter/X */}
              <Button
                variant="outline"
                className="flex items-center gap-2 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-600"
                onClick={() => handleShare('twitter')}
              >
                <Twitter className="h-4 w-4 text-blue-700" />
                Twitter
              </Button>

              {/* LinkedIn */}
              <Button
                variant="outline"
                className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-700"
                onClick={() => handleShare('linkedin')}
              >
                <Linkedin className="h-4 w-4 text-blue-700" />
                LinkedIn
              </Button>

              {/* Email */}
              <Button
                variant="outline"
                className="flex items-center gap-2 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-700"
                onClick={() => handleShare('email')}
              >
                <Mail className="h-4 w-4 text-blue-700" />
                Email
              </Button>
            </div>

            {/* Additional Options */}
            <div className="grid grid-cols-1 gap-3 mt-2">
              {/* Copy Link */}
              <Button
                variant="outline"
                className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-700"
                onClick={() => handleShare('copy')}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>

              {/* Native Share (Mobile) */}
              {navigator.share && (
                <Button
                  variant="outline"
                  className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-700"
                  onClick={() => handleShare('native')}
                >
                  <Share2 className="h-4 w-4" />
                  Share...
                </Button>
              )}
            </div>
          </div>

          {/* Close Button */}
          <Button
            variant="secondary"
            className="w-full bg-blue-700 hover:bg-blue-600"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
