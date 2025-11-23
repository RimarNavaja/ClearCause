/**
 * Notification Service
 * Handles in-app and email notifications
 */

import { supabase } from '../lib/supabase';
import {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  ClearCauseError,
} from '../lib/types';
import {
  withErrorHandling,
  handleSupabaseError,
  createSuccessResponse,
} from '../utils/errors';
import { createPaginatedResponse } from '../utils/helpers';

// Notification types
export type NotificationType =
  | 'donation_received'
  | 'donation_confirmed'
  | 'campaign_update'
  | 'milestone_completed'
  | 'milestone_verified'
  | 'fund_released'
  | 'review_approved'
  | 'review_rejected'
  | 'campaign_approved'
  | 'campaign_rejected'
  | 'charity_verified'
  | 'charity_rejected'
  | 'thank_you_message'
  | 'system_announcement';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  campaignId?: string | null;
  donationId?: string | null;
  milestoneId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, any>;
  emailSent: boolean;
  emailSentAt?: string | null;
  emailOpened: boolean;
  emailOpenedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  emailEnabled: boolean;
  emailDonationReceived: boolean;
  emailDonationConfirmed: boolean;
  emailCampaignUpdate: boolean;
  emailMilestoneCompleted: boolean;
  emailMilestoneVerified: boolean;
  emailFundReleased: boolean;
  emailReviewModerated: boolean;
  emailCampaignModerated: boolean;
  emailCharityVerified: boolean;
  emailThankYou: boolean;
  emailSystemAnnouncements: boolean;
  inappEnabled: boolean;
  inappDonationReceived: boolean;
  inappDonationConfirmed: boolean;
  inappCampaignUpdate: boolean;
  inappMilestoneCompleted: boolean;
  inappMilestoneVerified: boolean;
  inappFundReleased: boolean;
  inappReviewModerated: boolean;
  inappCampaignModerated: boolean;
  inappCharityVerified: boolean;
  inappThankYou: boolean;
  inappSystemAnnouncements: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  campaignId?: string;
  donationId?: string;
  milestoneId?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification
 * Uses the database function to respect user preferences
 */
export const createNotification = withErrorHandling(async (
  data: CreateNotificationData
): Promise<ApiResponse<string>> => {
  const { data: notificationId, error } = await supabase.rpc('create_notification', {
    p_user_id: data.userId,
    p_type: data.type,
    p_title: data.title,
    p_message: data.message,
    p_campaign_id: data.campaignId || null,
    p_donation_id: data.donationId || null,
    p_milestone_id: data.milestoneId || null,
    p_action_url: data.actionUrl || null,
    p_metadata: data.metadata || {},
  });

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(notificationId, 'Notification created successfully');
});

/**
 * Get notifications for a user
 */
export const getUserNotifications = withErrorHandling(async (
  userId: string,
  params: PaginationParams = { page: 1, limit: 20 },
  status?: NotificationStatus
): Promise<PaginatedResponse<Notification>> => {
  const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  // Filter by status if provided
  if (status) {
    query = query.eq('status', status);
  }

  // Apply pagination and sorting
  query = query
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    throw handleSupabaseError(error);
  }

  const notifications = (data || []).map(formatNotification);

  return createPaginatedResponse(notifications, count || 0, params);
});

/**
 * Get unread notification count
 */
export const getUnreadCount = withErrorHandling(async (
  userId: string
): Promise<ApiResponse<number>> => {
  const { data, error } = await supabase.rpc('get_unread_notification_count', {
    p_user_id: userId,
  });

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(data || 0);
});

/**
 * Mark notification as read
 */
export const markAsRead = withErrorHandling(async (
  notificationId: string,
  userId: string
): Promise<ApiResponse<void>> => {
  const { data, error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
    p_user_id: userId,
  });

  if (error) {
    throw handleSupabaseError(error);
  }

  if (!data) {
    throw new ClearCauseError('NOT_FOUND', 'Notification not found', 404);
  }

  return createSuccessResponse(undefined, 'Notification marked as read');
});

/**
 * Mark all notifications as read
 */
export const markAllAsRead = withErrorHandling(async (
  userId: string
): Promise<ApiResponse<number>> => {
  const { data, error } = await supabase.rpc('mark_all_notifications_read', {
    p_user_id: userId,
  });

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(data || 0, `${data || 0} notifications marked as read`);
});

/**
 * Delete notification
 */
export const deleteNotification = withErrorHandling(async (
  notificationId: string,
  userId: string
): Promise<ApiResponse<void>> => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(undefined, 'Notification deleted successfully');
});

/**
 * Archive notification
 */
export const archiveNotification = withErrorHandling(async (
  notificationId: string,
  userId: string
): Promise<ApiResponse<void>> => {
  const { error } = await supabase
    .from('notifications')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(undefined, 'Notification archived successfully');
});

/**
 * Get user notification preferences
 */
export const getNotificationPreferences = withErrorHandling(async (
  userId: string
): Promise<ApiResponse<NotificationPreferences>> => {
  let { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  // If no preferences exist, create default ones
  if (error && error.code === 'PGRST116') {
    const { data: newPrefs, error: insertError } = await supabase
      .from('notification_preferences')
      .insert({ user_id: userId })
      .select()
      .single();

    if (insertError) {
      throw handleSupabaseError(insertError);
    }

    data = newPrefs;
  } else if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(formatPreferences(data));
});

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = withErrorHandling(async (
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<ApiResponse<NotificationPreferences>> => {
  // Convert camelCase to snake_case for database
  const dbPreferences: any = {};
  Object.keys(preferences).forEach((key) => {
    if (key !== 'id' && key !== 'userId' && key !== 'createdAt' && key !== 'updatedAt') {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      dbPreferences[snakeKey] = preferences[key as keyof NotificationPreferences];
    }
  });

  const { data, error } = await supabase
    .from('notification_preferences')
    .update({ ...dbPreferences, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw handleSupabaseError(error);
  }

  return createSuccessResponse(formatPreferences(data), 'Preferences updated successfully');
});

/**
 * Helper: Format notification data
 */
function formatNotification(data: any): Notification {
  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    title: data.title,
    message: data.message,
    status: data.status,
    campaignId: data.campaign_id,
    donationId: data.donation_id,
    milestoneId: data.milestone_id,
    actionUrl: data.action_url,
    metadata: data.metadata || {},
    emailSent: data.email_sent,
    emailSentAt: data.email_sent_at,
    emailOpened: data.email_opened,
    emailOpenedAt: data.email_opened_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Helper: Format preferences data
 */
function formatPreferences(data: any): NotificationPreferences {
  return {
    id: data.id,
    userId: data.user_id,
    emailEnabled: data.email_enabled,
    emailDonationReceived: data.email_donation_received,
    emailDonationConfirmed: data.email_donation_confirmed,
    emailCampaignUpdate: data.email_campaign_update,
    emailMilestoneCompleted: data.email_milestone_completed,
    emailMilestoneVerified: data.email_milestone_verified,
    emailFundReleased: data.email_fund_released,
    emailReviewModerated: data.email_review_moderated,
    emailCampaignModerated: data.email_campaign_moderated,
    emailCharityVerified: data.email_charity_verified,
    emailThankYou: data.email_thank_you,
    emailSystemAnnouncements: data.email_system_announcements,
    inappEnabled: data.inapp_enabled,
    inappDonationReceived: data.inapp_donation_received,
    inappDonationConfirmed: data.inapp_donation_confirmed,
    inappCampaignUpdate: data.inapp_campaign_update,
    inappMilestoneCompleted: data.inapp_milestone_completed,
    inappMilestoneVerified: data.inapp_milestone_verified,
    inappFundReleased: data.inapp_fund_released,
    inappReviewModerated: data.inapp_review_moderated,
    inappCampaignModerated: data.inapp_campaign_moderated,
    inappCharityVerified: data.inapp_charity_verified,
    inappThankYou: data.inapp_thank_you,
    inappSystemAnnouncements: data.inapp_system_announcements,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// ===== NOTIFICATION HELPERS =====
// These functions create notifications for specific events

/**
 * Notify donor about donation confirmation
 */
export const notifyDonationConfirmed = async (
  userId: string,
  donationId: string,
  campaignId: string,
  campaignTitle: string,
  amount: number
) => {
  return createNotification({
    userId,
    type: 'donation_confirmed',
    title: 'Donation Confirmed',
    message: `Your donation of ₱${amount.toLocaleString()} to "${campaignTitle}" has been confirmed. Thank you for your generosity!`,
    campaignId,
    donationId,
    actionUrl: `/campaigns/${campaignId}`,
    metadata: { amount, campaignTitle },
  });
};

/**
 * Notify charity about donation received
 */
export const notifyDonationReceived = async (
  userId: string,
  donationId: string,
  campaignId: string,
  campaignTitle: string,
  amount: number,
  donorName?: string
) => {
  return createNotification({
    userId,
    type: 'donation_received',
    title: 'New Donation Received',
    message: `${donorName || 'An anonymous donor'} donated ₱${amount.toLocaleString()} to your campaign "${campaignTitle}"`,
    campaignId,
    donationId,
    actionUrl: `/charity/campaigns/${campaignId}`,
    metadata: { amount, campaignTitle, donorName },
  });
};

/**
 * Notify donors about milestone completion
 */
export const notifyMilestoneCompleted = async (
  userId: string,
  campaignId: string,
  milestoneId: string,
  campaignTitle: string,
  milestoneTitle: string
) => {
  return createNotification({
    userId,
    type: 'milestone_completed',
    title: 'Milestone Completed!',
    message: `Great news! "${campaignTitle}" has completed the milestone: "${milestoneTitle}"`,
    campaignId,
    milestoneId,
    actionUrl: `/campaigns/${campaignId}`,
    metadata: { campaignTitle, milestoneTitle },
  });
};

/**
 * Notify charity about milestone verification
 */
export const notifyMilestoneVerified = async (
  userId: string,
  campaignId: string,
  milestoneId: string,
  campaignTitle: string,
  milestoneTitle: string,
  approved: boolean
) => {
  return createNotification({
    userId,
    type: 'milestone_verified',
    title: approved ? 'Milestone Verified' : 'Milestone Needs Revision',
    message: approved
      ? `Your milestone "${milestoneTitle}" for "${campaignTitle}" has been verified and approved.`
      : `Your milestone "${milestoneTitle}" for "${campaignTitle}" needs revision. Please check the feedback.`,
    campaignId,
    milestoneId,
    actionUrl: `/charity/campaigns/${campaignId}/milestones`,
    metadata: { campaignTitle, milestoneTitle, approved },
  });
};

/**
 * Notify charity about fund release
 */
export const notifyFundReleased = async (
  userId: string,
  campaignId: string,
  campaignTitle: string,
  amount: number
) => {
  return createNotification({
    userId,
    type: 'fund_released',
    title: 'Funds Released',
    message: `₱${amount.toLocaleString()} has been released for your campaign "${campaignTitle}". Funds will be transferred within 3-5 business days.`,
    campaignId,
    actionUrl: `/charity/funds`,
    metadata: { amount, campaignTitle },
  });
};

/**
 * Notify user about review moderation
 */
export const notifyReviewModerated = async (
  userId: string,
  campaignId: string,
  campaignTitle: string,
  approved: boolean
) => {
  return createNotification({
    userId,
    type: approved ? 'review_approved' : 'review_rejected',
    title: approved ? 'Review Approved' : 'Review Not Approved',
    message: approved
      ? `Your review for "${campaignTitle}" has been approved and is now visible.`
      : `Your review for "${campaignTitle}" was not approved. Please check the admin notes.`,
    campaignId,
    actionUrl: `/campaigns/${campaignId}`,
    metadata: { campaignTitle, approved },
  });
};

/**
 * Notify charity about campaign moderation
 */
export const notifyCampaignModerated = async (
  userId: string,
  campaignId: string,
  campaignTitle: string,
  approved: boolean
) => {
  return createNotification({
    userId,
    type: approved ? 'campaign_approved' : 'campaign_rejected',
    title: approved ? 'Campaign Approved' : 'Campaign Needs Revision',
    message: approved
      ? `Your campaign "${campaignTitle}" has been approved and is now live!`
      : `Your campaign "${campaignTitle}" needs revision. Please check the feedback.`,
    campaignId,
    actionUrl: `/charity/campaigns/${campaignId}`,
    metadata: { campaignTitle, approved },
  });
};

/**
 * Notify charity about verification status
 */
export const notifyCharityVerified = async (
  userId: string,
  organizationName: string,
  approved: boolean
) => {
  return createNotification({
    userId,
    type: approved ? 'charity_verified' : 'charity_rejected',
    title: approved ? 'Organization Verified' : 'Verification Declined',
    message: approved
      ? `Congratulations! ${organizationName} has been verified. You can now create campaigns.`
      : `Your verification request for ${organizationName} was declined. Please check the feedback.`,
    actionUrl: approved ? '/charity/campaigns/new' : '/charity/verification/status',
    metadata: { organizationName, approved },
  });
};
