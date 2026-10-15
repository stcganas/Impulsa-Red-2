import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronRight, Target, Users, Wallet, Trophy } from "lucide-react";

export default function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  
  const tourSteps = [
    {
      title: "¡Bienvenido a ImpulsaRed!",
      description: "Vamos a dar un recorrido rápido para que sepas cómo maximizar tus ganancias. ¿Estás listo?",
      icon: Trophy,
      color: "text-amber-500",
      bg: "bg-amber-100 dark:bg-amber-500/20"
    },
    {
      title: "Gana Experiencia (XP)",
      description: "Realiza tareas diarias para subir de nivel. A mayor nivel, mayor será el porcentaje de comisión que ganarás.",
      icon: Target,
      color: "text-blue-500",
      bg: "bg-blue-100 dark:bg-blue-500/20"
    },
    {
      title: "Expande tu Red",
      description: "Invita a otras personas a unirse. Construir una red fuerte es la clave para escalar tus ingresos pasivos.",
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-100 dark:bg-emerald-500/20"
    },
    {
      title: "Retira tus Ganancias",
      description: "Todo el saldo generado por tus referidos y tu actividad irá a tu Billetera, donde podrás retirarlo fácilmente.",
      icon: Wallet,
      color: "text-purple-500",
      bg: "bg-purple-100 dark:bg-purple-500/20"
    }
  ];

  const current = tourSteps[step];
  const Icon = current.icon;

  const handleNext = () => {
    if (step < tourSteps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem("impulsa_tour_completed", "true");
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem("impulsa_tour_completed", "true");
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="bg-white dark:bg-[#111] border border-slate-100 dark:border-white/10 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative overflow-hidden"
        >
          {/* Progress indicators */}
          <div className="flex gap-1.5 mb-6">
            {tourSteps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full flex-1 transition-colors ${idx <= step ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-800'}`} 
              />
            ))}
          </div>

          <div className="flex flex-col items-center text-center">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${current.bg}`}>
              <Icon className={`w-10 h-10 ${current.color}`} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3">
              {current.title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
              {current.description}
            </p>

            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={handleNext}
                className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                {step === tourSteps.length - 1 ? (
                  <>
                    ¡Empezar a ganar! <Check className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Siguiente <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
              {step < tourSteps.length - 1 && (
                <button 
                  onClick={handleSkip}
                  className="w-full py-3 text-slate-400 font-medium active:scale-[0.98] transition-transform"
                >
                  Omitir tour
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
