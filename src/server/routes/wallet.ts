import { Router } from 'express';

export function walletRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();



  router.post('/withdraw/request', authenticate, async (req: any, res: any) => {
    try {









    const authUser = req.user;

      const { amount } = req.body;
      if (!amount || isNaN(amount) || amount < 10000) {
        return res.status(400).json({ error: 'El monto mínimo de retiro es $10.000' });
      }

      // Check current balance
      const balance = await updateWalletBalance(authUser.id);
      if (amount > balance) {
        return res.status(400).json({ error: 'Saldo insuficiente' });
      }

      // Create withdrawal transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: authUser.id,
          amount: amount,
          commission: 0,
          type: 'withdrawal',
          status: 'pending'
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update wallet balance after withdrawal request
      await updateWalletBalance(authUser.id);

      res.json({ success: true, transaction });
    } catch (error: any) {
      console.error('Error in /api/withdraw/request:', error);
      res.status(500).json({ error: error.message || 'Error al procesar el retiro' });
    }
  });
  return router;
}
