import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service role key to bypass RLS policies for setup
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in .env');
  console.log('Available Env Keys:', Object.keys(process.env));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addTestData() {
  const donorId = '0508a8fe-e5c5-4b79-b818-ba497c815563';
  const refundRequestId = '2e0aaa62-72a8-4c89-8ac9-5a09fb127746';
  const donationId = 'd4100d42-0000-4100-8000-000000004111'; // V11
  const campaignId = '2f2145ef-2043-461d-80e9-44f43aa320db';

  console.log('Cleaning up pending decisions...');
  const { error: deleteError } = await supabase
    .from('donor_refund_decisions')
    .delete()
    .eq('donor_id', donorId)
    .eq('status', 'pending');
  
  if (deleteError) console.error('Delete Error:', deleteError);

  console.log('Inserting donation V11...');
  const { error: donationError } = await supabase
    .from('donations')
    .insert({
      id: donationId,
      user_id: donorId,
      campaign_id: campaignId,
      amount: 4100.00,
      status: 'completed',
      payment_method: 'card',
      transaction_id: 'TEST_REFUND_4100_11_USER2',
      donated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

  if (donationError) {
    if (donationError.message.includes('duplicate key')) {
        console.log('Donation already exists, proceeding...');
    } else {
        console.error('Donation Insert Error:', donationError);
        return;
    }
  }

  console.log('Inserting refund decision V11...');
  const { data, error: decisionError } = await supabase
    .from('donor_refund_decisions')
    .insert({
      refund_request_id: refundRequestId,
      donor_id: donorId,
      donation_id: donationId,
      refund_amount: 4100.00,
      status: 'pending'
    })
    .select();

  if (decisionError) {
    console.error('Decision Insert Error:', decisionError);
  } else {
    console.log('Success! Inserted decision:', data);
  }
}

addTestData();