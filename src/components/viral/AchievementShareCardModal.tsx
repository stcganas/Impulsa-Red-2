import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Share2, Sparkles, Copy, Check, MessageCircle, Send, Trophy, Flame, Shield, ArrowRight, X } from "lucide-react";
import { calculatePercentage } from "../../utils/levelUtils";
import { useSettings } from "../../contexts/SettingsContext";

interface AchievementShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    name?: string;
    level?: number;
    xp?: number;
    percentage?: number;
    plan?: string;
    referral_code?: string;
    current_streak?: number;
  };
}

export function AchievementShareCardModal({
  isOpen,
  onClose,
  user,
}: AchievementShareCardModalProps) {
  const [copied, setCopied] = useState(false);
  const { settings } = useSettings();

  if (!isOpen) return null;

  const level = user.level || 1;
  const plan = user.plan || "Básico";
  const commission = calculatePercentage(level, plan);
  const streak = user.current_streak || 0;
  const refCode = user.referral_code || "IMPULSA";
  const appName = settings?.app_name || "ImpulsaRed";
  const inviteLink = `${window.location.origin}/invite/${refCode}`;

  const getBadgeName = (lv: number) => {
    if (lv >= 100) return "Arquitecto 70%";
    if (lv >= 90) return "Líder Supremo";
    if (lv >= 80) return "Transformador";
    if (lv >= 70) return "Referente (Mes 2)";
    if (lv >= 60) return "Mentor";
    if (lv >= 50) return "Inspirador";
    if (lv >= 40) return "Constructor";
    if (lv >= 30) return "Estratega (Mes 1)";
    if (lv >= 20) return "Visionario";
    if (lv >= 10) return "Emprendedor";
    return "Promotor Inicial";
  };

  const badgeTitle = getBadgeName(level);

  const shareText = `🚀 ¡Alcancé el Nivel ${level} (${badgeTitle}) en ${appName}!
💰 Mi tasa de comisión en red ya está en ${commission.toFixed(2)}%
🔥 Racha activa: ${streak} días consecutivos

Únete a mi equipo y gana comisiones reales completando tareas diarias:
${inviteLink}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleTelegramShare = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full relative overflow-hidden shadow-2xl shadow-amber-500/10 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Tarjeta de Logro Compartible</span>
          </div>

          {/* Visual Share Card Preview */}
          <div className="bg-gradient-to-br from-slate-950 via-[#131926] to-slate-900 border-2 border-amber-500/40 rounded-3xl p-6 relative overflow-hidden shadow-inner mb-6">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-400 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 inline-block mb-1">
                  {appName} • Miembro VIP
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">
                  {user.name || "Emprendedor VIP"}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Trophy className="w-6 h-6 text-slate-950" />
              </div>
            </div>

            {/* Level & Commission Big Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Rango Actual</span>
                <span className="text-xl font-black text-amber-400 block">Nv. {level}</span>
                <span className="text-[11px] font-semibold text-slate-300 truncate block">{badgeTitle}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Comisión de Red</span>
                <span className="text-xl font-black text-emerald-400 block">{commission.toFixed(2)}%</span>
                <span className="text-[11px] text-slate-400 block">Meta: 70.00%</span>
              </div>
            </div>

            {/* Footer details in Card */}
            <div className="flex justify-between items-center text-xs text-slate-400 border-t border-white/10 pt-3">
              <div className="flex items-center gap-1.5 font-bold text-orange-400">
                <Flame className="w-4 h-4 fill-orange-400" />
                <span>Racha: {streak} días</span>
              </div>
              <div className="font-mono text-[11px] text-amber-300">
                Código: <strong className="text-white">{refCode}</strong>
              </div>
            </div>
          </div>

          {/* Social Action Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>Compartir en Estado de WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleTelegramShare}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-sm shadow-lg shadow-[#0088cc]/20 flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-5 h-5" />
              <span>Compartir en Telegram</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">¡Enlace de invitación copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copiar Mensaje e Invitación</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
