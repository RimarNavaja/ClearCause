import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY');
const PAYMONGO_WEBHOOK_SECRET = Deno.env.get('PAYMONGO_WEBHOOK_SECRET');
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

// More secure CORS - only allow your app domain
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  Deno.env.get('VITE_APP_URL'),
].filter(Boolean);

const getCorsHeaders = (origin: string | null) => {
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

// Verify webhook signature for security
async function verifyWebhookSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) {
    console.warn('⚠️ Webhook signature verification skipped - missing signature or secret');
    return true; // Allow for now if not configured
  }

  try {
    // PayMongo uses HMAC SHA256 for webhook signatures
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Compare signatures
    const isValid = signature === expectedSignature;

    if (!isValid) {
      console.error('❌ Invalid webhook signature!');
      console.error('Expected:', expectedSignature);
      console.error('Received:', signature);
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

serve(async (req)=>{
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // 1. Get webhook signature and verify it
    const signature = req.headers.get('paymongo-signature');
    const body = await req.text();

    // Verify webhook signature for security
    if (PAYMONGO_WEBHOOK_SECRET) {
      const isValid = await verifyWebhookSignature(body, signature, PAYMONGO_WEBHOOK_SECRET);
      if (!isValid) {
        console.error('❌ Webhook signature verification failed');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      console.log('✅ Webhook signature verified');
    } else {
      console.warn('⚠️ Webhook signature verification disabled - PAYMONGO_WEBHOOK_SECRET not set');
    }

    // DEBUG: Log webhook arrival details
    console.log('========== WEBHOOK RECEIVED ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Content-Type:', req.headers.get('content-type'));

    // Parse webhook event
    const event = JSON.parse(body);
    console.log('Event ID:', event.data?.id);
    console.log('Event Type:', event.data?.attributes?.type);
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
          console.log('\n===== PROCESSING SOURCE.CHARGEABLE =====');
          console.log('Source ID:', sourceId);
          console.log('Source Status:', resource.attributes?.status);
          console.log('Amount:', resource.attributes?.amount / 100, 'PHP');

          // Find the payment session by source ID first
          console.log('Searching for payment session with source_id:', sourceId);

          // Use explicit foreign key to avoid ambiguity (payment_sessions.donation_id -> donations.id)
          const { data: paymentSession, error: sessionError } = await supabase
            .from('payment_sessions')
            .select('*, donations!payment_sessions_donation_id_fkey (*)')
            .eq('provider_source_id', sourceId)
            .single();

          console.log('Payment session lookup result:', {
            found: !!paymentSession,
            error: sessionError?.message,
            sessionId: paymentSession?.id
          });

          if (sessionError || !paymentSession || !paymentSession.donations) {
            console.error('❌ Payment session or donation not found for source:', sourceId);
            console.error('Error details:', sessionError);

            // DEBUG: Query all recent payment sessions to help diagnose
            const { data: recentSessions } = await supabase
              .from('payment_sessions')
              .select('id, provider_source_id, status, created_at')
              .order('created_at', { ascending: false })
              .limit(10);
            console.log('Recent payment sessions in database:', recentSessions);
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
            console.error('❌ Donation not found in payment session for source:', sourceId);
            console.error('Payment session data:', paymentSession);
            await supabase.from('webhook_events').update({
              processed: true,
              processed_at: new Date().toISOString(),
              error_message: `Donation not found for source: ${sourceId}`,
              payment_session_id: paymentSession.id
            }).eq('id', loggedEvent?.id);
            break;
          }
          console.log('✅ Found donation:', {
            donationId: donation.id,
            amount: donation.amount,
            status: donation.status,
            campaignId: donation.campaign_id,
            paymentSessionId: paymentSession.id
          });

          // Create a Payment to actually charge the source
          console.log('Creating PayMongo payment to charge source...');
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
            console.log('✅ Payment created successfully:', {
              paymentId: payment.id,
              status: payment.attributes.status,
              amount: payment.attributes.amount / 100
            });

            // Update donation status
            console.log('Updating donation status to completed...');
            const { error: donationUpdateError } = await supabase.from('donations').update({
              status: 'completed',
              provider_payment_id: payment.id,
              updated_at: new Date().toISOString(),
              metadata: {
                ...donation.metadata,
                fees: paymentSession?.metadata?.fees || {}
              }
            }).eq('id', donation.id);

            if (donationUpdateError) {
              console.error('❌ Failed to update donation:', donationUpdateError);
            } else {
              console.log('✅ Donation updated to completed');
            }

            // Update payment session
            console.log('Updating payment session status...');
            const { error: sessionUpdateError } = await supabase.from('payment_sessions').update({
              status: 'succeeded',
              completed_at: new Date().toISOString(),
              metadata: {
                payment_id: payment.id,
                payment_status: payment.attributes.status
              }
            }).eq('id', paymentSession.id);

            if (sessionUpdateError) {
              console.error('❌ Failed to update payment session:', sessionUpdateError);
            } else {
              console.log('✅ Payment session updated to succeeded');
            }

            // Get fee breakdown from payment session
            const netAmount = paymentSession?.metadata?.fees?.netAmount || donation.amount;

            // Update campaign amount using RPC function
            console.log('Incrementing campaign amount with net amount...');
            console.log('RPC params:', {
              campaign_id: donation.campaign_id,
              amount: netAmount,
              grossAmount: donation.amount
            });

            const { error: rpcError } = await supabase.rpc('increment_campaign_amount', {
              campaign_id: donation.campaign_id,
              amount: netAmount
            });

            if (rpcError) {
              console.error('❌ Failed to increment campaign amount:', rpcError);
            } else {
              console.log('✅ Campaign RPC called successfully');

              // Verify the campaign was updated
              const { data: updatedCampaign, error: campaignError } = await supabase
                .from('campaigns')
                .select('id, title, current_amount, donors_count, updated_at')
                .eq('id', donation.campaign_id)
                .single();

              if (campaignError) {
                console.error('❌ Failed to verify campaign update:', campaignError);
              } else {
                console.log('✅ Campaign after increment:', {
                  id: updatedCampaign.id,
                  title: updatedCampaign.title,
                  currentAmount: updatedCampaign.current_amount,
                  donorCount: updatedCampaign.donors_count,
                  updatedAt: updatedCampaign.updated_at
                });
              }
            }
            // Mark webhook as processed
            console.log('Marking webhook as processed...');
            await supabase.from('webhook_events').update({
              processed: true,
              processed_at: new Date().toISOString(),
              donation_id: donation.id,
              payment_session_id: paymentSession.id
            }).eq('id', loggedEvent?.id);

            console.log('========== WEBHOOK PROCESSING COMPLETE ==========\n');
          } else {
            console.error('❌ Failed to create payment');
            console.error('PayMongo response:', paymentData);
            console.error('Status code:', paymentResponse.status);
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
