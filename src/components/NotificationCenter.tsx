import React, { useState } from 'react';
import { Bell, X, Check, Info, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
      >
        <Bell className="w-6 h-6 text-slate-400 dark:text-slate-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-slate-900 shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed sm:absolute right-0 sm:right-0 top-16 sm:top-auto left-4 sm:left-auto right-4 sm:right-0 mt-2 w-auto sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-900 dark:text-white">Notificaciones</h3>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="sm:hidden p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
                    <Check className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto notification-scroll">
                {loading ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400 dark:text-slate-500 text-sm">No tienes notificaciones aún.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {notifications.map((n) => (
                      <div 
                        key={n.id}
                        onClick={() => {
                          if (!n.read) markAsRead(n.id);
                        }}
                        className={cn(
                          "p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer",
                          !n.read && "bg-blue-50/30 dark:bg-blue-500/5"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          n.type === 'success' ? "bg-emerald-100 dark:bg-emerald-900/30" : 
                          n.type === 'warning' ? "bg-amber-100 dark:bg-amber-900/30" :
                          n.type === 'error' ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-100 dark:bg-blue-900/30"
                        )}>
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className={cn("text-sm font-bold truncate", n.read ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-white")}>
                              {n.title}
                            </h4>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                              {new Date(n.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 text-center border-t border-slate-100 dark:border-slate-700">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    navigate('/notifications');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
