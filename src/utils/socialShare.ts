/**
 * Social Sharing Utility
 * Provides functions to share achievements on various social media platforms
 */

import { Achievement } from '@/lib/types';

export interface ShareOptions {
  achievement: Achievement;
  donorName?: string;
  customMessage?: string;
  baseUrl?: string;
}

/**
 * Generate share text for an achievement
 */
export const generateShareText = (options: ShareOptions): string => {
  const { achievement, donorName, customMessage } = options;

  if (customMessage) {
    return customMessage;
  }

  const name = donorName || 'I';
  return `${name} just earned the "${achievement.name}" achievement on ClearCause! ${achievement.description}`;
};

/**
 * Generate hashtags for social sharing
 */
export const generateHashtags = (): string[] => {
  return ['ClearCause', 'CharityDonation', 'MakingADifference', 'Achievement'];
};

/**
 * Share on Facebook
 */
export const shareOnFacebook = (options: ShareOptions): void => {
  const baseUrl = options.baseUrl || window.location.origin;
  const shareUrl = `${baseUrl}/achievements`;
  const text = generateShareText(options);

  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;

  window.open(facebookUrl, '_blank', 'width=600,height=400');
};

/**
 * Share on Twitter/X
 */
export const shareOnTwitter = (options: ShareOptions): void => {
  const baseUrl = options.baseUrl || window.location.origin;
  const shareUrl = `${baseUrl}/achievements`;
  const text = generateShareText(options);
  const hashtags = generateHashtags().join(',');

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}&hashtags=${encodeURIComponent(hashtags)}`;

  window.open(twitterUrl, '_blank', 'width=600,height=400');
};

/**
 * Share on LinkedIn
 */
export const shareOnLinkedIn = (options: ShareOptions): void => {
  const baseUrl = options.baseUrl || window.location.origin;
  const shareUrl = `${baseUrl}/achievements`;

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  window.open(linkedInUrl, '_blank', 'width=600,height=400');
};

/**
 * Share via email
 */
export const shareViaEmail = (options: ShareOptions): void => {
  const baseUrl = options.baseUrl || window.location.origin;
  const shareUrl = `${baseUrl}/achievements`;
  const text = generateShareText(options);
  const subject = `${options.achievement.name} Achievement Unlocked!`;

  const body = `${text}\n\nCheck out my achievements on ClearCause: ${shareUrl}\n\n#ClearCause #CharityDonation #MakingADifference`;

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  window.location.href = mailtoUrl;
};

/**
 * Copy share link to clipboard
 */
export const copyShareLink = async (options: ShareOptions): Promise<boolean> => {
  const baseUrl = options.baseUrl || window.location.origin;
  const shareUrl = `${baseUrl}/achievements`;
  const text = generateShareText(options);
  const fullText = `${text}\n\n${shareUrl}`;

  try {
    await navigator.clipboard.writeText(fullText);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Share via Web Share API (mobile devices)
 */
export const shareViaWebShareAPI = async (options: ShareOptions): Promise<boolean> => {
  if (!navigator.share) {
    return false;
  }

  const baseUrl = options.baseUrl || window.location.origin;
  const shareUrl = `${baseUrl}/achievements`;
  const text = generateShareText(options);

  try {
    await navigator.share({
      title: `${options.achievement.name} Achievement!`,
      text: text,
      url: shareUrl,
    });
    return true;
  } catch (error) {
    // User cancelled or error occurred
    console.error('Web Share API error:', error);
    return false;
  }
};

/**
 * Download achievement image (future implementation)
 */
export const downloadAchievementImage = (options: ShareOptions): void => {
  // TODO: Implement image generation and download
  console.log('Download achievement image:', options.achievement.name);
  // This would generate an image with the achievement badge and details
  // and trigger a download
};
