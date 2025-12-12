import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY')!;
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

// Gateway fee rate (2.5%) - Matches frontend feeCalculator.ts
const GATEWAY_FEE_RATE = 0.025;

// Fetch configurable platform fee rate from database
async function getPlatformFeeRate(supabase: any): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_fee_percentage')
      .single();

    if (error || !data) {
      console.warn('⚠️  Failed to fetch platform fee percentage, using default 5%:', error?.message);
      return 0.05; // Fallback to 5%
    }

    const percentage = Number(data.value);
    console.log('✅ Using platform fee rate:', percentage + '%');
    return percentage / 100; // Convert 5 -> 0.05
  } catch (err) {
    console.error('❌ Error fetching platform fee:', err);
    return 0.05; // Fallback to 5%
  }
}

// Fetch configurable minimum donation from database
async function getMinimumDonation(supabase: any): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'minimum_donation_amount')
      .single();

    if (error || !data) {
      console.warn('⚠️  Failed to fetch minimum donation, using default ₱100:', error?.message);
      return 100; // Fallback to ₱100
    }

    const amount = Number(data.value);
    console.log('✅ Using minimum donation:', '₱' + amount);
    return amount;
  } catch (err) {
    console.error('❌ Error fetching minimum donation:', err);
    return 100; // Fallback to ₱100
  }
}

interface FeeBreakdown {
  grossAmount: number;      // Donor's intended donation
  platformFee: number;      // ClearCause fee
  tipAmount: number;        // Optional tip
  netAmount: number;        // Amount to charity
  totalCharge: number;      // Total charged to donor
  donorCoversFees: boolean; // Whether donor is covering fees
  gatewayFee: number;       // Payment processor fee
}

function calculateDonationFees(
  grossAmount: number,
  tipAmount: number = 0,
  coverFees: boolean = true,
  platformFeeRate: number
): FeeBreakdown {
  if (coverFees) {
    // Donor covers fees - charity gets 100% of intended donation
    const platformFee = Math.round(grossAmount * platformFeeRate * 100) / 100;
    
    // Amount we want to receive (Donation + Platform Fee + Tip)
    const amountToReceive = grossAmount + platformFee + tipAmount;

    // Calculate total charge needed to cover gateway fees
    // Formula: AmountToReceive / (1 - GatewayRate)
    const totalCharge = amountToReceive / (1 - GATEWAY_FEE_RATE);
    
    // Gateway fee is the difference
    const gatewayFee = totalCharge - amountToReceive;

    return {
      grossAmount,
      platformFee,
      tipAmount,
      netAmount: grossAmount,  // Charity gets 100% of donation (tip goes to ClearCause!)
      totalCharge,
      donorCoversFees: true,
      gatewayFee
    };
  } else {
    // Standard deduction - fees deducted from donation
    const platformFee = Math.round(grossAmount * platformFeeRate * 100) / 100;
    
    // Gateway fee is deducted from the gross amount
    const gatewayFee = grossAmount * GATEWAY_FEE_RATE;
    
    const totalCharge = grossAmount + tipAmount;
    
    // Charity gets donation minus (platform fee + gateway fee)
    const netAmount = grossAmount - platformFee - gatewayFee;

    return {
      grossAmount,
      platformFee,
      tipAmount,
      netAmount,
      totalCharge,
      donorCoversFees: false,
      gatewayFee
    };
  }
}

interface CreatePaymentRequest {
  donationId: string;
  amount: number;
  tipAmount?: number;
  coverFees?: boolean;
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
    const { donationId, amount, tipAmount = 0, coverFees = true, userId }: CreatePaymentRequest = await req.json();

    console.log('========== CREATE GCASH PAYMENT REQUEST ==========');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Request details:', {
      donationId,
      amount,
      tipAmount,
      coverFees,
      userId,
      appUrl: Deno.env.get('VITE_APP_URL')
    });

    // 2. Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        global: {
          headers: {
            'Cache-Control': 'no-cache' // Force bypass Supabase API cache
          }
        }
      }
    );

    // 2.5. Fetch configurable platform fee rate
    const PLATFORM_FEE_RATE = await getPlatformFeeRate(supabase);
    console.log('Platform fee rate for this donation:', (PLATFORM_FEE_RATE * 100) + '%');

    // 2.6. Fetch minimum donation amount
    const MIN_DONATION = await getMinimumDonation(supabase);
    console.log('Minimum donation amount:', '₱' + MIN_DONATION);

    // 2.7. Validate donation amount
    if (amount < MIN_DONATION) {
      console.error('❌ Donation amount validation failed:', amount, '< MIN:', MIN_DONATION);
      return new Response(
        JSON.stringify({
          error: 'INVALID_AMOUNT',
          message: `Minimum donation is ₱${MIN_DONATION}`,
          details: { minimumRequired: MIN_DONATION, provided: amount }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // 4. Calculate fees
    const fees = calculateDonationFees(amount, tipAmount, coverFees, PLATFORM_FEE_RATE);
    console.log('Fee breakdown:', fees);

    // Validate minimum net amount to charity (₱50 minimum)
    if (fees.netAmount < 50) {
      throw new Error('Donation amount too low. Charity must receive at least ₱50 after fees.');
    }

    // Convert total charge to centavos for PayMongo
    const amountInCentavos = Math.round(fees.totalCharge * 100);

    // Check for GCash limit (100,000 PHP = 10,000,000 centavos)
    if (amountInCentavos > 10000000) {
      throw new Error(`Total charge ₱${fees.totalCharge.toLocaleString()} exceeds GCash limit of ₱100,000. Please reduce donation or tip amount.`);
    }

    const successUrl = `${Deno.env.get('VITE_APP_URL')}/donate/success?donation_id=${donationId}`;
    const failedUrl = `${Deno.env.get('VITE_APP_URL')}/donate/error?donation_id=${donationId}`;

    console.log('Creating PayMongo source...');
    console.log('Amount:', amountInCentavos, 'centavos (₱', fees.totalCharge, 'PHP)');
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

    // 5. Save payment session with fee breakdown
    console.log('Saving payment session to database...');
    const sessionData = {
      donation_id: donationId,
      user_id: userId,
      provider: 'paymongo',
      provider_session_id: source.id,
      provider_source_id: source.id,
      amount: fees.grossAmount,
      currency: 'PHP',
      payment_method: 'gcash',
      checkout_url: source.attributes.redirect.checkout_url,
      success_url: source.attributes.redirect.success,
      cancel_url: source.attributes.redirect.failed,
      status: 'created',
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour expiry
      metadata: {
        source_status: source.attributes.status,
        fees: {
          grossAmount: fees.grossAmount,
          platformFee: fees.platformFee,
          platformFeePercentage: PLATFORM_FEE_RATE * 100, // Store as percentage for history
          tipAmount: fees.tipAmount,
          netAmount: fees.netAmount,
          totalCharge: fees.totalCharge,
          donorCoversFees: coverFees,  // Store the actual checkbox value!
          gatewayFee: fees.gatewayFee  // New field
        }
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
