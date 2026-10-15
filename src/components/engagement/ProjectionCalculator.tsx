import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Calculator, Sparkles, TrendingUp, Target, Award, ArrowRight } from "lucide-react";
import { 
  LEVEL_100_TOTAL_XP, 
  calculateLevelFromXP, 
  calculatePercentage, 
  getXPForLevel 
} from "../../utils/levelUtils";
import { cn } from "@/lib/utils";

interface ProjectionCalculatorProps {
  currentXP: number;
  currentLevel: number;
  plan?: string;
  className?: string;
}

export function ProjectionCalculator({
  currentXP = 0,
  currentLevel = 1,
  plan = "Básico",
  className,
}: ProjectionCalculatorProps) {
  const [dailyPace, setDailyPace] = useState<number>(500); // Default target 500 XP/day

  const presets = [
    { label: "Casual", xp: 200, desc: "1-2 tareas" },
    { label: "Constante", xp: 350, desc: "Tareas + Racha" },
    { label: "Óptimo (90 Días)", xp: 500, desc: "Tareas + Red + Racha", recommended: true },
    { label: "Acelerado", xp: 750, desc: "Equipo activo" },
    { label: "Top Leader", xp: 1000, desc: "Crecimiento rápido" },
  ];

  const projection = useMemo(() => {
    const xpRemaining = Math.max(0, LEVEL_100_TOTAL_XP - currentXP);
    const pace = Math.max(50, dailyPace);
    const daysNeeded = Math.ceil(xpRemaining / pace);
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysNeeded);

    const formattedTargetDate = targetDate.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Milestone predictions
    const milestone30XP = Math.min(LEVEL_100_TOTAL_XP, currentXP + pace * 30);
    const milestone60XP = Math.min(LEVEL_100_TOTAL_XP, currentXP + pace * 60);
    const milestone90XP = Math.min(LEVEL_100_TOTAL_XP, currentXP + pace * 90);

    const level30 = calculateLevelFromXP(milestone30XP);
    const level60 = calculateLevelFromXP(milestone60XP);
    const level90 = calculateLevelFromXP(milestone90XP);

    const comm30 = calculatePercentage(level30, plan);
    const comm60 = calculatePercentage(level60, plan);
    const comm90 = calculatePercentage(level90, plan);

    return {
      xpRemaining,
      daysNeeded,
      formattedTargetDate,
      milestone30: { level: level30, comm: comm30, xp: milestone30XP },
      milestone60: { level: level60, comm: comm60, xp: milestone60XP },
      milestone90: { level: level90, comm: comm90, xp: milestone90XP },
    };
  }, [currentXP, dailyPace, plan]);

  return (
    <div className={cn("bg-white dark:bg-[#111] rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-white/5", className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Simulador de Proyección Nivel 100
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Interactivo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Calcula cuándo llegarás al 70% de comisión según tu esfuerzo diario.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="mb-6">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 block">
          Selecciona tu Ritmo Diario de XP:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.xp}
              type="button"
              onClick={() => setDailyPace(preset.xp)}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between",
                dailyPace === preset.xp
                  ? "bg-amber-500/10 border-amber-500 text-slate-900 dark:text-white shadow-md shadow-amber-500/10"
                  : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/10"
              )}
            >
              {preset.recommended && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-bl-lg uppercase">
                  Ideal
                </div>
              )}
              <span className="font-bold text-sm block">{preset.label}</span>
              <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                +{preset.xp} XP/día
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Slider */}
      <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Ajuste fino de XP diario:
          </span>
          <span className="text-sm font-black text-amber-600 dark:text-amber-400">
            {dailyPace} XP / día
          </span>
        </div>
        <input
          type="range"
          min="100"
          max="1500"
          step="50"
          value={dailyPace}
          onChange={(e) => setDailyPace(Number(e.target.value))}
          className="w-full accent-amber-500 cursor-pointer"
        />
      </div>

      {/* Result Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase mb-1">
            <Target className="w-4 h-4" />
            <span>Tiempo Estimado para Nivel 100</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {projection.daysNeeded} Días
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Fecha calculada: <span className="font-bold text-slate-700 dark:text-slate-200">{projection.formattedTargetDate}</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase mb-1">
            <Award className="w-4 h-4" />
            <span>Meta de Comisión Alcanzada</span>
          </div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            70.00%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Restante por acumular: <span className="font-bold text-slate-700 dark:text-slate-200">{projection.xpRemaining.toLocaleString()} XP</span>
          </p>
        </div>
      </div>

      {/* Projected Milestones Timeline */}
      <div className="border-t border-slate-100 dark:border-white/5 pt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <span>Proyección en los Próximos Meses:</span>
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {/* Day 30 */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">En 30 Días</span>
            <span className="text-sm font-black text-slate-900 dark:text-white block mt-0.5">
              Nv. {projection.milestone30.level}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
              {projection.milestone30.comm.toFixed(1)}% com.
            </span>
          </div>

          {/* Day 60 */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-center">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">En 60 Días</span>
            <span className="text-sm font-black text-slate-900 dark:text-white block mt-0.5">
              Nv. {projection.milestone60.level}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
              {projection.milestone60.comm.toFixed(1)}% com.
            </span>
          </div>

          {/* Day 90 */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 block">En 90 Días</span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400 block mt-0.5">
              Nv. {projection.milestone90.level}
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
              {projection.milestone90.comm.toFixed(1)}% com.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
