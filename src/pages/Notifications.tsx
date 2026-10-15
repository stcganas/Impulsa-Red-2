import React, { useState, useEffect } from 'react';
import { Bell, Check, Info, AlertTriangle, AlertCircle, Loader2, ChevronLeft, Trash2, Smartphone, Globe, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { toast as sonnerToast } from 'sonner';

export default function Notifications() {
  const { user } = useUser();
  const { permission, requestPermission, token, tokenError } = useNotifications();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);

  const handleResetNotifications = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
        sonnerToast.success('Service Workers limpiados. Reiniciando...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error resetting SW:', error);
      sonnerToast.error('Error al limpiar el estado');
    }
  };

  const handleTestNotification = async () => {
    try {
      setSendingTest(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const response = await fetch('/api/user/test-notification', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) throw new Error('Error al enviar notificación de prueba');
      sonnerToast.success('Notificación de prueba enviada');
    } catch (error: any) {
      console.error('Test notification error:', error);
      sonnerToast.error(error.message || 'Error al enviar prueba');
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      
      // Subscribe to real-time updates
      const channel = supabase
        .channel('notifications_page')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.warn('Notice marking notification as read:', error.message || error);
      }
    } catch (error) {
      console.warn('Network issue marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) {
        console.warn('Notice marking all as read:', error.message || error);
      }
    } catch (error) {
      console.warn('Network issue marking all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllNotifications = async () => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar todas tus notificaciones?")) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;
      setNotifications([]);
      sonnerToast.success('Todas las notificaciones eliminadas');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      sonnerToast.error('Error al eliminar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <Check className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a]">
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Notificaciones</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {notifications.length > 0 && (
              <button 
                onClick={deleteAllNotifications}
                className="text-sm font-bold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
              >
                Eliminar todas
              </button>
            )}
            {notifications.some(n => !n.read) && (
              <button 
                onClick={markAllAsRead}
                className="text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                Marcar leídas
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 lg:pb-12">
        {/* Web Push Configuration */}
        <div className="mb-8 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-8 border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Globe className="w-24 h-24" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Notificaciones Web Push
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-lg">
              Recibe avisos instantáneos sobre comisiones, nuevas tareas y actualizaciones de red directamente en tu navegador.
            </p>

            <div className="flex flex-wrap gap-3 items-center">
              {!('serviceWorker' in navigator) || !('PushManager' in window) ? (
                <div className="w-full px-4 py-4 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-100 dark:border-amber-900/20 text-sm flex gap-3">
                  <Globe className="w-5 h-5 shrink-0" />
                  <p>Tu navegador actual no soporta notificaciones nativas. Te recomendamos usar <strong>Google Chrome</strong> o, si estás en iPhone, usar la opción <strong>"Añadir a la pantalla de inicio"</strong>.</p>
                </div>
              ) : permission === 'default' ? (
                <button 
                  onClick={requestPermission}
                  className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Bell className="w-4 h-4" />
                  Activar Notificaciones
                </button>
              ) : permission === 'granted' ? (
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center w-full">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-sm font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    Permisos concedidos
                  </div>
                  
                  <button 
                    onClick={handleTestNotification}
                    disabled={sendingTest || !token}
                    className="w-full sm:w-auto px-6 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                  >
                    {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
                    Enviar Prueba
                  </button>

                  <button 
                    onClick={handleResetNotifications}
                    className="text-xs text-slate-400 hover:text-blue-600 font-medium transition-colors"
                  >
                    Reiniciar configuración
                  </button>
                </div>
              ) : (
                <div className="w-full px-4 py-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/20 text-sm flex gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>Las notificaciones están bloqueadas. Por favor, actívalas en la configuración de tu navegador para este sitio.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Historial Reciente</h2>
          <span className="text-xs text-slate-400">{notifications.length} notificaciones</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="text-slate-500 dark:text-slate-400">Cargando...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Sin notificaciones</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Vuelve más tarde para ver tus avisos.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n, index) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                key={n.id}
                className={cn(
                  "bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border shadow-sm flex gap-3 sm:gap-4 group relative",
                  n.read 
                    ? "border-slate-100 dark:border-slate-800" 
                    : "border-blue-100 dark:border-blue-900/30 bg-blue-50/5 dark:bg-blue-900/5 ring-1 ring-blue-500/10 shadow-md"
                )}
                onClick={() => !n.read && markAsRead(n.id)}
              >
                <div className={cn(
                  "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0",
                  n.type === 'success' ? "bg-emerald-100/50 dark:bg-emerald-900/20" : 
                  n.type === 'warning' ? "bg-amber-100/50 dark:bg-amber-900/20" :
                  n.type === 'error' ? "bg-red-100/50 dark:bg-red-900/20" : "bg-blue-100/50 dark:bg-blue-900/20"
                )}>
                  {getIcon(n.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className={cn(
                      "font-bold text-sm sm:text-base pr-6",
                      n.read ? "text-slate-600 dark:text-slate-400" : "text-slate-900 dark:text-white"
                    )}>
                      {n.title}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-2 leading-relaxed">
                    {n.message}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                    
                    <div className="flex gap-1">
                      {!n.read && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded-md"
                        >
                          Leer
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {!n.read && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-600" />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
