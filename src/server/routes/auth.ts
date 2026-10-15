import { Router } from 'express';

export function authRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();



  // Session verification endpoint
  router.get('/auth/verify', authenticate, async (req: any, res: any) => {
    res.json({ 
      authenticated: true, 
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role // Note: this depends on your user profile logic
      } 
    });
  });
  return router;
}
