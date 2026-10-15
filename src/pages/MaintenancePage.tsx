import React from 'react';
import { Hammer, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { useSettings } from '../contexts/SettingsContext';

export default function MaintenancePage() {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[100px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="w-24 h-24 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-amber-500/20">
          <Hammer className="w-12 h-12 text-amber-500" />
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tight">
          Estamos en <span className="text-amber-500">Mantenimiento</span>
        </h1>
        
        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
          Estamos realizando mejoras importantes para brindarte la mejor experiencia financiera. Volveremos muy pronto.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-start gap-4 text-left">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Nota para Líderes</p>
            <p className="text-slate-500 text-xs mt-1">
              Tus referidos y saldo están seguros. Las tareas diarias se reanudarán una vez finalizado el mantenimiento.
            </p>
          </div>
        </div>

        <div className="mt-12 text-slate-600 text-sm font-medium">
          &copy; 2026 {settings.app_name || "ImpulsaRed"}. Todos los derechos reservados.
        </div>
      </motion.div>
    </div>
  );
}
