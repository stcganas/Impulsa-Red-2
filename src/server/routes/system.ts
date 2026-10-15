import { Router } from 'express';

export function systemRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();



  // Health check
  router.get('/health', (req, res) => {
    res.json({ 
      status: 'ok',
      supabase: {
        url_configured: !!process.env.VITE_SUPABASE_URL,
        anon_key_configured: !!process.env.VITE_SUPABASE_ANON_KEY,
        service_key_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  });
;

  // Test policies
  router.get('/test-policies', async (req, res) => {
    try {
      const sql = `
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      `;
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      res.json({ success: true, data, error });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });


  // Get Global Settings
  router.get('/app-config', async (req, res) => {
    console.log("Fetching app config...");
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      
      const settings: Record<string, any> = {};
      data.forEach(s => {
        try {
          // Attempt to parse JSON (for booleans, numbers, objects)
          // If it's a simple string, it might fail or stay as string if not quoted
          settings[s.key] = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
        } catch (e) {
          settings[s.key] = s.value;
        }
      });
      
      console.log("Settings fetched:", settings);
      res.json(settings);
    } catch (error) {
      console.error('Error in GET /api/app-config:', error);
      res.status(500).json({ error: 'Error al obtener configuraciones' });
    }
  });


  // System Status
  router.get('/system/status', async (req, res) => {
    console.log("Checking system status...");
    const status = {
      database: 'down',
      gemini_api: 'down',
      auth_server: 'down',
      server: 'up',
      timestamp: new Date().toISOString()
    };

    if (!supabase) {
      console.error("Supabase client not initialized");
      return res.json(status);
    }

    try {
      // Check Database - use a simple query
      const { error: dbError } = await supabase.from('users').select('id').limit(1);
      if (!dbError) {
        status.database = 'up';
        // If we can query the DB, the auth/connection to Supabase is likely fine
        status.auth_server = 'up';
      } else {
        console.error("Database check failed:", dbError);
      }

      // Check Gemini
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
        status.gemini_api = 'up';
      } else {
        console.warn("Gemini API Key missing or default");
      }

      res.json(status);
    } catch (error) {
      console.error("System status check exception:", error);
      res.json(status);
    }
  });
  return router;
}
