import { Router } from 'express';

export function eventsRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();

router.post('/events', authenticate, async (req: any, res: any) => {
    try {






    const user = req.user;

      const { event_type, value, metadata } = req.body;

      if (!event_type) return res.status(400).json({ error: 'event_type is required' });

      const event = {
        user_id: user.id,
        event_type,
        value: value || 1,
        metadata: metadata || {}
      };

      // Log event
      await supabase.from('events').insert(event);

      // Evaluate tasks
      await evaluateTasks(user.id, event);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error recording event:', error);
      res.status(500).json({ error: error.message });
    }
  });
  return router;
}
