import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

interface ScheduledTask {
  id: string;
  name: string;
  schedule: string;
  description: string;
}

export default function NotificationScheduler() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedulerStatus();
  }, []);

  const fetchSchedulerStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/notifications/scheduler', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (!res.ok) throw new Error('Error fetching scheduler');
      
      const data = await res.json();
      setTasks(data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-slate-100 dark:bg-white/5 rounded-3xl" />;
  }

  return (
    <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden">
      <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">Programador Automático</h3>
            <p className="text-xs text-slate-500">Notificaciones periódicas del sistema</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {tasks.map((task) => (
          <div 
            key={task.id}
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 transition-all hover:bg-slate-100/50 dark:hover:bg-white/[0.04]"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{task.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-[9px] font-mono text-slate-600 dark:text-slate-400">
                  {task.schedule}
                </span>
              </div>
              <p className="text-xs text-slate-500">{task.description}</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg text-[10px] font-bold">
              <CheckCircle className="w-3 h-3" />
              ACTIVO
            </div>
          </div>
        ))}

        <div className="mt-6 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-[11px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-1">Nota Técnica</p>
              <p className="text-xs text-blue-700/80 dark:text-blue-300/60 leading-relaxed">
                El programador utiliza cronjobs en el servidor. Las notificaciones se enviarán incluso si no hay administradores conectados. 
                Los usuarios deben haber concedido permiso de notificaciones push en sus navegadores.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
