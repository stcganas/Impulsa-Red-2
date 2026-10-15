import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, ArrowRight, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ExitIntentModal({ referralCode }: { referralCode: string }) {
  const [show, setShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShown) {
        setShow(true);
        setHasShown(true);
        
        // Track exit intent
        const track = async () => {
          try {
            await supabase.from('conversion_events').insert({
              referral_code: referralCode,
              event_type: 'exit_intent_triggered',
              metadata: { path: window.location.pathname }
            });
          } catch (err) {
            console.error(err);
          }
        };
        track();
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShown, referralCode]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
        >
          <button 
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-500 mb-2">
              <AlertTriangle className="w-10 h-10" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 leading-tight">
              🚀 ¡Espera, no te vayas!
            </h2>
            
            <p className="text-slate-600 font-medium text-lg">
              Únete ahora y empieza a generar ingresos pasivos.
              <br />
              <span className="font-bold text-blue-600">Te tomará menos de 1 minuto.</span>
            </p>

            <div className="w-full space-y-3 pt-4">
              <button 
                onClick={() => {
                  setShow(false);
                  document.getElementById('register-button')?.click();
                }}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-600/20"
              >
                Registrarme ahora <ArrowRight className="w-5 h-5" />
              </button>
              
              <button 
                onClick={() => {
                  setShow(false);
                  document.getElementById('share-whatsapp')?.click();
                }}
                className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-5 h-5" /> Compartir enlace
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
