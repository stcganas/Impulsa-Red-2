import { motion } from "motion/react";
import {
  Trophy,
  Star,
  Shield,
  Crown,
  Medal,
  Award,
  Target,
  Zap,
  Rocket,
  Gem,
  Check,
  Calendar,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { 
  calculatePercentage, 
  getXPProgressInCurrentLevel, 
  getDailyPacingGoal, 
  LEVEL_100_TOTAL_XP,
  MONTH_1_TARGET_XP,
  MONTH_2_TARGET_XP,
  MONTH_3_TARGET_XP,
  getXPForLevel
} from "../utils/levelUtils";

const badges = [
  {
    level: 1,
    name: "Novato",
    icon: Star,
    color: "text-slate-400 bg-slate-100",
  },
  {
    level: 10,
    name: "Emprendedor",
    icon: Target,
    color: "text-blue-500 bg-blue-50",
  },
  {
    level: 20,
    name: "Visionario",
    icon: Zap,
    color: "text-indigo-500 bg-indigo-50",
  },
  {
    level: 30,
    name: "Estratega",
    icon: Shield,
    color: "text-emerald-500 bg-emerald-50",
    month: "Mes 1",
  },
  {
    level: 40,
    name: "Constructor",
    icon: Rocket,
    color: "text-teal-500 bg-teal-50",
  },
  {
    level: 50,
    name: "Inspirador",
    icon: Medal,
    color: "text-amber-500 bg-amber-50",
  },
  {
    level: 60,
    name: "Mentor",
    icon: Award,
    color: "text-orange-500 bg-orange-50",
  },
  {
    level: 70,
    name: "Referente",
    icon: Trophy,
    color: "text-rose-500 bg-rose-50",
    month: "Mes 2",
  },
  {
    level: 80,
    name: "Transformador",
    icon: Gem,
    color: "text-fuchsia-500 bg-fuchsia-50",
  },
  {
    level: 90,
    name: "Líder Supremo",
    icon: Crown,
    color: "text-purple-600 bg-purple-100",
  },
  {
    level: 100,
    name: "Arquitecto",
    icon: Crown,
    color:
      "text-yellow-500 bg-yellow-100 border-2 border-yellow-400 shadow-lg shadow-yellow-500/30",
    month: "Mes 3",
  },
];

export default function Levels() {
  const { user } = useUser();

  if (!user) return null;

  const currentLevel = user.level || 1;
  const currentCommission = user.percentage || 5;
  const xp = user.xp || 0;

  const progress = getXPProgressInCurrentLevel(xp);
  const pacing = getDailyPacingGoal(xp, 1);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24 relative overflow-hidden transition-colors duration-300">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-amber-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plan 90 Días al Nivel 100</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Tu Progreso de Nivel
          </h1>
          <p className="text-slate-400 dark:text-slate-500 text-base">
            Alcanza el Nivel 100 en 3 meses y desbloquea el 70% de comisión.
          </p>
        </div>
      </div>

      {/* Current Status Card */}
      <div className="px-6 -mt-16 relative z-20 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-white/5 space-y-6"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider mb-0.5">
                  Nivel Actual
                </p>
                <div className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Nv. {currentLevel}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    {xp.toLocaleString()} XP
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider mb-0.5">
                Comisión Red
              </p>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {currentCommission.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* XP Progress Bar to Next Level */}
          <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-600 dark:text-slate-300">
                Progreso a Nivel {progress.nextLevel}
              </span>
              <span className="text-blue-600 dark:text-blue-400">
                {progress.xpInLevel} / {progress.xpRequiredForNext} XP ({progress.progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.progressPercent}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* 90-Day Challenge Pacing Indicator */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Meta Recomendada: ~500 XP / día
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Te faltan {progress.remainingTo100.toLocaleString()} XP para alcanzar el Nivel 100.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3-Month Segmented Roadmap */}
      <div className="px-6 mb-8">
        <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          <span>Etapas del Plan de 90 Días</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Mes 1 */}
          <div className={cn(
            "p-4 rounded-2xl border transition-all",
            currentLevel >= 30 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100" 
              : currentLevel >= 1 
                ? "bg-white dark:bg-[#111] border-blue-500/40 shadow-sm" 
                : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 opacity-60"
          )}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500">
                Mes 1 (Días 1-30)
              </span>
              <span className="text-xs font-bold text-slate-500">250 XP / Nv</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Meta: Nivel 30 (Estratega)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Acumulado: {MONTH_1_TARGET_XP.toLocaleString()} XP
            </p>
          </div>

          {/* Mes 2 */}
          <div className={cn(
            "p-4 rounded-2xl border transition-all",
            currentLevel >= 70 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100" 
              : currentLevel >= 31 
                ? "bg-white dark:bg-[#111] border-amber-500/40 shadow-sm" 
                : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 opacity-60"
          )}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500">
                Mes 2 (Días 31-60)
              </span>
              <span className="text-xs font-bold text-slate-500">450 XP / Nv</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Meta: Nivel 70 (Referente)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Acumulado: {MONTH_2_TARGET_XP.toLocaleString()} XP
            </p>
          </div>

          {/* Mes 3 */}
          <div className={cn(
            "p-4 rounded-2xl border transition-all",
            currentLevel >= 100 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100" 
              : currentLevel >= 71 
                ? "bg-white dark:bg-[#111] border-purple-500/40 shadow-sm" 
                : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 opacity-60"
          )}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-500">
                Mes 3 (Días 61-90)
              </span>
              <span className="text-xs font-bold text-slate-500">650 XP / Nv</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Meta: Nivel 100 (Arquitecto 70%)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Acumulado: {MONTH_3_TARGET_XP.toLocaleString()} XP
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200 mb-6">
          Rangos e Hitos Desbloqueables
        </h2>

        <div className="relative pl-8 space-y-8 before:absolute before:inset-0 before:ml-10 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-700 before:to-transparent">
          {badges.map((badge, idx) => {
            const isUnlocked = currentLevel >= badge.level;
            const isNext =
              !isUnlocked && (idx === 0 || badges[idx - 1]?.level <= currentLevel);
            const Icon = badge.icon;
            const requiredXP = getXPForLevel(badge.level);

            return (
              <motion.div
                key={badge.level}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-[#111] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10",
                    isUnlocked
                      ? "bg-emerald-500"
                      : isNext
                        ? "bg-amber-500 animate-pulse"
                        : "bg-slate-200 dark:bg-slate-800",
                  )}
                >
                  {isUnlocked ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-xs font-bold text-white dark:text-slate-400">
                      {badge.level}
                    </span>
                  )}
                </div>

                {/* Card */}
                <div
                  className={cn(
                    "w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl shadow-sm border transition-all",
                    isUnlocked
                      ? "bg-white dark:bg-[#111] border-emerald-100 dark:border-emerald-500/20 shadow-emerald-100/50 dark:shadow-emerald-500/5"
                      : isNext
                        ? "bg-white dark:bg-[#111] border-amber-200 dark:border-amber-500/30 shadow-amber-200/50 dark:shadow-amber-500/10 ring-2 ring-amber-100 dark:ring-amber-500/20"
                        : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 opacity-60 grayscale",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        badge.color,
                        badge.color.includes('bg-slate-100') && 'dark:bg-slate-800 dark:text-slate-400',
                        badge.color.includes('bg-blue-50') && 'dark:bg-blue-500/10 dark:text-blue-400',
                        badge.color.includes('bg-indigo-50') && 'dark:bg-indigo-500/10 dark:text-indigo-400',
                        badge.color.includes('bg-emerald-50') && 'dark:bg-emerald-500/10 dark:text-emerald-400',
                        badge.color.includes('bg-teal-50') && 'dark:bg-teal-500/10 dark:text-teal-400',
                        badge.color.includes('bg-amber-50') && 'dark:bg-amber-500/10 dark:text-amber-400',
                        badge.color.includes('bg-orange-50') && 'dark:bg-orange-500/10 dark:text-orange-400',
                        badge.color.includes('bg-rose-50') && 'dark:bg-rose-500/10 dark:text-rose-400',
                        badge.color.includes('bg-fuchsia-50') && 'dark:bg-fuchsia-500/10 dark:text-fuchsia-400',
                        badge.color.includes('bg-purple-100') && 'dark:bg-purple-500/10 dark:text-purple-400',
                        badge.color.includes('bg-yellow-100') && 'dark:bg-yellow-500/10 dark:text-yellow-400',
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3
                          className={cn(
                            "font-bold text-lg",
                            isUnlocked ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-600",
                          )}
                        >
                          {badge.name}
                        </h3>
                        {badge.month && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500">
                            {badge.month}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        Nivel {badge.level} • {calculatePercentage(badge.level, user.plan || 'Básico').toFixed(2)}% Comisión
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Requiere {requiredXP.toLocaleString()} XP acumulados
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
