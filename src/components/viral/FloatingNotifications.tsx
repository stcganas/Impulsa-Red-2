import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, DollarSign, Bell } from 'lucide-react';

interface Notification {
  id: string;
  message: string;
  icon: 'trophy' | 'dollar' | 'bell';
}

export default function FloatingNotifications() {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);

  useEffect(() => {
    const notifications: Notification[] = [
      { id: '1', message: 'Alguien acaba de ganar $20.000', icon: 'dollar' },
      { id: '2', message: 'Nuevo líder en la red', icon: 'trophy' },
      { id: '3', message: '¡Un equipo acaba de subir de nivel!', icon: 'bell' },
      { id: '4', message: 'Alguien completó su primera tarea', icon: 'trophy' },
    ];

    const showRandomNotification = () => {
      const random = notifications[Math.floor(Math.random() * notifications.length)];
      setCurrentNotification(random);
      
      setTimeout(() => {
        setCurrentNotification(null);
      }, 5000); // Hide after 5 seconds
    };

    // Show first notification after 10 seconds
    const initialTimeout = setTimeout(showRandomNotification, 10000);

    // Then show every 15-30 seconds
    const interval = setInterval(() => {
      showRandomNotification();
    }, Math.random() * 15000 + 15000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="fixed top-20 right-4 z-50 pointer-events-none">
      <AnimatePresence>
        {currentNotification && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
            className="bg-slate-900/90 backdrop-blur-md shadow-2xl rounded-2xl p-4 flex items-center gap-4 border border-slate-800/50"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              currentNotification.icon === 'dollar' ? 'bg-emerald-500/20 text-emerald-400' :
              currentNotification.icon === 'trophy' ? 'bg-amber-500/20 text-amber-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {currentNotification.icon === 'dollar' && <DollarSign className="w-5 h-5" />}
              {currentNotification.icon === 'trophy' && <Trophy className="w-5 h-5" />}
              {currentNotification.icon === 'bell' && <Bell className="w-5 h-5" />}
            </div>
            <p className="text-sm font-bold text-white pr-4">{currentNotification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
