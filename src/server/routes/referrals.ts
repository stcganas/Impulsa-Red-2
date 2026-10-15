import { Router } from 'express';
import { calculateLevelFromXP } from '../../utils/levelUtils';

export function referralsRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile, sendNotification } = services;
  const router = Router();



  // Process Referral
  router.post('/referrals/process', authenticate, async (req: any, res: any) => {
    try {
      const user = req.user;
      const { referrerCode } = req.body;
      if (!referrerCode) return res.json({ success: true, message: 'No referral code provided' });

      // Find referrer
      const { data: referrer, error: referrerError } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referrerCode)
        .single();

      if (referrerError || !referrer) {
        return res.status(400).json({ error: 'Código de referido inválido' });
      }

      // Check if user already has a referrer
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', user.id)
        .single();

      if (existingReferral) {
        return res.status(400).json({ error: 'El usuario ya tiene un referido' });
      }

      // Insert referral
      const { error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrer.id,
          referred_id: user.id
        });

      if (insertError) {
        console.error("Error inserting referral:", insertError);
        return res.status(500).json({ error: 'Error al procesar el referido' });
      }

      // Check today's referrals for viral multiplier
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todaysReferrals } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', referrer.id)
        .gte('created_at', today.toISOString());

      const refsToday = todaysReferrals?.length || 1;
      let multiplier = 1;
      if (refsToday >= 10) multiplier = 3;
      else if (refsToday >= 5) multiplier = 2;
      else if (refsToday >= 3) multiplier = 1.5;

      // Add XP to direct referrer (+150 XP * multiplier)
      const { data: refProfile } = await supabase.from('users').select('xp, level, plan').eq('id', referrer.id).single();
      if (refProfile) {
        const xpGained = Math.floor(150 * multiplier);
        const newXp = (refProfile.xp || 0) + xpGained;
        let newLevel = calculateLevelFromXP(newXp);
        if (newLevel > 100) newLevel = 100;
        let newPercentage = refProfile.percentage;

        if (newLevel > (refProfile.level || 1)) {
          newPercentage = calculatePercentage(newLevel, refProfile.plan || 'Básico');
        }

        await supabase.from('users').update({ xp: newXp, level: newLevel, percentage: newPercentage }).eq('id', referrer.id);
      }

      // Check for level 2 referrer (+75 XP)
      const { data: level2Referral } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('referred_id', referrer.id)
        .single();

      if (level2Referral && level2Referral.referrer_id) {
        const { data: ref2Profile } = await supabase.from('users').select('xp, level, plan').eq('id', level2Referral.referrer_id).single();
        if (ref2Profile) {
          const xpGained2 = 75;
          const newXp2 = (ref2Profile.xp || 0) + xpGained2;
          let newLevel2 = calculateLevelFromXP(newXp2);
          if (newLevel2 > 100) newLevel2 = 100;
          let newPercentage2 = ref2Profile.percentage;

          if (newLevel2 > (ref2Profile.level || 1)) {
            newPercentage2 = calculatePercentage(newLevel2, ref2Profile.plan || 'Básico');
          }

          await supabase.from('users').update({ xp: newXp2, level: newLevel2, percentage: newPercentage2 }).eq('id', level2Referral.referrer_id);
        }
      }

      // Notify Referrer
      const { data: newUser } = await supabase.from('users').select('name').eq('id', user.id).single();
      const xpGained = Math.floor(100 * multiplier);
      await sendNotification({
        userId: referrer.id,
        title: '¡Nuevo Referido!',
        message: `${newUser?.name || 'Un nuevo usuario'} se ha unido usando tu código. ¡Has ganado ${xpGained} XP!`,
        type: 'info'
      });

      // Trigger Smart Tasks events for the referrer
      try {
        // 1. Trigger USER_REFERRED event (increments INVITE_COUNT tasks)
        await evaluateTasks(referrer.id, {
          event_type: 'USER_REFERRED',
          value: 1,
          metadata: { referred_user_id: user.id }
        });

        // 2. Trigger TEAM_UPDATED event (updates TEAM_SIZE tasks)
        // Calculate new team size for the referrer
        const { count: teamSize } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', referrer.id);
          
        if (teamSize !== null) {
          await evaluateTasks(referrer.id, {
            event_type: 'TEAM_UPDATED',
            value: teamSize,
            metadata: { new_member_id: user.id }
          });
        }
      } catch (taskError) {
        console.error('Error evaluating tasks for referral:', taskError);
        // Don't fail the referral process if task evaluation fails
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error processing referral:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });


  // Public endpoint to get referrer information and social proof for the viral invite landing page
  router.get('/referrals/info/:referralCode', async (req: any, res: any) => {
    try {
      const { referralCode } = req.params;
      const cleanCode = (referralCode || '').trim();

      if (!cleanCode) {
        return res.status(400).json({ error: 'Código de referido no proporcionado' });
      }

      // Fetch referrer user details by referral_code (case-insensitive)
      let { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, photo_url, invite_title, invite_message, invite_banner, invite_whatsapp_message, referral_code, level, plan')
        .ilike('referral_code', cleanCode)
        .maybeSingle();

      // If not found by referral_code, try finding by id (in case UUID was passed)
      if (!user && cleanCode.length > 20) {
        const { data: userById } = await supabase
          .from('users')
          .select('id, name, photo_url, invite_title, invite_message, invite_banner, invite_whatsapp_message, referral_code, level, plan')
          .eq('id', cleanCode)
          .maybeSingle();
        if (userById) user = userById;
      }

      // If still not found, provide a fallback referrer so the invite page never crashes
      const referrerData = user || {
        id: 'system',
        name: 'Líder de la Red',
        photo_url: '',
        invite_title: `¡Te invitan a unirte a ImpulsaRed! 🚀`,
        invite_message: 'Empieza a generar ingresos diarios con tareas y expande tu red de afiliados.',
        invite_banner: '',
        invite_whatsapp_message: `🚀 Te invito a unirte a mi equipo en ImpulsaRed. ¡Gana dinero diario!`,
        referral_code: cleanCode.toUpperCase(),
        level: 5,
        plan: 'Pro'
      };

      // Get joined count if user exists in DB
      let joinedCount = 0;
      let dailyJoins = 0;

      if (user?.id) {
        const { count: totalCount } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', user.id);
        
        joinedCount = totalCount || 0;

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: dayCount } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', user.id)
          .gte('created_at', yesterday);

        dailyJoins = dayCount || 0;
      }

      // Fetch global settings for bonuses
      const { data: settingsData } = await supabase
        .from('settings')
        .select('key, value');

      const settingsMap: Record<string, any> = {};
      if (settingsData) {
        settingsData.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
      }

      return res.json({
        success: true,
        referrer: referrerData,
        joinedCount,
        dailyJoins,
        appName: settingsMap['app_name'] || 'ImpulsaRed',
        bonusActive: settingsMap['bonus_active'] === true || settingsMap['bonus_active'] === 'true',
        bonusMultiplier: Number(settingsMap['bonus_multiplier']) || 2,
        bonusExpiration: settingsMap['bonus_expiration'] || new Date(Date.now() + 86400000).toISOString()
      });
    } catch (error: any) {
      console.error('Error in /api/referrals/info:', error);
      res.status(500).json({ error: error.message || 'Error al obtener información de invitación' });
    }
  });

  // Track conversion event anonymously
  router.post('/referrals/track-event', async (req: any, res: any) => {
    try {
      const { referralCode, eventType, metadata } = req.body;
      if (!referralCode || !eventType) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
      }

      await supabase
        .from('conversion_events')
        .insert({
          referral_code: referralCode,
          event_type: eventType,
          metadata: {
            ...metadata,
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
          }
        });

      return res.json({ success: true });
    } catch (error: any) {
      // Don't fail the client request if tracking table fails
      console.warn('Track event warning:', error?.message);
      return res.json({ success: true });
    }
  });

  // Track referral clicks
  router.post('/referrals/click', async (req, res) => {
    const { referralCode } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    if (!referralCode) {
      return res.status(400).json({ error: 'Falta el código de referido' });
    }

    try {
      await supabase
        .from('invite_clicks')
        .insert({
          referral_code: referralCode,
          ip: typeof ip === 'string' ? ip : (Array.isArray(ip) ? ip[0] : null),
          user_agent: userAgent,
          device: userAgent?.includes('Mobi') ? 'Mobile' : 'Desktop'
        });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // Get referral stats for a user
  router.get('/referrals/summary', authenticate, async (req: any, res: any) => {
    try {
      const authUser = req.user;
      // Get user's referral code
      const { data: userData } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', authUser.id)
        .single();

      if (!userData?.referral_code) {
        return res.json({ clicks: 0, registrations: 0, active: 0 });
      }

      // Count clicks
      const { count: clicksCount } = await supabase
        .from('invite_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('referral_code', userData.referral_code);

      // Count registrations (direct referrals)
      const { count: registrationsCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', authUser.id);

      // Count active referrals (those who have activated tasks)
      const { count: activeCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', authUser.id)
        .eq('is_tasks_active', true);

      res.json({
        clicks: clicksCount || 0,
        registrations: registrationsCount || 0,
        active: activeCount || 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  
  // Get Team Stats
  router.get('/team/summary', authenticate, async (req: any, res: any) => {
    try {









    const user = req.user;

      let allMembers: any[] = [];
      let activeDirects = 0;

      // Level 1: Direct Referrals
      const { data: directReferrals } = await supabase
        .from('referrals')
        .select('referred_id')
        .eq('referrer_id', user.id);

      const level1Ids = directReferrals?.map(r => r.referred_id) || [];
      
      if (level1Ids.length > 0) {
        const { data: users1 } = await supabase
          .from('users')
          .select('id, name, email, level, plan, created_at, xp, is_tasks_active, leader_level')
          .in('id', level1Ids);
          
        if (users1) {
          allMembers.push(...users1.map(u => ({ ...u, status: u.is_tasks_active ? 'active' : 'inactive', networkLevel: 1 })));
          activeDirects = users1.filter(u => u.plan && u.plan.toLowerCase() !== 'básico' && u.plan.toLowerCase() !== 'gratis' && u.plan.toLowerCase() !== 'free').length;
        }

        // Level 2: Indirect Referrals (Referred by Level 1)
        const { data: level2Referrals } = await supabase
          .from('referrals')
          .select('referred_id, referrer_id')
          .in('referrer_id', level1Ids);
          
        const level2Ids = level2Referrals?.map(r => r.referred_id) || [];
        
        if (level2Ids.length > 0) {
          const { data: users2 } = await supabase
            .from('users')
            .select('id, name, email, level, plan, created_at, xp, is_tasks_active, leader_level')
            .in('id', level2Ids);
            
          if (users2) {
            allMembers.push(...users2.map(u => ({ ...u, status: u.is_tasks_active ? 'active' : 'inactive', networkLevel: 2 })));
          }

          // Level 3: Indirect Referrals (Referred by Level 2)
          const { data: level3Referrals } = await supabase
            .from('referrals')
            .select('referred_id, referrer_id')
            .in('referrer_id', level2Ids);
            
          const level3Ids = level3Referrals?.map(r => r.referred_id) || [];
          
          if (level3Ids.length > 0) {
            const { data: users3 } = await supabase
              .from('users')
              .select('id, name, email, level, plan, created_at, xp, is_tasks_active, leader_level')
              .in('id', level3Ids);
              
            if (users3) {
              allMembers.push(...users3.map(u => ({ ...u, status: u.is_tasks_active ? 'active' : 'inactive', networkLevel: 3 })));
            }
          }
        }
      }

      // Determine leader level
      let leaderLevel = 'Promotor';
      if (activeDirects >= 300) leaderLevel = 'Embajador';
      else if (activeDirects >= 100) leaderLevel = 'Director';
      else if (activeDirects >= 40) leaderLevel = 'Coordinador';
      else if (activeDirects >= 15) leaderLevel = 'Líder';
      else if (activeDirects >= 5) leaderLevel = 'Promotor';
      else leaderLevel = 'Usuario';

      // Get network earnings
      const { data: commissions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'referral_commission')
        .eq('status', 'completed');

      const totalEarnings = commissions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

      res.json({
        leaderLevel,
        activeDirects,
        totalDirects: level1Ids.length,
        totalEarnings,
        teamMembers: allMembers
      });
    } catch (error) {
      console.error('Error in /api/team/summary:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas del equipo' });
    }
  });
  return router;
}
