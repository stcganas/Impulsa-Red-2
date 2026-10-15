import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Share2, MessageCircle, CheckCircle2, Rocket, ChevronRight, AlertCircle, ExternalLink, Sparkles, Eye } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFeatures } from "../contexts/FeatureContext";
import { useSettings } from "../contexts/SettingsContext";
import { useNotifications } from "../contexts/NotificationContext";
import { cn } from "@/lib/utils";
import { TaskEngine } from "../utils/TaskEngine";

interface InviteFriendsProps {
  referralCode: string;
  onSwitchToViral?: () => void;
  referralCount?: number;
}

export default function InviteFriends({ referralCode, onSwitchToViral, referralCount = 0 }: InviteFriendsProps) {
  const [copiedViral, setCopiedViral] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const { getUserFeature } = useFeatures();
  const { settings } = useSettings();
  const { broadcastActivity } = useNotifications();

  const viralLink = `${window.location.origin}/invite/${referralCode}`;
  const directLink = `${window.location.origin}/register?ref=${referralCode}`;

  const maxReferrals = getUserFeature('max_referrals');
  const hasReachedLimit = maxReferrals !== null && maxReferrals !== undefined && referralCount >= maxReferrals;

  const copyViralLink = async () => {
    if (hasReachedLimit) return;
    navigator.clipboard.writeText(viralLink);
    setCopiedViral(true);
    broadcastActivity('compartió su enlace viral');
    await TaskEngine.triggerEvent('SHARE_COMPLETED', 1);
    setTimeout(() => setCopiedViral(false), 2000);
  };

  const copyCode = async () => {
    if (hasReachedLimit) return;
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const shareWhatsApp = async () => {
    if (hasReachedLimit) return;
    const appName = settings.app_name || "ImpulsaRed";
    const message = `🚀 ¡Hola! Te invito a unirte a mi equipo en ${appName}.\n\n💰 Gana hasta un 70% de comisiones por red y completa tareas remuneradas desde tu celular.\n\n👇 Ingresa aquí a tu cupo exclusivo:\n${viralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    broadcastActivity('compartió por WhatsApp');
    await TaskEngine.triggerEvent('SHARE_COMPLETED', 1);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareGeneric = async () => {
    if (hasReachedLimit) return;
    const appName = settings.app_name || "ImpulsaRed";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Únete a mi equipo en ${appName}`,
          text: `Gana dinero diario con tareas y comisiones por red en ${appName} 🚀`,
          url: viralLink,
        });
        broadcastActivity('compartió su invitación');
        await TaskEngine.triggerEvent('SHARE_COMPLETED', 1);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      copyViralLink();
    }
  };

  return (
    <div className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center">
          <Share2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invitar amigos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Gana XP y comisiones por cada amigo que se una a tu red.</p>
        </div>
      </div>

      {/* Limit Warning */}
      {hasReachedLimit && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">Límite de referidos alcanzado</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Tu plan actual permite un máximo de {maxReferrals} referidos. Mejora tu plan para invitar a más personas.
            </p>
          </div>
        </div>
      )}

      {/* Viral Engine Banner */}
      {onSwitchToViral && (
        <motion.div 
          whileHover={!hasReachedLimit ? { scale: 1.01 } : {}}
          whileTap={!hasReachedLimit ? { scale: 0.99 } : {}}
          onClick={!hasReachedLimit ? onSwitchToViral : undefined}
          className={cn(
            "rounded-2xl p-4 text-white shadow-lg flex items-center justify-between relative overflow-hidden transition-all",
            hasReachedLimit 
              ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-50" 
              : "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-blue-500/20 cursor-pointer"
          )}
        >
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">Alta Conversión</span>
                <p className="text-blue-100 text-[11px] font-bold">Página de aterrizaje personalizada</p>
              </div>
              <p className="font-bold text-sm">Personalizar Motor de Conversión Viral</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/80 relative z-10" />
        </motion.div>
      )}

      {/* Highlighted Viral Link Box */}
      <div className={cn(
        "p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30 rounded-2xl border border-blue-100 dark:border-blue-800/40 space-y-3",
        hasReachedLimit ? "opacity-50" : ""
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">Tu Enlace Viral Recomendado</span>
          </div>
          <Link
            to={`/invite/${referralCode}`}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver página en app</span>
          </Link>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex-1 truncate">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Página de conversión personalizada con tu perfil de líder</p>
          </div>
          <button 
            onClick={copyViralLink}
            disabled={hasReachedLimit}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-bold text-xs flex items-center gap-2 shrink-0 shadow-sm cursor-pointer"
          >
            {copiedViral ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copiedViral ? "¡Enlace Copiado!" : "Copiar Enlace"}</span>
          </button>
        </div>
      </div>

      {/* Referral Code Box */}
      <div className={cn(
        "bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-dashed transition-all",
        hasReachedLimit ? "border-slate-300 dark:border-white/5 opacity-50" : "border-slate-200 dark:border-white/10"
      )}>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tu código de invitación</p>
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-2xl font-mono font-black tracking-widest transition-all",
            hasReachedLimit ? "text-slate-400" : "text-blue-600 dark:text-blue-400"
          )}>{referralCode}</span>
          <button 
            onClick={copyCode}
            disabled={hasReachedLimit}
            className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:cursor-not-allowed"
          >
            {copiedCode ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button 
          onClick={shareWhatsApp}
          disabled={hasReachedLimit}
          className={cn(
            "flex items-center justify-center gap-2 py-3.5 text-white rounded-2xl font-bold text-sm sm:text-base transition-all shadow-lg",
            hasReachedLimit 
              ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed shadow-none" 
              : "bg-[#25D366] hover:opacity-90 shadow-[#25D366]/20"
          )}
        >
          <MessageCircle className="w-5 h-5" />
          WhatsApp
        </button>
        <button 
          onClick={shareGeneric}
          disabled={hasReachedLimit}
          className={cn(
            "flex items-center justify-center gap-2 py-3.5 text-white rounded-2xl font-bold text-sm sm:text-base transition-all shadow-lg",
            hasReachedLimit 
              ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed shadow-none" 
              : "bg-slate-900 dark:bg-white dark:text-slate-950 hover:bg-slate-800 shadow-slate-900/20"
          )}
        >
          <Share2 className="w-5 h-5" />
          Compartir
        </button>
      </div>

      <AnimatePresence>
        {(copiedViral || copiedCode) && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold shadow-2xl z-50 border border-white/10"
          >
            {copiedViral ? "¡Enlace viral copiado al portapapeles!" : "¡Código copiado al portapapeles!"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
