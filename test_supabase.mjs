import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function check() {
  const { data, error } = await supabase.auth.getUser('invalid_token_just_testing');
  console.log(error?.message);
}
check();
