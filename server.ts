import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

import { calculateLevelFromXP, calculatePercentage } from './src/utils/levelUtils.ts';


import {
  systemRoutes,
  uploadRoutes,
  referralsRoutes,
  eventsRoutes,
  tasksRoutes,
  coursesRoutes,
  usersRoutes,
  plansRoutes,
  walletRoutes,
  adminRoutes,
  authRoutes,
  mentorRoutes,
  ticketsRoutes
} from './src/server/routes/index.ts';
import { sendNotification } from './src/server/services/notificationService.ts';
import { initScheduler } from './src/server/services/schedulerService.ts';
dotenv.config();

console.log("--- SERVIDOR INICIANDO ---");

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

console.log("Supabase URL configured:", !!supabaseUrl, supabaseUrl ? `(${supabaseUrl.substring(0, 15)}...)` : "");
console.log("Supabase Key configured:", !!supabaseServiceKey, supabaseServiceKey ? `(${supabaseServiceKey.substring(0, 10)}...)` : "");
const isUsingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log("Is using Service Role Key:", isUsingServiceRole);

let supabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    console.log("Supabase inicializado correctamente (Session persistence disabled)");
    
    // Ensure storage buckets exist
    const buckets = ['app-assets', 'avatars', 'receipts'];
    buckets.forEach(bucketName => {
      supabase.storage.getBucket(bucketName)
        .then(({ data, error }: any) => {
          if (error && error.message.includes('not found')) {
            console.log(`Creating bucket ${bucketName}...`);
            return supabase.storage.createBucket(bucketName, { public: true });
          }
          return { data, error };
        })
        .then(({ error: createError }: any) => {
          if (createError) console.error(`Error with bucket ${bucketName}:`, createError);
          else console.log(`Bucket ${bucketName} checked/created successfully`);
        })
        .catch((err: any) => {
          console.error(`Unhandled error in bucket ${bucketName} check:`, err);
        });
    });

    // Add receipt_url column if not exists
    supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS receipt_url text;' })
      .then(({ error }: any) => {
        if (error) console.warn("Could not add receipt_url column via RPC.");
        else console.log("receipt_url column check completed");
      })
      .catch((err: any) => {
        console.error("Unhandled error in exec_sql RPC:", err);
      });

    // Add task-related and invitation columns to users table
    const addTaskColumnsSql = `
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_tasks_active boolean DEFAULT false;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS task_start_date timestamp with time zone;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS task_end_date timestamp with time zone;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance numeric DEFAULT 0;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS inventory_status text DEFAULT 'Inactivo';
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS compliance_score integer DEFAULT 100;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invite_title text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invite_message text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invite_banner text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invite_whatsapp_message text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_reset_at timestamp with time zone;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date date;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS neighborhood text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nequi_number text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS document_url text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS document_back_url text;
      
      -- Phase 3: Gamification & Retention Columns
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_task_date timestamp with time zone;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS badges jsonb DEFAULT '[]'::jsonb;
      
      CREATE TABLE IF NOT EXISTS public.events (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        event_type text NOT NULL,
        value numeric DEFAULT 1,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamp with time zone DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.conversion_events (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        referral_code text,
        event_type text NOT NULL,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamp with time zone DEFAULT now()
      );
      ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Enable all access for conversion_events" ON public.conversion_events;
      CREATE POLICY "Enable all access for conversion_events" ON public.conversion_events FOR ALL USING (true) WITH CHECK (true);

      CREATE TABLE IF NOT EXISTS public.tasks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text,
        day text DEFAULT '1',
        xp integer DEFAULT 0,
        type text DEFAULT 'daily',
        created_at timestamp with time zone DEFAULT now()
      );

      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title text;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description text;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS conditions jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS xp_reward integer DEFAULT 0;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

      -- Migrate existing tasks data if needed
      UPDATE public.tasks SET title = name WHERE title IS NULL AND name IS NOT NULL;
      UPDATE public.tasks SET xp_reward = xp WHERE xp_reward = 0 AND xp IS NOT NULL;

      CREATE TABLE IF NOT EXISTS public.user_tasks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
        progress numeric DEFAULT 0,
        required numeric DEFAULT 1,
        completed boolean DEFAULT false,
        ready_to_claim boolean DEFAULT false,
        completed_at timestamp with time zone,
        UNIQUE(user_id, task_id)
      );

      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS progress numeric DEFAULT 0;
      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS required numeric DEFAULT 1;
      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;
      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS ready_to_claim boolean DEFAULT false;
      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS reward_claimed boolean DEFAULT false;
      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
      
      CREATE TABLE IF NOT EXISTS public.task_submissions (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
        evidence_url text,
        notes text,
        status text DEFAULT 'pending',
        reviewed_at timestamp with time zone,
        reviewed_by uuid REFERENCES auth.users(id),
        rejection_reason text,
        created_at timestamp with time zone DEFAULT now()
      );

      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES public.task_submissions(id) ON DELETE SET NULL;
      
      -- Feature System Tables
      CREATE TABLE IF NOT EXISTS public.plans (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text NOT NULL,
        price numeric NOT NULL DEFAULT 0,
        level integer NOT NULL DEFAULT 1,
        description text,
        created_at timestamptz DEFAULT now()
      );

      -- Scheduled Notifications Table
      CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
        target_role text,
        title text NOT NULL,
        message text NOT NULL,
        type text DEFAULT 'info',
        scheduled_at timestamp with time zone NOT NULL,
        status text DEFAULT 'pending',
        created_at timestamp with time zone DEFAULT now()
      );
      ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Enable all access for scheduled_notifications" ON public.scheduled_notifications;
      CREATE POLICY "Enable all access for scheduled_notifications" ON public.scheduled_notifications FOR ALL USING (true) WITH CHECK (true);

      CREATE TABLE IF NOT EXISTS public.notifications (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
        title text NOT NULL,
        message text NOT NULL,
        type text DEFAULT 'info',
        read boolean DEFAULT false,
        created_at timestamp with time zone DEFAULT now()
      );
      ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Enable all access for notifications" ON public.notifications;
      CREATE POLICY "Enable all access for notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);


      CREATE TABLE IF NOT EXISTS public.features (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        key text NOT NULL UNIQUE,
        name text NOT NULL,
        description text,
        default_value jsonb NOT NULL,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.plan_features (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
        feature_id uuid REFERENCES public.features(id) ON DELETE CASCADE,
        value jsonb NOT NULL,
        UNIQUE(plan_id, feature_id)
      );

      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id);
      
      -- Seed Default Plans
      INSERT INTO public.plans (id, name, price, level, description)
      VALUES 
        ('00000000-0000-0000-0000-000000000000', 'Básico', 15000, 1, 'Plan ideal para empezar a construir tu red.'),
        ('11111111-1111-1111-1111-111111111111', 'Avanzado', 30000, 2, 'Para usuarios que buscan mayor rentabilidad y herramientas.'),
        ('22222222-2222-2222-2222-222222222222', 'Pro', 60000, 3, 'El equilibrio perfecto entre inversión y beneficios exponenciales.'),
        ('33333333-3333-3333-3333-333333333333', 'Élite', 120000, 4, 'Máxima rentabilidad, soporte VIP y acceso total a la plataforma.')
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name, 
        price = EXCLUDED.price, 
        description = EXCLUDED.description;

      -- Assign default plan to users without one
      UPDATE public.users SET plan_id = '00000000-0000-0000-0000-000000000000' WHERE plan_id IS NULL;

      -- Seed Default Features
      INSERT INTO public.features (key, name, description, default_value)
      VALUES 
        ('commission_level_1', 'Comisión Nivel 1', 'Porcentaje de comisión por referidos directos', '0.05'),
        ('commission_increment', 'Incremento por Nivel', 'Aumento de comisión por cada nivel subido', '0.0065'),
        ('max_referrals', 'Máximo de Referidos', 'Número máximo de personas que puedes referir', '1000000'),
        ('support_type', 'Tipo de Soporte', 'Nivel de atención al cliente', '"Estándar"'),
        ('marketing_material', 'Material de Marketing', 'Acceso a recursos para promocionar', '"Básico"'),
        ('mentorship', 'Mentorías', 'Acceso a sesiones de mentoría', '"No"'),
        ('automation_tools', 'Herramientas de Automatización', 'Uso de bots y herramientas automáticas', '"No"'),
        ('vip_events', 'Eventos VIP', 'Acceso a eventos presenciales exclusivos', '"No"')
      ON CONFLICT (key) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description;

      -- Seed Plan Features (We need to link them, but since we don't know the feature IDs easily in raw SQL without a DO block, we can do it via a quick script or just leave the features to be configured via the admin panel. Let's use a DO block to seed plan features)
      DO $$
      DECLARE
        f_comm1 uuid; f_inc uuid; f_supp uuid; f_mkt uuid; f_ment uuid; f_auto uuid; f_vip uuid;
      BEGIN
        SELECT id INTO f_comm1 FROM public.features WHERE key = 'commission_level_1';
        SELECT id INTO f_inc FROM public.features WHERE key = 'commission_increment';
        SELECT id INTO f_supp FROM public.features WHERE key = 'support_type';
        SELECT id INTO f_mkt FROM public.features WHERE key = 'marketing_material';
        SELECT id INTO f_ment FROM public.features WHERE key = 'mentorship';
        SELECT id INTO f_auto FROM public.features WHERE key = 'automation_tools';
        SELECT id INTO f_vip FROM public.features WHERE key = 'vip_events';

        -- Básico
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('00000000-0000-0000-0000-000000000000', f_comm1, '"0.05"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('00000000-0000-0000-0000-000000000000', f_inc, '"0.0065"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('00000000-0000-0000-0000-000000000000', f_supp, '"Estándar"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('00000000-0000-0000-0000-000000000000', f_mkt, '"Básico"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;

        -- Avanzado
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('11111111-1111-1111-1111-111111111111', f_comm1, '"0.10"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('11111111-1111-1111-1111-111111111111', f_inc, '"0.0060"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('11111111-1111-1111-1111-111111111111', f_supp, '"Prioritario"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('11111111-1111-1111-1111-111111111111', f_mkt, '"Avanzado"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;

        -- Pro
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('22222222-2222-2222-2222-222222222222', f_comm1, '"0.20"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('22222222-2222-2222-2222-222222222222', f_inc, '"0.0050"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('22222222-2222-2222-2222-222222222222', f_supp, '"Prioritario"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('22222222-2222-2222-2222-222222222222', f_ment, '"Grupales"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('22222222-2222-2222-2222-222222222222', f_auto, '"Sí"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;

        -- Élite
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_comm1, '"0.30"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_inc, '"0.0040"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_supp, '"VIP 24/7"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_ment, '"1 a 1"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_auto, '"Sí Avanzado"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_vip, '"Sí"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
      END $$;
      
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type text DEFAULT 'daily';
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS day text DEFAULT '1';
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS requires_evidence boolean DEFAULT true;

      CREATE TABLE IF NOT EXISTS public.settings (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        key text NOT NULL UNIQUE,
        value jsonb NOT NULL,
        created_at timestamptz DEFAULT now()
      );

      -- Seed Default Settings
      INSERT INTO public.settings (key, value)
      VALUES 
        ('app_name', '"ImpulsaRed"'),
        ('app_logo', 'null'),
        ('maintenance_mode', 'false'),
        ('min_withdrawal', '50'),
        ('max_withdrawal', '1000'),
        ('withdrawal_fee', '5')
      ON CONFLICT (key) DO NOTHING;

      CREATE TABLE IF NOT EXISTS public.penalty_tasks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        name text NOT NULL,
        xp integer DEFAULT 0,
        is_completed boolean DEFAULT false,
        original_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
        created_at timestamp with time zone DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.invite_clicks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        referral_code text NOT NULL,
        ip text,
        device text,
        user_agent text,
        created_at timestamp with time zone DEFAULT now()
      );

      -- Settings RLS Policies
      ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Public read access to settings" ON public.settings;
      CREATE POLICY "Public read access to settings" ON public.settings
        FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Admin write access to settings" ON public.settings;
      CREATE POLICY "Admin write access to settings" ON public.settings
        FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
          )
        );

      -- Storage RLS Policies
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Public Access to app-assets" ON storage.objects;
      CREATE POLICY "Public Access to app-assets" ON storage.objects
        FOR SELECT
        USING (bucket_id = 'app-assets');

      DROP POLICY IF EXISTS "Authenticated users can upload to app-assets" ON storage.objects;
      CREATE POLICY "Authenticated users can upload to app-assets" ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'app-assets');

      DROP POLICY IF EXISTS "Authenticated users can update their uploads in app-assets" ON storage.objects;
      CREATE POLICY "Authenticated users can update their uploads in app-assets" ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'app-assets' AND owner = auth.uid());

      DROP POLICY IF EXISTS "Authenticated users can delete their uploads in app-assets" ON storage.objects;
      CREATE POLICY "Authenticated users can delete their uploads in app-assets" ON storage.objects
        FOR DELETE
        TO authenticated
        USING (bucket_id = 'app-assets' AND owner = auth.uid());

      -- Avatars Bucket Policies
      DROP POLICY IF EXISTS "Public Access to avatars" ON storage.objects;
      CREATE POLICY "Public Access to avatars" ON storage.objects
        FOR SELECT
        USING (bucket_id = 'avatars');

      DROP POLICY IF EXISTS "Authenticated users can upload to avatars" ON storage.objects;
      CREATE POLICY "Authenticated users can upload to avatars" ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'avatars');

      DROP POLICY IF EXISTS "Authenticated users can update their uploads in avatars" ON storage.objects;
      CREATE POLICY "Authenticated users can update their uploads in avatars" ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'avatars'); -- Note: allowed update for any authenticated for simplicity in this dev phase

      -- Receipts Bucket Policies
      DROP POLICY IF EXISTS "Public Access to receipts" ON storage.objects;
      CREATE POLICY "Public Access to receipts" ON storage.objects
        FOR SELECT
        USING (bucket_id = 'receipts');

      DROP POLICY IF EXISTS "Authenticated users can upload to receipts" ON storage.objects;
      CREATE POLICY "Authenticated users can upload to receipts" ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'receipts');
    `;
    supabase.rpc('exec_sql', { sql: addTaskColumnsSql })
      .then(({ error }: any) => {
        if (error) console.warn("Could not add task columns via RPC.", error);
        else console.log("Database schema and storage RLS policies updated successfully.");
      })
      .catch((err: any) => {
        console.error("Unhandled error in addTaskColumnsSql RPC:", err);
      });
  } catch (err) {
    console.error("Error al inicializar Supabase:", err);
  }
} else {
  console.warn("ADVERTENCIA: Faltan llaves de Supabase. Algunas funciones no estarán disponibles.");
}

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));

    // Logger middleware
    app.use((req, res, next) => {
      if (req.url.includes('upload-image') || req.url.includes('reset-progress')) {
        console.log(`[DEBUG API] Request: ${req.method} ${req.url}`);
        console.log(`[DEBUG API] Headers: ${JSON.stringify(req.headers)}`);
      }
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });

    // Supabase check middleware
    app.use((req, res, next) => {
      if (!supabase && !req.url.startsWith('/api/health')) {
        return res.status(503).json({ error: 'Servicio no disponible: Supabase no inicializado' });
      }
      next();
    });

    console.log(`[SERVER] Iniciando en puerto ${PORT}...`);
    
    // API ROUTES definition starts here...


  const authenticate = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn(`[AUTH] No auth header or invalid format for ${req.url}`);
        return res.status(401).json({ error: 'No token provided' });
      }
      
      const token = authHeader.replace('Bearer ', '').trim();
      
      if (!token || token === 'undefined' || token === 'null') {
        console.warn(`[AUTH] Invalid or missing token string for ${req.url}`);
        return res.status(401).json({ error: 'Malformed token' });
      }

      const { data, error: authError } = await supabase.auth.getUser(token);
      const user = data?.user;
      
      if (authError || !user) {
        const errorMsg = authError?.message || 'Empty user returned';
        if (errorMsg === 'Auth session missing!') {
          return res.status(401).json({ error: 'Sesión expirada o inválida', code: 401 });
        }
        console.error(`[AUTH ERROR] ${req.url}: ${errorMsg}`, { token: token.substring(0, 10) + '...', fullError: authError });
        
        return res.status(401).json({ 
          error: errorMsg, 
          details: 'Authentication failed',
          code: authError?.status || 401
        });
      }

      req.user = user;
      next();
    } catch (error: any) {
      console.error(`[AUTH CRITICAL] ${req.url}:`, error);
      res.status(401).json({ error: 'Error de autenticación' });
    }
  }

;

  // Admin Authorization Middleware
  const authorizeAdmin = async (req: any, res: any, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });

    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();
      
      if (profileError || profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso restringido: se requieren permisos de administrador' });
      }
      
      next();
    } catch (error) {
      console.warn(`[AUTH] Admin verification failed for ${req.url}:`, error);
      res.status(500).json({ error: 'Error al verificar permisos de administrador' });
    }
  }


  // Helper to check and perform daily reset
  async function checkDailyReset(userId: string) {
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('task_start_date, last_reset_at, is_tasks_active')
        .eq('id', userId)
        .single();

      if (userError || !user || !user.is_tasks_active || !user.task_start_date) return;

      const now = new Date();
      const startDate = new Date(user.task_start_date);
      const diffTime = Math.abs(now.getTime() - startDate.getTime());
      const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const lastReset = user.last_reset_at ? new Date(user.last_reset_at) : null;
      
      // If we are in a new day relative to the last reset
      if (!lastReset || (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear())) {
        console.log(`Performing daily reset for user ${userId}. Current day: ${currentDay}`);
        
        // Update last_reset_at
        await supabase.from('users').update({ last_reset_at: now.toISOString() }).eq('id', userId);
        
        // Optionally: Archive old tasks or perform other reset logic
        // For now, the frontend filters tasks by date, so we just need to track the reset
      }
    } catch (err) {
      console.error("Error in checkDailyReset:", err);
    }
  }

  
// --- SMART TASKS ENGINE ---
  async function evaluateTasks(userId: string, event: any) {
    try {
      // 1. Get active tasks
      const { data: activeTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true);

      if (!activeTasks || activeTasks.length === 0) return;

      // 2. Get user's current task progress
      const { data: userTasks } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', userId);

      const userTasksMap = new Map(userTasks?.map((ut: any) => [ut.task_id, ut]) || []);

      for (const task of activeTasks) {
        let userTask = userTasksMap.get(task.id) as any;
        
        // If task is already completed or ready to claim, skip
        if (userTask && (userTask.completed || userTask.ready_to_claim)) continue;

        let progressIncrement = 0;
        let required = 1;
        let applies = false;

        const conditions = task.conditions || {};

        switch (task.type) {
          case 'INVITE_COUNT':
            if (event.event_type === 'USER_REFERRED') {
              applies = true;
              progressIncrement = event.value || 1;
              required = conditions.value || 1;
            }
            break;
          case 'PROFILE_COMPLETED':
            if (event.event_type === 'PROFILE_COMPLETED') {
              applies = true;
              progressIncrement = 1;
              required = 1;
            }
            break;
          case 'VIRAL_ENGINE_CONFIGURED':
            if (event.event_type === 'VIRAL_ENGINE_CONFIGURED') {
              applies = true;
              progressIncrement = 1;
              required = 1;
            }
            break;
          case 'COURSE_COMPLETED':
            if (event.event_type === 'COURSE_COMPLETED' && event.metadata?.course_id === conditions.course_id) {
              applies = true;
              progressIncrement = 1;
              required = 1;
            }
            break;
          case 'LOGIN_STREAK':
            if (event.event_type === 'LOGIN') {
              applies = true;
              progressIncrement = 1;
              required = conditions.value || 1;
            }
            break;
          case 'TEAM_SIZE':
            if (event.event_type === 'TEAM_UPDATED') {
              applies = true;
              // For team size, progress is absolute, not incremental
              const currentSize = event.value || 0;
              required = conditions.value || 1;
              
              if (currentSize >= required) {
                progressIncrement = required - (userTask?.progress || 0);
              } else {
                progressIncrement = currentSize - (userTask?.progress || 0);
              }
            }
            break;
          case 'PLAN_PURCHASE':
            if (event.event_type === 'PLAN_PURCHASE' && event.metadata?.plan_id === conditions.plan_id) {
              applies = true;
              progressIncrement = 1;
              required = 1;
            }
            break;
          case 'SHARE_ACTION':
            if (event.event_type === 'SHARE_COMPLETED') {
              applies = true;
              progressIncrement = 1;
              required = conditions.value || 1;
            }
            break;
          case 'FEATURE_USAGE':
            if (event.event_type === 'FEATURE_USAGE' && event.metadata?.feature_id === conditions.feature_id) {
              applies = true;
              progressIncrement = 1;
              required = conditions.value || 1;
            }
            break;
        }

        if (applies && progressIncrement > 0) {
          const currentProgress = (userTask?.progress || 0) + progressIncrement;
          const isReady = currentProgress >= required;

          if (userTask) {
            await supabase
              .from('user_tasks')
              .update({
                progress: currentProgress,
                required: required,
                ready_to_claim: isReady
              })
              .eq('id', userTask.id);
          } else {
            await supabase
              .from('user_tasks')
              .insert({
                user_id: userId,
                task_id: task.id,
                progress: currentProgress,
                required: required,
                ready_to_claim: isReady
              });
          }
        }
      }
    } catch (error) {
      console.error('Error in evaluateTasks:', error);
    }
  }

  

  // Helper to update user wallet balance
  async function updateWalletBalance(userId: string) {
    try {
      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('amount, type, status')
        .eq('user_id', userId);

      if (txError) throw txError;

      const totalEarnings = (txs || [])
        .filter((t: any) => t.type === 'referral_commission' && t.status === 'completed')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

      const totalWithdrawals = (txs || [])
        .filter((t: any) => t.type === 'withdrawal' && t.status !== 'rejected')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

      const totalWalletPurchases = (txs || [])
        .filter((t: any) => t.type === 'plan_purchase' && t.status === 'completed' && t.receipt_url === 'wallet')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

      const balance = totalEarnings - totalWithdrawals - totalWalletPurchases;

      await supabase
        .from('users')
        .update({ wallet_balance: balance })
        .eq('id', userId);

      return balance;
    } catch (err) {
      console.error(`Error updating wallet balance for user ${userId}:`, err);
      return 0;
    }
  }

  
// Define helper function to process a plan purchase specifically (used by wallet payments and admin approval)
  async function processPlanPurchase(tx: any) {
    if (!tx || tx.type !== 'plan_purchase') return;

    // 0. Get user's current level
    const { data: userProfile } = await supabase.from('users').select('level').eq('id', tx.user_id).single();
    const userLevel = userProfile?.level || 1;

    // 1. Identify plan from amount or metadata
    const amount = Math.abs(tx.amount);
    let planName = 'Básico';
    let planId = null;
    
    // Try to find plan in database by amount
    const { data: planData } = await supabase
      .from('plans')
      .select('id, name')
      .eq('price', amount)
      .single();

    if (planData) {
      planName = planData.name;
      planId = planData.id;
    } else {
      // Fallback to hardcoded logic if plan not found in table
      if (amount >= 120000) { planName = 'Élite'; }
      else if (amount >= 60000) { planName = 'Pro'; }
      else if (amount >= 30000) { planName = 'Avanzado'; }
    }

    const newPercentage = calculatePercentage(userLevel, planName);

    // 2. Update user plan
    const updateData: any = {
      plan: planName,
      percentage: newPercentage
    };
    if (planId) {
      updateData.plan_id = planId;
    }

    const { error: userUpdateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', tx.user_id);

    if (userUpdateError) throw userUpdateError;

    // 3. Process referral commission (Up to 3 levels)
    let currentReferredId = tx.user_id;
    let currentLevel = 1;
    
    while (currentLevel <= 3) {
      const { data: referral } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('referred_id', currentReferredId)
        .single();

      if (!referral || !referral.referrer_id) break;

      const { data: referrer } = await supabase
        .from('users')
        .select('percentage, name, plan')
        .eq('id', referral.referrer_id)
        .single();

      if (referrer) {
        // Calculate percentage based on level and plan
        let levelPercentage = 0;
        const planLower = referrer.plan?.toLowerCase() || 'básico';
        
        if (currentLevel === 1) {
          levelPercentage = 100; // 100% of their base commission
        } else if (currentLevel === 2) {
          if (planLower.includes('elite') || planLower.includes('élite')) levelPercentage = 50;
          else if (planLower.includes('pro')) levelPercentage = 40;
          else if (planLower.includes('avanzado')) levelPercentage = 30;
          else levelPercentage = 20; // Básico
        } else if (currentLevel === 3) {
          if (planLower.includes('elite') || planLower.includes('élite')) levelPercentage = 25;
          else if (planLower.includes('pro')) levelPercentage = 20;
          else if (planLower.includes('avanzado')) levelPercentage = 15;
          else levelPercentage = 10; // Básico
        }

        const effectiveCommissionPercentage = referrer.percentage * (levelPercentage / 100);
        const commissionAmount = amount * (effectiveCommissionPercentage / 100);
        
        if (commissionAmount > 0) {
          await supabase.from('transactions').insert({
            user_id: referral.referrer_id,
            referred_id: tx.user_id,
            amount: commissionAmount,
            commission: effectiveCommissionPercentage,
            type: 'referral_commission',
            status: 'completed',
            nivel_red: currentLevel
          });

          // Update referrer's wallet balance
          await updateWalletBalance(referral.referrer_id);

          // Notify Referrer
          await sendNotification({
            userId: referral.referrer_id,
            title: `¡Comisión de Red (Nivel ${currentLevel})!`,
            message: `Has recibido $${commissionAmount.toLocaleString('es-CO')} por la compra de un referido en tu nivel ${currentLevel}.`,
            type: 'success'
          });
          
          // Add XP for referral buying plan (+600 XP)
          const { data: refProfile } = await supabase.from('users').select('xp, level, plan').eq('id', referral.referrer_id).single();
          if (refProfile) {
            const xpGained = 600; // +600 XP for active referral plan purchase
            const newXp = (refProfile.xp || 0) + xpGained;
            let newLevel = calculateLevelFromXP(newXp);
            if (newLevel > 100) newLevel = 100;
            let newPercentage = refProfile.percentage;

            if (newLevel > (refProfile.level || 1)) {
              newPercentage = calculatePercentage(newLevel, refProfile.plan || 'Básico');
            }

            await supabase.from('users').update({ xp: newXp, level: newLevel, percentage: newPercentage }).eq('id', referral.referrer_id);
          }
        }
      }

      currentReferredId = referral.referrer_id;
      currentLevel++;
    }

    // Notify User that plan is approved
    await sendNotification({
      userId: tx.user_id,
      title: 'Plan Activado',
      message: `Tu plan ${planName} ha sido activado con éxito. ¡Disfruta de tus beneficios!`,
      type: 'success'
    });

    await evaluateTasks(tx.user_id, {
      event_type: 'PLAN_PURCHASE',
      metadata: { plan_id: planName }
    });
  }

  


  // Helper to get or create user profile
  async function getOrCreateProfile(userId: string, email?: string, metadata?: any) {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      if (!profileError || profileError.code === 'PGRST116') {
        console.log(`Creating missing profile for user ${userId}`);
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            name: metadata?.full_name || email?.split('@')[0] || 'Usuario',
            email: email,
            role: 'user',
            plan: 'Básico',
            plan_id: '00000000-0000-0000-0000-000000000000',
            level: 1,
            xp: 0,
            percentage: calculatePercentage(1, 'Básico'),
            trust_score: 100,
            leader_level: 'Promotor',
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error creating profile for user ${userId}:`, insertError);
          throw insertError;
        }
        if (!newProfile) {
          console.error(`Profile creation returned null for user ${userId}`);
          throw new Error('Error al crear el perfil');
        }

        // Send welcome notification
        try {
          await sendNotification({
            userId: userId,
            title: '¡Bienvenido a ImpulsaRed!',
            message: 'Estamos felices de tenerte aquí. Comienza completando tus tareas diarias para ganar XP y recompensas.',
            type: 'success'
          });
        } catch (notifErr) {
          console.error('Error sending welcome notification:', notifErr);
        }

        return newProfile;
      }
      console.error(`Error fetching profile for user ${userId}:`, profileError);
      throw profileError;
    }

    return profile;
  }

  



  // Modular Routes
  const services = { 
    supabase, 
    authenticate, 
    authorizeAdmin, 
    calculatePercentage, 
    updateWalletBalance, 
    processPlanPurchase, 
    evaluateTasks, 
    checkDailyReset, 
    getOrCreateProfile,
    sendNotification 
  };

  app.use('/api', systemRoutes(services));
  app.use('/api', uploadRoutes(services));
  app.use('/api', referralsRoutes(services));
  app.use('/api', eventsRoutes(services));
  app.use('/api', tasksRoutes(services));
  app.use('/api', coursesRoutes(services));
  app.use('/api', usersRoutes(services));
  app.use('/api', plansRoutes(services));
  app.use('/api', walletRoutes(services));
  app.use('/api/admin', adminRoutes(services));
  app.use('/api', authRoutes(services));
  app.use('/api', mentorRoutes(services));
  app.use('/api', ticketsRoutes(services));

  // 404 for API routes
  app.all('/api/*', (req, res) => {
    console.log(`[404] API Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `Ruta de API no encontrada: ${req.method} ${req.url}` });
  });

if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    });

    console.log(`[SERVER] Preparado para escuchar en puerto ${PORT}`);
    const serverInstance = app.listen(PORT, '0.0.0.0', () => {
      console.log(`--- SERVIDOR EN LÍNEA ---`);
      console.log(`URL: http://0.0.0.0:${PORT}`);
      console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
      
      // Initialize notification scheduler
      initScheduler();
    });

    serverInstance.on('error', (err: any) => {
      console.error('[SERVER ERROR]', err);
    });
  } catch (error: any) {
    console.error('Critical server error during startServer:', error);
  }
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
