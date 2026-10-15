import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, 
  Medal, 
  Star, 
  Crown, 
  Loader2, 
  Flame, 
  Clock, 
  Sparkles, 
  Gift, 
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { useSettings } from "../contexts/SettingsContext";
import { supabase } from "../lib/supabase";

interface RankedUser {
  id: string;
  name: string;
  level: number;
  xp: number;
  plan: string;
  percentage: number;
  avatar_url: string | null;
  wallet_balance: number;
}

export default function Ranking() {
  const { user } = useUser();
  const { settings } = useSettings();
  const [leaderboard, setLeaderboard] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankingPeriod, setRankingPeriod] = useState<'season' | 'all-time'>('season');
  const [showPrizesModal, setShowPrizesModal] = useState(false);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, level, xp, plan, percentage, avatar_url, wallet_balance')
          .order('xp', { ascending: false })
          .limit(50);
          
        if (error) throw error;
        
        setLeaderboard(data as RankedUser[]);
      } catch (error) {
        console.error("Error fetching ranking:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  const getBadge = (level: number) => {
    if (level >= 100) return "Arquitecto";
    if (level >= 90) return "Líder Supremo";
    if (level >= 80) return "Transformador";
    if (level >= 70) return "Referente";
    if (level >= 60) return "Mentor";
    if (level >= 50) return "Inspirador";
    if (level >= 40) return "Constructor";
    if (level >= 30) return "Estratega";
    if (level >= 20) return "Visionario";
    if (level >= 10) return "Emprendedor";
    return "Novato";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-28 relative overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[120%] bg-amber-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Temporada 1: Desafío de Titanes
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">
              Tabla de Líderes
            </h1>
            <p className="text-slate-400 text-sm">
              Compite por el podio y gana bonos de saldo en efectivo.
            </p>
          </div>
          <button 
            onClick={() => setShowPrizesModal(true)}
            className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 hover:scale-105 active:scale-95 transition-transform"
          >
            <Gift className="w-6 h-6" />
          </button>
        </div>

        {/* Season Time & Prize summary bar */}
        <div className="relative z-10 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Fin de Temporada: <strong className="text-amber-400">6 días</strong></span>
          </div>
          <button
            onClick={() => setShowPrizesModal(true)}
            className="text-xs font-black text-amber-400 flex items-center gap-1 hover:underline"
          >
            <span>Premios $850.000 COP</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Period Filter Selector */}
      <div className="px-6 -mt-6 relative z-30 mb-6 flex justify-center">
        <div className="bg-white dark:bg-[#111] p-1 rounded-2xl shadow-lg border border-slate-100 dark:border-white/10 flex gap-1 w-full max-w-xs">
          <button
            onClick={() => setRankingPeriod('season')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center",
              rankingPeriod === 'season'
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            Esta Temporada
          </button>
          <button
            onClick={() => setRankingPeriod('all-time')}
            className={cn(
              "flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center",
              rankingPeriod === 'all-time'
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            Histórico Global
          </button>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="px-6 relative z-20 mb-8 flex justify-center items-end gap-2 sm:gap-4 h-52">
        {/* 2nd Place */}
        {leaderboard[1] && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center flex-1"
          >
            <div className="relative mb-2">
              {leaderboard[1].avatar_url ? (
                <img src={leaderboard[1].avatar_url} alt={leaderboard[1].name} className="w-14 h-14 rounded-full border-4 border-slate-300 dark:border-slate-700 shadow-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center shadow-lg border-4 border-slate-300 dark:border-slate-700 z-10">
                  <span className="font-bold text-slate-600 dark:text-slate-400">2</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-300 dark:bg-slate-700 rounded-full flex items-center justify-center border-2 border-white dark:border-[#111]">
                <Medal className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
              </div>
            </div>
            <div className="bg-white dark:bg-[#111] w-full rounded-t-2xl pt-6 pb-4 px-2 text-center shadow-lg border border-slate-100 dark:border-white/5 h-28 flex flex-col justify-end">
              <p className="font-bold text-slate-900 dark:text-slate-200 text-xs truncate w-full">{leaderboard[1].name}</p>
              <span className="text-[10px] font-black text-slate-400 mt-0.5">🥈 $250.000 COP</span>
              <p className="text-xs font-black text-amber-500 mt-1">{leaderboard[1].xp} XP</p>
            </div>
          </motion.div>
        )}

        {/* 1st Place */}
        {leaderboard[0] && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center flex-[1.2] z-10"
          >
            <div className="relative mb-2">
              <Crown className="w-9 h-9 text-amber-400 absolute -top-7 left-1/2 -translate-x-1/2 drop-shadow-md animate-bounce" />
              {leaderboard[0].avatar_url ? (
                <img src={leaderboard[0].avatar_url} alt={leaderboard[0].name} className="w-20 h-20 rounded-full border-4 border-amber-400 shadow-xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-xl shadow-amber-500/30 border-4 border-white dark:border-[#111]">
                  <span className="font-black text-white text-xl">1</span>
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-[#111] w-full rounded-t-2xl pt-8 pb-4 px-2 text-center shadow-xl border border-slate-100 dark:border-white/5 h-36 flex flex-col justify-end">
              <p className="font-black text-slate-900 dark:text-white text-sm truncate w-full">{leaderboard[0].name}</p>
              <span className="text-[10px] font-black text-amber-500 mt-0.5">👑 $500.000 COP</span>
              <p className="text-sm font-black text-amber-500 mt-1">{leaderboard[0].xp} XP</p>
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {leaderboard[2] && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center flex-1"
          >
            <div className="relative mb-2">
              {leaderboard[2].avatar_url ? (
                <img src={leaderboard[2].avatar_url} alt={leaderboard[2].name} className="w-14 h-14 rounded-full border-4 border-orange-400 shadow-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-orange-200 dark:bg-orange-900/30 flex items-center justify-center shadow-lg border-4 border-orange-400 z-10">
                  <span className="font-bold text-orange-700 dark:text-orange-500">3</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-300 dark:bg-orange-800 rounded-full flex items-center justify-center border-2 border-white dark:border-[#111]">
                <Medal className="w-3.5 h-3.5 text-orange-800 dark:text-orange-200" />
              </div>
            </div>
            <div className="bg-white dark:bg-[#111] w-full rounded-t-2xl pt-6 pb-4 px-2 text-center shadow-lg border border-slate-100 dark:border-white/5 h-24 flex flex-col justify-end">
              <p className="font-bold text-slate-900 dark:text-slate-200 text-xs truncate w-full">{leaderboard[2].name}</p>
              <span className="text-[10px] font-black text-orange-500 mt-0.5">🥉 $100.000 COP</span>
              <p className="text-xs font-black text-amber-500 mt-1">{leaderboard[2].xp} XP</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="px-6 space-y-3 pb-24">
        {leaderboard.slice(3).map((rankedUser, index) => (
          <motion.div
            key={rankedUser.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className={cn(
              "bg-white dark:bg-[#111] rounded-2xl p-4 flex items-center gap-4 shadow-sm border transition-all",
              user?.id === rankedUser.id 
                ? "border-amber-500 shadow-amber-100 dark:shadow-amber-900/20 bg-amber-50/40 dark:bg-amber-500/5" 
                : "border-slate-100 dark:border-white/5"
            )}
          >
            <div className="w-8 text-center font-black text-slate-400 dark:text-slate-600 text-sm">
              #{index + 4}
            </div>
            
            {rankedUser.avatar_url ? (
              <img src={rankedUser.avatar_url} alt={rankedUser.name} className="w-10 h-10 rounded-full object-cover border border-slate-100 dark:border-white/5" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center font-bold text-slate-600 dark:text-slate-400">
                {rankedUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-200 truncate">{rankedUser.name}</h3>
                {user?.id === rankedUser.id && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase">
                    Tú
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">
                <span className="font-bold text-amber-600 uppercase">Nivel {rankedUser.level}</span>
                <span>•</span>
                <span className="truncate">{getBadge(rankedUser.level)}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="font-black text-amber-500 text-sm">{rankedUser.xp} XP</div>
              <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">
                ${(rankedUser.wallet_balance || 0).toLocaleString('es-CO')}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sticky My Position */}
      {user && !leaderboard.slice(0, 50).some(u => u.id === user.id) && (
        <div className="fixed bottom-20 left-0 right-0 px-6 z-30">
          <div className="bg-slate-900 dark:bg-[#111] text-white rounded-2xl p-4 flex items-center gap-4 shadow-2xl border border-white/10">
            <div className="w-8 text-center font-bold text-slate-400">
              ?
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center font-bold text-white">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Tu Posición</p>
              <p className="text-[10px] text-slate-400">Sigue ganando XP para entrar al Top 50</p>
            </div>
            <div className="text-right">
              <div className="font-black text-amber-500 text-sm">{user.xp || 0} XP</div>
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-0.5">
                Nivel {user.level || 1}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Season Prize Pool Modal */}
      <AnimatePresence>
        {showPrizesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#111] w-full max-w-md rounded-3xl overflow-hidden border border-slate-100 dark:border-white/10 shadow-2xl p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Premios de la Temporada 1
                  </h3>
                </div>
                <button
                  onClick={() => setShowPrizesModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  {
                    place: "1er Lugar (Campeón)",
                    reward: "$500.000 COP",
                    perks: "Corona de Oro en perfil + 1.000 XP + Destacado en Inicio",
                    color: "border-amber-400 bg-amber-50/50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  },
                  {
                    place: "2do Lugar (Subcampeón)",
                    reward: "$250.000 COP",
                    perks: "Insignia de Plata + 500 XP",
                    color: "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300"
                  },
                  {
                    place: "3er Lugar (Tercer Puesto)",
                    reward: "$100.000 COP",
                    perks: "Insignia de Bronce + 250 XP",
                    color: "border-orange-300 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  },
                  {
                    place: "Top 4 al Top 10",
                    reward: "Bono de XP",
                    perks: "+100 XP extras para subir de nivel",
                    color: "border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }
                ].map((tier, i) => (
                  <div key={i} className={cn("p-4 rounded-2xl border", tier.color)}>
                    <div className="flex justify-between items-center">
                      <span className="font-black text-sm">{tier.place}</span>
                      <span className="font-black text-base">{tier.reward}</span>
                    </div>
                    <p className="text-xs mt-1 opacity-80">{tier.perks}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowPrizesModal(false)}
                className="w-full py-3.5 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs rounded-2xl shadow-lg transition-all active:scale-95"
              >
                ¡Entendido, a competir!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
