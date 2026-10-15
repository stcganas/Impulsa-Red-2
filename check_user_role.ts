import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', 'ericcharris432@gmail.com')
    .single();

  if (error) {
    console.error('Error fetching user:', error);
  } else {
    console.log('User status:', data);
  }
}
run();
