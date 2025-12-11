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
  console.error('Missing env vars:');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQuery() {
  console.log('Testing query...');
  
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .or('entity_type.eq.platform_setting,action.eq.UPDATE_PLATFORM_SETTING,action.eq.CHARITY_VERIFICATION_UPDATE,action.ilike.%approve%,action.ilike.%reject%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} rows.`);
    if (data.length > 0) {
      console.log('Sample:', data[0]);
    }
  }
}

testQuery();