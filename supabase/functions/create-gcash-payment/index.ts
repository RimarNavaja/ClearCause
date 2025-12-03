import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY')!;
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

interface CreatePaymentRequest {
  donationId: string;
  amount: number;
  userId: string;
}

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
    // 1. Parse request
    const { donationId, amount, userId }: CreatePaymentRequest = await req.json();

    console.log('========== CREATE GCASH PAYMENT REQUEST ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request details:', {
      donationId,
      amount,
      userId,
      appUrl: Deno.env.get('VITE_APP_URL')
    });

    // 2. Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 3. Validate donation exists and is pending
    console.log('Validating donation...');
    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .select('*')
      .eq('id', donationId)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (donationError || !donation) {
      console.error('❌ Donation validation failed:', donationError);
      return new Response(
        JSON.stringify({ error: 'Invalid donation or donation not found' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Donation validated:', {
      donationId: donation.id,
      amount: donation.amount,
      status: donation.status,
      campaignId: donation.campaign_id
    });

    // 4. Create PayMongo Source for GCash
    const amountInCentavos = Math.round(amount * 100); // Convert PHP to centavos

    // Check for GCash limit (100,000 PHP = 10,000,000 centavos)
    if (amountInCentavos > 10000000) {
      throw new Error('Amount exceeds the maximum limit of ₱100,000 for GCash transactions. Please try a smaller amount or use a different payment method.');
    }

    const successUrl = `${Deno.env.get('VITE_APP_URL')}/donate/success?donation_id=${donationId}`;
    const failedUrl = `${Deno.env.get('VITE_APP_URL')}/donate/error?donation_id=${donationId}`;

    console.log('Creating PayMongo source...');
    console.log('Amount:', amountInCentavos, 'centavos (', amount, 'PHP)');
    console.log('Success URL:', successUrl);
    console.log('Failed URL:', failedUrl);

    const sourceResponse = await fetch(`${PAYMONGO_API_URL}/sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(PAYMONGO_SECRET_KEY + ':')}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            type: 'gcash',
            amount: amountInCentavos,
            currency: 'PHP',
            redirect: {
              success: successUrl,
              failed: failedUrl,
            },
          },
        },
      }),
    });

    const sourceData = await sourceResponse.json();

    if (!sourceResponse.ok) {
      console.error('❌ PayMongo source creation failed');
      console.error('Status code:', sourceResponse.status);
      console.error('Error response:', sourceData);
      throw new Error(sourceData.errors?.[0]?.detail || 'Failed to create payment source');
    }

    const source = sourceData.data;
    console.log('✅ PayMongo source created successfully:', {
      sourceId: source.id,
      status: source.attributes.status,
      type: source.attributes.type,
      amount: source.attributes.amount / 100,
      checkoutUrl: source.attributes.redirect.checkout_url
    });

    // 5. Save payment session
    console.log('Saving payment session to database...');
    const sessionData = {
      donation_id: donationId,
      user_id: userId,
      provider: 'paymongo',
      provider_session_id: source.id,
      provider_source_id: source.id,
      amount: amount,
      currency: 'PHP',
      payment_method: 'gcash',
      checkout_url: source.attributes.redirect.checkout_url,
      success_url: source.attributes.redirect.success,
      cancel_url: source.attributes.redirect.failed,
      status: 'created',
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour expiry
      metadata: {
        source_status: source.attributes.status,
      },
    };
    console.log('Session data:', sessionData);

    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (sessionError) {
      console.error('❌ Failed to save payment session:', sessionError);
      // Continue anyway, don't block user
    } else {
      console.log('✅ Payment session saved:', {
        sessionId: session.id,
        sourceId: source.id,
        status: session.status
      });
    }

    // 6. Update donation with session reference
    console.log('Updating donation with payment session reference...');
    const { error: updateError } = await supabase
      .from('donations')
      .update({
        payment_session_id: session?.id,
        provider: 'paymongo',
        metadata: {
          source_id: source.id,
        },
      })
      .eq('id', donationId);

    if (updateError) {
      console.error('❌ Failed to update donation:', updateError);
    } else {
      console.log('✅ Donation updated with session reference');
    }

    // 7. Return checkout URL
    console.log('Returning checkout URL to client...');
    console.log('Checkout URL:', source.attributes.redirect.checkout_url);
    console.log('========== PAYMENT CREATION COMPLETE ==========\n');

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: source.attributes.redirect.checkout_url,
        sessionId: session?.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Payment creation error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create payment',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
