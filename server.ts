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
import { 
  calculateMultiLevelCommissions, 
  financialMutex, 
  getTierMultiplier 
} from './src/server/services/commissionEngine.ts';
dotenv.config();

console.log("--- SERVIDOR INICIANDO ---");

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isUsingServiceRole = !!supabaseServiceRoleKey;
console.log("Supabase URL configured:", !!supabaseUrl);
console.log("Supabase Service Role Key configured:", isUsingServiceRole);
console.log("Supabase Public Anon Key configured:", !!supabaseAnonKey);

let supabaseAdmin: any = null;
let supabasePublic: any = null;
let supabase: any = null;

if (!supabaseUrl) {
  console.warn("ADVERTENCIA CRÍTICA: VITE_SUPABASE_URL no está configurada.");
}

// 1. Privileged server client (Requires SUPABASE_SERVICE_ROLE_KEY, NO silent fallback to anon key)
if (supabaseUrl && supabaseServiceRoleKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    console.log("Cliente administrativo Supabase (service_role) inicializado de forma segura.");
  } catch (err) {
    console.error("Error al inicializar cliente administrativo de Supabase:", err);
  }
} else {
  console.warn("ALERTA DE SEGURIDAD: SUPABASE_SERVICE_ROLE_KEY no configurada. Las operaciones financieras y de administración requerirán credencial privilegiada y serán rechazadas de forma segura.");
}

// 2. Public client (for public non-privileged reads with anon key)
if (supabaseUrl && supabaseAnonKey) {
  try {
    supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    console.log("Cliente público Supabase (anon_key) inicializado.");
  } catch (err) {
    console.error("Error al inicializar cliente público de Supabase:", err);
  }
}

// Primary client for general operations: prefer admin if configured, else public
supabase = supabaseAdmin || supabasePublic;

if (supabase) {
  try {
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

    console.log("Supabase storage buckets verified. Schema migrations are managed via versioned SQL scripts.");
  } catch (err) {
    console.error("Error al verificar storage de Supabase:", err);
  }
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

  

  // Helper to update user wallet balance under concurrency mutex lock
  async function updateWalletBalance(userId: string): Promise<number> {
    if (!userId) return 0;
    const releaseUserLock = await financialMutex.acquire(`wallet_user_${userId}`);
    try {
      const client = supabaseAdmin || supabase;
      if (!client) {
        console.warn(`[WALLET] Supabase client not available to update balance for user ${userId}`);
        return 0;
      }

      const { data: txs, error: txError } = await client
        .from('transactions')
        .select('amount, type, status, receipt_url')
        .eq('user_id', userId);

      if (txError) throw txError;

      // 1. Total earnings from completed referral commissions
      const totalEarnings = (txs || [])
        .filter((t: any) => t.type === 'referral_commission' && t.status === 'completed')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);

      // 2. Total committed withdrawals (pending reservation + completed; rejected are excluded/released)
      const totalWithdrawals = (txs || [])
        .filter((t: any) => t.type === 'withdrawal' && t.status !== 'rejected')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);

      // 3. Total plan purchases paid with wallet balance
      const totalWalletPurchases = (txs || [])
        .filter((t: any) => t.type === 'plan_purchase' && t.status === 'completed' && t.receipt_url === 'wallet')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);

      const balance = Math.max(0, Math.floor(totalEarnings - totalWithdrawals - totalWalletPurchases));

      // Persist balance in users table
      await client
        .from('users')
        .update({ wallet_balance: balance })
        .eq('id', userId);

      return balance;
    } catch (err) {
      console.error(`Error updating wallet balance for user ${userId}:`, err);
      return 0;
    } finally {
      releaseUserLock();
    }
  }

  // Define helper function to process a plan purchase with atomicity, idempotency, and 70% commission cap
  async function processPlanPurchase(tx: any) {
    if (!tx || tx.type !== 'plan_purchase') return { success: false, reason: 'Invalid transaction' };

    const client = supabaseAdmin || supabase;
    if (!client) {
      throw new Error('Supabase client unavailable');
    }

    // Acquire lock for this specific purchase transaction to prevent concurrent duplicate accreditation
    const releaseTxLock = await financialMutex.acquire(`purchase_tx_${tx.id}`);
    try {
      // 1. Idempotency Check: check if referral commissions for this purchase_tx already exist
      const { data: existingCommissions } = await client
        .from('transactions')
        .select('id')
        .eq('type', 'referral_commission')
        .or(`receipt_url.eq.commission_for_${tx.id},purchase_tx_id.eq.${tx.id}`);

      if (existingCommissions && existingCommissions.length > 0) {
        console.log(`[IDEMPOTENCY] Purchase transaction ${tx.id} already processed commissions (${existingCommissions.length} found). Skipping.`);
        return { success: true, alreadyProcessed: true };
      }

      // Fetch fresh transaction row
      const { data: currentTx, error: txFetchError } = await client
        .from('transactions')
        .select('*')
        .eq('id', tx.id)
        .single();

      if (txFetchError || !currentTx) {
        throw new Error(`Purchase transaction ${tx.id} not found`);
      }

      // 2. Identify plan from amount or metadata
      const amount = Math.abs(Number(currentTx.amount) || 0);
      let planName = 'Básico';
      let planId = null;

      const { data: planData } = await client
        .from('plans')
        .select('id, name')
        .eq('price', amount)
        .single();

      if (planData) {
        planName = planData.name;
        planId = planData.id;
      } else {
        if (amount >= 120000) { planName = 'Élite'; }
        else if (amount >= 60000) { planName = 'Pro'; }
        else if (amount >= 30000) { planName = 'Avanzado'; }
      }

      // 3. Update user's plan and percentage
      const { data: userProfile } = await client
        .from('users')
        .select('level')
        .eq('id', currentTx.user_id)
        .single();

      const userLevel = userProfile?.level || 1;
      const newPercentage = calculatePercentage(userLevel, planName);

      const updateData: any = {
        plan: planName,
        percentage: newPercentage
      };
      if (planId) {
        updateData.plan_id = planId;
      }

      const { error: userUpdateError } = await client
        .from('users')
        .update(updateData)
        .eq('id', currentTx.user_id);

      if (userUpdateError) throw userUpdateError;

      // 4. Traverse sponsor hierarchy (Levels 1, 2, 3)
      const sponsors: {
        level1?: any;
        level2?: any;
        level3?: any;
      } = {};

      let currentReferredId = currentTx.user_id;
      for (let level = 1; level <= 3; level++) {
        const { data: referral } = await client
          .from('referrals')
          .select('referrer_id')
          .eq('referred_id', currentReferredId)
          .single();

        if (!referral || !referral.referrer_id) break;

        const { data: referrer } = await client
          .from('users')
          .select('id, percentage, name, plan, level, xp')
          .eq('id', referral.referrer_id)
          .single();

        if (referrer) {
          if (level === 1) sponsors.level1 = referrer;
          if (level === 2) sponsors.level2 = referrer;
          if (level === 3) sponsors.level3 = referrer;
        }

        currentReferredId = referral.referrer_id;
      }

      // 5. Calculate multi-level commissions using the centralized Commission Engine
      const commissionResult = calculateMultiLevelCommissions({
        purchaseTxId: currentTx.id,
        buyerId: currentTx.user_id,
        baseAmount: amount,
        sponsors
      });

      console.log(`[COMMISSION ENGINE] Purchase ${currentTx.id}: Base = $${amount}, MaxCap(70%) = $${commissionResult.maxAllowedCommission}, OriginalSum = $${commissionResult.totalOriginalCommission}, FinalSum = $${commissionResult.totalFinalCommission}, Prorated = ${commissionResult.exceededCap}`);

      // 6. Record commission transactions and update wallets
      for (const comm of commissionResult.commissions) {
        if (comm.adjustedAmount <= 0) continue;

        const insertPayload: any = {
          user_id: comm.beneficiaryId,
          referred_id: comm.referredId,
          amount: comm.adjustedAmount,
          commission: comm.effectiveRate,
          type: 'referral_commission',
          status: 'completed',
          nivel_red: comm.nivelRed,
          receipt_url: `commission_for_${currentTx.id}`
        };

        const { error: commError } = await client
          .from('transactions')
          .insert(insertPayload);

        if (commError) {
          console.error(`Error inserting commission for sponsor ${comm.beneficiaryId}:`, commError);
          continue;
        }

        // Update sponsor's wallet balance
        await updateWalletBalance(comm.beneficiaryId);

        // Notify Referrer
        await sendNotification({
          userId: comm.beneficiaryId,
          title: `¡Comisión de Red (Nivel ${comm.nivelRed})!`,
          message: `Has recibido $${comm.adjustedAmount.toLocaleString('es-CO')} por la compra de un referido en tu nivel ${comm.nivelRed}.${comm.wasAdjusted ? ' (Ajuste proporcional por tope del 70%)' : ''}`,
          type: 'success'
        });

        // Add XP (+600 XP) for referral buying plan
        const { data: refProfile } = await client
          .from('users')
          .select('xp, level, plan, percentage')
          .eq('id', comm.beneficiaryId)
          .single();

        if (refProfile) {
          const xpGained = 600;
          const newXp = (refProfile.xp || 0) + xpGained;
          let newLevel = calculateLevelFromXP(newXp);
          if (newLevel > 100) newLevel = 100;
          let newPercentage = refProfile.percentage;

          if (newLevel > (refProfile.level || 1)) {
            newPercentage = calculatePercentage(newLevel, refProfile.plan || 'Básico');
          }

          await client
            .from('users')
            .update({ xp: newXp, level: newLevel, percentage: newPercentage })
            .eq('id', comm.beneficiaryId);
        }
      }

      // Notify Buyer that plan is approved
      await sendNotification({
        userId: currentTx.user_id,
        title: 'Plan Activado',
        message: `Tu plan ${planName} ha sido activado con éxito. ¡Disfruta de tus beneficios!`,
        type: 'success'
      });

      await evaluateTasks(currentTx.user_id, {
        event_type: 'PLAN_PURCHASE',
        metadata: { plan_id: planName }
      });

      return {
        success: true,
        commissionResult
      };
    } finally {
      releaseTxLock();
    }
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
    supabaseAdmin,
    supabasePublic,
    isUsingServiceRole,
    authenticate, 
    authorizeAdmin, 
    calculatePercentage, 
    updateWalletBalance, 
    processPlanPurchase, 
    evaluateTasks, 
    checkDailyReset, 
    getOrCreateProfile,
    sendNotification,
    commissionEngine: {
      calculateMultiLevelCommissions,
      getTierMultiplier
    },
    financialMutex
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
      res.status(500).json({ error: 'Internal server error' });
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
