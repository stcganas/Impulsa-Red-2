import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  DollarSign, 
  Loader2,
  ChevronRight,
  AlertCircle,
  Check,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { useNotifications } from "../contexts/NotificationContext";
import { supabase } from "../lib/supabase";

interface Transaction {
  id: string;
  amount: number;
  commission: number;
  type: 'plan_purchase' | 'referral_commission' | 'withdrawal';
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
  referred_name?: string;
}

export default function Wallet() {
  const { user, refreshUser } = useUser();
  const { broadcastActivity } = useNotifications();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchTransactions = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          commission,
          type,
          status,
          created_at,
          users!transactions_referred_id_fkey (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTransactions = (data || []).map((t: any) => ({
        id: t.id,
        amount: t.amount,
        commission: t.commission || 0,
        type: t.type,
        status: t.status,
        created_at: t.created_at,
        referred_name: t.users?.name
      }));

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user?.id]);

  const totalEarnings = transactions
    .filter(t => t.type === 'referral_commission' && t.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal' && t.status !== 'rejected')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalEarnings - totalWithdrawals;

  const handleWithdraw = async (e: any) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount < 10000) {
      setError("El monto mínimo de retiro es $10.000");
      return;
    }

    if (amount > balance) {
      setError("Saldo insuficiente");
      return;
    }

    if (!user?.id) return;

    setWithdrawing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch('/api/withdraw/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ amount })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al procesar el retiro");
      }

      setSuccess("Retiro solicitado con éxito");
      broadcastActivity('retiró ganancias');
      setWithdrawAmount("");
      await fetchTransactions();
      await refreshUser();
    } catch (error: any) {
      console.error("Error processing withdrawal:", error);
      setError(error.message || "Error de conexión");
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24 relative overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Mi Billetera</h1>
          <p className="text-slate-400 text-lg">Gestiona tus ganancias y retiros.</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="px-6 -mt-16 relative z-20 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-[#111] rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-white/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <WalletIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          
          <p className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-widest mb-2">Saldo Disponible</p>
          <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-6">
            ${balance.toLocaleString("es-CO")}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100 dark:border-white/5">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Ganado</p>
              <p className="text-emerald-600 font-bold text-lg">+${totalEarnings.toLocaleString("es-CO")}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Retirado</p>
              <p className="text-slate-900 dark:text-slate-200 font-bold text-lg">-${totalWithdrawals.toLocaleString("es-CO")}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Withdraw Form */}
      <div className="px-6 mb-8">
        <div className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-blue-600" />
            Solicitar Retiro
          </h2>
          
          <form onSubmit={handleWithdraw} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}
            
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Monto a retirar (Min. $10.000)"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>
            
            <button
              type="submit"
              disabled={withdrawing || !withdrawAmount}
              className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white font-bold shadow-lg hover:bg-slate-800 dark:hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {withdrawing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Confirmar Retiro"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-6 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400 dark:text-slate-600" />
            Historial
          </h2>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-[#111] rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
            <p className="text-slate-400 dark:text-slate-600 font-medium">No hay transacciones aún.</p>
          </div>
        ) : (
          transactions.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white dark:bg-[#111] rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-white/5 flex items-center gap-4"
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                t.type === 'referral_commission' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : 
                t.type === 'withdrawal' ? "bg-red-50 dark:bg-red-500/10 text-red-600" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600"
              )}>
                {t.type === 'referral_commission' ? <ArrowDownLeft className="w-6 h-6" /> : 
                 t.type === 'withdrawal' ? <ArrowUpRight className="w-6 h-6" /> : <WalletIcon className="w-6 h-6" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 dark:text-slate-200 truncate">
                  {t.type === 'referral_commission' ? `Comisión: ${t.referred_name}` : 
                   t.type === 'withdrawal' ? 'Retiro de Saldo' : `Compra de Plan: ${t.amount}`}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {new Date(t.created_at).toLocaleDateString("es-CO", { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {t.type === 'withdrawal' && (
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                      t.status === 'pending' ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-500" :
                      t.status === 'rejected' ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-500" :
                      "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500"
                    )}>
                      {t.status === 'pending' ? 'Pendiente' : t.status === 'rejected' ? 'Rechazado' : 'Completado'}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className={cn(
                  "font-black text-lg",
                  t.type === 'referral_commission' ? "text-emerald-600" : 
                  t.type === 'withdrawal' ? "text-red-600" : "text-slate-900 dark:text-white",
                  t.status === 'rejected' && "opacity-50 line-through"
                )}>
                  {t.type === 'referral_commission' ? `+$${t.commission.toLocaleString("es-CO")}` : 
                   `-$${t.amount.toLocaleString("es-CO")}`}
                </p>
                {t.type !== 'withdrawal' && (
                  <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-tighter">Completado</p>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
