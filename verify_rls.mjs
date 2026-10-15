import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// This client acts as a random authenticated user
export const testRls = async (userToken) => {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } }
  });

  console.log("--- Red Team Audit: RLS Verification ---");

  // TEST 1: Privilege Escalation
  const { error: err1 } = await supabase.from('users').update({ role: 'admin' }).eq('id', 'self');
  console.log("ATH-01 (Self-Admin Update):", err1 ? "PASS (Denied)" : "FAIL (Allowed!)");

  // TEST 2: XP Injection
  const { error: err2 } = await supabase.from('users').update({ xp: 1000000 }).eq('id', 'self');
  console.log("ATH-02 (XP Manipulation):", err2 ? "PASS (Denied)" : "FAIL (Allowed!)");

  // TEST 3: PII Scraping
  const { data: data3, error: err3 } = await supabase.from('users').select('email').neq('id', 'self').limit(1);
  console.log("ATH-03 (Cross-User Email Read):", (err3 || (data3 && data3.length === 0)) ? "PASS (Protected)" : "FAIL (Leaked!)");

  // TEST 4: Unauthorized Transaction
  const { error: err4 } = await supabase.from('transactions').insert({ user_id: 'other-uuid', amount: 999, status: 'completed' });
  console.log("FIN-01 (Cross-User Transaction):", err4 ? "PASS (Denied)" : "FAIL (Allowed!)");

  console.log("--- Audit Complete ---");
};
