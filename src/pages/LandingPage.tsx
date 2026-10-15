import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Trophy, 
  ShieldCheck, 
  Zap, 
  Target,
  Sparkles,
  Rocket,
  Wallet,
  ChevronRight,
  Quote,
  Network,
  HeartHandshake,
  Gem,
  CheckCircle2,
  Globe,
  DollarSign,
  Smartphone,
  BrainCircuit,
  BadgeCheck,
  Award,
  BarChart3,
  Flame,
  Star,
  Check
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import Logo from '../components/Logo';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';

const LandingPage = () => {
  const { user, loading } = useUser();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);

  const appName = (settings?.app_name || "ImpulsaRed").replace(/^"|"$/g, "");

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data } = await supabase
          .from('plans')
          .select(`
            *,
            plan_features (
              value,
              features (
                key,
                name,
                description
              )
            )
          `)
          .order('price', { ascending: true });
        if (data && data.length > 0) {
          setPlans(data);
        }
      } catch (err) {
        console.error("Error fetching plans:", err);
      }
    };
    fetchPlans();
  }, []);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-32 font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      
      {/* Background Ambient Glows & Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-[120px]" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-emerald-600/15 rounded-full blur-[100px]" />
        <div className="absolute top-2/3 -right-48 w-96 h-96 bg-purple-600/15 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      </div>

      {/* App Header (Sticky) */}
      <header className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex justify-between items-center transition-all">
        <div className="flex items-center gap-3">
          <Logo showText size="sm" />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link 
            to="/login" 
            className="text-xs sm:text-sm font-bold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Iniciar Sesión
          </Link>
          <Link 
            to="/register" 
            className="text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 sm:px-5 py-2 rounded-xl shadow-lg shadow-blue-600/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Crear Cuenta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-28 sm:pt-36 pb-12 sm:pb-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          
          {/* VIP Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-gradient-to-r from-blue-500/15 via-indigo-500/15 to-purple-500/15 border border-blue-500/30 shadow-lg shadow-blue-500/5 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-black text-blue-300 uppercase tracking-wider">
              Ecosistema de Crecimiento Financiero & Afiliados VIP
            </span>
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-black leading-[1.08] tracking-tight text-white"
          >
            Construye tu Éxito y <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
              Multiplica tus Ingresos
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-300 text-base sm:text-xl font-medium leading-relaxed max-w-2xl mx-auto"
          >
            Monetiza tu tiempo libre completando tareas diarias remuneradas y expande una red de afiliados con <strong className="text-emerald-400 font-bold">hasta el 70% de comisiones directas</strong> con retiros rápidos a Nequi.
          </motion.p>

          {/* CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2"
          >
            <Link 
              to="/register" 
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:bg-[length:200%_auto] text-white rounded-2xl font-black text-base shadow-xl shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer border border-blue-400/30"
            >
              <Rocket className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
              <span>COMENZAR AHORA (+100 XP BONO)</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/login" 
              className="w-full sm:w-auto px-6 py-4 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-2xl font-bold text-sm border border-white/10 transition-all active:scale-95 cursor-pointer text-center"
            >
              Ya tengo una cuenta
            </Link>
          </motion.div>

          {/* Community Proof Pill */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="inline-flex items-center gap-3 bg-slate-900/90 border border-white/10 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl shadow-xl"
          >
            <div className="flex -space-x-2.5 overflow-hidden">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" alt="Miembro" />
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" alt="Miembro" />
              <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80" className="w-8 h-8 rounded-full border-2 border-slate-900 object-cover" alt="Miembro" />
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-900">
                +15K
              </div>
            </div>
            <div className="text-left text-xs">
              <p className="font-bold text-white leading-tight">Más de 15,200 Emprendedores</p>
              <p className="text-slate-400 text-[11px]">Generando ganancias diarias en Colombia</p>
            </div>
          </motion.div>
        </div>

        {/* Wealth & Financial Metrics Visual Showcase */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Card 1: Total Payouts */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-emerald-950/40 p-6 border border-emerald-500/20 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors">
              <DollarSign className="w-24 h-24 -mr-6 -mt-6" />
            </div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">Volumen Pagado</span>
                <h4 className="text-xs text-slate-400">Total liquidado a miembros</h4>
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">+$54,820,000 <span className="text-sm font-bold text-emerald-400">COP</span></div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Retiros diarios y sin comisiones ocultas</span>
            </p>
          </div>

          {/* Card 2: Network Commission Rate */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-blue-950/40 p-6 border border-blue-500/20 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-blue-500/10 group-hover:text-blue-500/20 transition-colors">
              <Network className="w-24 h-24 -mr-6 -mt-6" />
            </div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider">Comisiones de Red</span>
                <h4 className="text-xs text-slate-400">3 Niveles de profundidad</h4>
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">Hasta el 70% <span className="text-sm font-bold text-blue-400">Directo</span></div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>50% Nivel 1 • 15% Nivel 2 • 5% Nivel 3</span>
            </p>
          </div>

          {/* Card 3: AI Intelligence Engine */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-purple-950/40 p-6 border border-purple-500/20 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-purple-500/10 group-hover:text-purple-500/20 transition-colors">
              <BrainCircuit className="w-24 h-24 -mr-6 -mt-6" />
            </div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-black text-purple-400 uppercase tracking-wider">Mentor con IA</span>
                <h4 className="text-xs text-slate-400">Estrategias de prospección</h4>
              </div>
            </div>
            <div className="text-3xl font-black text-white tracking-tight">24/7 en Vivo <span className="text-sm font-bold text-purple-400">Gemini 3.7</span></div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Guiones automáticos de ventas y WhatsApp</span>
            </p>
          </div>
        </motion.div>
      </section>

      {/* Motivational Inspirational Image Banner */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto my-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-slate-900 min-h-[260px] sm:min-h-[320px] flex items-center p-6 sm:p-12"
        >
          <img 
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80" 
            alt="Jóvenes y profesionales alcanzando el éxito con ImpulsaRed" 
            className="absolute inset-0 w-full h-full object-cover opacity-25"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
          
          <div className="relative z-10 max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase">
              <Award className="w-3.5 h-3.5" />
              <span>Libertad Financiera Accesible</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              "El éxito financiero no depende de la suerte, sino del vehículo que elijas para construirlo."
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              En {appName} creamos un sistema donde el progreso individual impulsa el éxito colectivo. Conéctate, ejecuta tus misiones y escala tus recompensas desde el primer día.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Deep Dive: Objetivos & Propósito de la Aplicación */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto py-12 sm:py-16">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider">
            <Target className="w-4 h-4" />
            <span>Misión y Objetivos de {appName}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
            ¿Por qué existe {appName} y cómo transforma tus ingresos?
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Nuestro objetivo fundamental es democratizar el acceso a la economía digital, permitiendo que cualquier persona genere ganancias recurrentes a través de 4 pilares estratégicos de monetización.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Objetivo 1 */}
          <div className="p-7 rounded-[2rem] bg-slate-900/90 border border-white/10 hover:border-blue-500/30 transition-all space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">1. Monetización Inmediata con Micro-Tareas</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Eliminamos las barreras de entrada. Realiza actividades digitales sencillas como validación de contenidos, engagement y tareas diarias para acumular saldo real y puntos XP desde tu celular.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tareas diarias remuneradas todos los días</span>
            </div>
          </div>

          {/* Objetivo 2 */}
          <div className="p-7 rounded-[2rem] bg-slate-900/90 border border-white/10 hover:border-emerald-500/30 transition-all space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">2. Red de Afiliados Multinivel (Hasta 70%)</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Construye tu propio equipo de emprendedores. Recibe comisiones masivas del 50% por invitados directos (Nivel 1), 15% por Nivel 2 y 5% por Nivel 3 de forma automatizada.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ingresos residuales exponenciales en equipo</span>
            </div>
          </div>

          {/* Objetivo 3 */}
          <div className="p-7 rounded-[2rem] bg-slate-900/90 border border-white/10 hover:border-purple-500/30 transition-all space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">3. Mentoría & Automatización con IA</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Nunca estás solo. Nuestro Mentor impulsado por Gemini 3.7 te asiste en tiempo real redactando guiones de ventas, mensajes persuasivos para WhatsApp y planes de acción para duplicar tus cierres.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Entrenamiento y guiones personalizados 24/7</span>
            </div>
          </div>

          {/* Objetivo 4 */}
          <div className="p-7 rounded-[2rem] bg-slate-900/90 border border-white/10 hover:border-amber-500/30 transition-all space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">4. Retiros Rápidos y 100% Transparentes</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Tu dinero es tuyo. Solicita retiros de tus comisiones y tareas directamente a tu cuenta registrada en Nequi o transferencia bancaria con confirmación rápida y soporte prioritario.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Seguridad blindada y procesamiento verificado</span>
            </div>
          </div>
        </div>
      </section>

      {/* Real Success Testimonials */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto py-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-full">
            Testimonios Verificados
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Historias Reales de Crecimiento</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              name: "Sebastián Gómez",
              city: "Medellín, Colombia",
              rank: "Rango Diamante",
              amount: "+$1,450,000 COP",
              quote: "Con el plan Élite y el motor de referidos recuperé mi inversión en 48 horas. Las comisiones del 50% son las más altas del mercado.",
              avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
            },
            {
              name: "Camila Restrepo",
              city: "Bogotá, Colombia",
              rank: "Rango Oro",
              amount: "+$890,000 COP",
              quote: "Hago mis tareas diarias mientras voy en el transporte. Ya he retirado 3 veces directo a mi Nequi sin demoras.",
              avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80"
            },
            {
              name: "Alejandro Valencia",
              city: "Cali, Colombia",
              rank: "Rango Platino",
              amount: "+$2,100,000 COP",
              quote: "El mentor de IA me enseñó a crear los mensajes exactos para WhatsApp. Mi equipo ya tiene más de 45 personas activas.",
              avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80"
            }
          ].map((t, i) => (
            <div key={i} className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-blue-500" />
                  <div>
                    <h4 className="font-bold text-white text-sm">{t.name}</h4>
                    <p className="text-[11px] text-slate-400">{t.city} • <span className="text-amber-400 font-bold">{t.rank}</span></p>
                  </div>
                </div>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed italic">"{t.quote}"</p>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-slate-400">Ganancias generadas:</span>
                <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">{t.amount}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <span className="text-xs font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3.5 py-1 rounded-full">
            Planes de Activación
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Escala tus Ganancias</h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Elige el plan ideal para desbloquear mayores comisiones, más misiones diarias y soporte prioritario.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(plans.length > 0 ? plans : [
            { id: "1", name: "Básico", price: 30000, desc: "Para iniciar tu camino", features: ["Comisión Nivel 1 (30%)", "Tareas diarias básicas", "Retiros estándar"] },
            { id: "2", name: "Pro", price: 60000, desc: "El más popular para crecer", features: ["Comisión Nivel 1 (50%)", "Comisión Nivel 2 (10%)", "Mentor IA Básico", "Tareas remuneradas x2"] },
            { id: "3", name: "Élite VIP", price: 120000, desc: "Máxima rentabilidad y ganancias", is_popular: true, features: ["Comisión Nivel 1 (50%)", "Comisión Nivel 2 (15%)", "Comisión Nivel 3 (5%)", "Mentor IA Gemini 3.7 Ilimitado", "Misiones VIP de Alto Valor"] }
          ]).map((plan) => {
            const isPremium = plan.name.toLowerCase().includes('élite') || plan.name.toLowerCase().includes('elite') || plan.is_popular;
            
            return (
              <div 
                key={plan.id}
                className={cn(
                  "rounded-3xl p-7 flex flex-col justify-between relative overflow-hidden transition-all shadow-xl",
                  isPremium 
                    ? "bg-gradient-to-b from-blue-900/40 via-slate-900/90 to-indigo-950/60 border-2 border-blue-500/60 shadow-blue-500/10" 
                    : "bg-slate-900/80 border border-white/10 hover:border-white/20"
                )}
              >
                {isPremium && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl shadow-md">
                    MÁS RENTABLE
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <h3 className="text-xl font-black text-white">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{plan.description || "Plan optimizado para generar ingresos"}</p>
                  </div>

                  <div className="pt-2">
                    <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      ${Number(plan.price).toLocaleString('es-CO')} <span className="text-xs font-semibold text-slate-400">COP</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-white/10">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Beneficios Incluidos:</p>
                    {plan.plan_features ? (
                      plan.plan_features.map((pf: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                          <Check className={cn("w-4 h-4 shrink-0", isPremium ? "text-amber-400" : "text-blue-400")} />
                          <span>{pf.features?.name || "Característica"}: <strong className="text-white">{pf.value}</strong></span>
                        </div>
                      ))
                    ) : (
                      plan.features?.map((f: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                          <Check className={cn("w-4 h-4 shrink-0", isPremium ? "text-amber-400" : "text-blue-400")} />
                          <span>{f}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-8">
                  <Link 
                    to="/register"
                    className={cn(
                      "w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-lg",
                      isPremium 
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30" 
                        : "bg-slate-800 hover:bg-slate-700 text-white border border-white/10"
                    )}
                  >
                    <span>Activar {plan.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final High Impact Wealth Call to Action */}
      <section className="px-4 sm:px-6 max-w-4xl mx-auto mt-8 mb-12">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-900 p-8 sm:p-12 text-center text-white space-y-6 relative overflow-hidden shadow-2xl border border-blue-400/30">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-15" />
          
          <div className="relative z-10 space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black uppercase tracking-wider backdrop-blur-md">
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>Cupos VIP Abiertos</span>
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              ¿Listo para Construir tu Libertad Financiera?
            </h2>
            <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto leading-relaxed">
              Únete a miles de personas que ya están generando ingresos todos los días. Activa tu cuenta en menos de 2 minutos y recibe tu bono de bienvenida.
            </p>
          </div>

          <div className="relative z-10 pt-2">
            <Link 
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-slate-950 hover:bg-slate-100 rounded-2xl font-black text-base shadow-2xl active:scale-95 transition-all cursor-pointer"
            >
              <span>CREAR MI CUENTA GRATIS</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Sticky Bottom CTA for Mobile Conversions */}
      <div className="fixed bottom-0 left-0 w-full p-4 bg-slate-950/90 backdrop-blur-xl border-t border-white/10 z-40 sm:hidden">
        <Link 
          to="/register" 
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-6 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/40 active:scale-95 transition-transform"
        >
          <Rocket className="w-4 h-4 text-amber-300" />
          <span>COMENZAR AHORA (+100 XP)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
};

export default LandingPage;
