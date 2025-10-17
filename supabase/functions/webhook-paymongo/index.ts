import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY');
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // 1. Get webhook signature (TODO: Implement signature verification for production)
    const signature = req.headers.get('paymongo-signature');
    const body = await req.text();
    console.log('Received webhook event');
    // Parse webhook event
    const event = JSON.parse(body);
    // 2. Initialize Supabase client
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    // 3. Log webhook event
    const { data: loggedEvent } = await supabase.from('webhook_events').insert({
      provider: 'paymongo',
      event_id: event.data.id,
      event_type: event.data.attributes.type,
      payload: event,
      processed: false
    }).select().single();
    console.log('Webhook event logged:', loggedEvent?.id);
    // 4. Handle different event types
    const eventType = event.data.attributes.type;
    const resource = event.data.attributes.data;
    console.log('Processing event type:', eventType);
    switch(eventType){
      case 'source.chargeable':
        {
          // Source is ready to be charged (user completed GCash authorization)
          const sourceId = resource.id;
          console.log('Source chargeable:', sourceId);

          // Find the payment session by source ID first
          // Use explicit foreign key to avoid ambiguity (payment_sessions.donation_id -> donations.id)
          const { data: paymentSession, error: sessionError } = await supabase
            .from('payment_sessions')
            .select('*, donations!payment_sessions_donation_id_fkey (*)')
            .eq('provider_source_id', sourceId)
            .single();

          if (sessionError || !paymentSession || !paymentSession.donations) {
            console.error('Payment session or donation not found for source:', sourceId, sessionError);
            await supabase.from('webhook_events').update({
              processed: true,
              processed_at: new Date().toISOString(),
              error_message: `Donation not found for source: ${sourceId}`,
              payment_session_id: paymentSession?.id
            }).eq('id', loggedEvent?.id);
            break;
          }

          // Get donation from the nested data
          const donation = Array.isArray(paymentSession.donations)
            ? paymentSession.donations[0]
            : paymentSession.donations;

          if (!donation) {
            console.error('Donation not found in payment session for source:', sourceId);
            await supabase.from('webhook_events').update({
              processed: true,
              processed_at: new Date().toISOString(),
              error_message: `Donation not found for source: ${sourceId}`,
              payment_session_id: paymentSession.id
            }).eq('id', loggedEvent?.id);
            break;
          }
          console.log('Found donation:', donation.id);
          // Create a Payment to actually charge the source
          const paymentResponse = await fetch(`${PAYMONGO_API_URL}/payments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  amount: Math.round(donation.amount * 100),
                  currency: 'PHP',
                  source: {
                    id: sourceId,
                    type: 'source'
                  }
                }
              }
            })
          });
          const paymentData = await paymentResponse.json();
          if (paymentResponse.ok) {
            const payment = paymentData.data;
            console.log('Payment created:', payment.id);
            // Update donation status
            await supabase.from('donations').update({
              status: 'completed',
              provider_payment_id: payment.id,
              updated_at: new Date().toISOString()
            }).eq('id', donation.id);
            // Update payment session
            await supabase.from('payment_sessions').update({
              status: 'succeeded',
              completed_at: new Date().toISOString(),
              metadata: {
                payment_id: payment.id,
                payment_status: payment.attributes.status
              }
            }).eq('id', paymentSession.id);
            // Update campaign amount using RPC function
            const { error: rpcError } = await supabase.rpc('increment_campaign_amount', {
              p_campaign_id: donation.campaign_id,
              p_amount: donation.amount
            });
            if (rpcError) {
              console.error('Failed to increment campaign amount:', rpcError);
            }
            console.log('Campaign amount incremented for campaign:', donation.campaign_id);
            // Mark webhook as processed
            await supabase.from('webhook_events').update({
              processed: true,
              processed_at: new Date().toISOString(),
              donation_id: donation.id,
              payment_session_id: paymentSession.id
            }).eq('id', loggedEvent?.id);
          } else {
            console.error('Failed to create payment:', paymentData);
            // Update donation as failed
            await supabase.from('donations').update({
              status: 'failed',
              failure_reason: paymentData.errors?.[0]?.detail || 'Payment creation failed',
              updated_at: new Date().toISOString()
            }).eq('id', donation.id);
            // Mark webhook as processed with error
            await supabase.from('webhook_events').update({
              processed: true,
              processed_at: new Date().toISOString(),
              error_message: paymentData.errors?.[0]?.detail || 'Payment creation failed'
            }).eq('id', loggedEvent?.id);
          }
          break;
        }
      case 'payment.paid':
        {
          // Direct payment completed (for cards)
          const paymentId = resource.id;
          console.log('Payment paid:', paymentId);
          await supabase.from('donations').update({
            status: 'completed',
            updated_at: new Date().toISOString()
          }).eq('provider_payment_id', paymentId);
          // Mark webhook as processed
          await supabase.from('webhook_events').update({
            processed: true,
            processed_at: new Date().toISOString()
          }).eq('id', loggedEvent?.id);
          break;
        }
      case 'payment.failed':
        {
          // Payment failed
          const paymentId = resource.id;
          const failureReason = resource.attributes.last_payment_error?.message || 'Payment failed';
          console.log('Payment failed:', paymentId, failureReason);
          await supabase.from('donations').update({
            status: 'failed',
            failure_reason: failureReason,
            updated_at: new Date().toISOString()
          }).eq('provider_payment_id', paymentId);
          // Update payment session status
          const { data: donation } = await supabase.from('donations').select('payment_session_id').eq('provider_payment_id', paymentId).single();
          if (donation?.payment_session_id) {
            await supabase.from('payment_sessions').update({
              status: 'failed',
              updated_at: new Date().toISOString()
            }).eq('id', donation.payment_session_id);
          }
          // Mark webhook as processed
          await supabase.from('webhook_events').update({
            processed: true,
            processed_at: new Date().toISOString()
          }).eq('id', loggedEvent?.id);
          break;
        }
      default:
        console.log('Unhandled event type:', eventType);
        // Mark as processed anyway
        await supabase.from('webhook_events').update({
          processed: true,
          processed_at: new Date().toISOString(),
          error_message: `Unhandled event type: ${eventType}`
        }).eq('id', loggedEvent?.id);
    }
    return new Response(JSON.stringify({
      received: true
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
