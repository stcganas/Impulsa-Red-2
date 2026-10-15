import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("Checking count before:");
  const { data: bData } = await supabase.from('notifications').select('id');
  console.log("Count:", bData?.length);

  console.log("Attempting to delete with neq...");
  const { error, data } = await supabase
    .from('notifications')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  
  if (error) {
    console.error("Delete Error:", error);
  } else {
    console.log("Delete success", data);
  }

  console.log("Checking count after...");
  const { data: aData } = await supabase.from('notifications').select('id');
  console.log("Count:", aData?.length);
}
run();
