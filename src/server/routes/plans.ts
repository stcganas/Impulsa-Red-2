import { Router } from 'express';

export function plansRoutes(services: any) {
  const { 
    supabase, 
    supabaseAdmin, 
    authenticate, 
    updateWalletBalance, 
    processPlanPurchase, 
    financialMutex 
  } = services;
  
  const router = Router();
  const getClient = () => supabaseAdmin || supabase;

  router.post('/plans/purchase', authenticate, async (req: any, res: any) => {
    try {
      const authUser = req.user;
      const { planId, receiptUrl, payWithBalance, idempotencyKey } = req.body;

      if (!planId) {
        return res.status(400).json({ error: 'ID de plan requerido' });
      }

      const client = getClient();
      if (!client) {
        return res.status(503).json({ error: 'Servicio no disponible: cliente de base de datos no configurado' });
      }

      // Fetch and validate plan strictly from database (server authority on price)
      const { data: selectedPlan, error: planError } = await client
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !selectedPlan) {
        return res.status(400).json({ error: 'Plan inválido o no encontrado' });
      }

      const planPrice = Math.floor(Number(selectedPlan.price));
      if (isNaN(planPrice) || planPrice <= 0) {
        return res.status(400).json({ error: 'Precio de plan no configurado' });
      }

      // Model 1: Pay with Wallet Balance (Immediate deduction under exclusive mutex)
      if (payWithBalance) {
        const releaseUserLock = await financialMutex.acquire(`wallet_user_${authUser.id}`);
        try {
          // Re-verify current available balance under exclusive lock
          const balance = await updateWalletBalance(authUser.id);
          if (balance < planPrice) {
            return res.status(400).json({ 
              error: 'Saldo insuficiente en billetera para adquirir este plan',
              available_balance: balance,
              plan_price: planPrice
            });
          }

          // Insert completed transaction with receipt_url = 'wallet'
          const { data: transaction, error: txError } = await client
            .from('transactions')
            .insert({
              user_id: authUser.id,
              amount: planPrice,
              commission: 0,
              type: 'plan_purchase',
              status: 'completed',
              receipt_url: 'wallet'
            })
            .select()
            .single();

          if (txError) throw txError;

          // Process plan activation, multi-level commissions (with 70% cap) & tasks
          const processResult = await processPlanPurchase(transaction);

          // Update user's wallet balance after purchase deduction
          const newBalance = await updateWalletBalance(authUser.id);

          res.json({ 
            success: true, 
            transaction,
            new_balance: newBalance,
            plan: selectedPlan.name,
            processResult
          });
        } finally {
          releaseUserLock();
        }
      } else {
        // Model 2: Pay with external receipt (Pending approval by admin)
        if (!receiptUrl) {
          return res.status(400).json({ error: 'Comprobante de pago requerido para compras externas' });
        }

        const { data: transaction, error: txError } = await client
          .from('transactions')
          .insert({
            user_id: authUser.id,
            amount: planPrice,
            commission: 0,
            type: 'plan_purchase',
            status: 'pending',
            receipt_url: receiptUrl
          })
          .select()
          .single();

        if (txError) throw txError;

        res.json({ 
          success: true, 
          transaction,
          message: 'Comprobante recibido. La activación y comisiones se liquidarán tras aprobación administrativa.'
        });
      }
    } catch (error: any) {
      console.error('Error in /api/plans/purchase:', error);
      res.status(500).json({ error: error.message || 'Error al procesar la compra' });
    }
  });

  return router;
}
