import React from "react";
import { MousePointer2, UserPlus, Activity, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

interface InviteStatsProps {
  stats: {
    clicks: number;
    registrations: number;
    active: number;
  };
}

export default function InviteStats({ stats }: InviteStatsProps) {
  const statCards = [
    {
      label: "Clics en Enlace",
      value: stats.clicks,
      icon: <MousePointer2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      colorClass: "bg-blue-50 dark:bg-blue-500/10",
      description: "Personas que abrieron tu página"
    },
    {
      label: "Registros",
      value: stats.registrations,
      icon: <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      colorClass: "bg-emerald-50 dark:bg-emerald-500/10",
      description: "Usuarios que se crearon cuenta"
    },
    {
      label: "Referidos Activos",
      value: stats.active,
      icon: <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      colorClass: "bg-amber-50 dark:bg-amber-500/10",
      description: "Usuarios con misiones activas"
    }
  ];

  const conversionRate = stats.clicks > 0 
    ? ((stats.registrations / stats.clicks) * 100).toFixed(1) 
    : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5"
          >
            <div className={`w-10 h-10 rounded-2xl ${card.colorClass} flex items-center justify-center mb-4`}>
              {card.icon}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.label}</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{card.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-slate-900 dark:bg-[#111] rounded-3xl p-6 text-white shadow-xl shadow-slate-900/20 dark:shadow-black/40 overflow-hidden relative border border-white/5">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Tasa de Conversión</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black">{conversionRate}%</span>
              <span className="text-emerald-400 text-sm font-bold">Excelente rendimiento</span>
            </div>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-white/10 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
