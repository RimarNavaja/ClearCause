-- Migration: Fix create_notification logic and add email support
-- Date: 2025-12-13

-- 1. Update create_notification function to check both email and in-app preferences
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_campaign_id UUID DEFAULT NULL,
  p_donation_id UUID DEFAULT NULL,
  p_milestone_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_preferences RECORD;
  v_email_enabled_for_type BOOLEAN;
  v_inapp_enabled_for_type BOOLEAN;
BEGIN
  -- Get user preferences
  SELECT * INTO v_preferences
  FROM public.notification_preferences
  WHERE user_id = p_user_id;

  -- If no preferences exist, create default ones
  IF v_preferences IS NULL THEN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_preferences;
  END IF;

  -- Determine if enabled for specific type (both email and in-app)
  CASE p_type
    WHEN 'donation_received' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_donation_received;
      v_email_enabled_for_type := v_preferences.email_donation_received;
    WHEN 'donation_confirmed' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_donation_confirmed;
      v_email_enabled_for_type := v_preferences.email_donation_confirmed;
    WHEN 'campaign_update' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_campaign_update;
      v_email_enabled_for_type := v_preferences.email_campaign_update;
    WHEN 'milestone_completed' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_milestone_completed;
      v_email_enabled_for_type := v_preferences.email_milestone_completed;
    WHEN 'milestone_verified' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_milestone_verified;
      v_email_enabled_for_type := v_preferences.email_milestone_verified;
    WHEN 'fund_released' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_fund_released;
      v_email_enabled_for_type := v_preferences.email_fund_released;
    WHEN 'review_approved' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_review_moderated;
      v_email_enabled_for_type := v_preferences.email_review_moderated;
    WHEN 'review_rejected' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_review_moderated;
      v_email_enabled_for_type := v_preferences.email_review_moderated;
    WHEN 'campaign_approved' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_campaign_moderated;
      v_email_enabled_for_type := v_preferences.email_campaign_moderated;
    WHEN 'campaign_rejected' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_campaign_moderated;
      v_email_enabled_for_type := v_preferences.email_campaign_moderated;
    WHEN 'charity_verified' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_charity_verified;
      v_email_enabled_for_type := v_preferences.email_charity_verified;
    WHEN 'charity_rejected' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_charity_verified;
      v_email_enabled_for_type := v_preferences.email_charity_verified;
    WHEN 'thank_you_message' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_thank_you;
      v_email_enabled_for_type := v_preferences.email_thank_you;
    WHEN 'system_announcement' THEN
      v_inapp_enabled_for_type := v_preferences.inapp_system_announcements;
      v_email_enabled_for_type := v_preferences.email_system_announcements;
    ELSE
      v_inapp_enabled_for_type := true;
      v_email_enabled_for_type := true;
  END CASE;

  -- Logic: Insert if (InApp Global AND InApp Type) OR (Email Global AND Email Type)
  -- We insert the record. The 'status' is 'unread'.
  -- The Edge Function (via Webhook) will handle the actual email sending based on the 'email_enabled' flags.
  -- But we must ensure the record exists for the webhook to fire.

  IF (v_preferences.inapp_enabled AND v_inapp_enabled_for_type) OR 
     (v_preferences.email_enabled AND v_email_enabled_for_type) THEN
    
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      campaign_id,
      donation_id,
      milestone_id,
      action_url,
      metadata
    )
    VALUES (
      p_user_id,
      p_type,
      p_title,
      p_message,
      p_campaign_id,
      p_donation_id,
      p_milestone_id,
      p_action_url,
      p_metadata
    )
    RETURNING id INTO v_notification_id;
  END IF;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add 'impact_update' if needed (it maps to 'campaign_update' usually, but let's ensure coverage)
-- (No schema change needed if we reuse 'campaign_update' type)
