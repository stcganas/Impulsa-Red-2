import { Router } from 'express';

export function walletRoutes(services: any) {
  const { 
    supabase, 
    supabaseAdmin, 
    authenticate, 
    updateWalletBalance, 
    financialMutex 
  } = services;
  
  const router = Router();
  const getClient = () => supabaseAdmin || supabase;

  // Authoritative Balance Endpoint (Single Source of Truth)
  router.get('/wallet/balance', authenticate, async (req: any, res: any) => {
    try {
      const authUser = req.user;
      const client = getClient();

      const balance = await updateWalletBalance(authUser.id);

      const { data: txs, error: txError } = await client
        .from('transactions')
        .select('amount, type, status, receipt_url')
        .eq('user_id', authUser.id);

      if (txError) throw txError;

      const totalEarnings = (txs || [])
        .filter((t: any) => t.type === 'referral_commission' && t.status === 'completed')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);

      const totalWithdrawalsCompleted = (txs || [])
        .filter((t: any) => t.type === 'withdrawal' && t.status === 'completed')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);

      const totalWithdrawalsPending = (txs || [])
        .filter((t: any) => t.type === 'withdrawal' && t.status === 'pending')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);

      const totalWalletPurchases = (txs || [])
        .filter((t: any) => t.type === 'plan_purchase' && t.status === 'completed' && t.receipt_url === 'wallet')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);

      res.json({
        success: true,
        available_balance: balance,
        breakdown: {
          total_earnings: totalEarnings,
          total_withdrawals_completed: totalWithdrawalsCompleted,
          total_withdrawals_pending: totalWithdrawalsPending,
          total_wallet_purchases: totalWalletPurchases,
          total_committed: totalWithdrawalsCompleted + totalWithdrawalsPending + totalWalletPurchases
        }
      });
    } catch (error: any) {
      console.error('Error in /api/wallet/balance:', error);
      res.status(500).json({ error: error.message || 'Error al obtener saldo de billetera' });
    }
  });

  // Request Withdrawal with Mutex Concurrency Protection & Immediate Reservation
  router.post('/withdraw/request', authenticate, async (req: any, res: any) => {
    try {
      const authUser = req.user;
      const { amount } = req.body;
      const parsedAmount = Math.floor(Number(amount));

      if (isNaN(parsedAmount) || parsedAmount < 10000) {
        return res.status(400).json({ error: 'El monto mínimo de retiro es $10.000 COP' });
      }

      // Acquire lock for this user to prevent concurrent race conditions
      const releaseUserLock = await financialMutex.acquire(`wallet_user_${authUser.id}`);
      try {
        const client = getClient();
        if (!client) {
          return res.status(503).json({ error: 'Servicio no disponible: cliente de base de datos no configurado' });
        }

        // Recompute available balance under exclusive lock
        const balance = await updateWalletBalance(authUser.id);
        if (parsedAmount > balance) {
          return res.status(400).json({ 
            error: 'Saldo insuficiente para realizar el retiro',
            available_balance: balance,
            requested_amount: parsedAmount
          });
        }

        // Create pending withdrawal transaction (reserves balance immediately)
        const { data: transaction, error: txError } = await client
          .from('transactions')
          .insert({
            user_id: authUser.id,
            amount: parsedAmount,
            commission: 0,
            type: 'withdrawal',
            status: 'pending'
          })
          .select()
          .single();

        if (txError) throw txError;

        // Persist new balance reservation
        const newBalance = await updateWalletBalance(authUser.id);

        res.json({ 
          success: true, 
          transaction,
          new_balance: newBalance,
          message: 'Solicitud de retiro registrada y saldo reservado con éxito.'
        });
      } finally {
        releaseUserLock();
      }
    } catch (error: any) {
      console.error('Error in /api/withdraw/request:', error);
      res.status(500).json({ error: error.message || 'Error al procesar el retiro' });
    }
  });

  // User Cancel Own Pending Withdrawal (Safely releases reserved balance)
  router.post('/withdraw/cancel', authenticate, async (req: any, res: any) => {
    try {
      const authUser = req.user;
      const { transactionId } = req.body;

      if (!transactionId) {
        return res.status(400).json({ error: 'ID de transacción requerido' });
      }

      const releaseUserLock = await financialMutex.acquire(`wallet_user_${authUser.id}`);
      try {
        const client = getClient();
        if (!client) {
          return res.status(503).json({ error: 'Servicio no disponible' });
        }

        // Check transaction ownership and current status
        const { data: tx, error: txError } = await client
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .eq('user_id', authUser.id)
          .single();

        if (txError || !tx) {
          return res.status(404).json({ error: 'Transacción de retiro no encontrada' });
        }

        if (tx.type !== 'withdrawal') {
          return res.status(400).json({ error: 'La transacción no corresponde a un retiro' });
        }

        if (tx.status !== 'pending') {
          return res.status(400).json({ 
            error: `Solo se pueden cancelar retiros en estado 'pending'. Estado actual: '${tx.status}'` 
          });
        }

        // Transition to rejected (releases reservation exactly once)
        const { error: updateError } = await client
          .from('transactions')
          .update({ 
            status: 'rejected',
            receipt_url: 'cancelled_by_user'
          })
          .eq('id', transactionId);

        if (updateError) throw updateError;

        const newBalance = await updateWalletBalance(authUser.id);

        res.json({
          success: true,
          message: 'Solicitud de retiro cancelada. El saldo reservado fue liberado.',
          new_balance: newBalance
        });
      } finally {
        releaseUserLock();
      }
    } catch (error: any) {
      console.error('Error in /api/withdraw/cancel:', error);
      res.status(500).json({ error: error.message || 'Error al cancelar retiro' });
    }
  });

  return router;
}
