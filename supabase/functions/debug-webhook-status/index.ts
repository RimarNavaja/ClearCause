import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('========== DEBUG WEBHOOK STATUS ==========');
    console.log('Timestamp:', new Date().toISOString());

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Get recent webhook events
    const { data: webhookEvents, error: webhookError } = await supabase
      .from('webhook_events')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(10);

    // 2. Get pending donations with payment sessions
    const { data: pendingDonations, error: donationsError } = await supabase
      .from('donations')
      .select(`
        id,
        amount,
        status,
        payment_method,
        payment_session_id,
        campaign_id,
        donated_at,
        payment_sessions (
          id,
          provider_source_id,
          status,
          created_at
        )
      `)
      .eq('status', 'pending')
      .order('donated_at', { ascending: false })
      .limit(10);

    // 3. Get recent payment sessions
    const { data: paymentSessions, error: sessionsError } = await supabase
      .from('payment_sessions')
      .select('id, provider_source_id, status, amount, created_at, donation_id')
      .order('created_at', { ascending: false })
      .limit(10);

    // 4. Get recent campaigns to check amounts
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, title, current_amount, donor_count, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5);

    // 5. Count statistics
    const { count: totalWebhooks } = await supabase
      .from('webhook_events')
      .select('*', { count: 'exact', head: true });

    const { count: processedWebhooks } = await supabase
      .from('webhook_events')
      .select('*', { count: 'exact', head: true })
      .eq('processed', true);

    const { count: pendingCount } = await supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: completedCount } = await supabase
      .from('donations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // 6. Environment configuration check
    const config = {
      supabaseUrl: Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasPayMongoSecret: !!Deno.env.get('PAYMONGO_SECRET_KEY'),
      appUrl: Deno.env.get('VITE_APP_URL'),
      expectedWebhookUrl: `https://${Deno.env.get('SUPABASE_URL')?.replace('https://', '')}/functions/v1/webhook-paymongo`,
    };

    // Build debug response
    const debugInfo = {
      timestamp: new Date().toISOString(),
      configuration: config,
      statistics: {
        totalWebhookEvents: totalWebhooks,
        processedWebhookEvents: processedWebhooks,
        unprocessedWebhookEvents: (totalWebhooks || 0) - (processedWebhooks || 0),
        pendingDonations: pendingCount,
        completedDonations: completedCount,
      },
      recentWebhookEvents: webhookEvents?.map(event => ({
        id: event.id,
        eventType: event.event_type,
        processed: event.processed,
        receivedAt: event.received_at,
        processedAt: event.processed_at,
        errorMessage: event.error_message,
        donationId: event.donation_id,
        paymentSessionId: event.payment_session_id,
      })),
      pendingDonations: pendingDonations?.map(donation => ({
        id: donation.id,
        amount: donation.amount,
        status: donation.status,
        paymentMethod: donation.payment_method,
        donatedAt: donation.donated_at,
        campaignId: donation.campaign_id,
        paymentSession: donation.payment_sessions ? {
          id: donation.payment_sessions.id,
          sourceId: donation.payment_sessions.provider_source_id,
          status: donation.payment_sessions.status,
          createdAt: donation.payment_sessions.created_at,
        } : null,
      })),
      recentPaymentSessions: paymentSessions?.map(session => ({
        id: session.id,
        sourceId: session.provider_source_id,
        status: session.status,
        amount: session.amount,
        donationId: session.donation_id,
        createdAt: session.created_at,
      })),
      recentCampaigns: campaigns?.map(campaign => ({
        id: campaign.id,
        title: campaign.title,
        currentAmount: campaign.current_amount,
        donorCount: campaign.donor_count,
        updatedAt: campaign.updated_at,
      })),
      errors: {
        webhookError: webhookError?.message,
        donationsError: donationsError?.message,
        sessionsError: sessionsError?.message,
        campaignsError: campaignsError?.message,
      },
    };

    console.log('Debug info generated successfully');
    console.log('Pending donations:', pendingCount);
    console.log('Total webhooks:', totalWebhooks);
    console.log('Processed webhooks:', processedWebhooks);

    return new Response(
      JSON.stringify(debugInfo, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
