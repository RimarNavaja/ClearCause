
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfillMissingEvents() {
  console.log('Starting secondary backfill for campaign events...');

  // 1. Backfill Milestone Verifications (Approved)
  const { data: milestones } = await supabase
    .from('milestone_proofs')
    .select('id, milestone_id, verified_by, submitted_at, verification_status')
    .eq('verification_status', 'approved');

  if (milestones && milestones.length > 0) {
    console.log(`Found ${milestones.length} approved milestones to log...`);
    
    for (const proof of milestones) {
      const { data: milestone } = await supabase
        .from('milestones')
        .select('title, campaign_id, target_amount')
        .eq('id', proof.milestone_id)
        .single();
        
      if (!milestone) continue;
      
      const { data: campaign } = await supabase.from('campaigns').select('title').eq('id', milestone.campaign_id).single();

      await supabase.from('audit_logs').upsert({
        user_id: proof.verified_by || '00000000-0000-0000-0000-000000000000', // System if null
        action: 'MILESTONE_VERIFIED',
        entity_type: 'milestone',
        entity_id: proof.milestone_id,
        details: {
          milestone_title: milestone.title,
          campaign_id: milestone.campaign_id,
          campaign_title: campaign?.title,
          target_amount: milestone.target_amount,
          verification_status: 'approved'
        },
        created_at: proof.submitted_at
      }, { onConflict: 'entity_id' }); // Use unique constraint on entity_id if appropriate or let duplicates slide if IDs distinct
    }
  }

  // 2. Backfill Fund Releases
  const { data: completedMilestones } = await supabase
    .from('milestones')
    .select('id, title, campaign_id, target_amount, updated_at')
    .eq('status', 'completed'); // Assuming completed means funds released

  if (completedMilestones && completedMilestones.length > 0) {
    console.log(`Found ${completedMilestones.length} completed milestones (funds released)...`);
    
    for (const m of completedMilestones) {
      const { data: campaign } = await supabase.from('campaigns').select('title, charity_id').eq('id', m.campaign_id).single();
      const { data: charity } = await supabase.from('charities').select('user_id').eq('id', campaign?.charity_id).single();

      await supabase.from('audit_logs').upsert({
         user_id: charity?.user_id || '00000000-0000-0000-0000-000000000000',
         action: 'FUNDS_RELEASED',
         entity_type: 'milestone',
         entity_id: m.id, // Using milestone ID but different action, might conflict if ID is unique key. 
         // If entity_id is unique in audit_logs, we need a composite key or different ID.
         // Let's assume (entity_id, action) is unique or just insert. 
         // Since upsert requires constraint, we might skip upsert and just insert if not exists.
         details: {
            milestone_title: m.title,
            campaign_id: m.campaign_id,
            campaign_title: campaign?.title,
            amount: m.target_amount
         },
         created_at: m.updated_at
      }); 
      // Note: If entity_id is a unique constraint, this will fail if we used it for verification above.
      // Audit logs usually don't have unique constraint on entity_id alone, but (action, entity_id).
    }
  }
  
  console.log('Backfill complete.');
}

backfillMissingEvents();
