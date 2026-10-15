import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clean() {
    console.log('Limpiando datos relacionales antes de borrar tareas...');
    
    // 1. Borrar user_tasks
    const { error: err1 } = await supabase.from('user_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) console.warn('Aviso: problema al borrar user_tasks (puede estar vacía):', err1);

    // 2. Borrar task_submissions
    const { error: err2 } = await supabase.from('task_submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) console.warn('Aviso: problema al borrar task_submissions:', err2);
    
    // 3. Borrar penalty_tasks
    const { error: err3 } = await supabase.from('penalty_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err3) console.warn('Aviso: problema al borrar penalty_tasks:', err3);

    // 4. Finalmente borrar tareas
    console.log('Borrando todas las tareas...');
    const { error: err4 } = await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err4) console.error('Error final al borrar tareas:', err4);
    else console.log('Tareas limpiadas correctamente.');
}

clean();
