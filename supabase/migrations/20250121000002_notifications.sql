-- Notifications Migration
-- Adds email and in-app notification system

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'donation_received',
  'donation_confirmed',
  'campaign_update',
  'milestone_completed',
  'milestone_verified',
  'fund_released',
  'review_approved',
  'review_rejected',
  'campaign_approved',
  'campaign_rejected',
  'charity_verified',
  'charity_rejected',
  'thank_you_message',
  'system_announcement'
);

-- Create notification status enum
CREATE TYPE notification_status AS ENUM ('unread', 'read', 'archived');

-- Notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'unread',

  -- Related entities (optional - for linking to specific items)
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  donation_id UUID REFERENCES public.donations(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE CASCADE,

  -- Action URL (optional - where to go when clicked)
  action_url TEXT,

  -- Metadata (JSON for additional data)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Email notification tracking
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_opened BOOLEAN DEFAULT false,
  email_opened_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_user_status ON public.notifications(user_id, status);

-- User notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Email preferences
  email_enabled BOOLEAN DEFAULT true,
  email_donation_received BOOLEAN DEFAULT true,
  email_donation_confirmed BOOLEAN DEFAULT true,
  email_campaign_update BOOLEAN DEFAULT true,
  email_milestone_completed BOOLEAN DEFAULT true,
  email_milestone_verified BOOLEAN DEFAULT true,
  email_fund_released BOOLEAN DEFAULT true,
  email_review_moderated BOOLEAN DEFAULT true,
  email_campaign_moderated BOOLEAN DEFAULT true,
  email_charity_verified BOOLEAN DEFAULT true,
  email_thank_you BOOLEAN DEFAULT true,
  email_system_announcements BOOLEAN DEFAULT true,

  -- In-app preferences
  inapp_enabled BOOLEAN DEFAULT true,
  inapp_donation_received BOOLEAN DEFAULT true,
  inapp_donation_confirmed BOOLEAN DEFAULT true,
  inapp_campaign_update BOOLEAN DEFAULT true,
  inapp_milestone_completed BOOLEAN DEFAULT true,
  inapp_milestone_verified BOOLEAN DEFAULT true,
  inapp_fund_released BOOLEAN DEFAULT true,
  inapp_review_moderated BOOLEAN DEFAULT true,
  inapp_campaign_moderated BOOLEAN DEFAULT true,
  inapp_charity_verified BOOLEAN DEFAULT true,
  inapp_thank_you BOOLEAN DEFAULT true,
  inapp_system_announcements BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Email templates table (for storing customizable email templates)
CREATE TABLE public.email_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type notification_type NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- List of available template variables
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Function to create notification with preferences check
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
  v_should_create BOOLEAN;
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

  -- Check if in-app notifications are enabled for this type
  v_should_create := CASE p_type
    WHEN 'donation_received' THEN v_preferences.inapp_donation_received
    WHEN 'donation_confirmed' THEN v_preferences.inapp_donation_confirmed
    WHEN 'campaign_update' THEN v_preferences.inapp_campaign_update
    WHEN 'milestone_completed' THEN v_preferences.inapp_milestone_completed
    WHEN 'milestone_verified' THEN v_preferences.inapp_milestone_verified
    WHEN 'fund_released' THEN v_preferences.inapp_fund_released
    WHEN 'review_approved' THEN v_preferences.inapp_review_moderated
    WHEN 'review_rejected' THEN v_preferences.inapp_review_moderated
    WHEN 'campaign_approved' THEN v_preferences.inapp_campaign_moderated
    WHEN 'campaign_rejected' THEN v_preferences.inapp_campaign_moderated
    WHEN 'charity_verified' THEN v_preferences.inapp_charity_verified
    WHEN 'charity_rejected' THEN v_preferences.inapp_charity_verified
    WHEN 'thank_you_message' THEN v_preferences.inapp_thank_you
    WHEN 'system_announcement' THEN v_preferences.inapp_system_announcements
    ELSE true
  END;

  -- Only create notification if enabled
  IF v_should_create AND v_preferences.inapp_enabled THEN
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

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.notifications
    WHERE user_id = p_user_id AND status = 'unread'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.notifications
  SET status = 'read', updated_at = NOW()
  WHERE id = p_notification_id AND user_id = p_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET status = 'read', updated_at = NOW()
  WHERE user_id = p_user_id AND status = 'unread';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true); -- Handled by create_notification function

-- Notification preferences policies
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Email templates policies (admin only)
CREATE POLICY "Admins can view email templates"
  ON public.email_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER set_updated_at_notifications
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_notification_preferences
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_email_templates
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default email templates
INSERT INTO public.email_templates (type, subject, html_body, text_body, variables) VALUES
  (
    'donation_confirmed',
    'Thank you for your donation to {{campaignTitle}}!',
    '<h1>Thank you for your generous donation!</h1><p>Dear {{donorName}},</p><p>Your donation of <strong>{{amount}}</strong> to <strong>{{campaignTitle}}</strong> has been confirmed.</p><p>Transaction ID: {{transactionId}}</p><p>You can track the impact of your donation anytime at: {{campaignUrl}}</p><p>Thank you for making a difference!</p><p>Best regards,<br>The ClearCause Team</p>',
    'Thank you for your generous donation!\n\nDear {{donorName}},\n\nYour donation of {{amount}} to {{campaignTitle}} has been confirmed.\n\nTransaction ID: {{transactionId}}\n\nYou can track the impact of your donation anytime at: {{campaignUrl}}\n\nThank you for making a difference!\n\nBest regards,\nThe ClearCause Team',
    '["donorName", "amount", "campaignTitle", "transactionId", "campaignUrl"]'::jsonb
  ),
  (
    'milestone_completed',
    'Milestone Completed: {{milestoneTitle}}',
    '<h1>Great News!</h1><p>A campaign you supported has reached a milestone!</p><p><strong>{{campaignTitle}}</strong> has completed: <strong>{{milestoneTitle}}</strong></p><p>{{milestoneDescription}}</p><p>View the proof and updates: {{campaignUrl}}</p><p>Thank you for your support!</p>',
    'Great News!\n\nA campaign you supported has reached a milestone!\n\n{{campaignTitle}} has completed: {{milestoneTitle}}\n\n{{milestoneDescription}}\n\nView the proof and updates: {{campaignUrl}}\n\nThank you for your support!',
    '["campaignTitle", "milestoneTitle", "milestoneDescription", "campaignUrl"]'::jsonb
  ),
  (
    'fund_released',
    'Funds Released for {{campaignTitle}}',
    '<h1>Funds Released</h1><p>Dear {{charityName}},</p><p>We are pleased to inform you that funds have been released for your campaign: <strong>{{campaignTitle}}</strong></p><p>Amount: <strong>{{amount}}</strong></p><p>The funds will be transferred to your registered bank account within 3-5 business days.</p><p>View details: {{dashboardUrl}}</p>',
    'Funds Released\n\nDear {{charityName}},\n\nWe are pleased to inform you that funds have been released for your campaign: {{campaignTitle}}\n\nAmount: {{amount}}\n\nThe funds will be transferred to your registered bank account within 3-5 business days.\n\nView details: {{dashboardUrl}}',
    '["charityName", "campaignTitle", "amount", "dashboardUrl"]'::jsonb
  );

COMMENT ON TABLE public.notifications IS 'Stores in-app notifications for users';
COMMENT ON TABLE public.notification_preferences IS 'User preferences for email and in-app notifications';
COMMENT ON TABLE public.email_templates IS 'Customizable email templates for different notification types';
COMMENT ON FUNCTION create_notification IS 'Creates a notification with automatic preference checking';
