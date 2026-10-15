import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Flame, Clock, AlertTriangle, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StreakRiskBannerProps {
  currentStreak?: number;
  completedToday?: boolean;
  className?: string;
}

export function StreakRiskBanner({
  currentStreak = 0,
  completedToday = false,
  className,
}: StreakRiskBannerProps) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Calculate countdown to midnight local time
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);

      const diffMs = Math.max(0, midnight.getTime() - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate streak bonus
  const getStreakBonusXP = (streak: number) => {
    if (streak >= 30) return 250;
    if (streak >= 14) return 150;
    if (streak >= 7) return 100;
    if (streak >= 3) return 30;
    return 10;
  };

  const bonusXP = getStreakBonusXP(currentStreak);

  if (completedToday) {
    return (
      <div className={cn("p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between", className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Flame className="w-6 h-6 fill-emerald-500 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Racha Activa: {currentStreak} {currentStreak === 1 ? "día" : "días"}
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                Protegida hoy
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ¡Completaste tu tarea diaria! Sumaste +{bonusXP} XP extra por tu constancia.
            </p>
          </div>
        </div>
        <ShieldCheck className="w-6 h-6 text-emerald-500 hidden sm:block" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-orange-950/90 border border-orange-500/40 relative overflow-hidden shadow-xl shadow-orange-500/10 text-white",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/40 shrink-0 mt-0.5 sm:mt-0 animate-pulse">
            <Flame className="w-7 h-7 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-extrabold text-base text-white tracking-tight">
                ¡Tu Racha de {currentStreak} {currentStreak === 1 ? "Día" : "Días"} está en Riesgo!
              </h4>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span>Expira hoy</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Haz al menos 1 tarea hoy para mantener tu avance al Nivel 100 y desbloquear <strong className="text-amber-400">+{bonusXP} XP extra</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
            <Clock className="w-4 h-4 text-orange-400" />
            <span>
              {String(timeLeft.hours).padStart(2, "0")}h {String(timeLeft.minutes).padStart(2, "0")}m {String(timeLeft.seconds).padStart(2, "0")}s
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/tasks")}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-orange-500/30 flex items-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer"
          >
            <span>Ir a Tareas</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
