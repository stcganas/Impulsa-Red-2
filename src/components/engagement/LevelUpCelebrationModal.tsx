import { motion, AnimatePresence } from "motion/react";
import { Trophy, Sparkles, Award, ArrowRight, Check, Share2, Star } from "lucide-react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { calculatePercentage } from "../../utils/levelUtils";

interface LevelUpCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  xpGained: number;
  userPlan?: string;
}

export function LevelUpCelebrationModal({
  isOpen,
  onClose,
  newLevel,
  xpGained,
  userPlan = "Básico",
}: LevelUpCelebrationModalProps) {
  const { width, height } = useWindowSize();

  if (!isOpen) return null;

  const getBadgeName = (level: number) => {
    if (level >= 100) return "Arquitecto 70%";
    if (level >= 90) return "Líder Supremo";
    if (level >= 80) return "Transformador";
    if (level >= 70) return "Referente (Mes 2)";
    if (level >= 60) return "Mentor";
    if (level >= 50) return "Inspirador";
    if (level >= 40) return "Constructor";
    if (level >= 30) return "Estratega (Mes 1)";
    if (level >= 20) return "Visionario";
    if (level >= 10) return "Emprendedor";
    return "Promotor Inicial";
  };

  const badgeName = getBadgeName(newLevel);
  const newCommission = calculatePercentage(newLevel, userPlan);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 overflow-y-auto"
        onClick={onClose}
      >
        <Confetti width={width} height={height} recycle={false} numberOfPieces={600} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 30 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-gradient-to-b from-slate-900 via-[#111] to-[#0a0a0a] text-white p-6 sm:p-8 rounded-[36px] text-center shadow-2xl shadow-amber-500/20 max-w-sm w-full border border-amber-500/30 relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Trophy Icon Badge */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-24 h-24 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/40 border-2 border-amber-300 relative"
          >
            <Trophy className="w-12 h-12 text-white" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              className="absolute -top-2 -right-2 p-1.5 rounded-full bg-white text-amber-500 shadow-md"
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
          </motion.div>

          <span className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-block mb-2">
            ¡Ascenso de Nivel!
          </span>

          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 tracking-tight mb-1">
            Nivel {newLevel}
          </h2>

          <p className="text-lg font-bold text-amber-200/90 mb-4">
            Rango: <span className="text-white">{badgeName}</span>
          </p>

          {/* Stats Box */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-medium">XP Ganado:</span>
              <span className="font-extrabold text-amber-400">+{xpGained} XP</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-medium">Nueva Comisión:</span>
              <span className="font-extrabold text-emerald-400 text-base">{newCommission.toFixed(2)}%</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            ¡Sigue completando tus tareas diarias para alcanzar el Nivel 100 y tu 70% de comisión!
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>¡Continuar Ganando!</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
