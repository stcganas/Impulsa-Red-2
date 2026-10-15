import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Plus, X, Loader2, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  admin_reply?: string;
  resolved_at?: string;
}

export default function Tickets() {
  const { user } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/tickets', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) return;

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Error creating ticket');

      await fetchTickets();
      setIsCreating(false);
      setFormData({ subject: '', message: '', priority: 'medium' });
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Error al crear el ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-500/10 text-emerald-500';
      case 'in_progress': return 'bg-amber-500/10 text-amber-500';
      default: return 'bg-blue-500/10 text-blue-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'resolved': return 'Resuelto';
      case 'in_progress': return 'En Progreso';
      default: return 'Abierto';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24">
      <div className="bg-emerald-600 dark:bg-emerald-900 pt-12 pb-20 px-6 rounded-b-[40px] shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white mb-2">Soporte</h1>
            <p className="text-emerald-100 text-sm">Gestiona tus tickets de ayuda</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="px-6 -mt-10 relative z-20 space-y-4">
        {tickets.length === 0 ? (
          <div className="bg-white dark:bg-[#111] rounded-3xl p-8 text-center border border-slate-100 dark:border-white/5 shadow-xl">
            <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No tienes tickets</h3>
            <p className="text-slate-500 text-sm mb-6">¿Necesitas ayuda? Crea un nuevo ticket de soporte.</p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
            >
              Crear Ticket
            </button>
          </div>
        ) : (
          tickets.map(ticket => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedTicket(ticket)}
              className="bg-white dark:bg-[#111] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-white/5 cursor-pointer hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getStatusColor(ticket.status)}`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{ticket.subject}</h3>
                    <p className="text-xs text-slate-500">{new Date(ticket.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(ticket.status)}`}>
                  {getStatusText(ticket.status)}
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{ticket.message}</p>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Ticket Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nuevo Ticket</h3>
                  <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Asunto</label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors text-slate-900 dark:text-white"
                      placeholder="¿En qué podemos ayudarte?"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Prioridad</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['low', 'medium', 'high'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormData({...formData, priority: p})}
                          className={`py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                            formData.priority === p 
                              ? p === 'high' ? 'bg-red-500 text-white' : p === 'medium' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                              : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                          }`}
                        >
                          {p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : 'Alta'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mensaje</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500 transition-colors resize-none text-slate-900 dark:text-white"
                      placeholder="Describe tu problema con detalle..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !formData.subject || !formData.message}
                    className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50 mt-6"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                    Enviar Ticket
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Ticket Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111] rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(selectedTicket.status)}`}>
                    {getStatusText(selectedTicket.status)}
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full">
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{selectedTicket.subject}</h3>
                <p className="text-xs text-slate-500 mb-6">Enviado el {new Date(selectedTicket.created_at).toLocaleString()}</p>

                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tu Mensaje</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>

                  {selectedTicket.admin_reply && (
                    <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                      <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2">Respuesta de Soporte</p>
                      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{selectedTicket.admin_reply}</p>
                      {selectedTicket.resolved_at && (
                        <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/60 mt-3">
                          Resuelto el {new Date(selectedTicket.resolved_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
