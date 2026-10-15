import React from 'react';
import { motion } from 'motion/react';
import { Gift, Star, TrendingUp, Award } from 'lucide-react';

export default function RewardPreview() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-indigo-950/40 via-blue-950/30 to-purple-950/20 border border-blue-500/20 rounded-2xl p-5 shadow-lg my-4"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2.5 rounded-xl shadow-md ring-1 ring-white/10">
          <Gift className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wide">
            Beneficios Exclusivos al Registrarte
          </h3>
          <p className="text-[11px] text-blue-300 font-medium">Bono aplicado automáticamente con este enlace</p>
        </div>
      </div>
      
      <ul className="space-y-2.5">
        <li className="flex items-center gap-3 text-slate-200 text-xs font-semibold bg-white/5 p-2.5 rounded-xl border border-white/5">
          <div className="bg-amber-500/20 text-amber-400 p-1.5 rounded-lg shrink-0">
            <Star className="w-4 h-4" />
          </div>
          <span><strong>+100 XP</strong> de bonificación inicial de bienvenida</span>
        </li>
        <li className="flex items-center gap-3 text-slate-200 text-xs font-semibold bg-white/5 p-2.5 rounded-xl border border-white/5">
          <div className="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-lg shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span>Acceso inmediato a ganancias por red (hasta 3 niveles)</span>
        </li>
        <li className="flex items-center gap-3 text-slate-200 text-xs font-semibold bg-white/5 p-2.5 rounded-xl border border-white/5">
          <div className="bg-purple-500/20 text-purple-400 p-1.5 rounded-lg shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <span>Misiones diarias remuneradas con retiro directo</span>
        </li>
      </ul>
    </motion.div>
  );
}
