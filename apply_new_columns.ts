import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const sql = fs.readFileSync('add_user_document_columns.sql', 'utf8');
  console.log('Applying SQL:', sql);
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('Error applying SQL:', error);
  } else {
    console.log('SQL applied successfully:', data);
  }
}
run();
