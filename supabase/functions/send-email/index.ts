import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  schema: string;
  record: any; // Notification record
  old_record: null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    console.log('[send-email] Received webhook payload:', payload.type);

    if (payload.type !== 'INSERT' || payload.table !== 'notifications') {
      return new Response('Ignored', { headers: corsHeaders });
    }

    const notification = payload.record;
    console.log('Processing notification:', notification.id, notification.type);

    // Initialize Supabase Admin Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get User Profile (Email) and Preferences
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', notification.user_id)
      .single();

    if (profileError || !userProfile || !userProfile.email) {
      console.error('User profile or email not found:', profileError);
      return new Response('User email not found', { status: 400, headers: corsHeaders });
    }

    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', notification.user_id)
      .single();

    if (prefError) {
      console.error('Preferences not found:', prefError);
      return new Response('Preferences not found', { status: 400, headers: corsHeaders });
    }

    // 2. Check if Email is enabled for this type
    if (!preferences.email_enabled) {
      console.log('Global email notifications disabled for user');
      return new Response('Email disabled', { headers: corsHeaders });
    }

    // Map notification type to preference column
    const typeToPrefColumn: Record<string, string> = {
      'donation_received': 'email_donation_received',
      'donation_confirmed': 'email_donation_confirmed',
      'campaign_update': 'email_campaign_update',
      'milestone_completed': 'email_milestone_completed',
      'milestone_verified': 'email_milestone_verified',
      'fund_released': 'email_fund_released',
      'review_approved': 'email_review_moderated',
      'review_rejected': 'email_review_moderated',
      'campaign_approved': 'email_campaign_moderated',
      'campaign_rejected': 'email_campaign_moderated',
      'charity_verified': 'email_charity_verified',
      'charity_rejected': 'email_charity_verified',
      'thank_you_message': 'email_thank_you',
      'system_announcement': 'email_system_announcements'
    };

    const prefColumn = typeToPrefColumn[notification.type];
    if (prefColumn && !preferences[prefColumn]) {
      console.log(`Email notifications disabled for type: ${notification.type}`);
      return new Response('Email type disabled', { headers: corsHeaders });
    }

    // 3. Get Email Template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('type', notification.type)
      .single();

    if (templateError || !template) {
      console.log(`No email template for type: ${notification.type}, using default`);
      // Fallback: Use notification title/message
    }

    // 4. Prepare Email Content
    let subject = template?.subject || notification.title;
    let htmlBody = template?.html_body || `<p>${notification.message}</p>`;
    let textBody = template?.text_body || notification.message;

    // Replace variables (simple implementation)
    // Metadata contains the dynamic values
    const metadata = notification.metadata || {};
    const variables = {
      ...metadata,
      donorName: userProfile.full_name || 'Donor', // Default var
      appName: 'ClearCause',
    };

    Object.keys(variables).forEach(key => {
      const value = variables[key];
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value));
      htmlBody = htmlBody.replace(regex, String(value));
      textBody = textBody.replace(regex, String(value));
    });

    // 5. Send Email
    console.log(`Sending email to ${userProfile.email}...`);
    console.log(`Subject: ${subject}`);

    let emailSent = false;

    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'ClearCause <noreply@clearcause.org>', // Replace with verified domain
          to: [userProfile.email],
          subject: subject,
          html: htmlBody,
          text: textBody,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Email sent via Resend:', data);
        emailSent = true;
      } else {
        const err = await res.json();
        console.error('Resend API error:', err);
      }
    } else {
      console.log('RESEND_API_KEY not set. simulating email send.');
      console.log('--- EMAIL CONTENT ---');
      console.log(textBody);
      console.log('---------------------');
      // Simulate success in dev
      emailSent = true; 
    }

    // 6. Update Notification Status
    if (emailSent) {
      await supabase
        .from('notifications')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .eq('id', notification.id);
    }

    return new Response(JSON.stringify({ success: emailSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error processing webhook:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});