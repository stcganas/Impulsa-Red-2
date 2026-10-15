import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Gift, Star, Target, Zap, Lock } from 'lucide-react';
import { TaskProgressBar } from './TaskProgressBar';
import { cn } from "../../lib/utils";
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

export function TaskItem({ task, onClaimed, isLocked, index }: { task: any, onClaimed: () => void, isLocked?: boolean, index?: number }) {
  const [claiming, setClaiming] = useState(false);
  const { userTask } = task;

  const handleClaim = async () => {
    if (isLocked) {
      toast.error('Completa las semanas anteriores para desbloquear esta tarea.');
      return;
    }
    if (!userTask.ready_to_claim || userTask.reward_claimed || claiming) return;

    setClaiming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`/api/tasks/claim/${task.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`¡Recompensa de ${task.xp_reward || task.xp} XP reclamada!`);
        onClaimed();
      } else {
        console.error('Failed to claim task:', data.error);
      }
    } catch (error) {
      console.error('Error claiming task:', error);
    } finally {
      setClaiming(false);
    }
  };

  const getIcon = () => {
    switch (task.type) {
      case 'INVITE_COUNT': return <Target className="w-5 h-5" />;
      case 'PROFILE_COMPLETED': return <CheckCircle2 className="w-5 h-5" />;
      case 'LOGIN_STREAK': return <Zap className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-xl border p-4 transition-all duration-300",
      userTask.completed ? "border-green-200 bg-green-50/50" : 
      userTask.ready_to_claim ? "border-indigo-300 shadow-md shadow-indigo-100" : "border-gray-200"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "p-3 rounded-lg flex-shrink-0",
          userTask.completed ? "bg-green-100 text-green-600" :
          userTask.ready_to_claim ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
        )}>
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {index !== undefined && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                Tarea {index}
              </span>
            )}
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Zap className="w-3 h-3 inline pb-0.5 mr-0.5"/> Tarea Inteligente
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className={cn(
                "font-semibold break-words",
                userTask.completed ? "text-green-900" : "text-gray-900"
              )}>
                {task.title || task.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {task.description || "Completa esta tarea para ganar XP"}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-sm font-medium whitespace-nowrap">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              {task.xp_reward || task.xp} XP
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 w-full">
              <TaskProgressBar 
                progress={userTask.progress} 
                required={userTask.required || task.conditions?.value || 1} 
                completed={userTask.completed}
              />
            </div>
            
            <div className="flex-shrink-0 w-full sm:w-auto">
              {userTask.reward_claimed ? (
                <div className="flex items-center justify-center gap-1 text-emerald-600 font-bold text-sm bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                  <CheckCircle2 className="w-5 h-5" />
                  Reclamada
                </div>
              ) : (
                <motion.button
                  whileHover={userTask.ready_to_claim && !isLocked ? { scale: 1.05 } : {}}
                  whileTap={userTask.ready_to_claim && !isLocked ? { scale: 0.95 } : {}}
                  onClick={handleClaim}
                  disabled={!userTask.ready_to_claim || claiming || isLocked}
                  className={cn(
                    "w-full sm:w-auto justify-center px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all",
                    isLocked
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : userTask.ready_to_claim 
                        ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-200" 
                        : userTask.completed 
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {claiming ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : userTask.ready_to_claim ? (
                    <Gift className="w-4 h-4" />
                  ) : (
                    <Target className="w-4 h-4" />
                  )}
                  {isLocked ? 'Bloqueada' : userTask.ready_to_claim ? 'Reclamar' : userTask.completed ? 'Completada' : 'En Progreso'}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
