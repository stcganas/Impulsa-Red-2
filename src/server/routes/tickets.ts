import { Router } from 'express';

export function ticketsRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();



  // Tickets - Create
  router.post('/tickets', authenticate, async (req: any, res: any) => {
    try {






    const user = req.user;

      const { subject, message, priority } = req.body;
      const { data, error } = await supabase.from('tickets').insert({
        user_id: user.id,
        subject,
        message,
        priority: priority || 'medium'
      }).select().single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Error in POST /api/tickets:', error);
      res.status(500).json({ error: 'Error al crear ticket' });
    }
  });


  // Tickets - List (User)
  router.get('/tickets', authenticate, async (req: any, res: any) => {
    try {






    const user = req.user;

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Error in GET /api/tickets:', error);
      res.status(500).json({ error: 'Error al obtener tickets' });
    }
  });
  return router;
}
