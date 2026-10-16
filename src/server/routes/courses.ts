import { Router } from 'express';
import { calculateLevelFromXP } from '../../utils/levelUtils';

export function coursesRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();



  // Complete a course
  router.post('/courses/complete/:id', authenticate, async (req: any, res: any) => {







    try {
    const authUser = req.user;

      const courseId = req.params.id;
      // Security: Sanitize and bound xpReward to prevent arbitrary XP injection (max 100 XP per course)
      const rawXp = Number(req.body.xpReward);
      const safeXpReward = Math.min(Math.max(!isNaN(rawXp) ? Math.floor(rawXp) : 50, 0), 100);

      // 1. Check if already completed
      const { data: existing } = await supabase
        .from('user_courses')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('course_id', courseId)
        .single();

      if (existing) return res.status(400).json({ error: 'Curso ya completado' });

      // 2. Insert into user_courses
      const { error: ucError } = await supabase
        .from('user_courses')
        .insert({ user_id: authUser.id, course_id: courseId });

      if (ucError) throw ucError;

      // 3. Update user XP and Level
      const { data: profile } = await supabase
        .from('users')
        .select('xp, level, plan')
        .eq('id', authUser.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      const newXp = (profile.xp || 0) + safeXpReward;
      const newLevel = calculateLevelFromXP(newXp);
      const leveledUp = newLevel > (profile.level || 1);
      
      let updateData: any = { xp: newXp, level: newLevel };
      
      if (leveledUp) {
        updateData.percentage = calculatePercentage(newLevel, profile.plan || 'Básico');
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      res.json({ 
        success: true, 
        xpGained: safeXpReward, 
        newXp, 
        newLevel, 
        leveledUp,
        newPercentage: updateData.percentage
      });
    } catch (error: any) {
      console.error('Error in /api/courses/complete:', error);
      res.status(500).json({ error: error.message });
    }
  });
  return router;
}
