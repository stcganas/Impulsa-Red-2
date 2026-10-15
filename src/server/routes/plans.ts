import { Router } from 'express';

export function plansRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();

router.post('/plans/purchase', authenticate, async (req: any, res: any) => {
    try {









    const authUser = req.user;

      const { planId, receiptUrl, payWithBalance } = req.body;
      
      // Fetch plan from database
      const { data: selectedPlan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !selectedPlan) {
        return res.status(400).json({ error: 'Plan inválido' });
      }

      if (payWithBalance) {
        const balance = await updateWalletBalance(authUser.id);
        if (balance < selectedPlan.price) {
          return res.status(400).json({ error: 'Saldo insuficiente en billetera. Solicita un retiro o recarga.' });
        }

        // Subtract directly from balance creates a 'completed' transaction
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: authUser.id,
            amount: selectedPlan.price,
            type: 'plan_purchase',
            status: 'completed',
            receipt_url: 'wallet' // This flag is used in updateWalletBalance
          })
          .select()
          .single();

        if (txError) throw txError;

        // Process the plan purchase
        await processPlanPurchase(transaction);
        
        // Update user's wallet
        await updateWalletBalance(authUser.id);

        res.json({ success: true, transaction });
      } else {
        // Create a pending transaction
        const { data: transaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: authUser.id,
            amount: selectedPlan.price,
            type: 'plan_purchase',
            status: 'pending',
            receipt_url: receiptUrl
          })
          .select()
          .single();

        if (txError) throw txError;

        res.json({ success: true, transaction });
      }
    } catch (error: any) {
      console.error('Error in /api/plans/purchase:', error);
      res.status(500).json({ error: error.message || 'Error al procesar la compra' });
    }
  });
  return router;
}
