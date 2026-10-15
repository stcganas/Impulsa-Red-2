import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, DollarSign, TrendingUp, UserPlus, Loader2, MousePointer2, UserCheck, Activity, Settings, Share2, History, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { useFeatures } from "../contexts/FeatureContext";
import { supabase } from "../lib/supabase";
import InviteFriends from "../components/InviteFriends";
import InviteStats from "../components/InviteStats";
import InviteEditor from "../components/InviteEditor";

interface Referral {
  id: string;
  name: string;
  plan: string;
  created_at: string;
  total_commission: number;
}

interface ReferralStats {
  clicks: number;
  registrations: number;
  active: number;
}

export default function Referrals() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { getUserFeature } = useFeatures();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats>({ clicks: 0, registrations: 0, active: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invite' | 'personalize' | 'history'>((location.state as any)?.tab || 'invite');
  const [conversionScore, setConversionScore] = useState(0);

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/referrals/summary', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }

      if (user?.referral_code) {
        const { data: events } = await supabase
          .from('conversion_events')
          .select('event_type')
          .eq('referral_code', user.referral_code);

        if (events) {
          let score = 0;
          events.forEach(e => {
            if (e.event_type === 'page_view') score += 1;
            if (e.event_type === 'click_register' || e.event_type === 'click_whatsapp') score += 3;
            if (e.event_type === 'register_completed') score += 10;
          });
          setConversionScore(score);
        }
      }
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    }
  };

  const fetchReferrals = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch referrals where the current user is the referrer
      const { data: referralData, error: referralError } = await supabase
        .from('referrals')
        .select(`
          created_at,
          referred_id,
          users!referrals_referred_id_fkey (
            id,
            name,
            plan
          )
        `)
        .eq('referrer_id', user.id);

      if (referralError) throw referralError;

      // Fetch commissions for these referrals
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('referred_id, amount')
        .eq('user_id', user.id)
        .eq('type', 'referral_commission')
        .eq('status', 'completed');

      if (txError) throw txError;

      // Combine data
      const formattedReferrals: Referral[] = (referralData || []).map((ref: any) => {
        const referredUser = ref.users;
        const commissions = (txData || [])
          .filter(tx => tx.referred_id === referredUser.id)
          .reduce((sum, tx) => sum + (tx.amount || 0), 0);

        return {
          id: referredUser.id,
          name: referredUser.name,
          plan: referredUser.plan,
          created_at: ref.created_at,
          total_commission: commissions
        };
      });

      setReferrals(formattedReferrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
    fetchStats();
  }, [user?.id]);

  const totalMonthly = referrals.reduce(
    (acc, curr) => acc + (curr.total_commission || 0),
    0,
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'invite', label: 'Invitar', icon: <Share2 className="w-4 h-4" /> },
    { id: 'personalize', label: 'Motor Viral', icon: <Zap className="w-4 h-4" /> },
    { id: 'history', label: 'Mi Red', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24 relative overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[120%] bg-emerald-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Referidos
            </h1>
            <p className="text-slate-400 text-lg">
              Gana dinero construyendo tu red.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            {conversionScore > 0 && (
              <div className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Score: {conversionScore}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 -mt-10 relative z-20 mb-8">
        <div className="bg-white dark:bg-[#111] p-1.5 rounded-2xl shadow-lg flex gap-1 border border-slate-100 dark:border-white/5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'invite' && (
            <motion.div
              key="invite"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <InviteStats stats={stats} />
              <InviteFriends 
                referralCode={user?.referral_code || ""} 
                onSwitchToViral={() => setActiveTab('personalize')} 
                referralCount={referrals.length}
              />
            </motion.div>
          )}

          {activeTab === 'personalize' && (
            <motion.div
              key="personalize"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <InviteEditor />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Total Earnings Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-200 dark:shadow-none relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-20">
                  <TrendingUp className="w-32 h-32" />
                </div>
                <div className="relative z-10 mb-4">
                  <p className="text-emerald-100 font-bold uppercase tracking-widest text-xs mb-1">
                    Comisiones Totales
                  </p>
                  <div className="text-4xl font-black tracking-tight">
                    ${totalMonthly.toLocaleString("es-CO")}
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-2 text-emerald-100 text-sm font-medium">
                  <UserCheck className="w-4 h-4" />
                  <span>{referrals.length} referidos directos</span>
                </div>
              </motion.div>

              {/* Referrals List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Historial de Red
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 dark:text-slate-500 font-bold text-sm">
                      {referrals.length} Miembros
                    </span>
                    <button 
                      onClick={() => navigate("/team")}
                      className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                      title="Panel de Líder"
                    >
                      <Shield className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {referrals.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-[#111] rounded-3xl border border-dashed border-slate-200 dark:border-white/10 p-6">
                    <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Aún no tienes referidos directos.</p>
                    <p className="text-slate-400 dark:text-slate-600 text-sm mb-6">¡Comparte tu código para empezar a construir tu red!</p>
                    <button 
                      onClick={() => navigate("/team")}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-sm hover:bg-emerald-500/20 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Ver Panel de Líder
                    </button>
                  </div>
                ) : (
                  referrals.map((ref, idx) => (
                    <motion.div
                      key={ref.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white dark:bg-[#111] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-white/5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold text-lg">
                            {ref.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-200">{ref.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                              {new Date(ref.created_at).toLocaleDateString("es-CO", { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                            ref.plan === "Élite"
                              ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-500"
                              : ref.plan === "Pro"
                                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500"
                                : ref.plan === "Avanzado"
                                  ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-500"
                                  : "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-400",
                          )}
                        >
                          {ref.plan}
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 rounded-xl p-3">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Comisión Generada
                        </p>
                        <p className="font-black text-emerald-600 flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {(ref.total_commission || 0).toLocaleString("es-CO")}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
