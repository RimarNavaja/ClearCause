/**
 * Edge Function: Process Expired Campaigns
 *
 * This function is called daily by pg_cron to check for:
 * 1. Campaigns that expired (end_date + 7 days passed) without reaching funding goal
 * 2. Campaigns that were cancelled with donations
 *
 * It automatically initiates the refund process for eligible campaigns.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Verify authorization (cron secret)
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error('[process-expired-campaigns] Unauthorized cron request')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('[process-expired-campaigns] Starting scheduled job...')
    const startTime = Date.now()

    // Call database function to process expired campaigns
    const { data, error } = await supabase.rpc('process_expired_campaigns')

    if (error) {
      console.error('[process-expired-campaigns] Error:', error)
      return new Response(
        JSON.stringify({
          error: error.message,
          details: error.details || null
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const processedCount = data?.length || 0
    const duration = Date.now() - startTime

    console.log(`[process-expired-campaigns] Processed ${processedCount} campaigns in ${duration}ms`)

    // Log details of processed campaigns
    if (data && data.length > 0) {
      console.log('[process-expired-campaigns] Processed campaigns:')
      data.forEach((campaign: any) => {
        console.log(`  - ${campaign.campaign_title} (${campaign.trigger_type}): ₱${campaign.total_amount} for ${campaign.affected_donors} donors`)
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        campaigns: data || [],
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (err) {
    console.error('[process-expired-campaigns] Unexpected error:', err)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
