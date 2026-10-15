import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.storage.getBucket('app-assets');
  if (error && error.message.includes('not found')) {
    console.log('Creating bucket app-assets...');
    const { data: createData, error: createError } = await supabase.storage.createBucket('app-assets', { public: true });
    if (createError) console.error('Error creating bucket:', createError);
    else console.log('Bucket created:', createData);
  } else if (error) {
    console.error('Error getting bucket:', error);
  } else {
    console.log('Bucket exists:', data);
  }
}
check();
