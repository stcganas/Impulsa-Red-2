import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, X, CheckCircle, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Task {
  id: string;
  day: string;
  name: string;
  title?: string;
  description?: string;
  xp: number;
  xp_reward?: number;
  type: string;
  conditions?: any;
  is_active?: boolean;
  requires_evidence?: boolean;
  created_at: string;
  week?: number;
}

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<any>(null);
  const [endingWeek, setEndingWeek] = useState(false);
  const [selectedWeekUI, setSelectedWeekUI] = useState(1);
  
  const [formData, setFormData] = useState({
    week: 1,
    day: '1',
    name: '',
    description: '',
    xp: 100,
    type: 'daily',
    conditions_value: 1,
    conditions_course_id: '',
    conditions_plan_id: '',
    conditions_feature_id: '',
    is_active: true,
    requires_evidence: true
  });

  useEffect(() => {
    fetchTasks();
    fetchWeeklySchedule();

    // Subscribe to task changes
    const subscription = supabase
      .channel('public:tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchWeeklySchedule = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'weekly_schedule')
        .single();
      
      if (!error && data) {
        setWeeklySchedule(data.value);
      }
    } catch (error) {
      console.error('Error fetching weekly schedule:', error);
    }
  };

  const handleEndWeek = async () => {
    if (!window.confirm('¿Estás seguro de finalizar la semana? Esto aplicará sanciones a los usuarios que no hayan completado sus tareas y reiniciará el progreso para la nueva semana.')) return;
    
    setEndingWeek(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch('/api/admin/tasks/end-week', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ penaltyXp: 50 })
      });
      
      if (!res.ok) throw new Error('Error ending week');
      
      alert('Semana finalizada correctamente. Se han aplicado las sanciones y el progreso ha sido reiniciado.');
      fetchWeeklySchedule();
    } catch (error) {
      console.error('Error ending week:', error);
      alert('Error al finalizar la semana.');
    } finally {
      setEndingWeek(false);
    }
  };

  const handleSeedTasks = async () => {
    if (!window.confirm('¿Deseas sembrar las tareas iniciales recomendadas para la primera semana?')) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch('/api/admin/tasks/seed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!res.ok) throw new Error('Error seeding tasks');
      
      alert('Tareas iniciales sembradas correctamente.');
      fetchTasks();
    } catch (error) {
      console.error('Error seeding tasks:', error);
      alert('Error al sembrar tareas.');
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('week', { ascending: true })
        .order('day', { ascending: true });
        
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Check if we are adding a daily task and if the limit of 10 is reached
      if (formData.type === 'daily' && !editingTask) {
        const tasksForDay = tasks.filter(t => t.type === 'daily' && t.day === formData.day);
        if (tasksForDay.length >= 10) {
          alert('No puedes crear más de 10 tareas para el mismo día.');
          return;
        }
      }

      // Build conditions object based on type
      let conditions: any = {};
      if (['INVITE_COUNT', 'LOGIN_STREAK', 'TEAM_SIZE', 'SHARE_ACTION', 'FEATURE_USAGE'].includes(formData.type)) {
        conditions.value = Number(formData.conditions_value);
      }
      if (formData.type === 'COURSE_COMPLETED') {
        conditions.course_id = formData.conditions_course_id;
      }
      if (formData.type === 'PLAN_PURCHASE') {
        conditions.plan_id = formData.conditions_plan_id;
      }
      if (formData.type === 'FEATURE_USAGE') {
        conditions.feature_id = formData.conditions_feature_id;
      }

      const taskPayload = {
        week: formData.week,
        day: formData.day,
        name: formData.name, // Keep for backwards compatibility
        title: formData.name,
        description: formData.description,
        xp: formData.xp, // Keep for backwards compatibility
        xp_reward: formData.xp,
        type: formData.type,
        conditions: conditions,
        is_active: formData.is_active,
        requires_evidence: formData.requires_evidence
      };

      if (editingTask) {
        const res = await fetch(`/api/admin/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(taskPayload)
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error updating task');
        }
      } else {
        const res = await fetch('/api/admin/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(taskPayload)
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Error creating task');
        }
      }
      
      setIsModalOpen(false);
      setEditingTask(null);
      setFormData({ 
        week: selectedWeekUI,
        day: '1', name: '', description: '', xp: 100, type: 'daily', 
        conditions_value: 1, conditions_course_id: '', conditions_plan_id: '', conditions_feature_id: '', is_active: true, requires_evidence: true
      });
      fetchTasks();
    } catch (error: any) {
      console.error('Error saving task:', error);
      alert(`Error al guardar la tarea: ${error.message || 'Verifica tus permisos de administrador.'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) throw new Error('Error deleting task');
        
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error al eliminar la tarea. Verifica tus permisos de administrador.');
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      week: task.week || selectedWeekUI,
      day: task.day,
      name: task.title || task.name,
      description: task.description || '',
      xp: task.xp_reward || task.xp,
      type: task.type || 'daily',
      conditions_value: task.conditions?.value || 1,
      conditions_course_id: task.conditions?.course_id || '',
      conditions_plan_id: task.conditions?.plan_id || '',
      conditions_feature_id: task.conditions?.feature_id || '',
      is_active: task.is_active !== false,
      requires_evidence: task.requires_evidence !== false
    });
    setIsModalOpen(true);
  };

  const deleteAllTasks = async () => {
    if (!window.confirm('¿Estás seguro de eliminar TODAS las tareas? Esta acción no se puede deshacer.')) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch('/api/admin/tasks', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) throw new Error('Error deleting all tasks');
        
      fetchTasks();
    } catch (error: any) {
      console.error('Error deleting all tasks:', error);
      alert('Error al eliminar todas las tareas. Verifica tus permisos de administrador.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const handleDeleteWeek = async (week: number) => {
    if (!window.confirm(`¿Estás seguro de eliminar la Semana ${week}? Se eliminarán TODAS las tareas de esta semana.`)) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(`/api/admin/tasks/week/${week}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        throw new Error('Error al eliminar la semana');
      }
      
      toast.success(`Semana ${week} eliminada.`);
      if (selectedWeekUI === week) {
        setSelectedWeekUI(Math.max(1, week - 1));
      }
      fetchTasks();
    } catch (error) {
      console.error('Error deleting week:', error);
      toast.error('Error al eliminar la semana.');
    }
  };

  const maxExistingWeek = tasks.length > 0 ? Math.max(...tasks.map(t => t.week || 1)) : 1;
  const totalWeeks = Math.max(selectedWeekUI, maxExistingWeek);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Tareas</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Administra las tareas diarias y semanales.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {totalWeeks > 1 && (
            <button
              onClick={() => handleDeleteWeek(selectedWeekUI)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-colors text-sm"
              title={`Eliminar Semana ${selectedWeekUI}`}
            >
              <Trash2 className="w-4 h-4" /> Eliminar Sem {selectedWeekUI}
            </button>
          )}
          <button
            onClick={deleteAllTasks}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-colors text-sm"
            title="Borrar todas las tareas de todas las semanas"
          >
            <Trash2 className="w-4 h-4" /> Borrar Todas
          </button>
          <button
            onClick={() => {
              setEditingTask(null);
              setFormData({ 
                week: selectedWeekUI,
                day: '1', name: '', description: '', xp: 100, type: 'daily', 
                conditions_value: 1, conditions_course_id: '', conditions_plan_id: '', conditions_feature_id: '', is_active: true 
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors text-sm shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" /> Nueva Tarea
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: totalWeeks }).map((_, i) => {
          const weekNum = i + 1;
          const isActive = selectedWeekUI === weekNum;
          return (
            <button
              key={weekNum}
              onClick={() => setSelectedWeekUI(weekNum)}
              className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
                isActive 
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Semana {weekNum}
            </button>
          );
        })}
        <button
          onClick={() => setSelectedWeekUI(totalWeeks + 1)}
          className="px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors bg-white dark:bg-slate-800 text-emerald-500 border border-dashed border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
        >
          <Plus className="w-4 h-4 inline-block mr-1" />
          Nueva Semana
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Calendar className="w-5 h-5 text-emerald-500" />
              Programación Semanal
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {weeklySchedule ? (
                <>
                  Semana actual: {new Date(weeklySchedule.start_date).toLocaleDateString()} - {new Date(weeklySchedule.end_date).toLocaleDateString()}
                </>
              ) : (
                'No hay una semana programada actualmente.'
              )}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg w-fit">
              <AlertTriangle className="w-4 h-4" />
              Sanción por incumplimiento: -50 XP por tarea
            </div>
          </div>
          <button
            onClick={handleEndWeek}
            disabled={endingWeek}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            {endingWeek ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Finalizar Semana y Aplicar Sanciones
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
        <div className="p-4 space-y-6">
          {[1, 2, 3, 4, 5, 6, 7].map(day => {
            const filteredTasks = tasks.filter(t => (t.week || 1) === selectedWeekUI && t.type === 'daily' && parseInt(t.day) === day);
            return (
              <div key={day} className="border-b border-slate-100 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-slate-900 dark:text-white">Día {day}</h4>
                  <button
                    onClick={() => {
                      setEditingTask(null);
                      setFormData(prev => ({ ...prev, week: selectedWeekUI, day: day.toString(), name: '', xp: 100, type: 'daily' }));
                      setIsModalOpen(true);
                    }}
                    className="text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-600 font-bold"
                  >
                    <Plus className="w-3 h-3" /> Agregar Tarea
                  </button>
                </div>
                <div className="space-y-2">
                  {filteredTasks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No hay tareas para este día.</p>
                  ) : (
                      filteredTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-transparent hover:border-emerald-500/30 transition-all group">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{task.title || task.name}</span>
                          {task.description && (
                            <span className="text-[10px] text-slate-500 line-clamp-1">{task.description}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg">+{task.xp_reward || task.xp} XP</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(task)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDelete(task.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          );
        })}
          
        <div className="border-t border-slate-100 dark:border-white/5 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-slate-900 dark:text-white">Semanales Adicionales</h4>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setFormData(prev => ({ ...prev, week: selectedWeekUI, day: '1', name: '', xp: 100, type: 'weekly' }));
                  setIsModalOpen(true);
                }}
                className="text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-600 font-bold"
              >
                <Plus className="w-3 h-3" /> Agregar Tarea
              </button>
            </div>
            <div className="space-y-2">
              {tasks.filter(t => (t.week || 1) === selectedWeekUI && t.type === 'weekly').map(task => (
                <div key={task.id} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-transparent hover:border-emerald-500/30 transition-all group">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{task.title || task.name}</span>
                    {task.description && (
                      <span className="text-[10px] text-slate-500 line-clamp-1">{task.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg">+{task.xp_reward || task.xp} XP</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(task)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(task.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
 
          <div className="border-t border-slate-100 dark:border-white/5 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-slate-900 dark:text-white">Tareas Inteligentes</h4>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setFormData(prev => ({ 
                    ...prev,
                    week: selectedWeekUI,
                    day: '1', name: '', description: '', xp: 100, type: 'INVITE_COUNT', 
                    conditions_value: 1, conditions_course_id: '', conditions_plan_id: '', conditions_feature_id: '', is_active: true 
                  }));
                  setIsModalOpen(true);
                }}
                className="text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-600 font-bold"
              >
                <Plus className="w-3 h-3" /> Agregar Tarea
              </button>
            </div>
            <div className="space-y-2">
              {tasks.filter(t => (t.week || 1) === selectedWeekUI && !['daily', 'weekly'].includes(t.type)).map(task => (
                <div key={task.id} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-transparent hover:border-emerald-500/30 transition-all group">
                  <div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block">{task.title || task.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase bg-slate-200 dark:bg-white/5 px-1.5 py-0.5 rounded mt-1 inline-block">{task.type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg">+{task.xp_reward || task.xp} XP</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditModal(task)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(task.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5">
              <h3 className="font-bold text-xl text-slate-900 dark:text-white">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                title="Cerrar modal"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block uppercase tracking-wider">Semana</label>
                    <input 
                      type="number"
                      min="1"
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                      value={formData.week} 
                      onChange={e => setFormData({...formData, week: parseInt(e.target.value) || 1})} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block uppercase tracking-wider">Día (Solo Diarias)</label>
                    <input 
                      type="number"
                      min="1"
                      max="7"
                      disabled={formData.type !== 'daily'}
                      required={formData.type === 'daily'}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white disabled:opacity-50" 
                      value={formData.day} 
                      onChange={e => setFormData({...formData, day: e.target.value})} 
                      placeholder="Ej: 1" 
                    />
                    {formData.type === 'daily' && (
                      <p className="text-[10px] text-slate-400 mt-1 ml-1 font-medium">Máximo 10 tareas por día.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block uppercase tracking-wider">Tipo</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white"
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="daily">Diaria</option>
                      <option value="weekly">Semanal</option>
                      <option value="INVITE_COUNT">Invitar Usuarios</option>
                      <option value="PROFILE_COMPLETED">Completar Perfil</option>
                      <option value="COURSE_COMPLETED">Completar Curso</option>
                      <option value="LOGIN_STREAK">Racha de Ingresos</option>
                      <option value="TEAM_SIZE">Tamaño de Equipo</option>
                      <option value="PLAN_PURCHASE">Comprar Plan</option>
                      <option value="SHARE_ACTION">Compartir</option>
                      <option value="FEATURE_USAGE">Usar Función</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block uppercase tracking-wider">Experiencia (XP)</label>
                    <input 
                      type="number"
                      min="0"
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                      value={formData.xp} 
                      onChange={e => setFormData({...formData, xp: parseInt(e.target.value) || 0})} 
                      placeholder="Ej: 100" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block uppercase tracking-wider">Nombre de la Tarea</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    placeholder="Ej: Seguir en Instagram" 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block uppercase tracking-wider">Descripción (Opcional)</label>
                  <textarea 
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white resize-none" 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    placeholder="Ej: Sigue nuestra cuenta oficial para estar al tanto de las novedades." 
                    rows={3}
                  />
                </div>

                {/* Conditional Fields based on Type */}
                {['INVITE_COUNT', 'LOGIN_STREAK', 'TEAM_SIZE', 'SHARE_ACTION', 'FEATURE_USAGE'].includes(formData.type) && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block uppercase tracking-wider">Valor Requerido</label>
                    <input 
                      type="number"
                      min="1"
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                      value={formData.conditions_value} 
                      onChange={e => setFormData({...formData, conditions_value: parseInt(e.target.value) || 1})} 
                      placeholder="Ej: 5" 
                    />
                  </div>
                )}

                {formData.type === 'COURSE_COMPLETED' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block uppercase tracking-wider">ID del Curso</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                      value={formData.conditions_course_id} 
                      onChange={e => setFormData({...formData, conditions_course_id: e.target.value})} 
                      placeholder="Ej: course_123" 
                    />
                  </div>
                )}

                {formData.type === 'PLAN_PURCHASE' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block uppercase tracking-wider">ID del Plan</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                      value={formData.conditions_plan_id} 
                      onChange={e => setFormData({...formData, conditions_plan_id: e.target.value})} 
                      placeholder="Ej: plan_premium" 
                    />
                  </div>
                )}

                {formData.type === 'FEATURE_USAGE' && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 mb-1 block uppercase tracking-wider">ID de la Función</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                      value={formData.conditions_feature_id} 
                      onChange={e => setFormData({...formData, conditions_feature_id: e.target.value})} 
                      placeholder="Ej: feature_chat" 
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/10">
                  <input
                    type="checkbox"
                    id="requires_evidence"
                    checked={formData.requires_evidence}
                    onChange={e => setFormData({...formData, requires_evidence: e.target.checked})}
                    className="w-5 h-5 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <div className="flex flex-col">
                    <label htmlFor="requires_evidence" className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer">
                      Requiere Evidencia Manual
                    </label>
                    <span className="text-xs text-slate-500">Si se desactiva, la tarea se completa al hacer clic (ej. abrir un enlace).</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-100 dark:border-white/10">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="w-5 h-5 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <div className="flex flex-col">
                    <label htmlFor="is_active" className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer">
                      Tarea Activa
                    </label>
                    <span className="text-xs text-slate-500">¿Está disponible para que los usuarios la completen?</span>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex gap-3 justify-end mt-auto">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="px-6 py-3 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-xl font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="task-form"
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5 pr-1" />
                Guardar Tarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
