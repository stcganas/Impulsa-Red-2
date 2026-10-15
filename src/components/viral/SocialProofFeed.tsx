import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Star, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Event {
  id: string;
  message: string;
  icon: 'user' | 'star' | 'zap';
  time: string;
}

export default function SocialProofFeed({ referralCode }: { referralCode: string }) {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    // Initial fake events for immediate social proof
    const initialEvents: Event[] = [
      { id: '1', message: 'María se unió hace 2 minutos', icon: 'user', time: '2m' },
      { id: '2', message: 'Carlos acaba de registrarse', icon: 'zap', time: 'Justo ahora' },
    ];
    setEvents(initialEvents);

    // Listen to real-time events on conversion_events table
    const channel = supabase.channel('public:conversion_events')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'conversion_events',
        filter: `referral_code=eq.${referralCode}`
      }, (payload) => {
        const newEvent = payload.new;
        if (newEvent.event_type === 'register_completed') {
          const name = newEvent.metadata?.name || 'Alguien';
          addEvent({
            id: newEvent.id,
            message: `${name} acaba de unirse al equipo!`,
            icon: 'star',
            time: 'Justo ahora'
          });
        }
      })
      .subscribe();

    // Randomly add fake events every 15-30 seconds to keep it alive if no real events
    const interval = setInterval(() => {
      const names = ['Ana', 'Juan', 'Luis', 'Sofia', 'Diego', 'Valentina'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      addEvent({
        id: Date.now().toString(),
        message: `${randomName} se ha registrado`,
        icon: 'user',
        time: 'Justo ahora'
      });
    }, Math.random() * 15000 + 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [referralCode]);

  const addEvent = (event: Event) => {
    setEvents(prev => [event, ...prev].slice(0, 3)); // Keep only last 3
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="bg-white/90 backdrop-blur-md shadow-lg rounded-2xl p-3 pr-6 flex items-center gap-3 border border-slate-100"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              event.icon === 'user' ? 'bg-blue-100 text-blue-600' :
              event.icon === 'star' ? 'bg-amber-100 text-amber-500' :
              'bg-emerald-100 text-emerald-500'
            }`}>
              {event.icon === 'user' && <UserPlus className="w-4 h-4" />}
              {event.icon === 'star' && <Star className="w-4 h-4" />}
              {event.icon === 'zap' && <Zap className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{event.message}</p>
              <p className="text-xs text-slate-500">{event.time}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
