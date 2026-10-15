import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const { data, error } = await supabaseAdmin.auth.getUser('null');
  console.log('Error for null:', error?.message);
}

run();
