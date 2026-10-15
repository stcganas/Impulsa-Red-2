import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Network, TrendingUp, Target, Sparkles, ChevronLeft, ChevronRight, ArrowRight, ShieldCheck, Zap, Home, ArrowLeft } from "lucide-react";
import { useUser } from "../contexts/UserContext";

const steps = [
  {
    id: 1,
    title: "Convierte tus conexiones en ingresos",
    description: "Únete a la red de crecimiento financiero más innovadora y multiplica tu capital con tu equipo.",
    icon: Network,
    badge: "Red de Afiliados Multinivel",
    color: "text-blue-400",
    iconBg: "bg-blue-500/15 border-blue-500/30 text-blue-400",
    glowColor: "from-blue-600/30 via-indigo-600/10 to-transparent",
  },
  {
    id: 2,
    title: "Gana hasta el 70% en comisiones",
    description: "Comisiones automáticas en 3 niveles de profundidad (50% N1, 15% N2, 5% N3) con retiros a Nequi.",
    icon: TrendingUp,
    badge: "Altas Comisiones Diarias",
    color: "text-emerald-400",
    iconBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    glowColor: "from-emerald-600/30 via-teal-600/10 to-transparent",
  },
  {
    id: 3,
    title: "Completa tareas y multiplica tu éxito",
    description: "Realiza misiones diarias desde tu celular, entrena con IA y construye tu libertad financiera.",
    icon: Target,
    badge: "Misiones Remuneradas & IA",
    color: "text-purple-400",
    iconBg: "bg-purple-500/15 border-purple-500/30 text-purple-400",
    glowColor: "from-purple-600/30 via-pink-600/10 to-transparent",
  },
];

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.25, 1, 0.5, 1],
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.25,
      ease: [0.25, 1, 0.5, 1],
    },
  }),
};

export default function Onboarding() {
  const [[page, direction], setPage] = useState([0, 0]);
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  const paginate = (newDirection: number) => {
    const nextStep = page + newDirection;
    if (nextStep >= 0 && nextStep < steps.length) {
      setPage([nextStep, newDirection]);
    } else if (nextStep >= steps.length) {
      navigate("/register");
    }
  };

  const setSpecificStep = (index: number) => {
    if (index === page) return;
    setPage([index, index > page ? 1 : -1]);
  };

  const handleNext = () => {
    if (page < steps.length - 1) {
      paginate(1);
    } else {
      navigate("/register");
    }
  };

  const handleSkip = () => {
    navigate("/login");
  };

  // Touch handlers for mobile swipe gesture support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      // Swiped Left -> Go Next
      if (page < steps.length - 1) {
        paginate(1);
      }
    } else if (distance < -minSwipeDistance) {
      // Swiped Right -> Go Prev
      if (page > 0) {
        paginate(-1);
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const step = steps[page];
  const Icon = step.icon;

  return (
    <div 
      className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden relative select-none touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-15%] left-1/2 -translate-x-1/2 w-[90%] h-[60%] bg-gradient-to-b ${step.glowColor} blur-[120px] rounded-full transition-all duration-700`} />
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      </div>

      {/* Top Header Bar */}
      <div className="relative z-20 px-6 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {page > 0 ? (
            <button
              onClick={() => paginate(-1)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              title="Volver a la página principal"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Inicio</span>
            </Link>
          )}
        </div>

        <button
          onClick={handleSkip}
          className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          Saltar
        </button>
      </div>

      {/* Main Interactive Slider Area with Motion Drag & Gestures */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              const swipeThreshold = 50;
              const velocityThreshold = 400;
              if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
                if (page < steps.length - 1) {
                  paginate(1);
                }
              } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
                if (page > 0) {
                  paginate(-1);
                }
              }
            }}
            className="flex flex-col items-center text-center w-full max-w-sm cursor-grab active:cursor-grabbing px-2"
          >
            {/* Step Category Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-black text-slate-300 uppercase tracking-widest mb-6 backdrop-blur-md">
              <Sparkles className={`w-3.5 h-3.5 ${step.color}`} />
              <span>{step.badge}</span>
            </div>

            {/* Glowing Icon Container */}
            <div
              className={`w-36 h-36 sm:w-40 sm:h-40 rounded-3xl flex items-center justify-center mb-8 border ${step.iconBg} shadow-2xl backdrop-blur-xl relative group transition-transform duration-500`}
            >
              <div className="absolute inset-0 rounded-3xl bg-white/5 animate-pulse" />
              <Icon className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-md z-10" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black mb-3 leading-tight tracking-tight text-white">
              {step.title}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xs mx-auto">
              {step.description}
            </p>

            {/* Swipe Instruction Hint */}
            <p className="text-[11px] font-semibold text-slate-400 mt-6 flex items-center gap-1 opacity-70">
              <ChevronLeft className="w-3 h-3" />
              <span>Desliza con el dedo para navegar</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="p-6 sm:p-8 pb-10 relative z-20 max-w-md mx-auto w-full">
        {/* Interactive Dots Pagination */}
        <div className="flex justify-center items-center gap-2.5 mb-6">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSpecificStep(idx)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === page ? "w-8 bg-blue-500 shadow-md shadow-blue-500/50" : "w-2.5 bg-slate-700 hover:bg-slate-600"
              }`}
              aria-label={`Ir al paso ${idx + 1}`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:bg-[length:200%_auto] text-white font-black text-base shadow-xl shadow-blue-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border border-blue-400/30"
          >
            <span>{page === steps.length - 1 ? "Crear Mi Cuenta (+100 XP)" : "Continuar"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleSkip}
            className="w-full py-3 rounded-xl text-slate-400 font-bold text-xs uppercase tracking-wider hover:text-white transition-colors cursor-pointer"
          >
            ¿Ya tienes cuenta? Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

