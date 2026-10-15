import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Search,
  Loader2,
  X,
  Send,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  admin_reply: string | null;
  created_at: string;
  resolved_at: string | null;
  user: {
    name: string;
    email: string;
  };
}

export default function TicketManagement() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/tickets', {
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

  const handleResolve = async () => {
    if (!selectedTicket || !reply) return;

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ admin_reply: reply })
      });

      if (response.ok) {
        await fetchTickets();
        setSelectedTicket(null);
        setReply('');
      }
    } catch (error) {
      console.error('Error resolving ticket:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-500 bg-blue-500/10';
      case 'in_progress': return 'text-amber-500 bg-amber-500/10';
      case 'resolved': return 'text-emerald-500 bg-emerald-500/10';
      case 'closed': return 'text-slate-500 bg-slate-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Tickets</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Responde y resuelve las dudas de los usuarios.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/5 px-4 py-2 rounded-xl w-full md:w-80 shadow-sm">
          <Search className="w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por asunto, nombre o email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none text-slate-900 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/2">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Asunto</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridad</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredTickets.length > 0 ? (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-white/2 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{ticket.user.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-500">{ticket.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium max-w-[200px] truncate text-slate-700 dark:text-slate-200">{ticket.subject}</p>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold uppercase ${
                        ticket.priority === 'high' ? 'text-red-500' : 
                        ticket.priority === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => setSelectedTicket(ticket)}
                        className="p-2 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 rounded-lg transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron tickets.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#111] rounded-[40px] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getStatusColor(selectedTicket.status)}`}>
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedTicket.subject}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">De: {selectedTicket.user.name} ({selectedTicket.user.email})</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-white/2 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Mensaje del Usuario</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedTicket.message}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-4">Enviado el {new Date(selectedTicket.created_at).toLocaleString()}</p>
                    </div>

                    {selectedTicket.admin_reply && (
                      <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/10">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3">Tu Respuesta</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedTicket.admin_reply}</p>
                        <p className="text-[10px] text-emerald-500/60 mt-4">Resuelto el {new Date(selectedTicket.resolved_at!).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    {selectedTicket.status !== 'resolved' && (
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Responder Ticket</p>
                        <textarea 
                          rows={6}
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="Escribe tu respuesta aquí..."
                          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-emerald-500/50 transition-colors resize-none text-sm text-slate-900 dark:text-white"
                        />
                        <button 
                          onClick={handleResolve}
                          disabled={submitting || !reply}
                          className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50"
                        >
                          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                          Resolver Ticket
                        </button>
                      </div>
                    )}

                    <div className="bg-slate-50 dark:bg-white/2 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Detalles Técnicos</p>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">ID Ticket:</span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono">{selectedTicket.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Prioridad:</span>
                          <span className={`font-bold uppercase ${
                            selectedTicket.priority === 'high' ? 'text-red-500' : 
                            selectedTicket.priority === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                          }`}>{selectedTicket.priority}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Estado:</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold uppercase">{selectedTicket.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
