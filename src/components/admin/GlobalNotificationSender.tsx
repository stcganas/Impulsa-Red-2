import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Send, Bell, Loader2, Users, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function GlobalNotificationSender() {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    targetRole: 'todos'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch('/api/admin/notifications/global', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar notificaciones');
      }

      setSuccessMessage(`¡Notificación enviada con éxito a ${data.count} usuarios!`);
      setFormData({ ...formData, title: '', message: '' }); // Reset text fields
    } catch (error: any) {
      console.error('Error:', error);
      setErrorMessage(error.message || 'Ocurrió un error al enviar la notificación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-8 shadow-sm border border-slate-200 dark:border-white/5">

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/10 flex items-center justify-center shrink-0">
          <Bell className="w-7 h-7 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Notificaciones Globales</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Comunícate instantáneamente con todos tus usuarios</p>
        </div>
      </div>

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{successMessage}</p>
        </motion.div>
      )}

      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-bold">{errorMessage}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Destinatarios</label>
            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white appearance-none"
              >
                <option value="todos">Todos los usuarios</option>
                <option value="user">Usuarios Regulares</option>
                <option value="leader">Líderes</option>
                <option value="admin">Administradores</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Alerta</label>
            <div className="relative">
              <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white appearance-none"
              >
                <option value="info">Información (Azul)</option>
                <option value="success">Éxito (Verde)</option>
                <option value="alert">Alerta / Advertencia (Naranja)</option>
                <option value="error">Urgente / Error (Rojo)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Título de la Notificación</label>
          <input
            type="text"
            required
            placeholder="Ej: Nueva actualización de planes"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mensaje</label>
          <textarea
            required
            rows={4}
            placeholder="Escribe el mensaje que recibirán los usuarios..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <motion.button
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
            type="submit"
            disabled={loading || !formData.title || !formData.message}
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar Notificación
              </>
            )}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
