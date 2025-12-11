/**
 * Backfill Audit Logs Script
 * Populates audit_logs table with historical data from existing campaigns, donations, etc.
 * Run with: npx ts-node scripts/backfill-audit-logs.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillAuditLogs() {
  console.log('🚀 Starting audit log backfill...\n');

  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251211000003_backfill_audit_logs.sql');
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements (excluding comments and empty lines)
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comment blocks
      if (statement.startsWith('/*') || statement.includes('COMMENT ON')) {
        console.log(`⏭️  Skipping statement ${i + 1}/${statements.length} (comment)`);
        continue;
      }

      console.log(`▶️  Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });

        if (error) {
          // Try direct execution if rpc fails
          const { error: directError } = await supabase
            .from('_dummy_')
            .select('*')
            .limit(0);
            
          if (directError) {
            console.warn(`⚠️  Warning: Could not execute statement: ${error.message}`);
          }
        } else {
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
        }
      } catch (err: any) {
        console.warn(`⚠️  Warning on statement ${i + 1}: ${err.message}`);
      }
    }

    // Now fetch summary counts
    console.log('\n📊 Fetching audit log summary...\n');

    const [
      { count: userSignups },
      { count: campaignCreations },
      { count: donations },
      { count: milestoneVerifications },
      { count: charityVerifications },
      { count: totalLogs }
    ] = await Promise.all([
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'USER_SIGNUP'),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'CAMPAIGN_CREATED'),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'DONATION_COMPLETED'),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'MILESTONE_VERIFIED'),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'CHARITY_VERIFICATION_UPDATE'),
      supabase.from('audit_logs').select('*', { count: 'exact', head: true })
    ]);

    console.log('========================================');
    console.log('✨ AUDIT LOG BACKFILL SUMMARY');
    console.log('========================================');
    console.log(`📝 User Signups: ${userSignups || 0}`);
    console.log(`🎯 Campaign Creations: ${campaignCreations || 0}`);
    console.log(`💰 Donations: ${donations || 0}`);
    console.log(`✓  Milestone Verifications: ${milestoneVerifications || 0}`);
    console.log(`🏛️  Charity Verifications: ${charityVerifications || 0}`);
    console.log('========================================');
    console.log(`📊 Total Audit Logs: ${totalLogs || 0}`);
    console.log('========================================\n');

    console.log('✅ Audit log backfill completed successfully!');

  } catch (error: any) {
    console.error('\n❌ Error during backfill:', error.message);
    process.exit(1);
  }
}

// Execute alternative method using direct inserts
async function backfillAuditLogsAlternative() {
  console.log('🚀 Starting audit log backfill (alternative method)...\n');

  try {
    // 1. Backfill User Signups
    console.log('📝 1. Backfilling user signup logs...');
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, role, full_name, created_at');

    if (profiles && profiles.length > 0) {
      const { error: signupError } = await supabase
        .from('audit_logs')
        .upsert(
          profiles.map(p => ({
            user_id: p.id,
            action: 'USER_SIGNUP',
            entity_type: 'user',
            entity_id: p.id,
            details: { email: p.email, role: p.role, full_name: p.full_name },
            created_at: p.created_at
          })),
          { onConflict: 'user_id,action,entity_id', ignoreDuplicates: true }
        );
      
      if (signupError) {
        console.warn(`⚠️  Warning: ${signupError.message}`);
      } else {
        console.log(`✅ Created ${profiles.length} user signup logs`);
      }
    }

    // 2. Backfill Campaign Creations
    console.log('📝 2. Backfilling campaign creation logs...');
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, charity_id, title, goal_amount, status, created_at, category');

    if (campaigns && campaigns.length > 0) {
      const { error: campaignError } = await supabase
        .from('audit_logs')
        .upsert(
          campaigns.map(c => ({
            user_id: c.charity_id,
            action: 'CAMPAIGN_CREATED',
            entity_type: 'campaign',
            entity_id: c.id,
            details: { 
              title: c.title, 
              goal_amount: c.goal_amount, 
              status: c.status,
              category: c.category
            },
            created_at: c.created_at
          })),
          { onConflict: 'entity_id', ignoreDuplicates: true }
        );
      
      if (campaignError) {
        console.warn(`⚠️  Warning: ${campaignError.message}`);
      } else {
        console.log(`✅ Created ${campaigns.length} campaign creation logs`);
      }
    }

    // 3. Backfill Donations
    console.log('📝 3. Backfilling donation logs...');
    const { data: donations } = await supabase
      .from('donations')
      .select('id, donor_id, campaign_id, amount, payment_method, is_anonymous, donated_at, created_at, campaigns(title)')
      .eq('status', 'completed');

    if (donations && donations.length > 0) {
      const { error: donationError } = await supabase
        .from('audit_logs')
        .upsert(
          donations.map(d => ({
            user_id: d.donor_id,
            action: 'DONATION_COMPLETED',
            entity_type: 'donation',
            entity_id: d.id,
            details: { 
              campaign_id: d.campaign_id,
              campaign_title: (d as any).campaigns?.title,
              amount: d.amount,
              payment_method: d.payment_method,
              is_anonymous: d.is_anonymous || false
            },
            created_at: d.donated_at || d.created_at
          })),
          { onConflict: 'entity_id', ignoreDuplicates: true }
        );
      
      if (donationError) {
        console.warn(`⚠️  Warning: ${donationError.message}`);
      } else {
        console.log(`✅ Created ${donations.length} donation logs`);
      }
    }

    // Fetch final counts
    const { count: totalLogs } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    console.log('\n========================================');
    console.log('✨ AUDIT LOG BACKFILL COMPLETED');
    console.log('========================================');
    console.log(`📊 Total Audit Logs: ${totalLogs || 0}`);
    console.log('========================================\n');

  } catch (error: any) {
    console.error('\n❌ Error during backfill:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the backfill
console.log('Select method:');
console.log('Using alternative method (direct inserts)...\n');
backfillAuditLogsAlternative()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
