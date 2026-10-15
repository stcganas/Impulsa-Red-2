import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trophy,
  Users,
  CheckSquare,
  Bell,
  ChevronRight,
  TrendingUp,
  Sparkles,
  LogOut,
  Sun,
  Moon,
  Shield,
  Rocket,
  Share2
} from "lucide-react";
import { motion } from "motion/react";
import { useUser } from "../contexts/UserContext";
import { useFeatures } from "../contexts/FeatureContext";
import Logo from "../components/Logo";
import { TaskEngine } from "../utils/TaskEngine";

import { useTheme } from "../contexts/ThemeContext";
import NotificationCenter from "../components/NotificationCenter";
import UserPlanView from "../components/UserPlanView";
import AdvancedStats from "../components/AdvancedStats";
import OnboardingTour from "../components/OnboardingTour";
import { getXPProgressInCurrentLevel } from "../utils/levelUtils";
import { StreakRiskBanner } from "../components/engagement/StreakRiskBanner";
import { ProjectionCalculator } from "../components/engagement/ProjectionCalculator";
import { AchievementShareCardModal } from "../components/viral/AchievementShareCardModal";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { getUserFeature } = useFeatures();
  
  const [showTour, setShowTour] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);
  const [showShareCardModal, setShowShareCardModal] = useState(false);

  useEffect(() => {
    // Check if the tour was completed
    if (!loading && user) {
      const tourCompleted = localStorage.getItem("impulsa_tour_completed");
      if (!tourCompleted) {
        setShowTour(true);
      }

      // Check if user completed a task today
      const checkTodayTask = async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const { data } = await supabase
            .from('user_task_history')
            .select('id')
            .eq('user_id', user.id)
            .gte('created_at', `${today}T00:00:00.000Z`)
            .limit(1);

          if (data && data.length > 0) {
            setCompletedToday(true);
          }
        } catch (e) {
          console.error("Error checking today task:", e);
        }
      };
      checkTodayTask();
    }
  }, [user, loading]);

  useEffect(() => {
    if (getUserFeature('has_advanced_stats')) {
      TaskEngine.triggerEvent('FEATURE_USAGE', 1, { feature_id: 'has_advanced_stats' });
    }
    if (getUserFeature('whatsapp_boost')) {
      TaskEngine.triggerEvent('FEATURE_USAGE', 1, { feature_id: 'whatsapp_boost' });
    }
  }, [getUserFeature]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  // Calculate badge based on level
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

  const getNextBadge = (level: number) => {
    if (level < 10) return { name: "Emprendedor", level: 10 };
    if (level < 20) return { name: "Visionario", level: 20 };
    if (level < 30) return { name: "Estratega", level: 30 };
    if (level < 40) return { name: "Constructor", level: 40 };
    if (level < 50) return { name: "Inspirador", level: 50 };
    if (level < 60) return { name: "Mentor", level: 60 };
    if (level < 70) return { name: "Referente", level: 70 };
    if (level < 80) return { name: "Transformador", level: 80 };
    if (level < 90) return { name: "Líder Supremo", level: 90 };
    if (level < 100) return { name: "Arquitecto", level: 100 };
    return null;
  };

  const badge = getBadge(user.level);
  const nextBadge = getNextBadge(user.level);
  
  const xpProgress = getXPProgressInCurrentLevel(user.xp || 0);
  
  const isLeaderEligible = Boolean(
    getUserFeature('can_create_team') || 
    user?.plan?.toLowerCase().includes('pro') || 
    user?.plan?.toLowerCase().includes('élite') || 
    user?.plan?.toLowerCase().includes('elite') || 
    user?.plan?.toLowerCase().includes('avanzado') || 
    (user?.level && user.level >= 5)
  );

  const currentCommission = user.percentage || 5;
  const progressTo70 = (currentCommission / 70) * 100;
  const levelProgress = xpProgress.progressPercent;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-20 pb-24 px-6 rounded-b-[40px] shadow-xl relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/20 blur-[60px] rounded-full pointer-events-none" />

        <div className="absolute top-6 left-6 z-50">
          <Logo size="sm" showText={false} />
        </div>

        <div className="absolute top-6 right-6 z-50 flex gap-3 items-center">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20"
            title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <NotificationCenter />
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 text-red-100 border border-red-500/30 text-sm font-medium hover:bg-red-500 hover:text-white transition-all shadow-lg"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
            <span className="sm:hidden">Salir</span>
          </button>
        </div>

        <div className="relative z-10 flex justify-between items-center mb-8">
          <div>
            <p className="text-slate-400 font-medium mb-1">Hola,</p>
            <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber-400 font-bold uppercase tracking-wider text-sm">
                {badge}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-xs font-medium text-slate-300">
                Plan {user.plan}
              </span>
            </div>
            <div className="text-2xl font-black">Nivel {user.level}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 -mt-16 space-y-6 relative z-20">
        {/* Streak Risk Alert Banner */}
        <StreakRiskBanner 
          currentStreak={user.current_streak || 0} 
          completedToday={completedToday} 
        />

        {/* Commission Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-white/5"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mb-1 uppercase tracking-wider">
                Comisión Actual
              </p>
              <div className="text-4xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                {currentCommission.toFixed(1)}
                <span className="text-2xl text-slate-400 dark:text-slate-600">%</span>
              </div>
            </div>

            {/* Circular Progress */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className="text-slate-100 dark:text-white/5"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <motion.path
                  initial={{ strokeDasharray: "0, 100" }}
                  animate={{ strokeDasharray: `${progressTo70}, 100` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="text-blue-500"
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Meta
                </span>
                <span className="text-sm font-black text-slate-900 dark:text-white">70%</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-slate-600 dark:text-slate-400">
                Progreso a Nivel {xpProgress.nextLevel}
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {xpProgress.xpInLevel} / {xpProgress.xpRequiredForNext} XP ({xpProgress.progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full relative"
              >
                <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/30 blur-[2px]" />
              </motion.div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowShareCardModal(true)}
            className="w-full mt-4 py-3 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Generar y Compartir Tarjeta de Logro</span>
            <Share2 className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Earnings Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate("/wallet")}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-6 shadow-xl shadow-emerald-500/20 text-white relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex justify-between items-center mb-2 relative z-10">
            <p className="font-medium text-emerald-100 uppercase tracking-wider text-sm">
              Total Generado
            </p>
            <TrendingUp className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="text-4xl font-black tracking-tight relative z-10">
            ${(user.totalEarned || 0).toLocaleString("es-CO")}
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-100 uppercase tracking-widest">
            <span>Ver Billetera</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div className={`grid ${isLeaderEligible ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate("/referrals")}
            className="bg-white dark:bg-[#111] rounded-3xl p-4 shadow-lg shadow-slate-200/40 dark:shadow-black/20 border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-white">Invitar</span>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate("/tasks")}
            className="bg-white dark:bg-[#111] rounded-3xl p-4 shadow-lg shadow-slate-200/40 dark:shadow-black/20 border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500">
              <CheckSquare className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-white">Tareas</span>
          </motion.button>

          {isLeaderEligible && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              onClick={() => navigate("/team")}
              className="bg-white dark:bg-[#111] rounded-3xl p-4 shadow-lg shadow-slate-200/40 dark:shadow-black/20 border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Shield className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm text-slate-800 dark:text-white">Mi Red</span>
            </motion.button>
          )}
        </div>

        {/* User Plan View */}
        <UserPlanView />

        {/* Projection Calculator */}
        <ProjectionCalculator 
          currentXP={user.xp || 0}
          currentLevel={user.level || 1}
          plan={user.plan}
        />

        {/* Advanced Stats */}
        {getUserFeature('has_advanced_stats') && (
          <AdvancedStats />
        )}

        {/* Mentor IA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => navigate("/mentor")}
          className="bg-slate-900 dark:bg-[#111] rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20 dark:shadow-black/40 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform relative overflow-hidden border border-white/5"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/20 blur-2xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-0.5">
                Nuevo
              </p>
              <p className="font-bold text-lg">Hablar con Mentor IA</p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-slate-500" />
        </motion.div>

        {/* Viral Engine */}
        {getUserFeature('whatsapp_boost') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            onClick={() => navigate("/referrals", { state: { tab: 'personalize' } })}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-3xl p-6 text-white shadow-xl shadow-violet-500/20 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-violet-200 text-xs font-bold uppercase tracking-widest mb-0.5">
                  Herramienta
                </p>
                <p className="font-bold text-lg">Motor de Conversión Viral</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-white/70" />
          </motion.div>
        )}

        {/* Next Milestone */}
        {nextBadge && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-[#111] rounded-3xl p-6 border border-slate-100 dark:border-white/5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-0.5">
                  Próxima Insignia
                </p>
                <p className="font-bold text-slate-800 dark:text-slate-200">{nextBadge.name} (Nivel {nextBadge.level})</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-300 dark:text-slate-600">Bloqueado</span>
          </motion.div>
        )}
      </div>

      {showTour && <OnboardingTour onComplete={() => setShowTour(false)} />}

      {/* Share Card Modal */}
      {user && (
        <AchievementShareCardModal
          isOpen={showShareCardModal}
          onClose={() => setShowShareCardModal(false)}
          user={user}
        />
      )}
    </div>
  );
}
