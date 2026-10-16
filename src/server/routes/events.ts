import { Router } from 'express';

export function eventsRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();

router.post('/events', authenticate, async (req: any, res: any) => {
    try {






    const user = req.user;

      const { event_type, value, metadata } = req.body;

      if (!event_type) return res.status(400).json({ error: 'event_type is required' });

      // Whitelist events permitted from client requests
      // Internal events (USER_REFERRED, PLAN_PURCHASE, TEAM_UPDATED) MUST only be fired server-side
      const ALLOWED_CLIENT_EVENTS = [
        'PROFILE_COMPLETED',
        'VIRAL_ENGINE_CONFIGURED',
        'LOGIN',
        'SHARE_COMPLETED',
        'FEATURE_USAGE',
        'COURSE_COMPLETED'
      ];

      if (!ALLOWED_CLIENT_EVENTS.includes(event_type)) {
        return res.status(403).json({ error: 'Tipo de evento no permitido para envío directo desde el cliente' });
      }

      const safeValue = Math.min(Math.max(Number(value) || 1, 1), 10);

      const event = {
        user_id: user.id,
        event_type,
        value: safeValue,
        metadata: (typeof metadata === 'object' && metadata !== null) ? metadata : {}
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
