import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  CheckCircle2, 
  Users, 
  Trophy, 
  Zap, 
  Loader2, 
  MessageCircle, 
  Gift, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Star, 
  Sparkles, 
  Copy, 
  Check, 
  TrendingUp, 
  DollarSign, 
  Smartphone, 
  BrainCircuit, 
  BadgeCheck,
  Award,
  ChevronRight
} from "lucide-react";
import InviteProfileCard from "../components/InviteProfileCard";
import InviteButtons from "../components/InviteButtons";
import { motion, AnimatePresence } from "motion/react";
import UrgencyBanner from "../components/viral/UrgencyBanner";
import RewardPreview from "../components/viral/RewardPreview";
import ReferralProgressBar from "../components/viral/ReferralProgressBar";
import ExitIntentModal from "../components/viral/ExitIntentModal";
import { useSettings } from "../contexts/SettingsContext";

interface ReferrerInfo {
  id?: string;
  name: string;
  photo_url?: string;
  invite_title?: string;
  invite_message?: string;
  invite_banner?: string;
  invite_whatsapp_message?: string;
  referral_code: string;
  level?: number;
  plan?: string;
}

export default function InviteLandingPage() {
  const { referralCode } = useParams<{ referralCode: string }>();
  const navigate = useNavigate();
  const cleanCode = (referralCode || "").trim().toUpperCase();

  const [referrer, setReferrer] = useState<ReferrerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinedCount, setJoinedCount] = useState(14);
  const [dailyJoins, setDailyJoins] = useState(3);
  const { settings } = useSettings();
  const [isFromWhatsapp, setIsFromWhatsapp] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!cleanCode) {
      setLoading(false);
      return;
    }

    // Persist referral code for the registration page
    localStorage.setItem("referral_code", cleanCode);
    sessionStorage.setItem("referral_code", cleanCode);

    // Detect visitor source
    if (document.referrer.includes("whatsapp") || window.location.search.includes("source=whatsapp")) {
      setIsFromWhatsapp(true);
    }
    if (localStorage.getItem(`visited_${cleanCode}`)) {
      setIsReturning(true);
    }
    localStorage.setItem(`visited_${cleanCode}`, "true");

    // Track click & page view asynchronously via server
    fetch("/api/referrals/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralCode: cleanCode })
    }).catch(() => {});

    fetch("/api/referrals/track-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referralCode: cleanCode,
        eventType: "page_view",
        metadata: { referrer: document.referrer, source: isFromWhatsapp ? "whatsapp" : "direct" }
      })
    }).catch(() => {});

    // Fetch referrer details from backend
    const loadReferrerInfo = async () => {
      try {
        const response = await fetch(`/api/referrals/info/${encodeURIComponent(cleanCode)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.referrer) {
            setReferrer(data.referrer);
            if (typeof data.joinedCount === "number") setJoinedCount(data.joinedCount);
            if (typeof data.dailyJoins === "number") setDailyJoins(data.dailyJoins);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Could not load from API, applying fallback:", err);
      }

      // Safe fallback if network error
      setReferrer({
        id: "system",
        name: "Líder de la Comunidad",
        photo_url: "",
        invite_title: `¡Te invitan a unirte a ${settings.app_name || "ImpulsaRed"}! 🚀`,
        invite_message: "Comienza a generar ingresos diarios con tareas y expande tu red de afiliados con hasta 70% de comisión.",
        invite_banner: "",
        invite_whatsapp_message: `🚀 Hola, te invito a unirte a mi equipo en ${settings.app_name || "ImpulsaRed"}. ¡Empieza a generar dinero hoy!`,
        referral_code: cleanCode,
        level: 5,
        plan: "Pro"
      });
      setLoading(false);
    };

    loadReferrerInfo();
  }, [cleanCode, settings.app_name, isFromWhatsapp]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Cargando invitación exclusiva...</p>
      </div>
    );
  }

  const appName = (settings?.app_name || "ImpulsaRed").replace(/^"|"$/g, "");
  const displayName = (referrer?.name || "").trim() || "Líder de la Red";
  const displayTitle = (referrer?.invite_title || "").trim() || `${displayName} te ha reservado un cupo VIP en ${appName} 🚀`;
  const displayMessage = (referrer?.invite_message || "").trim() || "Genera ingresos diarios reales completando tareas sencillas desde tu celular y construyendo una red de afiliados con hasta 70% de comisiones directas a tu Nequi.";
  const displayWhatsapp = (referrer?.invite_whatsapp_message || "").trim() || `🚀 ¡Hola! ${displayName} te invita a unirte a ${appName}.\n\n💰 Gana hasta 70% de comisiones por red y completa tareas diarias para ganar saldo real.`;
  const displayPhoto = (referrer?.photo_url || "").trim();
  const displayBanner = (referrer?.invite_banner || "").trim();

  const displayReferrer = {
    id: referrer?.id || "system",
    name: displayName,
    photo_url: displayPhoto,
    invite_title: displayTitle,
    invite_message: displayMessage,
    invite_banner: displayBanner,
    invite_whatsapp_message: displayWhatsapp,
    referral_code: cleanCode || referrer?.referral_code || "IMPULSA",
    level: referrer?.level || 1,
    plan: referrer?.plan || "Básico"
  };

  const steps = [
    {
      step: "01",
      icon: <Sparkles className="w-5 h-5 text-blue-400" />,
      title: "Registro Rápido y Bono",
      desc: "Activa tu cuenta con este enlace y recibe +100 XP de bienvenida inmediatamente."
    },
    {
      step: "02",
      icon: <Smartphone className="w-5 h-5 text-amber-400" />,
      title: "Completa Tareas Diarias",
      desc: "Monetiza tu tiempo libre realizando actividades digitales remuneradas desde tu celular."
    },
    {
      step: "03",
      icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
      title: "Gana hasta 70% por Red",
      desc: "Construye tu equipo en 3 niveles de comisiones directas y residuales ilimitadas."
    },
    {
      step: "04",
      icon: <DollarSign className="w-5 h-5 text-purple-400" />,
      title: "Retiros Diarios a Nequi",
      desc: "Transfiere tus ganancias acumuladas de forma segura y directa a tu cuenta registrada."
    }
  ];

  const testimonials = [
    {
      name: "Camila R.",
      role: "Nivel 4 • Bogotá",
      payout: "$240.000 COP retirados",
      comment: "Empecé haciendo las tareas diarias y ahora con mi equipo retiro semanalmente directo a Nequi. La plataforma es 100% transparente."
    },
    {
      name: "David M.",
      role: "Nivel 5 • Medellín",
      payout: "$680.000 COP generados",
      comment: "El mentor de IA te enseña exactamente cómo prospectar y cerrar nuevos miembros. La mejor decisión para generar ingresos extra."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden selection:bg-blue-600 selection:text-white">
      <ExitIntentModal referralCode={cleanCode} />

      {/* Urgency Announcement Bar */}
      <UrgencyBanner
        active={settings.bonus_active === true || settings.bonus_active === "true"}
        multiplier={Number(settings.bonus_multiplier) || 2}
        expiration={settings.bonus_expiration || new Date(Date.now() + 86400000).toISOString()}
      />

      {/* Top Hero Banner */}
      <div className="relative h-64 md:h-80 w-full bg-slate-900 overflow-hidden">
        {displayReferrer.invite_banner ? (
          <img
            src={displayReferrer.invite_banner}
            alt="Banner de Invitación"
            className="w-full h-full object-cover opacity-75"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full relative">
            <img
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
              alt="Comunidad Exitosa ImpulsaRed"
              className="w-full h-full object-cover opacity-35"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-slate-950/90 to-purple-950/80" />
            <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        {/* Floating Top Navigation */}
        <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between pointer-events-auto">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/referrals");
              }
            }}
            className="flex items-center gap-1.5 bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/10 text-xs font-bold text-slate-200 shadow-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la App</span>
          </button>

          <div className="flex items-center gap-2 bg-blue-600/90 backdrop-blur-md px-3.5 py-2 rounded-full border border-blue-400/30 text-xs font-black text-white shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{appName} OFICIAL</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 -mt-28 px-4 sm:px-6 pb-16 z-20 max-w-xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-slate-900/95 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl p-6 sm:p-8 space-y-7"
        >
          {/* Referrer Profile Card */}
          <InviteProfileCard
            name={displayReferrer.name}
            photoUrl={displayReferrer.photo_url}
            title={displayReferrer.invite_title}
            message={displayReferrer.invite_message}
          />

          {/* Contextual Badges */}
          {isReturning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-blue-500/10 text-blue-300 p-3.5 rounded-2xl text-xs font-semibold text-center border border-blue-500/20 flex items-center justify-center gap-2"
            >
              <span>👀 ¡Bienvenido de vuelta! Tu cupo con código <strong className="text-white font-mono">{cleanCode}</strong> sigue reservado.</span>
            </motion.div>
          )}

          {isFromWhatsapp && !isReturning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/10 text-emerald-300 p-3.5 rounded-2xl text-xs font-semibold text-center border border-emerald-500/20 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Invitación VIP recibida por WhatsApp 📲 Prioridad de asignación activada.</span>
            </motion.div>
          )}

          {/* Referral Code Quick Pill (Clean, without raw URL) */}
          <div className="bg-slate-800/90 rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-3 shadow-inner">
            <div className="truncate">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código de Invitación Activo</p>
              <p className="text-lg font-mono font-black text-blue-400 tracking-wider truncate">{cleanCode}</p>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-xs font-bold text-blue-300 rounded-xl border border-blue-500/30 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Copiar código"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-300" />}
              <span>{copiedCode ? "¡Copiado!" : "Copiar Código"}</span>
            </button>
          </div>

          {/* Team Progress Bar */}
          <ReferralProgressBar current={joinedCount} goal={Math.max(10, Math.ceil((joinedCount + 1) / 10) * 10)} />

          {/* Social Proof Counter */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 text-slate-300 text-xs font-bold bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span><strong>{joinedCount + 132}</strong> emprendedores en este equipo</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-bold bg-emerald-500/10 px-3.5 py-1.5 rounded-full border border-emerald-500/20">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>+{dailyJoins + 9} unidos hoy</span>
            </div>
          </div>

          {/* Supportive Visual Card: Economic & Empowerment Graphic */}
          <div className="rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-5 space-y-4 relative shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Crecimiento y Retornos Diarios</h4>
                  <p className="text-[11px] text-slate-400">Monetización comprobada y pagos directos</p>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full border border-emerald-400/30">
                100% Retirable
              </span>
            </div>

            {/* Economic Tier Breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nivel 1</p>
                <p className="text-base font-black text-emerald-400">50%</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Comisión directa</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nivel 2</p>
                <p className="text-base font-black text-blue-400">15%</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Residual indirecto</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Nivel 3</p>
                <p className="text-base font-black text-purple-400">5%</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Profundidad</p>
              </div>
            </div>

            {/* Inspiring Lifestyle & Community Image */}
            <div className="relative h-40 rounded-2xl overflow-hidden border border-white/10">
              <img
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80"
                alt="Emprendedores exitosos generando ingresos"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-bold text-white">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
                  <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>+$54.8M COP Pagados a la Red</span>
                </div>
                <div className="bg-emerald-600/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                  Vía Nequi
                </div>
              </div>
            </div>
          </div>

          {/* Reward Preview */}
          <RewardPreview />

          {/* Comprehensive Objective & Purpose Section */}
          <div className="space-y-4 pt-2">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-black uppercase tracking-wider">
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>¿Cuál es el Objetivo de {appName}?</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Democratizar la Generación de Ingresos Digitales
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                {appName} es la plataforma líder creada para que cualquier persona en Colombia pueda generar ingresos diarios reales desde su teléfono, sin experiencia previa, combinando micro-tareas remuneradas, marketing de afiliados y mentoría con Inteligencia Artificial.
              </p>
            </div>

            {/* How It Works - Step by Step */}
            <div className="grid grid-cols-1 gap-2.5 pt-2">
              {steps.map((s, idx) => (
                <div key={idx} className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-blue-500/20 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 border border-white/5 shadow-md">
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-blue-400 font-mono">{s.step}</span>
                      <h4 className="text-sm font-bold text-white leading-snug">{s.title}</h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Member Testimonials */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Historias Reales de la Comunidad</h4>
            <div className="grid grid-cols-1 gap-3">
              {testimonials.map((t, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{t.name}</p>
                      <p className="text-[10px] text-slate-400">{t.role}</p>
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {t.payout}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 italic leading-relaxed">"{t.comment}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Conversion Buttons (Registration & Traditional WhatsApp) */}
          <div className="pt-3">
            <InviteButtons
              referralCode={cleanCode}
              referrerName={displayReferrer.name}
              whatsappMessage={displayReferrer.invite_whatsapp_message}
            />
          </div>
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">{appName} • Ecosistema Digital de Afiliados y Tareas</p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            <Link to={`/register?ref=${cleanCode}`} className="hover:text-white transition-colors">Crear Cuenta</Link>
            <span>•</span>
            <Link to="/login" className="hover:text-white transition-colors">Iniciar Sesión</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

