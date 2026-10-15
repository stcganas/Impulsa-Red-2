import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Send, Trash2, Users, User, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

interface CustomTask {
  id: string;
  title: string;
  message: string;
  type: string;
  scheduled_at: string;
  user_id?: string;
  target_role?: string;
  status: string;
  user?: { name: string };
}

export default function CustomNotificationScheduler() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([]);
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    scheduledAt: '',
    targetType: 'todos', // todos, role, user
    targetRole: 'user',
    userId: ''
  });

  const [serverTime, setServerTime] = useState<string>('');

  useEffect(() => {
    fetchData();
    fetchUsers();
    
    // Update server time estimate
    const timer = setInterval(() => {
      setServerTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/notifications/scheduler', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) throw new Error('Error fetching scheduler');
      
      const data = await res.json();
      setCustomTasks(data.customTasks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('id, name').limit(100);
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message || !formData.scheduledAt) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const payload = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        targetRole: formData.targetType === 'role' ? formData.targetRole : null,
        userId: formData.targetType === 'user' ? formData.userId : null
      };

      const res = await fetch('/api/admin/notifications/schedule', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Error al programar');

      toast.success('Notificación programada correctamente');
      setFormData({
        ...formData,
        title: '',
        message: '',
        scheduledAt: ''
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/admin/notifications/schedule/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!res.ok) throw new Error('Error al cancelar');

      toast.success('Programación cancelada');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Form Section */}
      <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 dark:text-white">Programar Nueva Notificación</h3>
              <p className="text-xs text-slate-500">Define contenido y fecha de envío personalizado</p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1 px-4 py-2 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hora del Servidor (UTC)</span>
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                {serverTime ? new Date(serverTime).toLocaleTimeString('es-CO', { hour12: false }) : '--:--:--'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Título</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  placeholder="¡Inicia tu día con éxito!"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mensaje</label>
                <textarea 
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none h-32 resize-none"
                  placeholder="Escribe el cuerpo de la notificación..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha y Hora de Envío</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={e => setFormData({...formData, scheduledAt: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-2xl p-4 pl-12 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-400 italic">
                  * Se convertirá automáticamente a UTC para coincidir con el servidor.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Destinatarios</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl mb-4">
                  {(['todos', 'role', 'user'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({...formData, targetType: t})}
                      className={cn(
                        "py-2 rounded-xl text-[10px] font-bold uppercase transition-all",
                        formData.targetType === t 
                          ? "bg-white dark:bg-white/10 text-blue-600 shadow-sm" 
                          : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      {t === 'todos' ? 'Todos' : t === 'role' ? 'Rol' : 'Usuario'}
                    </button>
                  ))}
                </div>

                {formData.targetType === 'role' && (
                  <select
                    value={formData.targetRole}
                    onChange={e => setFormData({...formData, targetRole: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl p-4 text-sm outline-none"
                  >
                    <option value="user">Usuarios Estándar</option>
                    <option value="mentor">Mentores</option>
                    <option value="admin">Administradores</option>
                  </select>
                )}

                {formData.targetType === 'user' && (
                  <select
                    value={formData.userId}
                    onChange={e => setFormData({...formData, userId: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl p-4 text-sm outline-none"
                  >
                    <option value="">Seleccionar Usuario</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Alerta</label>
                <div className="flex gap-4">
                  {(['info', 'success', 'warning', 'error'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({...formData, type: t})}
                      className={cn(
                        "w-full py-3 rounded-2xl border-2 transition-all flex items-center justify-center",
                        formData.type === t
                          ? {
                              'info': 'border-blue-500 bg-blue-500/10 text-blue-600',
                              'success': 'border-emerald-500 bg-emerald-500/10 text-emerald-600',
                              'warning': 'border-amber-500 bg-amber-500/10 text-amber-600',
                              'error': 'border-red-500 bg-red-500/10 text-red-600'
                            }[t]
                          : "border-transparent bg-slate-50 dark:bg-white/5 text-slate-400"
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase">{t}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? 'Programando...' : 'Programar Notificación'}
          </button>
        </form>
      </div>

      {/* List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Próximos Envíos Programados
          </h3>
          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full">
            {customTasks.length} Pendientes
          </span>
        </div>

        {fetching ? (
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-white/5 rounded-3xl" />)}
          </div>
        ) : customTasks.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 dark:bg-white/[0.02] rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
            <Info className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No hay notificaciones programadas en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customTasks.map((task) => (
              <div 
                key={task.id}
                className="group bg-white dark:bg-[#111] p-5 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-blue-500/30 transition-all shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      {
                        'info': 'bg-blue-500',
                        'success': 'bg-emerald-500',
                        'warning': 'bg-amber-500',
                        'error': 'bg-red-500'
                      }[task.type as 'info']
                    )} />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{task.type}</span>
                  </div>
                  <button 
                    onClick={() => handleDelete(task.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h4 className="font-bold text-slate-800 dark:text-white mb-1">{task.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">{task.message}</p>

                <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-600/10 px-2 py-1 rounded-lg">
                      <Clock className="w-3 h-3" />
                      {new Date(task.scheduled_at).toLocaleString('es-CO', { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      {task.user_id ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      {task.user?.name || task.target_role || 'Todos'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
