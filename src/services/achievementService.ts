/**
 * Achievement Service
 * Handles achievement definitions and donor achievement tracking
 */

import { supabase } from '../lib/supabase';
import {
  Achievement,
  DonorAchievement,
  AchievementProgress,
  ApiResponse,
  ClearCauseError
} from '../lib/types';
import {
  validateData,
  achievementCreateSchema,
  achievementUpdateSchema,
} from '../utils/validation';
import {
  withErrorHandling,
  handleSupabaseError,
  createSuccessResponse,
  ErrorCode
} from '../utils/errors';
import { logAuditEvent } from './adminService';

/**
 * Get all achievements (optionally filtered)
 */
export const getAllAchievements = withErrorHandling(async (
  filters?: { category?: string; is_active?: boolean }
): Promise<ApiResponse<Achievement[]>> => {
  let query = supabase
    .from('achievements')
    .select('*')
    .order('display_order', { ascending: true });

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  const { data, error } = await query;

  if (error) throw handleSupabaseError(error);

  return createSuccessResponse(data || [], 'Achievements retrieved successfully');
});

/**
 * Get achievements earned by a specific donor
 */
export const getDonorAchievements = withErrorHandling(async (
  donorId: string
): Promise<ApiResponse<DonorAchievement[]>> => {
  const { data, error } = await supabase
    .from('donor_achievements')
    .select(`
      *,
      achievement:achievement_id (*)
    `)
    .eq('donor_id', donorId)
    .order('earned_at', { ascending: false });

  if (error) throw handleSupabaseError(error);

  return createSuccessResponse(data || [], 'Donor achievements retrieved successfully');
});

/**
 * Get achievement progress for a donor
 * Shows both earned and unearned achievements with progress indicators
 */
export const getDonorAchievementProgress = withErrorHandling(async (
  donorId: string
): Promise<ApiResponse<AchievementProgress[]>> => {
  // Get all active achievements
  const achievementsResult = await getAllAchievements({ is_active: true });
  if (!achievementsResult.success) {
    throw new ClearCauseError(ErrorCode.DATABASE_ERROR, 'Failed to fetch achievements');
  }

  // Get donor's earned achievements
  const earnedResult = await getDonorAchievements(donorId);
  if (!earnedResult.success) {
    throw new ClearCauseError(ErrorCode.DATABASE_ERROR, 'Failed to fetch earned achievements');
  }

  const earnedMap = new Map(
    earnedResult.data?.map(da => [da.achievement_id, da.earned_at]) || []
  );

  // Calculate progress for each achievement
  const progressPromises = achievementsResult.data?.map(async (achievement) => {
    const earned = earnedMap.has(achievement.id);
    const progress: AchievementProgress = {
      achievement,
      earned,
      earned_at: earnedMap.get(achievement.id),
    };

    // Calculate progress if not earned
    if (!earned) {
      progress.progress = await calculateAchievementProgress(donorId, achievement);
    }

    return progress;
  }) || [];

  const progressData = await Promise.all(progressPromises);

  return createSuccessResponse(progressData, 'Achievement progress retrieved successfully');
});

/**
 * Calculate progress toward an unearned achievement
 */
async function calculateAchievementProgress(
  donorId: string,
  achievement: Achievement
): Promise<{ current: number; target: number; percentage: number }> {
  const criteria = achievement.criteria;
  let current = 0;
  let target = 0;

  try {
    switch (criteria.type) {
      case 'first_donation':
        target = 1;
        const { count: donationCount } = await supabase
          .from('donations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', donorId)
          .eq('status', 'completed');
        current = donationCount || 0;
        break;

      case 'total_donated':
        target = criteria.amount;
        const { data: donations } = await supabase
          .from('donations')
          .select('amount')
          .eq('user_id', donorId)
          .eq('status', 'completed');
        current = donations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
        break;

      case 'unique_campaigns':
        target = criteria.count;
        const { data: campaignDonations } = await supabase
          .from('donations')
          .select('campaign_id')
          .eq('user_id', donorId)
          .eq('status', 'completed');
        const uniqueCampaigns = new Set(campaignDonations?.map(d => d.campaign_id));
        current = uniqueCampaigns.size;
        break;

      case 'unique_categories':
        target = criteria.count;
        const { data: categoryCampaigns } = await supabase
          .from('donations')
          .select('campaigns(category)')
          .eq('user_id', donorId)
          .eq('status', 'completed');
        const categories = new Set(categoryCampaigns?.map((d: any) => d.campaigns?.category).filter(Boolean));
        current = categories.size;
        break;

      case 'unique_charities':
        target = criteria.count;
        const { data: charityDonations } = await supabase
          .from('donations')
          .select('campaigns(charity_id)')
          .eq('user_id', donorId)
          .eq('status', 'completed');
        const charities = new Set(charityDonations?.map((d: any) => d.campaigns?.charity_id).filter(Boolean));
        current = charities.size;
        break;

      case 'complete_profile':
        target = 3; // name, phone, avatar
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, avatar_url')
          .eq('id', donorId)
          .single();
        current = [profile?.full_name, profile?.phone, profile?.avatar_url]
          .filter(Boolean).length;
        break;

      // Add more criteria types as needed
      default:
        target = 1;
        current = 0;
    }

    return {
      current,
      target,
      percentage: target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0,
    };
  } catch (error) {
    console.error('Error calculating achievement progress:', error);
    return { current: 0, target: 1, percentage: 0 };
  }
}

/**
 * Check and award achievements to a donor based on recent activity
 * This is the core function called after donations, profile updates, etc.
 */
export const checkAndAwardAchievements = withErrorHandling(async (
  donorId: string,
  eventType: 'donation' | 'profile_update' | 'campaign_tracked' | 'feedback_submitted',
  eventData: any
): Promise<ApiResponse<DonorAchievement[]>> => {
  // Get all active achievements
  const achievementsResult = await getAllAchievements({ is_active: true });
  if (!achievementsResult.success || !achievementsResult.data) {
    return createSuccessResponse([], 'No achievements to check');
  }

  // Get already earned achievements
  const earnedResult = await getDonorAchievements(donorId);
  const earnedIds = new Set(earnedResult.data?.map(da => da.achievement_id) || []);

  // Filter to unearned achievements
  const unearnedAchievements = achievementsResult.data.filter(
    a => !earnedIds.has(a.id)
  );

  // Check each unearned achievement
  const newlyEarned: DonorAchievement[] = [];

  for (const achievement of unearnedAchievements) {
    const earned = await checkAchievementCriteria(donorId, achievement, eventType, eventData);

    if (earned) {
      // Award the achievement
      const { data: awardedData, error: awardError } = await supabase
        .from('donor_achievements')
        .insert({
          donor_id: donorId,
          achievement_id: achievement.id,
          context: {
            event_type: eventType,
            event_data: eventData,
          },
        })
        .select(`
          *,
          achievement:achievement_id (*)
        `)
        .single();

      if (!awardError && awardedData) {
        newlyEarned.push(awardedData);

        // Log to audit
        await logAuditEvent(
          donorId,
          'ACHIEVEMENT_EARNED',
          'achievement',
          achievement.id,
          { achievement_name: achievement.name }
        );
      }
    }
  }

  return createSuccessResponse(
    newlyEarned,
    `Checked ${unearnedAchievements.length} achievements, awarded ${newlyEarned.length}`
  );
});

/**
 * Check if a donor meets the criteria for a specific achievement
 */
async function checkAchievementCriteria(
  donorId: string,
  achievement: Achievement,
  eventType: string,
  eventData: any
): Promise<boolean> {
  const criteria = achievement.criteria;

  try {
    switch (criteria.type) {
      case 'first_donation':
        if (eventType === 'donation') {
          const { count } = await supabase
            .from('donations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', donorId)
            .eq('status', 'completed');
          return count === 1;
        }
        return false;

      case 'total_donated': {
        const { data: donations } = await supabase
          .from('donations')
          .select('amount')
          .eq('user_id', donorId)
          .eq('status', 'completed');
        const total = donations?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
        return total >= criteria.amount;
      }

      case 'unique_campaigns': {
        const { data: campaigns } = await supabase
          .from('donations')
          .select('campaign_id')
          .eq('user_id', donorId)
          .eq('status', 'completed');
        const uniqueCampaigns = new Set(campaigns?.map(d => d.campaign_id));
        return uniqueCampaigns.size >= criteria.count;
      }

      case 'unique_categories': {
        const { data: categoryCampaigns } = await supabase
          .from('donations')
          .select('campaigns(category)')
          .eq('user_id', donorId)
          .eq('status', 'completed');
        const categories = new Set(
          categoryCampaigns?.map((d: any) => d.campaigns?.category).filter(Boolean)
        );
        return categories.size >= criteria.count;
      }

      case 'unique_charities': {
        const { data: charityDonations } = await supabase
          .from('donations')
          .select('campaigns(charity_id)')
          .eq('user_id', donorId)
          .eq('status', 'completed');
        const charities = new Set(
          charityDonations?.map((d: any) => d.campaigns?.charity_id).filter(Boolean)
        );
        return charities.size >= criteria.count;
      }

      case 'donations_in_period': {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - criteria.days);
        const { count } = await supabase
          .from('donations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', donorId)
          .eq('status', 'completed')
          .gte('donated_at', cutoffDate.toISOString());
        return (count || 0) >= criteria.count;
      }

      case 'consecutive_months': {
        const { data: donations } = await supabase
          .from('donations')
          .select('donated_at')
          .eq('user_id', donorId)
          .eq('status', 'completed')
          .order('donated_at', { ascending: false });

        if (!donations || donations.length === 0) return false;

        // Check for consecutive months
        const months = donations.map(d => {
          const date = new Date(d.donated_at);
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        });
        const uniqueMonths = [...new Set(months)].sort().reverse();

        let consecutive = 1;
        for (let i = 1; i < uniqueMonths.length; i++) {
          const [year1, month1] = uniqueMonths[i - 1].split('-').map(Number);
          const [year2, month2] = uniqueMonths[i].split('-').map(Number);

          const diff = (year1 - year2) * 12 + (month1 - month2);
          if (diff === 1) {
            consecutive++;
            if (consecutive >= criteria.count) return true;
          } else {
            consecutive = 1;
          }
        }
        return consecutive >= criteria.count;
      }

      case 'early_donation': {
        if (eventType === 'donation' && eventData.campaign) {
          const campaign = eventData.campaign;
          const campaignStart = new Date(campaign.created_at);
          const donationTime = new Date(eventData.donated_at);
          const hoursDiff = (donationTime.getTime() - campaignStart.getTime()) / (1000 * 60 * 60);
          return hoursDiff <= criteria.hours;
        }
        return false;
      }

      case 'milestone_trigger': {
        // Check if this donation triggered a milestone
        if (eventType === 'donation' && eventData.triggered_milestone) {
          return true;
        }
        return false;
      }

      case 'completed_campaign': {
        // Check if donor donated to any completed campaign
        const { data: completedDonations } = await supabase
          .from('donations')
          .select(`
            campaigns!inner(
              status,
              current_amount,
              goal_amount
            )
          `)
          .eq('user_id', donorId)
          .eq('status', 'completed')
          .eq('campaigns.status', 'completed');

        // Check if any campaign reached 100% of goal
        const hasCompletedCampaign = completedDonations?.some((d: any) =>
          d.campaigns && d.campaigns.current_amount >= d.campaigns.goal_amount
        );
        return hasCompletedCampaign || false;
      }

      case 'complete_profile': {
        if (eventType === 'profile_update') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone, avatar_url')
            .eq('id', donorId)
            .single();
          return !!(profile?.full_name && profile?.phone && profile?.avatar_url);
        }
        return false;
      }

      // Add more criteria handlers as needed

      default:
        console.warn(`Unknown achievement criteria type: ${criteria.type}`);
        return false;
    }
  } catch (error) {
    console.error(`Error checking achievement ${achievement.slug}:`, error);
    return false;
  }
}

/**
 * Admin: Create new achievement
 */
export const createAchievement = withErrorHandling(async (
  achievementData: any,
  adminId: string
): Promise<ApiResponse<Achievement>> => {
  const validatedData = validateData(achievementCreateSchema, achievementData);

  const { data, error } = await supabase
    .from('achievements')
    .insert(validatedData)
    .select()
    .single();

  if (error) throw handleSupabaseError(error);

  await logAuditEvent(adminId, 'ACHIEVEMENT_CREATED', 'achievement', data.id, {
    achievement_name: data.name,
  });

  return createSuccessResponse(data, 'Achievement created successfully');
});

/**
 * Admin: Update achievement
 */
export const updateAchievement = withErrorHandling(async (
  achievementId: string,
  updates: any,
  adminId: string
): Promise<ApiResponse<Achievement>> => {
  const validatedData = validateData(achievementUpdateSchema, updates);

  const { data, error } = await supabase
    .from('achievements')
    .update(validatedData)
    .eq('id', achievementId)
    .select()
    .single();

  if (error) throw handleSupabaseError(error);

  await logAuditEvent(adminId, 'ACHIEVEMENT_UPDATED', 'achievement', achievementId, {
    changes: validatedData,
  });

  return createSuccessResponse(data, 'Achievement updated successfully');
});
