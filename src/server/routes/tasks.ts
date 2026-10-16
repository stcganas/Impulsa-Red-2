import { Router } from 'express';
import { calculateLevelFromXP } from '../../utils/levelUtils';

export function tasksRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile, sendNotification } = services;
  const router = Router();



  // Submit a task with evidence (For review)
  router.post('/tasks/submit/:id', authenticate, async (req: any, res: any) => {
    try {
      const authUser = req.user;
      const taskId = req.params.id;
      const { evidence_url, notes } = req.body;

      // 1. Get task details
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError || !task) return res.status(404).json({ error: 'Tarea no encontrada' });

      // 2. Create submission record
      const { data: submission, error: subError } = await supabase
        .from('task_submissions')
        .insert({
          user_id: authUser.id,
          task_id: taskId,
          evidence_url,
          notes,
          status: 'pending'
        })
        .select()
        .single();

      if (subError) throw subError;

      // 3. Link submission to user_tasks or update status
      const { error: utError } = await supabase
        .from('user_tasks')
        .upsert({
          user_id: authUser.id,
          task_id: taskId,
          submission_id: submission.id,
          status: 'pending_review',
          ready_to_claim: false,
          reward_claimed: false
        })
        .eq('user_id', authUser.id)
        .eq('task_id', taskId);

      if (utError) {
        // If upsert fails due to policy or missing record, we try to insert
        const { error: insertError } = await supabase
          .from('user_tasks')
          .insert({
            user_id: authUser.id,
            task_id: taskId,
            submission_id: submission.id,
            status: 'pending_review',
            ready_to_claim: false,
            reward_claimed: false
          });
        if (insertError) throw insertError;
      }

      res.json({ 
        success: true, 
        message: 'Evidencia enviada correctamente. Un administrador la revisará pronto.',
        submission_id: submission.id
      });
    } catch (error: any) {
      console.error('Error in /api/tasks/submit:', error);
      res.status(500).json({ error: error.message });
    }
  });


  // Complete a task (Mark as ready to claim)
  router.post('/tasks/complete/:id', authenticate, async (req: any, res: any) => {
    try {
      const authUser = req.user;
      const taskId = req.params.id;

      // Check daily reset before completing
      await checkDailyReset(authUser.id);

      // 1. Get task details
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError || !task) return res.status(404).json({ error: 'Tarea no encontrada' });

      // Tasks that require evidence cannot be auto-completed directly
      if (task.requires_evidence === true) {
        return res.status(400).json({ error: 'Esta tarea requiere envío de evidencia para su revisión' });
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: existingUserTask } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('task_id', taskId)
        .gte('completed_at', today.toISOString())
        .single();

      if (existingUserTask) {
        return res.status(400).json({ error: 'Tarea ya completada hoy' });
      }

      // 3. Update/Insert user_tasks - Mark as ready to claim, but NOT reward_claimed
      const { data: newUserTask, error: utError } = await supabase
        .from('user_tasks')
        .insert({
          user_id: authUser.id,
          task_id: taskId,
          completed_at: new Date().toISOString(),
          ready_to_claim: true,
          reward_claimed: false
        })
        .select()
        .single();

      if (utError) throw utError;

      res.json({ 
        success: true, 
        message: 'Tarea completada. Lista para reclamar.',
        ready_to_claim: true
      });
    } catch (error: any) {
      console.error('Error in /api/tasks/complete:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Claim rewards for a task
  router.post('/tasks/claim/:id', authenticate, async (req: any, res: any) => {
    try {
      const authUser = req.user;
      const taskId = req.params.id;

      // 1. Get user_task record
      const { data: userTask, error: utError } = await supabase
        .from('user_tasks')
        .select('*, tasks(*)')
        .eq('user_id', authUser.id)
        .eq('task_id', taskId)
        .single();

      if (utError || !userTask) return res.status(404).json({ error: 'Registro de tarea no encontrado' });
      if (!userTask.ready_to_claim) return res.status(400).json({ error: 'La tarea aún no ha sido completada' });
      if (userTask.reward_claimed) return res.status(400).json({ error: 'Las recompensas ya han sido reclamadas' });

      // 2. Mark as reward_claimed
      const { error: updateUtError } = await supabase
        .from('user_tasks')
        .update({ reward_claimed: true })
        .eq('id', userTask.id);

      if (updateUtError) throw updateUtError;

      // 3. Update user XP, Level, and Streak
      const { data: profile } = await supabase
        .from('users')
        .select('xp, level, plan, percentage, current_streak, longest_streak, last_task_date, badges')
        .eq('id', authUser.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      // Streak Logic
      const now = new Date();
      let currentStreak = profile.current_streak || 0;
      let longestStreak = profile.longest_streak || 0;
      let badges = profile.badges || [];
      let unlockedBadges = [];

      if (profile.last_task_date) {
        const lastTaskDate = new Date(profile.last_task_date);
        const todayStr = now.toISOString().split('T')[0];
        const lastTaskStr = lastTaskDate.toISOString().split('T')[0];
        const todayDate = new Date(todayStr);
        const lastDate = new Date(lastTaskStr);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreak += 1;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      const streakBadges = [
        { days: 3, id: 'streak_3', name: 'Racha 3 Días', icon: '🔥' },
        { days: 7, id: 'streak_7', name: 'Racha Semanal', icon: '⚡' },
        { days: 30, id: 'streak_30', name: 'Racha Mensual', icon: '🏆' }
      ];

      for (const badge of streakBadges) {
        if (currentStreak >= badge.days && !badges.some((b: any) => b.id === badge.id)) {
          badges.push(badge);
          unlockedBadges.push(badge);
        }
      }

      // Check for Double XP Event
      const { data: settingsData } = await supabase.from('settings').select('value').eq('key', 'double_xp_active').single();
      const doubleXpActive = settingsData?.value === true || settingsData?.value === 'true';

      let xpGained = userTask.tasks?.xp || 100;
      
      // Enhanced Streak Bonus for 90-day progression
      if (currentStreak >= 30) {
        xpGained += 250; // 30-day streak bonus (+250 XP)
      } else if (currentStreak >= 14) {
        xpGained += 150; // 14-day streak bonus (+150 XP)
      } else if (currentStreak >= 7) {
        xpGained += 100; // Weekly streak bonus (+100 XP)
      } else if (currentStreak >= 3) {
        xpGained += 30; // 3-day streak bonus (+30 XP)
      }

      if (doubleXpActive) {
        xpGained *= 2;
      }

      const newXp = (profile.xp || 0) + xpGained;
      let newLevel = calculateLevelFromXP(newXp);
      if (newLevel > 100) newLevel = 100;
      let leveledUp = newLevel > (profile.level || 1);
      let newPercentage = profile.percentage;

      // Level up logic
      if (leveledUp) {
        newPercentage = calculatePercentage(newLevel, profile.plan || 'Básico');
      }

      await supabase
        .from('users')
        .update({
          xp: newXp,
          level: newLevel,
          percentage: newPercentage,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_task_date: now.toISOString(),
          badges: badges
        })
        .eq('id', authUser.id);

      res.json({ 
        success: true, 
        xpGained, 
        newXp, 
        newLevel, 
        leveledUp,
        newPercentage,
        reward_claimed: true,
        currentStreak,
        unlockedBadges
      });
    } catch (error: any) {
      console.error('Error in /api/tasks/claim:', error);
      res.status(500).json({ error: error.message });
    }
  });
// Activate Tasks
  router.post('/tasks/activate', authenticate, async (req: any, res: any) => {
    try {







    const authUser = req.user;

      // Get user profile (using helper to ensure it exists)
      const profile = await getOrCreateProfile(authUser.id, authUser.email, authUser.user_metadata);

      // Check if already active
      if (profile.is_tasks_active) {
        return res.status(400).json({ error: 'Las tareas ya están activas' });
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7);

      // Update user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_tasks_active: true,
          task_start_date: startDate.toISOString(),
          task_end_date: endDate.toISOString()
        })
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      // Notify user
      await sendNotification({
        userId: authUser.id,
        title: 'Tareas Activadas',
        message: 'Tu ciclo de tareas de 7 días ha comenzado. ¡Buena suerte!',
        type: 'success'
      });

      res.json({ 
        success: true, 
        task_start_date: startDate.toISOString(), 
        task_end_date: endDate.toISOString() 
      });
    } catch (error: any) {
      console.error('Error in /api/tasks/activate:', error);
      res.status(500).json({ error: error.message || 'Error al activar tareas' });
    }
  });


  router.get('/tasks/status', authenticate, async (req: any, res: any) => {
    try {






    const authUser = req.user;

      const user = await getOrCreateProfile(authUser.id, authUser.email, authUser.user_metadata);

      // Check if cycle has ended
      if (user.is_tasks_active && user.task_end_date && new Date() > new Date(user.task_end_date)) {
        // Cycle ended! Apply penalties
        
        // 1. Get all tasks for the 7-day cycle
        const { data: allTasks } = await supabase.from('tasks').select('*');
        
        // 2. Get user's completed tasks for this cycle
        const { data: completedTasks } = await supabase
          .from('user_tasks')
          .select('task_id')
          .eq('user_id', user.id);
        
        const completedIds = new Set(completedTasks?.map(ct => ct.task_id) || []);
        const uncompletedTasks = (allTasks || []).filter(t => !completedIds.has(t.id));

        // 3. Create penalty tasks for each uncompleted task
        if (uncompletedTasks.length > 0) {
          const penaltyTasks = uncompletedTasks.map(t => ({
            user_id: user.id,
            name: `Penalización: ${t.name}`,
            xp: Math.floor(t.xp * 0.5), // Penalty tasks give less XP
            is_completed: false,
            original_task_id: t.id
          }));

          await supabase.from('penalty_tasks').insert(penaltyTasks);
          
          // Deduct some XP or lower compliance
          const penaltyXp = uncompletedTasks.length * 50;
          const newCompliance = Math.max(0, (user.compliance_score || 100) - (uncompletedTasks.length * 5));
          
          await supabase.from('users').update({
            xp: Math.max(0, (user.xp || 0) - penaltyXp),
            compliance_score: newCompliance,
            is_tasks_active: false, // Deactivate tasks until next payment
            inventory_status: 'Inactivo'
          }).eq('id', user.id);

          // Notify user
          await sendNotification({
            userId: user.id,
            title: 'Ciclo de Tareas Finalizado',
            message: `Tu ciclo de 7 días ha terminado. No completaste ${uncompletedTasks.length} tareas. Se han aplicado sanciones y se han generado tareas de castigo.`,
            type: 'warning'
          });
        } else {
          // All tasks completed! Great job.
          await supabase.from('users').update({
            is_tasks_active: false,
            inventory_status: 'Inactivo',
            compliance_score: Math.min(100, (user.compliance_score || 100) + 5)
          }).eq('id', user.id);

          await sendNotification({
            userId: user.id,
            title: '¡Ciclo Completado!',
            message: '¡Felicidades! Has completado todas tus tareas del ciclo de 7 días. Tu cumplimiento ha mejorado.',
            type: 'success'
          });
        }

        // Clear user_tasks for the next cycle
        await supabase.from('user_tasks').delete().eq('user_id', user.id);
        
        return res.json({ cycleEnded: true });
      }

      res.json({ cycleEnded: false });
    } catch (error) {
      console.error('Error checking task status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // Get Penalty Tasks
  router.get('/tasks/penalty', authenticate, async (req: any, res: any) => {
    try {






    const authUser = req.user;

      const { data, error } = await supabase
        .from('penalty_tasks')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('reward_claimed', false);

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error('Error fetching penalty tasks:', JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // Complete Penalty Task (Mark as ready to claim)
  router.post('/tasks/complete-penalty/:id', authenticate, async (req: any, res: any) => {
    try {
      const authUser = req.user;
      const { id } = req.params;

      const { data: penaltyTask, error: fetchError } = await supabase
        .from('penalty_tasks')
        .select('*')
        .eq('id', id)
        .eq('user_id', authUser.id)
        .single();

      if (fetchError || !penaltyTask) return res.status(404).json({ error: 'Tarea de castigo no encontrada' });
      if (penaltyTask.is_completed) return res.status(400).json({ error: 'La tarea ya ha sido completada' });

      // Update penalty task
      await supabase.from('penalty_tasks').update({ 
        is_completed: true,
        ready_to_claim: true,
        reward_claimed: false
      }).eq('id', id);

      res.json({ success: true, message: 'Tarea de castigo completada. Lista para reclamar.', ready_to_claim: true });
    } catch (error) {
      console.error('Error completing penalty task:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Claim Rewards for Penalty Task
  router.post('/tasks/claim-penalty/:id', authenticate, async (req: any, res: any) => {
    try {
      const authUser = req.user;
      const { id } = req.params;

      const { data: penaltyTask, error: fetchError } = await supabase
        .from('penalty_tasks')
        .select('*')
        .eq('id', id)
        .eq('user_id', authUser.id)
        .single();

      if (fetchError || !penaltyTask) return res.status(404).json({ error: 'Tarea de castigo no encontrada' });
      if (!penaltyTask.ready_to_claim) return res.status(400).json({ error: 'La tarea no ha sido completada aún' });
      if (penaltyTask.reward_claimed) return res.status(400).json({ error: 'La recompensa ya ha sido reclamada' });

      // Update penalty task
      await supabase.from('penalty_tasks').update({ reward_claimed: true }).eq('id', id);

      // Add XP to user
      const { data: profile } = await supabase.from('users').select('xp, level, plan, percentage').eq('id', authUser.id).single();
      if (profile) {
        // Check for Double XP Event
        const { data: settingsData } = await supabase.from('settings').select('value').eq('key', 'double_xp_active').single();
        const doubleXpActive = settingsData?.value === true || settingsData?.value === 'true';

        let xpGained = penaltyTask.xp || 50;
        if (doubleXpActive) {
          xpGained *= 2;
        }

        const newXp = (profile.xp || 0) + xpGained;
        let newLevel = calculateLevelFromXP(newXp);
        if (newLevel > 100) newLevel = 100;
        let leveledUp = newLevel > (profile.level || 1);
        let newPercentage = profile.percentage;

        if (leveledUp) {
          newPercentage = calculatePercentage(newLevel, profile.plan || 'Básico');
        }

        await supabase.from('users').update({ xp: newXp, level: newLevel, percentage: newPercentage }).eq('id', authUser.id);
        res.json({ success: true, xpGained, leveledUp, newLevel, newPercentage, reward_claimed: true });
      } else {
        res.status(404).json({ error: 'Perfil de usuario no encontrado' });
      }
    } catch (error) {
      console.error('Error claiming penalty task reward:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
  return router;
}
