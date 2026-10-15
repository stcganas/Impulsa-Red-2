import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Calendar, Star, Trophy, Loader2, AlertTriangle, Play, Zap, ShieldCheck, Package, Gift, CheckCircle2, Image as ImageIcon, FileText, X, Clock, Upload, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../lib/supabase";
import { calculatePercentage } from "../utils/levelUtils";
import { TaskList } from "../components/tasks/TaskList";
import { useNotifications } from "../contexts/NotificationContext";
import { useSettings } from "../contexts/SettingsContext";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { playSuccessSound, playLevelUpSound } from "../utils/audio";
import { LevelUpCelebrationModal } from "../components/engagement/LevelUpCelebrationModal";
import { StreakRiskBanner } from "../components/engagement/StreakRiskBanner";

interface Task {
  id: string;
  day: string;
  name: string;
  xp: number;
  completed: boolean;
  readyToClaim?: boolean;
  rewardClaimed?: boolean;
  isPenalty?: boolean;
  type?: 'daily' | 'weekly' | string;
  status?: 'active' | 'pending_review' | 'completed' | string;
  week?: number;
  requires_evidence?: boolean;
}

export default function Tasks() {
  const { user, refreshUser } = useUser();
  const { settings } = useSettings();
  const { broadcastActivity } = useNotifications();
  const { width, height } = useWindowSize();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [penaltyTasks, setPenaltyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<any>(null);
  const [unlockedBadges, setUnlockedBadges] = useState<any[]>([]);
  const [showBadges, setShowBadges] = useState(false);
  const [currentRelativeDay, setCurrentRelativeDay] = useState(1);
  const [taskActivationCost, setTaskActivationCost] = useState(5000);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [maxUnlockedWeek, setMaxUnlockedWeek] = useState(1);
  const [maxExistingWeek, setMaxExistingWeek] = useState(1);

  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  
  useEffect(() => {
    if (showSubmissionModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSubmissionModal]);
  const [selectedTaskForSubmission, setSelectedTaskForSubmission] = useState<Task | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string>("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    if (!user?.id) return;
    console.log("Fetching tasks for user:", user.id);
    try {
      // Check health first
      try {
        const healthRes = await fetch('/api/health');
        console.log("API Health check:", healthRes.status);
      } catch (e) {
        console.error("API Health check failed:", e);
      }

      // Check cycle status first
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("Session found, fetching status...");
        try {
          const statusRes = await fetch('/api/tasks/status', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          console.log("Status response status:", statusRes.status);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            console.log("Status data:", statusData);
            if (statusData.cycleEnded) {
              await refreshUser();
              return;
            }
          }
        } catch (e) {
          console.error("Error fetching /api/tasks/status:", e);
          throw e;
        }
      } else {
        console.warn("No session found in fetchTasks");
      }

      // Fetch activation cost
      const { data: costSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'task_activation_cost')
        .single();
      if (costSetting) setTaskActivationCost(Number(costSetting.value));

      // Calculate relative day if tasks are active
      if (user.is_tasks_active && user.task_start_date) {
        const start = new Date(user.task_start_date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setCurrentRelativeDay(Math.min(7, diffDays));
      }

      // Get all tasks
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('id');
        
      if (tasksError) throw tasksError;

      // Get user's completed tasks
      const { data: userTasks, error: userTasksError } = await supabase
        .from('user_tasks')
        .select('task_id, ready_to_claim, reward_claimed, status, completed_at')
        .eq('user_id', user.id);
        
      if (userTasksError) throw userTasksError;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const userTasksMap = new Map((userTasks || []).map(ut => [ut.task_id, ut]));

    const formattedTasks = (allTasks || []).map(t => {
      const ut = userTasksMap.get(t.id);
      
      // For daily tasks, check if completed today
      let isCompleted = ut?.status === 'completed';
      if (t.type === 'daily' && isCompleted && ut?.completed_at) {
        const completedDate = new Date(ut.completed_at);
        completedDate.setHours(0, 0, 0, 0);
        if (completedDate.getTime() < today.getTime()) {
          isCompleted = false;
        }
      }

      return {
        id: t.id,
        week: t.week || 1,
        day: t.day,
        name: t.name,
        xp: t.xp,
        type: t.type || 'daily',
        completed: isCompleted,
        readyToClaim: ut?.ready_to_claim || false,
        rewardClaimed: ut?.reward_claimed || false,
        status: ut?.status || 'active'
      };
    });

      setTasks(formattedTasks);

      // Calculate maxUnlockedWeek
      const grouped = formattedTasks.reduce((acc, t) => {
        const w = t.week || 1;
        if (!acc[w]) acc[w] = [];
        acc[w].push(t);
        return acc;
      }, {} as Record<number, Task[]>);

      const maxExisting = Math.max(1, ...Object.keys(grouped).map(Number));
      setMaxExistingWeek(maxExisting);
      let unlocked = 1;
      
      for (let w = 1; w <= maxExisting; w++) {
        unlocked = w;
        const wTasks = grouped[w] || [];
        const isWeekCompleted = wTasks.length > 0 && wTasks.every(t => t.completed);
        if (!isWeekCompleted && wTasks.length > 0) {
          break; // Stop unlocking unless current week has no tasks
        }
      }
      
      setMaxUnlockedWeek(unlocked);
      setSelectedWeek((prev) => Math.min(Math.max(prev, 1), unlocked));

      // Fetch penalty tasks
      if (session) {
        const res = await fetch('/api/tasks/penalty', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const pTasks = await res.json();
          setPenaltyTasks(pTasks.map((pt: any) => ({ ...pt, isPenalty: true })));
        }
      }

    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    if (user?.id) {
      const channel = supabase.channel('tasks_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
          fetchTasks();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_tasks', filter: `user_id=eq.${user.id}` }, () => {
          fetchTasks();
        })
        .subscribe();
        
      return () => {
        channel.unsubscribe();
      };
    }
  }, [user?.id, user?.is_tasks_active]);

  const handleActivate = async () => {
    if (!user?.id || activating) return;
    
    setActivating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch('/api/tasks/activate', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al activar tareas');
      }

      await refreshUser();
    } catch (error: any) {
      console.error("Error activating tasks:", error);
      alert(error.message);
    } finally {
      setActivating(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedTaskForSubmission || !user?.id) return;
    if (!evidenceFile) {
      toast.error("Por favor selecciona una imagen como prueba.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const fileName = `${user.id}/${Date.now()}_task_${selectedTaskForSubmission.id}.jpg`;
      
      const uploadRes = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bucket: 'app-assets',
          fileName,
          base64Data: evidencePreview,
          contentType: 'image/jpeg'
        })
      });

      const uploadData = await uploadRes.json().catch(() => ({}));

      if (!uploadRes.ok) {
        console.error("Upload error details:", uploadData);
        throw new Error(uploadData.error || 'Error al subir la imagen');
      }

      const finalEvidenceUrl = uploadData.publicUrl;

      const res = await fetch(`/api/tasks/submit/${selectedTaskForSubmission.id}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          evidence_url: finalEvidenceUrl,
          notes: submissionNotes
        })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al enviar prueba');
      }

      toast.success("Prueba enviada correctamente. Un administrador la revisará.");
      setShowSubmissionModal(false);
      setEvidenceFile(null);
      setEvidencePreview("");
      setSubmissionNotes("");
      fetchTasks();
    } catch (error: any) {
      console.error("Error submitting task proof:", error);
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTask = async (task: Task, isPenalty: boolean = false) => {
    if (task.completed || task.status === 'pending_review' || !user?.id || !user.is_tasks_active) return;
    
    if (!isPenalty && (task.week || 1) > maxUnlockedWeek) {
      toast.error('Completa las semanas anteriores para desbloquear estas tareas.');
      return;
    }

    if (task.requires_evidence === false) {
      // Auto-complete simple tasks
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session');

        const url = isPenalty ? `/api/tasks/complete-penalty/${task.id}` : `/api/tasks/complete/${task.id}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Error completing task');
        }

        toast.success('¡Tarea completada! Ya puedes reclamar tu recompensa.');
        
        // Update local state
        if (isPenalty) {
          setPenaltyTasks(prev => prev.map(t => t.id === task.id ? { ...t, readyToClaim: true, completed: true } : t));
        } else {
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, readyToClaim: true, completed: true } : t));
        }
      } catch (error: any) {
        console.error("Error auto-completing task:", error);
        toast.error(error.message || "Error al completar la tarea");
      }
      return;
    }

    // For tasks requiring evidence, open the submission modal
    setSelectedTaskForSubmission(task);
    setShowSubmissionModal(true);
  };

  const handleClaim = async (taskId: string, isPenalty: boolean = false) => {
    if (!user?.id) return;
    
    // Check if task is locked by week
    const task = isPenalty ? penaltyTasks.find(t => t.id === taskId) : tasks.find(t => t.id === taskId);
    if (!isPenalty && task && (task.week || 1) > maxUnlockedWeek) {
      toast.error('Completa las semanas anteriores para desbloquear estas tareas.');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const url = isPenalty ? `/api/tasks/claim-penalty/${taskId}` : `/api/tasks/claim/${taskId}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error claiming reward');
      }

      const data = await res.json();

      // Update local state
      setTasks(tasks.map(t => t.id === taskId ? { 
        ...t, 
        rewardClaimed: true 
      } : t));

      // Handle level up if any
      if (data.leveledUp) {
        broadcastActivity('subió de nivel');
        setLevelUpData({ 
          newLevel: data.newLevel, 
          xpGained: data.xpGained, 
          newPercentage: data.newPercentage 
        });
        setShowLevelUp(true);
        playLevelUpSound();
        setTimeout(() => setShowLevelUp(false), 5000); // 5 seconds of confetti
      } else if (data.unlockedBadges && data.unlockedBadges.length > 0) {
        setUnlockedBadges(data.unlockedBadges);
        setShowBadges(true);
        playLevelUpSound();
        setTimeout(() => setShowBadges(false), 5000);
      } else {
        playSuccessSound();
      }
      
      // Update User Context Streak
      if (user) {
        refreshUser();
      }

      toast.success(`¡Recompensa de ${data.xpGained} XP reclamada!`);
      
      // Update local state for both regular and penalty tasks
      if (isPenalty) {
        setPenaltyTasks(prev => prev.map(t => t.id === taskId ? { ...t, rewardClaimed: true } : t));
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, rewardClaimed: true } : t));
      }

      await refreshUser();
    } catch (error: any) {
      console.error("Error claiming reward:", error);
      toast.error(error.message || "Error al reclamar la recompensa");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Filter tasks for selected week
  const weekTasks = tasks.filter(t => (t.week || 1) === selectedWeek);
  const dailyTasks = weekTasks.filter(t => t.type === 'daily');
  const weeklyTasks = weekTasks.filter(t => t.type === 'weekly');
  
  const activeTasks = [...dailyTasks, ...weeklyTasks];
  const smartTasks = weekTasks.filter(t => !['daily', 'weekly'].includes(t.type));
  const completedCount = activeTasks.filter((t) => t.completed).length + penaltyTasks.filter(t => t.completed).length + smartTasks.filter(t => t.completed).length;
  const totalTasksCount = activeTasks.length + penaltyTasks.length + smartTasks.length;
  const progress = totalTasksCount > 0 ? (completedCount / totalTasksCount) * 100 : 0;

  if (!user?.is_tasks_active) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24 px-6 pt-12">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-600/20">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Activa tus Tareas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
              Comienza tu ciclo de 7 días para ganar XP, subir de nivel y aumentar tus comisiones.
            </p>
          </div>

          <div className="bg-white dark:bg-[#111] rounded-[32px] p-8 border border-slate-100 dark:border-white/5 shadow-xl space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Ciclo de 7 Días</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tu semana comienza hoy mismo.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Recompensas de XP</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Gana experiencia por cada tarea.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Cumplimiento</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tu inventario y cumplimiento se activan.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={handleActivate}
                disabled={activating}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                {activating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Comenzar Ahora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24 relative overflow-hidden">
      {/* Submission Modal */}
      <AnimatePresence>
        {showSubmissionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#111] w-full max-w-md max-h-[90vh] flex flex-col rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5 shrink-0">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Enviar Prueba</h3>
                <button 
                  onClick={() => setShowSubmissionModal(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                  <h4 className="font-bold text-blue-700 dark:text-blue-400 text-sm mb-1">{selectedTaskForSubmission?.name}</h4>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/70">
                    Sube una captura de pantalla clara. Un administrador la revisará para validar tu progreso y asignarte tus {selectedTaskForSubmission?.xp} XP.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Captura de Evidencia</label>
                    <div className="relative">
                      {!evidencePreview ? (
                        <label className="flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Click para subir captura</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">PNG, JPG hasta 5MB</p>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*"
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  toast.error("La imagen debe ser menor a 5MB");
                                  return;
                                }
                                setEvidenceFile(file);
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setEvidencePreview(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      ) : (
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
                          <img src={evidencePreview} alt="Preview" className="w-full object-contain max-h-[300px]" />
                          <button
                            type="button"
                            onClick={() => {
                              setEvidenceFile(null);
                              setEvidencePreview("");
                            }}
                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Notas adicionales (Opcional)</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                      <textarea 
                        value={submissionNotes}
                        onChange={(e) => setSubmissionNotes(e.target.value)}
                        placeholder="Escribe algún detalle extra si es necesario..."
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-h-[100px] resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-white/5 shrink-0">
                <button
                  onClick={handleSubmitProof}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      Enviar para Revisión
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Level Up Animation Overlay */}
      <LevelUpCelebrationModal
        isOpen={showLevelUp}
        onClose={() => setShowLevelUp(false)}
        newLevel={levelUpData?.newLevel || 1}
        xpGained={levelUpData?.xpGained || 0}
        userPlan={user?.plan}
      />

      {/* Badges Unlocked Overlay */}
      <AnimatePresence>
        {showBadges && unlockedBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setShowBadges(false)}
          >
            <Confetti width={width} height={height} recycle={false} numberOfPieces={300} />
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-white dark:bg-[#111] p-8 rounded-[40px] text-center shadow-2xl shadow-blue-500/20 max-w-sm w-full mx-4 border border-slate-100 dark:border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center gap-4 mb-6">
                {unlockedBadges.map((badge, idx) => (
                  <motion.div 
                    key={badge.id}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: idx * 0.2, type: "spring" }}
                    className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl flex items-center justify-center shadow-lg shadow-orange-500/30"
                  >
                    <span className="text-4xl">{badge.icon}</span>
                  </motion.div>
                ))}
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                ¡Nuevas Insignias!
              </h2>
              <div className="space-y-2 mb-6">
                {unlockedBadges.map((badge) => (
                  <p key={badge.id} className="text-slate-500 dark:text-slate-400 font-medium">
                    Has desbloqueado: <span className="font-bold text-slate-900 dark:text-white">{badge.name}</span>
                  </p>
                ))}
              </div>
              <button 
                onClick={() => setShowBadges(false)}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold transition-transform active:scale-95"
              >
                ¡Genial!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        {/* Top Header / Streak Bar */}
        <div className="relative z-10 flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Mis Tareas</h1>
          </div>
          {user?.current_streak !== undefined && user.current_streak > 0 && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-orange-500/20 border border-orange-500/30 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg shadow-orange-500/10"
            >
              <span className="text-xl animate-pulse">🔥</span>
              <div>
                <p className="text-[9px] font-bold text-orange-300 uppercase tracking-wider leading-none mb-0.5">Racha Actual</p>
                <p className="font-black text-white leading-none text-sm">{user.current_streak} Días</p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="relative z-10 w-full overflow-x-auto pb-4 scrollbar-hide">
          <div className="flex gap-3 min-w-max">
            {Array.from({ length: maxExistingWeek }).map((_, i) => {
              const weekNum = i + 1;
              const isSelected = selectedWeek === weekNum;
              const isLocked = weekNum > maxUnlockedWeek;
              
              return (
                <button
                  key={weekNum}
                  onClick={() => setSelectedWeek(weekNum)}
                  className={cn(
                    "px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                    isSelected
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "bg-white/10 hover:bg-white/20 text-white backdrop-blur-md"
                  )}
                >
                  {isLocked ? <Lock className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                  Semana {weekNum}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {settings?.double_xp_active && (
        <div className="px-6 -mt-10 mb-4 relative z-20">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-2xl p-4 shadow-lg shadow-purple-500/30 flex items-center gap-3 border border-purple-400/30"
          >
            <div className="bg-white/20 p-2 rounded-xl shrink-0">
              <Zap className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-white font-bold text-sm">¡Evento de Doble XP Activo!</h4>
              <p className="text-purple-100 text-xs">Todas las tareas que reclames ahora otorgan el doble de experiencia.</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Streak Risk Alert Banner */}
      <div className={`px-6 relative z-20 mb-4 ${settings?.double_xp_active ? 'mt-0' : '-mt-16'}`}>
        <StreakRiskBanner 
          currentStreak={user?.current_streak || 0}
          completedToday={completedCount > 0}
        />
      </div>

      {/* Progress Card */}
      <div className="px-6 relative z-20 mb-8">
        <div className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-white/5">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider mb-1">
                Progreso del Día
              </p>
              <div className="text-3xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                {completedCount}{" "}
                <span className="text-lg text-slate-400 dark:text-slate-600 font-bold">
                  / {totalTasksCount} Tareas
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            </div>
          </div>

          <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-3 overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium text-center">
            {Math.round(progress)}% Completado
          </p>
        </div>
      </div>

      {/* Inventory & Compliance Status */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Inventario</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{user.inventory_status || 'Inactivo'}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Cumplimiento</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{user.compliance_score || 100}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="px-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tus Tareas</h2>
        
        {/* Smart Tasks (Tareas Inteligentes) */}
        <div className="mb-6">
          <TaskList userId={user.id} week={selectedWeek} isLocked={selectedWeek > maxUnlockedWeek} />
        </div>

        {/* Penalty Tasks - Tareas Adicionales */}
        {penaltyTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Tareas Adicionales</h2>
            {penaltyTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => toggleTask(task, true)}
                className={cn(
                  "bg-white dark:bg-[#111] rounded-2xl p-4 shadow-sm border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4",
                  task.completed
                    ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5"
                    : "border-red-200 dark:border-red-500/20 bg-red-50/30 dark:bg-red-500/5 hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-md"
                )}
              >
                  <div className="flex items-center sm:hidden mb-2 gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        task.completed
                          ? "bg-emerald-500 text-white"
                          : "bg-red-100 dark:bg-red-500/10 text-red-400 dark:text-red-500"
                      )}
                    >
                      <Check
                        className={cn(
                          "w-5 h-5",
                          task.completed ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Estado Adicional</span>
                  </div>
                  
                  <div className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center shrink-0 transition-colors bg-red-100 dark:bg-red-500/10 text-red-400 dark:text-red-500">
                     <Check className={cn("w-5 h-5", task.completed ? "opacity-100" : "opacity-0")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        Tarea {index + 1}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 whitespace-nowrap">
                        <ShieldCheck className="w-3 h-3 inline pb-0.5 mr-0.5"/> Validación Manual
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 dark:text-red-500 shrink-0" />
                      <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                        Castigo
                      </span>
                    </div>
                    <h3
                      className={cn(
                        "text-sm font-bold transition-colors break-words",
                        task.completed ? "text-slate-400 dark:text-slate-600 line-through" : "text-slate-900 dark:text-white"
                      )}
                    >
                      {task.name}
                    </h3>
                  </div>
                  <div className="w-full sm:w-auto mt-2 sm:mt-0 shrink-0 flex flex-wrap items-center gap-2 justify-end">
                    <div className={cn(
                      "inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-bold text-xs border transition-colors",
                      task.rewardClaimed
                        ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/10"
                        : task.completed
                          ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-500/20"
                          : "bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-white/5"
                    )}>
                      +{settings?.double_xp_active ? task.xp * 2 : task.xp} XP
                    </div>

                  {task.readyToClaim && !task.rewardClaimed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaim(task.id, true);
                      }}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-lg shadow-amber-500/10 transition-all hover:scale-105"
                    >
                      <Gift className="w-3 h-3" />
                      Reclamar
                    </button>
                  )}

                    {task.rewardClaimed && (
                      <div className="px-2 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-lg font-bold text-[10px] flex items-center gap-1 border border-slate-200 dark:border-white/10">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Reclamada
                      </div>
                    )}
                    
                  {!task.completed && task.status !== 'pending_review' && !task.readyToClaim && !task.rewardClaimed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task, true);
                      }}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-lg shadow-blue-600/10 transition-all hover:scale-105"
                    >
                      {task.requires_evidence === false ? <CheckCircle2 className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                      {task.requires_evidence === false ? 'Completar' : 'Subir Evidencia'}
                    </button>
                  )}
                  </div>
                </motion.div>
            ))}
          </div>
        )}
        
        {weeklyTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Tareas Semanales
            </h2>
            <div className="space-y-4">
              {weeklyTasks.map((task, idx) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => toggleTask(task, false)}
                  className={cn(
                    "bg-white dark:bg-[#111] rounded-2xl p-4 shadow-sm border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4",
                    task.completed
                      ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5"
                      : "border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-md",
                  )}
                >
                  <div className="flex items-center sm:hidden mb-2 gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                        task.completed || task.status === 'pending_review'
                          ? task.status === 'pending_review' ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                          : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600",
                      )}
                    >
                      {task.status === 'pending_review' ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <Check
                          className={cn(
                            "w-5 h-5",
                            task.completed ? "opacity-100" : "opacity-0",
                          )}
                        />
                      )}
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Estado Semanal</span>
                  </div>

                  <div
                    className={cn(
                      "hidden sm:flex w-8 h-8 rounded-xl items-center justify-center shrink-0 transition-colors",
                      task.completed || task.status === 'pending_review'
                        ? task.status === 'pending_review' ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                        : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600",
                    )}
                  >
                    {task.status === 'pending_review' ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <Check
                        className={cn(
                          "w-5 h-5",
                          task.completed ? "opacity-100" : "opacity-0",
                        )}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        Prueba {idx + 1}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 whitespace-nowrap">
                        <ShieldCheck className="w-3 h-3 inline pb-0.5 mr-0.5"/> Validación Manual
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                        Semanal
                      </span>
                    </div>
                    <p
                      className={cn(
                        "font-bold text-lg transition-colors break-words",
                        task.completed || task.status === 'pending_review'
                          ? "text-slate-400 dark:text-slate-600"
                          : "text-slate-800 dark:text-slate-200",
                      )}
                    >
                      {task.name}
                    </p>
                  </div>

                  <div className="w-full sm:w-auto mt-2 sm:mt-0 flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
                  <div
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1",
                      task.rewardClaimed
                        ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500"
                        : task.status === 'pending_review'
                          ? "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500"
                          : task.completed
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500"
                            : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    )}
                  >
                    +{settings?.double_xp_active ? task.xp * 2 : task.xp} <span className="text-[10px] uppercase">XP</span>
                  </div>

                  {task.status === 'pending_review' && (
                    <div className="px-3 py-2 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-amber-200 dark:border-white/10">
                      <Clock className="w-3.5 h-3.5" />
                      En Revisión
                    </div>
                  )}

                  {task.readyToClaim && !task.rewardClaimed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaim(task.id);
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 flex-1 sm:flex-none justify-center"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      Reclamar
                    </button>
                  )}

                  {task.rewardClaimed && (
                    <div className="px-3 py-2 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-white/10">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Reclamada
                    </div>
                  )}

                  {!task.completed && task.status !== 'pending_review' && !task.readyToClaim && !task.rewardClaimed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(task, false);
                      }}
                      disabled={selectedWeek > maxUnlockedWeek}
                      className={cn(
                        "px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all outline-none flex-1 sm:flex-none justify-center",
                        selectedWeek > maxUnlockedWeek
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 hover:scale-105"
                      )}
                    >
                      {selectedWeek > maxUnlockedWeek ? <Lock className="w-3.5 h-3.5" /> : (task.requires_evidence === false ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />)}
                      {selectedWeek > maxUnlockedWeek ? 'Bloqueada' : (task.requires_evidence === false ? 'Completar' : 'Evidencia')}
                    </button>
                  )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Tareas Adicionales de Hoy</h2>
        {dailyTasks.length === 0 ? (
          <div className="bg-white dark:bg-[#111] rounded-3xl p-8 text-center border border-dashed border-slate-200 dark:border-white/10">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No hay tareas programadas para hoy.</p>
          </div>
        ) : (
          dailyTasks.map((task, idx) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => toggleTask(task, false)}
              className={cn(
                "bg-white dark:bg-[#111] rounded-2xl p-4 shadow-sm border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center gap-4",
                task.completed
                  ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5"
                  : "border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-md",
              )}
            >
              <div className="flex items-center sm:hidden mb-2 gap-2">
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    task.completed || task.status === 'pending_review'
                      ? task.status === 'pending_review' ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                      : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600",
                  )}
                >
                  {task.status === 'pending_review' ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <Check
                      className={cn(
                        "w-5 h-5",
                        task.completed ? "opacity-100" : "opacity-0",
                      )}
                    />
                  )}
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">Estado Diario</span>
              </div>

              <div
                className={cn(
                  "hidden sm:flex w-8 h-8 rounded-xl items-center justify-center shrink-0 transition-colors",
                  task.completed || task.status === 'pending_review'
                    ? task.status === 'pending_review' ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"
                    : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600",
                )}
              >
                {task.status === 'pending_review' ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Check
                    className={cn(
                      "w-5 h-5",
                      task.completed ? "opacity-100" : "opacity-0",
                    )}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Tarea {idx + 1}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 whitespace-nowrap">
                    <ShieldCheck className="w-3 h-3 inline pb-0.5 mr-0.5"/> Validación Manual
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                    Día {task.day}
                  </span>
                </div>
                <p
                  className={cn(
                    "font-bold text-lg transition-colors break-words",
                    task.completed || task.status === 'pending_review'
                      ? "text-slate-400 dark:text-slate-600"
                      : "text-slate-800 dark:text-slate-200",
                  )}
                >
                  {task.name}
                </p>
              </div>

              <div className="w-full sm:w-auto mt-2 sm:mt-0 flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
                <div
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1",
                    task.rewardClaimed
                      ? "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500"
                      : task.status === 'pending_review'
                        ? "bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500"
                        : task.completed
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500"
                          : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                  )}
                >
                  +{settings?.double_xp_active ? task.xp * 2 : task.xp} <span className="text-[10px] uppercase">XP</span>
                </div>

                {task.status === 'pending_review' && (
                  <div className="px-3 py-2 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-amber-200 dark:border-white/10">
                    <Clock className="w-3.5 h-3.5" />
                    En Revisión
                  </div>
                )}

                {task.readyToClaim && !task.rewardClaimed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClaim(task.id);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 flex-1 sm:flex-none justify-center"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    Reclamar
                  </button>
                )}

                {task.rewardClaimed && (
                  <div className="px-3 py-2 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-200 dark:border-white/10">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Reclamada
                  </div>
                )}

                {!task.completed && task.status !== 'pending_review' && !task.readyToClaim && !task.rewardClaimed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(task, false);
                    }}
                    disabled={selectedWeek > maxUnlockedWeek}
                    className={cn(
                      "px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all outline-none flex-1 sm:flex-none justify-center",
                      selectedWeek > maxUnlockedWeek
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 hover:scale-105"
                    )}
                  >
                    {selectedWeek > maxUnlockedWeek ? <Lock className="w-3.5 h-3.5" /> : (task.requires_evidence === false ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />)}
                    {selectedWeek > maxUnlockedWeek ? 'Bloqueada' : (task.requires_evidence === false ? 'Completar' : 'Evidencia')}
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

    </div>
  );
}
