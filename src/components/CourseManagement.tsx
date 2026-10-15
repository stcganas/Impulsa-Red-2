import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, X, CheckCircle, Video } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  xpReward: number;
}

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    videoUrl: '',
    xpReward: 500
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'courses_list')
        .single();
        
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found error
      
      setCourses(data?.value || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCoursesToSettings = async (newCourses: Course[]) => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'courses_list', value: newCourses });
        
      if (error) throw error;
      setCourses(newCourses);
    } catch (error) {
      console.error('Error saving courses:', error);
      alert('Error al guardar los cursos');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let updatedCourses = [...courses];
    
    if (editingCourse) {
      updatedCourses = updatedCourses.map(c => 
        c.id === editingCourse.id ? { ...formData } : c
      );
    } else {
      // Generate a simple ID if new
      const newCourse = {
        ...formData,
        id: formData.id || `course_${Date.now()}`
      };
      updatedCourses.push(newCourse);
    }
    
    await saveCoursesToSettings(updatedCourses);
    setIsModalOpen(false);
    setEditingCourse(null);
    setFormData({ id: '', title: '', description: '', videoUrl: '', xpReward: 500 });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este curso?')) return;
    
    const updatedCourses = courses.filter(c => c.id !== id);
    await saveCoursesToSettings(updatedCourses);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({ ...course });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Capacitación</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Administra los videos y cursos para los usuarios.</p>
        </div>
        <button
          onClick={() => {
            setEditingCourse(null);
            setFormData({ id: '', title: '', description: '', videoUrl: '', xpReward: 500 });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" /> Nuevo Curso
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {courses.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
            <Video className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">No hay cursos configurados.</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Haz clic en "Nuevo Curso" para agregar el primero.</p>
          </div>
        ) : (
          courses.map((course) => (
            <div key={course.id} className="bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-video bg-slate-900 relative group">
                {course.videoUrl.includes('youtube.com') || course.videoUrl.includes('youtu.be') ? (
                  <img 
                    src={`https://img.youtube.com/vi/${course.videoUrl.split('v=')[1]?.split('&')[0] || course.videoUrl.split('/').pop()}/maxresdefault.jpg`} 
                    alt={course.title}
                    className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                    <Video className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                  +{course.xpReward} XP
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg mb-2 line-clamp-1 text-slate-900 dark:text-white">{course.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">{course.description}</p>
                
                <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
                  <button
                    onClick={() => openEditModal(course)}
                    className="flex-1 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/10 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-900 dark:text-white">{editingCourse ? 'Editar Curso' : 'Nuevo Curso'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">Título del Curso</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                  value={formData.title} 
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                  placeholder="Ej: Introducción a las Ventas" 
                />
              </div>
              
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">Descripción</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white resize-none" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Describe lo que aprenderán en este curso..." 
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">URL del Video (YouTube/Vimeo)</label>
                <input 
                  type="url"
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                  value={formData.videoUrl} 
                  onChange={e => setFormData({...formData, videoUrl: e.target.value})} 
                  placeholder="Ej: https://youtube.com/watch?v=..." 
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">Recompensa (XP)</label>
                <input 
                  type="number"
                  min="0"
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                  value={formData.xpReward} 
                  onChange={e => setFormData({...formData, xpReward: parseInt(e.target.value) || 0})} 
                  placeholder="Ej: 500" 
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
