import React, { useState, useEffect } from 'react';
import { Shield, Database, Cpu, Globe, RefreshCcw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SystemStatus {
  database: 'up' | 'down';
  gemini_api: 'up' | 'down';
  auth: 'up' | 'down';
  storage: 'up' | 'down';
}

export default function SystemManagement() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin/system-status', { headers }).catch(err => {
        console.warn("Network error fetching system status (server may be down):", err);
        return null;
      });
      
      if (!response) {
        setStatus({
          database: 'down',
          gemini_api: 'down',
          auth: 'down',
          auth_server: 'down',
          storage: 'down',
          server: 'down',
          timestamp: new Date().toISOString(),
          env: 'unknown'
        });
        return;
      }

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error fetching system status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const StatusCard = ({ title, status, icon: Icon }: { title: string, status?: 'up' | 'down', icon: any }) => (
    <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
          status === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
        }`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500">{status === 'up' ? 'Funcionando correctamente' : 'Fuera de servicio'}</p>
        </div>
      </div>
      {status === 'up' ? (
        <CheckCircle className="w-5 h-5 text-emerald-500" />
      ) : (
        <AlertCircle className="w-5 h-5 text-red-500" />
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Estado del Sistema</h2>
          <p className="text-slate-500">Monitorea la salud de los servicios externos e infraestructura.</p>
        </div>
        <button 
          onClick={fetchStatus}
          disabled={loading}
          className="p-3 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard title="Base de Datos" status={status?.database} icon={Database} />
        <StatusCard title="Gemini AI" status={status?.gemini_api} icon={Cpu} />
        <StatusCard title="Autenticación" status={status?.auth} icon={Shield} />
        <StatusCard title="Almacenamiento" status={status?.storage} icon={Globe} />
      </div>

      <div className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-[40px] flex flex-col md:flex-row items-center gap-8">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500 flex items-center justify-center text-white shrink-0">
          <Shield className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-emerald-500 mb-2">Seguridad y Respaldo</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
            Todos los servicios están protegidos por cifrado de extremo a extremo y respaldados diariamente. 
            Si notas algún servicio marcado como "Fuera de servicio", por favor contacta al equipo de infraestructura inmediatamente.
          </p>
          <div className="flex gap-4">
             <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1.5 rounded-full">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               Monitoreo en Tiempo Real Activo
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
