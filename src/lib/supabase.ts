import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERROR: Faltan las credenciales de Supabase. Por favor, configúralas en el panel de Secrets.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('Supabase client created:', !!supabase);
