import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LifeBuoy, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight, 
  MessageSquare,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  admin_reply: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default function Support() {
  const { user } = useUser();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'medium'
  });

  const fetchTickets = async () => {
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

  useEffect(() => {
    fetchTickets();
  }, []);

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

      if (response.ok) {
        await fetchTickets();
        setShowNewTicket(false);
        setFormData({ subject: '', message: '', priority: 'medium' });
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-500 bg-blue-500/10';
      case 'in_progress': return 'text-amber-500 bg-amber-500/10';
      case 'resolved': return 'text-emerald-500 bg-emerald-500/10';
      case 'closed': return 'text-slate-500 bg-slate-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-emerald-500';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[120%] bg-emerald-600/20 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Soporte Técnico</h1>
            <p className="text-slate-400">¿Tienes algún problema? Estamos para ayudarte.</p>
          </div>
          <button 
            onClick={() => setShowNewTicket(true)}
            className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <div className="px-6 -mt-12 relative z-20 space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#111] p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Abiertos</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length}
            </p>
          </div>
          <div className="bg-white dark:bg-[#111] p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Resueltos</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {tickets.filter(t => t.status === 'resolved').length}
            </p>
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 px-2">
            <Clock className="w-5 h-5 text-emerald-500" />
            Tus Tickets Recientes
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : tickets.length > 0 ? (
            tickets.map((ticket) => (
              <motion.button
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedTicket(ticket)}
                className="w-full bg-white dark:bg-[#111] p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5 flex items-center gap-4 text-left hover:border-emerald-500/30 transition-all group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getStatusColor(ticket.status)}`}>
                  {ticket.status === 'resolved' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(ticket.priority)}`}>
                      Prioridad {ticket.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-200 truncate">{ticket.subject}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-500 truncate mt-1">{ticket.message}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 transition-colors" />
              </motion.button>
            ))
          ) : (
            <div className="bg-white dark:bg-[#111] p-12 rounded-[40px] shadow-sm border border-slate-100 dark:border-white/5 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <LifeBuoy className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No tienes tickets de soporte activos.</p>
              <button 
                onClick={() => setShowNewTicket(true)}
                className="mt-4 text-emerald-600 dark:text-emerald-400 font-bold text-sm"
              >
                Crear mi primer ticket
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {showNewTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewTicket(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111] rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Nuevo Ticket</h3>
                  <button onClick={() => setShowNewTicket(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Asunto</label>
                    <input 
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      placeholder="Ej: Problema con mi retiro"
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-colors text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Prioridad</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['low', 'medium', 'high'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormData({...formData, priority: p})}
                          className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                            formData.priority === p 
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                            : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/10'
                          }`}
                        >
                          {p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : 'Alta'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Mensaje</label>
                    <textarea 
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Describe tu problema detalladamente..."
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-colors resize-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                  </div>

                  <button 
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Enviar Ticket
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-[#111] rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                  </button>
                </div>

                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{selectedTicket.subject}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Enviado el {new Date(selectedTicket.created_at).toLocaleString()}</p>

                <div className="space-y-6">
                  <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-3xl border border-slate-100 dark:border-white/10">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Tu Mensaje</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedTicket.message}</p>
                  </div>

                  {selectedTicket.admin_reply ? (
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2">Respuesta del Soporte</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedTicket.admin_reply}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-4 font-medium">
                        Resuelto el {new Date(selectedTicket.resolved_at!).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-5 bg-amber-50 dark:bg-amber-500/10 rounded-3xl border border-amber-100 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
                      <Clock className="w-5 h-5 shrink-0" />
                      <p className="text-xs font-medium">Nuestro equipo está revisando tu caso. Recibirás una respuesta en menos de 24 horas.</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="w-full mt-8 py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
