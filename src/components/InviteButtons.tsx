import React, { useState } from "react";
import { MessageCircle, UserPlus, Copy, CheckCircle2, Share2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useSettings } from "../contexts/SettingsContext";
import { motion } from "motion/react";

interface InviteButtonsProps {
  referralCode: string;
  referrerName: string;
  whatsappMessage?: string;
}

export default function InviteButtons({ referralCode, referrerName, whatsappMessage }: InviteButtonsProps) {
  const [copied, setCopied] = useState(false);
  const { settings } = useSettings();
  const inviteLink = `${window.location.origin}/invite/${referralCode}`;
  const registerLink = `/register?ref=${referralCode}`;

  const appName = settings.app_name || "ImpulsaRed";
  const defaultWhatsappMessage = `🚀 ¡Hola! ${referrerName} te invita a unirte a ${appName}.\n\n💰 Gana hasta 70% de comisiones por red y completa tareas diarias para ganar saldo real.\n\n👉 Accede a tu cupo exclusivo aquí:\n${inviteLink}`;
  const finalWhatsappMessage = whatsappMessage ? `${whatsappMessage}\n\n${inviteLink}` : defaultWhatsappMessage;

  const trackEvent = (eventType: string) => {
    fetch("/api/referrals/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referralCode,
        eventType,
        metadata: { path: window.location.pathname, button: eventType }
      })
    }).catch(() => {});
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    trackEvent("copy_invite_link");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsappShare = () => {
    trackEvent("click_whatsapp");
    const url = `https://wa.me/?text=${encodeURIComponent(finalWhatsappMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRegisterClick = () => {
    localStorage.setItem("referral_code", referralCode);
    sessionStorage.setItem("referral_code", referralCode);
    trackEvent("click_register");
  };

  return (
    <div className="w-full space-y-3">
      {/* Main Registration CTA */}
      <Link
        id="register-button"
        to={registerLink}
        onClick={handleRegisterClick}
        className="flex items-center justify-center gap-2.5 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-base sm:text-lg shadow-xl shadow-blue-600/30 transition-all active:scale-95 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
        <UserPlus className="w-5 h-5 z-10" />
        <span className="z-10 tracking-wide uppercase">REGISTRARME AHORA</span>
      </Link>

      {/* WhatsApp Share CTA */}
      <button
        id="share-whatsapp"
        onClick={handleWhatsappShare}
        className="flex items-center justify-center gap-2.5 w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl font-bold text-sm sm:text-base transition-all active:scale-95 shadow-lg shadow-[#25D366]/20 cursor-pointer"
      >
        <MessageCircle className="w-5 h-5" />
        <span>COMPARTIR POR WHATSAPP</span>
      </button>

      {/* Copy Link Button */}
      <button
        onClick={handleCopy}
        className="flex items-center justify-center gap-2 w-full py-3 text-xs sm:text-sm text-slate-300 hover:text-white transition-colors rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer font-semibold"
      >
        {copied ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 font-bold">¡Enlace de invitación copiado!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 text-slate-400" />
            <span>Copiar Enlace de Invitación</span>
          </>
        )}
      </button>
    </div>
  );
}
