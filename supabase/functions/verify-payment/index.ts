import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY');
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

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
    console.log('========== VERIFY PAYMENT REQUEST ==========');
    console.log('Timestamp:', new Date().toISOString());

    const { donationId } = await req.json();

    if (!donationId) {
      return new Response(
        JSON.stringify({ error: 'Donation ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Donation ID:', donationId);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get donation and payment session
    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .select(`
        *,
        payment_sessions!payment_sessions_donation_id_fkey (*)
      `)
      .eq('id', donationId)
      .single();

    if (donationError || !donation) {
      console.error('❌ Donation not found:', donationError);
      return new Response(
        JSON.stringify({ error: 'Donation not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Donation found:', {
      id: donation.id,
      status: donation.status,
      amount: donation.amount,
      campaignId: donation.campaign_id,
    });

    // If donation is already completed, return success
    if (donation.status === 'completed') {
      console.log('✅ Donation already completed');
      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          message: 'Donation already processed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get payment session
    const paymentSession = Array.isArray(donation.payment_sessions)
      ? donation.payment_sessions[0]
      : donation.payment_sessions;

    if (!paymentSession) {
      console.error('❌ Payment session not found');
      return new Response(
        JSON.stringify({ error: 'Payment session not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Payment session found:', {
      id: paymentSession.id,
      status: paymentSession.status,
      sourceId: paymentSession.provider_source_id,
    });

    // If payment session is already succeeded, just update donation
    if (paymentSession.status === 'succeeded') {
      console.log('Payment session already succeeded, updating donation...');

      const { error: updateError } = await supabase
        .from('donations')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', donationId);

      if (updateError) {
        console.error('❌ Failed to update donation:', updateError);
      }

      // Update campaign amount
      const { error: rpcError } = await supabase.rpc('increment_campaign_amount', {
        p_campaign_id: donation.campaign_id,
        p_amount: donation.amount,
      });

      if (rpcError) {
        console.error('❌ Failed to increment campaign amount:', rpcError);
      } else {
        console.log('✅ Campaign amount incremented');
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          message: 'Payment verified and donation completed',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check source status from PayMongo
    const sourceId = paymentSession.provider_source_id;
    console.log('Checking PayMongo source status:', sourceId);

    const sourceResponse = await fetch(`${PAYMONGO_API_URL}/sources/${sourceId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`,
      },
    });

    if (!sourceResponse.ok) {
      console.error('❌ Failed to fetch source from PayMongo');
      const errorData = await sourceResponse.json();
      console.error('PayMongo error:', errorData);

      return new Response(
        JSON.stringify({
          success: false,
          status: 'pending',
          message: 'Could not verify payment status',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const sourceData = await sourceResponse.json();
    const source = sourceData.data;

    console.log('PayMongo source status:', {
      sourceId: source.id,
      status: source.attributes.status,
      type: source.attributes.type,
    });

    // If source is chargeable, create a payment
    if (source.attributes.status === 'chargeable') {
      console.log('✅ Source is chargeable, creating payment...');

      const paymentResponse = await fetch(`${PAYMONGO_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: Math.round(donation.amount * 100),
              currency: 'PHP',
              source: {
                id: sourceId,
                type: 'source',
              },
            },
          },
        }),
      });

      const paymentData = await paymentResponse.json();

      if (paymentResponse.ok) {
        const payment = paymentData.data;
        console.log('✅ Payment created successfully:', {
          paymentId: payment.id,
          status: payment.attributes.status,
          amount: payment.attributes.amount / 100,
        });

        // Update donation status
        console.log('Updating donation status to completed...');
        const { error: donationUpdateError } = await supabase
          .from('donations')
          .update({
            status: 'completed',
            provider_payment_id: payment.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', donation.id);

        if (donationUpdateError) {
          console.error('❌ Failed to update donation:', donationUpdateError);
        } else {
          console.log('✅ Donation updated to completed');
        }

        // Update payment session
        console.log('Updating payment session status...');
        const { error: sessionUpdateError } = await supabase
          .from('payment_sessions')
          .update({
            status: 'succeeded',
            completed_at: new Date().toISOString(),
            metadata: {
              payment_id: payment.id,
              payment_status: payment.attributes.status,
            },
          })
          .eq('id', paymentSession.id);

        if (sessionUpdateError) {
          console.error('❌ Failed to update payment session:', sessionUpdateError);
        } else {
          console.log('✅ Payment session updated to succeeded');
        }

        // Update campaign amount using RPC function
        console.log('Incrementing campaign amount...');
        const { error: rpcError } = await supabase.rpc('increment_campaign_amount', {
          p_campaign_id: donation.campaign_id,
          p_amount: donation.amount,
        });

        if (rpcError) {
          console.error('❌ Failed to increment campaign amount:', rpcError);
        } else {
          console.log('✅ Campaign amount incremented successfully');

          // Verify the campaign was updated
          const { data: updatedCampaign, error: campaignError } = await supabase
            .from('campaigns')
            .select('id, title, current_amount, donors_count')
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
            });
          }
        }

        console.log('========== PAYMENT VERIFICATION COMPLETE ==========\n');

        return new Response(
          JSON.stringify({
            success: true,
            status: 'completed',
            message: 'Payment verified and donation completed',
            paymentId: payment.id,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        console.error('❌ Failed to create payment');
        console.error('PayMongo response:', paymentData);

        // Update donation as failed
        await supabase
          .from('donations')
          .update({
            status: 'failed',
            failure_reason: paymentData.errors?.[0]?.detail || 'Payment creation failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', donation.id);

        return new Response(
          JSON.stringify({
            success: false,
            status: 'failed',
            message: paymentData.errors?.[0]?.detail || 'Payment failed',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    } else {
      // Source is not chargeable yet
      console.log('⏳ Source not chargeable yet, status:', source.attributes.status);

      return new Response(
        JSON.stringify({
          success: false,
          status: 'pending',
          message: `Payment is still ${source.attributes.status}`,
          sourceStatus: source.attributes.status,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to verify payment',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
