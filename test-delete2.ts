import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("Inserting one notification...");
  await supabase.from('notifications').insert({ user_id: '5f922eb7-ce57-41b4-acfa-dd47cc153c30', title: 'Test', message: 'Test Notif', type: 'info' });

  const { data: bData } = await supabase.from('notifications').select('id');
  console.log("Count Before:", bData?.length);

  console.log("Attempting to delete with not(id, is, null)...");
  const { error, data } = await supabase
    .from('notifications')
    .delete()
    .not('id', 'is', null);
  
  if (error) {
    console.error("Delete Error:", error);
  } else {
    console.log("Delete success", data);
  }

  const { data: aData } = await supabase.from('notifications').select('id');
  console.log("Count After:", aData?.length);
}
run();
