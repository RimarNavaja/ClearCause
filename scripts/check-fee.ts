
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  global: {
    headers: { 'Cache-Control': 'no-cache' }
  }
});

async function checkPlatformFee() {
  console.log('Checking platform_fee_percentage...');
  
  const { data, error } = await supabase
    .from('platform_settings')
    .select('key, value')
    .eq('key', 'platform_fee_percentage')
    .single();

  if (error) {
    console.error('Error fetching settings:', error);
  } else {
    console.log('Current Database Value:', data);
    const fee = Number(data.value);
    console.log(`Fee Percentage: ${fee}%`);
    
    if (fee === 1.5) {
      console.log('❌ ISSUE CONFIRMED: Fee is still 1.5%');
    } else if (fee === 0.5) {
      console.log('✅ Fee is correct: 0.5%');
    } else {
      console.log(`⚠️ Fee is unexpected: ${fee}%`);
    }
  }
}

checkPlatformFee();
