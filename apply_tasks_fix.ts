import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const sql = fs.readFileSync('fix_rls_recursion_v2.sql', 'utf8');
    console.log('Aplicando corrección DEFINITIVA de RLS y regenerando permisos...');
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Error al aplicar SQL:', error);
    } else {
      console.log('Permisos actualizados correctamente:', data);
    }
  } catch (err) {
    console.error('Error durante la ejecución:', err);
  }
}
run();
