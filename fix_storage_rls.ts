import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
    -- Enable RLS on storage.objects if not already enabled
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

    -- Allow public read access to app-assets
    DROP POLICY IF EXISTS "Public Access to app-assets" ON storage.objects;
    CREATE POLICY "Public Access to app-assets" ON storage.objects
      FOR SELECT
      USING (bucket_id = 'app-assets');

    -- Allow authenticated users to upload to app-assets
    DROP POLICY IF EXISTS "Authenticated users can upload to app-assets" ON storage.objects;
    CREATE POLICY "Authenticated users can upload to app-assets" ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'app-assets');

    -- Allow authenticated users to update their own uploads in app-assets
    DROP POLICY IF EXISTS "Authenticated users can update their uploads in app-assets" ON storage.objects;
    CREATE POLICY "Authenticated users can update their uploads in app-assets" ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'app-assets' AND owner = auth.uid());

    -- Allow authenticated users to delete their own uploads in app-assets
    DROP POLICY IF EXISTS "Authenticated users can delete their uploads in app-assets" ON storage.objects;
    CREATE POLICY "Authenticated users can delete their uploads in app-assets" ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'app-assets' AND owner = auth.uid());
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('Error running SQL:', error);
  } else {
    console.log('SQL executed successfully:', data);
  }
}

run();
