import React, { useEffect, useState } from "react";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Eye, 
  ExternalLink, 
  MessageSquare, 
  User, 
  Calendar,
  Loader2,
  AlertCircle,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

interface TaskSubmission {
  id: string;
  user_id: string;
  task_id: string;
  evidence_url: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_feedback: string;
  created_at: string;
  user: {
    name: string;
    email: string;
  };
  task: {
    name: string;
    title: string;
    xp_reward: number;
    xp: number;
  };
}

export default function TaskSubmissionsManagement() {
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
  const [adminFeedback, setAdminFeedback] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/task-submissions', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!res.ok) throw new Error('Error al obtener envíos');
      const data = await res.json();
      setSubmissions(data || []);
    } catch (error: any) {
      console.error("Error fetching submissions:", error);
      toast.error("Error al cargar los envíos de tareas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleReview = async (id: string, status: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(`/api/admin/task-submissions/${id}/review`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status, 
          admin_feedback: adminFeedback 
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al revisar envío');
      }

      toast.success(status === 'approved' ? 'Envío aprobado correctamente' : 'Envio rechazado');
      setSelectedSubmission(null);
      setAdminFeedback("");
      fetchSubmissions();
    } catch (error: any) {
      console.error("Error reviewing submission:", error);
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesFilter = filter === 'all' || sub.status === filter;
    const matchesSearch = 
      sub.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      sub.task?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading && submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Cargando envíos de tareas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Buzón de Tareas</h2>
          <p className="text-slate-500">Revisa y aprueba las pruebas enviadas por los usuarios.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar usuario o tarea..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  filter === f 
                    ? "bg-white dark:bg-white/10 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobados' : 'Rechazados'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSubmissions.length > 0 ? filteredSubmissions.map((submission) => (
          <motion.div
            key={submission.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm flex flex-col"
          >
            <div className="p-6 space-y-4 flex-1">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{submission.user?.name}</h4>
                    <p className="text-[10px] text-slate-500">{submission.user?.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  submission.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                  submission.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {submission.status.toUpperCase()}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Tarea</p>
                <h5 className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-1">{submission.task?.title || submission.task?.name}</h5>
                <p className="text-xs text-emerald-500 font-bold mt-1">+{submission.task?.xp_reward || submission.task?.xp} XP</p>
              </div>

              {submission.evidence_url && (
                <div className="relative group">
                  <img 
                    src={submission.evidence_url} 
                    alt="Evidencia" 
                    className="w-full h-40 object-cover rounded-2xl border border-slate-100 dark:border-white/10"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                    <a 
                      href={submission.evidence_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-3 bg-white text-slate-900 rounded-full shadow-lg hover:scale-110 transition-transform"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              )}

              {submission.notes && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Notas
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{submission.notes}"</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-600 font-medium pt-2 border-t border-slate-100 dark:border-white/5">
                <Calendar className="w-3 h-3" />
                {new Date(submission.created_at).toLocaleDateString()} {new Date(submission.created_at).toLocaleTimeString()}
              </div>
            </div>

            {submission.status === 'pending' && (
              <div className="p-4 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedSubmission(submission)}
                  className="w-full py-2.5 bg-white dark:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs hover:bg-slate-100 dark:hover:bg-white/20 transition-all border border-slate-200 dark:border-white/10 flex items-center justify-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Revisar
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(submission.id, 'approved')}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setAdminFeedback("");
                    }}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-red-500/20 transition-all flex items-center justify-center"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white dark:bg-[#111] rounded-[40px] border border-dashed border-slate-200 dark:border-white/10">
            <Clock className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 dark:text-slate-600 mb-1">No hay envíos</h3>
            <p className="text-slate-500">Todo está al día por aquí.</p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-[#111] w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Revisar Tarea</h3>
                <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full">
                  <XCircle className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuario</p>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white">{selectedSubmission.user?.name}</h4>
                        <p className="text-xs text-slate-500">{selectedSubmission.user?.email}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-500/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-500/20">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Tarea a Validar</p>
                      <h5 className="text-xl font-bold text-blue-900 dark:text-blue-300">{selectedSubmission.task?.title || selectedSubmission.task?.name}</h5>
                      <div className="mt-4 flex items-center gap-4 text-xs font-bold">
                        <span className="text-blue-600 bg-blue-100 dark:bg-blue-500/20 px-3 py-1 rounded-full">
                          Día {selectedSubmission.task?.xp || 100} XP Recompensa
                        </span>
                      </div>
                    </div>

                    {selectedSubmission.notes && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <MessageSquare className="w-3.5 h-3.5" /> Comentarios del usuario
                        </p>
                        <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 italic text-slate-700 dark:text-slate-300">
                          {selectedSubmission.notes}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evidencia Sugerida</p>
                    {selectedSubmission.evidence_url ? (
                      <div className="rounded-3xl overflow-hidden border border-slate-100 dark:border-white/10 shadow-lg">
                        <img src={selectedSubmission.evidence_url} className="w-full h-64 object-cover" />
                        <a 
                          href={selectedSubmission.evidence_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Ver Imagen Completa
                        </a>
                      </div>
                    ) : (
                      <div className="aspect-video bg-slate-100 dark:bg-white/5 rounded-3xl flex items-center justify-center border border-dashed border-slate-200 dark:border-white/10">
                        <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-8 border-t border-slate-100 dark:border-white/5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Comentario del administrador</label>
                  <textarea 
                    value={adminFeedback}
                    onChange={(e) => setAdminFeedback(e.target.value)}
                    placeholder="Opcional: Escribe por qué se aprueba o rechaza..."
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
                  />
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button
                      onClick={() => handleReview(selectedSubmission.id, 'approved')}
                      disabled={processing}
                      className="py-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleReview(selectedSubmission.id, 'rejected')}
                      disabled={processing}
                      className="py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                      Rechazar
                    </button>
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
