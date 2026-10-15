import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Clock } from 'lucide-react';

export default function UrgencyBanner({ active, multiplier, expiration }: { active: boolean, multiplier: number, expiration: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!active || !expiration) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const exp = new Date(expiration).getTime();
      const distance = exp - now;

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('EXPIRADO');
        return;
      }

      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [active, expiration]);

  if (!active || timeLeft === 'EXPIRADO') return null;

  return (
    <motion.div 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-3 flex items-center justify-between shadow-md"
    >
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 animate-pulse" />
        <span className="font-bold text-sm sm:text-base">
          ¡Solo por hoy! Gana {multiplier}x XP al registrarte
        </span>
      </div>
      <div className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full text-sm font-mono font-bold">
        <Clock className="w-4 h-4" />
        {timeLeft}
      </div>
    </motion.div>
  );
}
