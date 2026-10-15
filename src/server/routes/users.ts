import { Router } from 'express';

export function usersRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();



  // We don't have a direct registration endpoint in server.ts since it uses Supabase Auth directly from the client.
  // But we can add a webhook or an endpoint to update trust score.
  // Actually, let's add an endpoint to report activity and update trust score.
  router.post('/user/activity', authenticate, async (req: any, res: any) => {
    try {







    const user = req.user;

      const { action } = req.body; // 'normal_activity', 'suspicious_activity'
      
      const { data: profile } = await supabase.from('users').select('trust_score').eq('id', user.id).single();
      
      if (profile) {
        let newScore = profile.trust_score !== undefined ? profile.trust_score : 100;
        
        if (action === 'normal_activity') newScore = Math.min(100, newScore + 5);
        else if (action === 'suspicious_activity') newScore = Math.max(0, newScore - 30);
        else if (action === 'plan_purchase') newScore = Math.min(100, newScore + 20);

        await supabase.from('users').update({ trust_score: newScore }).eq('id', user.id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating activity:', error);
      res.status(500).json({ error: 'Error interno' });
    }
  });


  // Get current user profile
  router.get('/user/me', authenticate, async (req: any, res: any) => {
    try {







    const authUser = req.user;

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) return res.status(404).json({ error: 'Perfil no encontrado' });

      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // Update Password
  router.post('/user/change-password', authenticate, async (req: any, res: any) => {
    try {
      const user = req.user;
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword
      });

      if (updateError) throw updateError;

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in /api/user/change-password:', error);
      res.status(500).json({ error: error.message || 'Error al cambiar contraseña' });
    }
  });


  // Get User Profile (Bypasses RLS recursion issues)
  router.get('/account/data', authenticate, async (req: any, res: any) => {
    try {
      const user = req.user;

      // Fetch profile using service role key (which bypasses RLS)
      const profile = await getOrCreateProfile(user.id, user.email, user.user_metadata);

      if (profile) {
        // Calculate total earned from transactions (only referral commissions)
        const { data: txs } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'referral_commission')
          .eq('status', 'completed');
          
        profile.totalEarned = txs?.reduce((sum: number, tx: any) => sum + (Number(tx.amount) || 0), 0) || 0;

        // Background update for percentage if needed
        const expectedPercentage = calculatePercentage(profile.level || 1, profile.plan || 'Básico');
        if (Math.abs((profile.percentage || 0) - expectedPercentage) > 0.01) {
          profile.percentage = expectedPercentage;
          supabase.from('users').update({ percentage: expectedPercentage }).eq('id', user.id)
            .then(({ error }: any) => { if (error) console.error("Error background updating percentage:", error); });
        }
      }

      res.json(profile);
    } catch (error) {
      console.error('Error in /api/account/data:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Test Notification
  router.post('/user/test-notification', authenticate, async (req: any, res: any) => {
    try {
      const user = req.user;
      const { sendNotification } = services;
      
      if (!sendNotification) {
        return res.status(500).json({ error: 'Servicio de notificaciones no disponible' });
      }

      await sendNotification({
        userId: user.id,
        title: '🔔 Prueba de Notificación',
        message: '¡Funciona! Esta es una notificación de prueba para verificar las notificaciones web.',
        type: 'info'
      });

      res.json({ success: true, message: 'Notificación enviada' });
    } catch (error: any) {
      console.error('Error in /api/user/test-notification:', error);
      res.status(500).json({ error: error.message || 'Error al enviar notificación' });
    }
  });

  return router;
}
