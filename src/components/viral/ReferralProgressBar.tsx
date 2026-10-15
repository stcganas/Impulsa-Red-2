import React from 'react';
import { motion } from 'motion/react';
import { Target, PartyPopper } from 'lucide-react';

export default function ReferralProgressBar({ current, goal }: { current: number, goal: number }) {
  const progress = Math.min((current / goal) * 100, 100);
  const isComplete = current >= goal;

  return (
    <div className="bg-slate-800/80 rounded-2xl p-4 shadow-sm border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-200 text-xs font-bold uppercase tracking-wide">
          <Target className="w-4 h-4 text-blue-400" />
          <span>Meta del equipo</span>
        </div>
        <span className="text-xs font-mono font-black text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
          {current} / {goal} miembros
        </span>
      </div>

      <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden relative border border-white/5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`absolute top-0 left-0 h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
        />
      </div>

      {isComplete ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl text-xs font-bold border border-emerald-500/20"
        >
          <PartyPopper className="w-4 h-4 shrink-0" />
          <span>¡Meta alcanzada! Bono especial activado para nuevos miembros.</span>
        </motion.div>
      ) : (
        <p className="text-[11px] text-slate-400 text-center font-medium">
          Faltan <strong>{Math.max(1, goal - current)}</strong> cupos para completar este hito de equipo
        </p>
      )}
    </div>
  );
}
