import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" 
  });

  if (error) {
    console.error('Error fetching columns:', error);
  } else {
    console.log('Columns in tasks table:', data);
  }
}
run();
