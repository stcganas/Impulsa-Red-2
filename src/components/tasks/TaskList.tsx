import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TaskItem } from './TaskItem';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Target } from 'lucide-react';

export function TaskList({ userId, week, isLocked }: { userId: string, week: number, isLocked?: boolean }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      // Get all active smart tasks
      const { data: activeTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true)
        .eq('week', week)
        .not('type', 'in', '("daily","weekly")');

      // Get user progress
      const { data: userTasks } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', userId);

      const userTasksMap = new Map(userTasks?.map(ut => [ut.task_id, ut]) || []);

      const combinedTasks = activeTasks?.map(task => {
        const ut = userTasksMap.get(task.id);
        return {
          ...task,
          userTask: ut || {
            progress: 0,
            required: task.conditions?.value || 1,
            completed: false,
            ready_to_claim: false
          }
        };
      }) || [];

      // Sort: ready to claim first, then incomplete, then completed
      combinedTasks.sort((a, b) => {
        if (a.userTask.ready_to_claim && !b.userTask.ready_to_claim) return -1;
        if (!a.userTask.ready_to_claim && b.userTask.ready_to_claim) return 1;
        if (a.userTask.completed && !b.userTask.completed) return 1;
        if (!a.userTask.completed && b.userTask.completed) return -1;
        return 0;
      });

      setTasks(combinedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Subscribe to user_tasks changes
    const subscription = supabase
      .channel('user_tasks_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_tasks',
        filter: `user_id=eq.${userId}`
      }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, week]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
      ))}
    </div>;
  }

  const completedCount = tasks.filter(t => t.userTask.completed).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <AnimatePresence>
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.1 }}
            >
              <TaskItem task={task} onClaimed={fetchTasks} isLocked={isLocked} index={index + 1} />
            </motion.div>
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No hay tareas activas</h3>
            <p className="text-gray-500">Vuelve más tarde para nuevas tareas</p>
          </div>
        )}
      </div>
    </div>
  );
}
