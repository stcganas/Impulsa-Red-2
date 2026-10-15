import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Play, 
  Clock, 
  Star, 
  ChevronRight, 
  Search,
  Filter,
  Award,
  Check,
  Trophy,
  Loader2,
  Download,
  Share2,
  X,
  Sparkles,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { useSettings } from "../contexts/SettingsContext";
import { supabase } from "../lib/supabase";
import { calculatePercentage } from "../utils/levelUtils";
import { TaskEngine } from "../utils/TaskEngine";

interface Course {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  xp: number;
  category?: string;
  duration?: string;
  lessons?: number;
  rating?: number;
  image?: string;
}

export default function Training() {
  const { user, refreshUser } = useUser();
  const { settings } = useSettings();
  const [courses, setCourses] = useState<Course[]>([]);
  const [completedCourses, setCompletedCourses] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<any>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const fetchData = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch courses from settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'courses_list')
        .single();
        
      if (!settingsError && settingsData) {
        // Add default values for UI if missing in DB
        const dbCourses = (settingsData.value as Course[]).map(c => ({
          ...c,
          category: c.category || "Marketing",
          duration: c.duration || "35 min",
          lessons: c.lessons || 4,
          rating: c.rating || 4.9,
          image: c.image || `https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60`
        }));
        setCourses(dbCourses);
      } else {
        // Default rich starter courses if none found
        const fallbackCourses: Course[] = [
          {
            id: 1,
            title: "Fundamentos del Crecimiento Multinivel",
            description: "Aprende cómo construir una base sólida de referidos y apalancarte en las 3 líneas de comisión.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            xp: 150,
            category: "Redes",
            duration: "25 min",
            lessons: 3,
            rating: 5.0,
            image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=60"
          },
          {
            id: 2,
            title: "Cierre de Ventas y Prospección en WhatsApp",
            description: "Guiones probados y técnicas de persuasión no invasiva para convertir prospectos en miembros activos.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            xp: 200,
            category: "Ventas",
            duration: "40 min",
            lessons: 5,
            rating: 4.9,
            image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=60"
          },
          {
            id: 3,
            title: "Marketing Digital para Líderes de Alto Rendimiento",
            description: "Estrategias de tráfico orgánico en TikTok e Instagram Reels para atraer decenas de registros diarios.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            xp: 250,
            category: "Marketing",
            duration: "45 min",
            lessons: 6,
            rating: 4.8,
            image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=60"
          },
          {
            id: 4,
            title: "Liderazgo y Duplicación de Equipos",
            description: "Cómo capacitar a tus directos de nivel 1 para que construyan sus propios niveles 2 y 3 de forma autónoma.",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
            xp: 300,
            category: "Liderazgo",
            duration: "50 min",
            lessons: 4,
            rating: 5.0,
            image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=60"
          }
        ];
        setCourses(fallbackCourses);
      }

      // Fetch completed courses
      const { data: completedData, error: completedError } = await supabase
        .from('user_courses')
        .select('course_id')
        .eq('user_id', user.id);
        
      if (!completedError && completedData) {
        setCompletedCourses(completedData.map(d => d.course_id));
      }
    } catch (error) {
      console.error("Error fetching training data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const completeCourse = async (courseId: number, xp: number) => {
    if (!user?.id || completedCourses.includes(courseId)) return;
    
    setCompletingId(courseId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(`/api/courses/complete/${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ xpReward: xp })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al completar el curso');
      }

      const result = await response.json();

      setCompletedCourses(prev => [...prev, courseId]);
      toast.success(`¡Curso completado! +${xp} XP ganados`);
      
      // Trigger COURSE_COMPLETED event
      await TaskEngine.triggerEvent('COURSE_COMPLETED', 1, { course_id: courseId.toString() });

      if (result.leveledUp) {
        setLevelUpData({ newLevel: result.newLevel, xpGained: result.xpGained });
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 4000);
      }
      
      await refreshUser();
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
      }
    } catch (error: any) {
      console.error("Error completing course:", error);
      toast.error(error instanceof Error ? error.message : "Error al completar el curso");
    } finally {
      setCompletingId(null);
    }
  };

  const filteredCourses = courses.filter(c => {
    const matchesCat = selectedCategory === "Todos" || c.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const completionPercentage = courses.length > 0 
    ? Math.round((completedCourses.length / courses.length) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-28 relative overflow-hidden transition-colors duration-300">
      {/* Level Up Animation Overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-gradient-to-br from-amber-400 to-amber-600 p-8 rounded-[40px] text-center shadow-2xl shadow-amber-500/50 max-w-xs w-full mx-4"
            >
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trophy className="w-12 h-12 text-amber-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                ¡Nivel {levelUpData?.newLevel}!
              </h2>
              <p className="text-amber-100 font-medium text-lg">
                Has ganado {levelUpData?.xpGained} XP
              </p>
              <p className="text-white font-bold mt-4 text-xl">
                Comisión: {levelUpData?.newPercentage?.toFixed(1) || '70'}%
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-400 text-xs font-black uppercase tracking-wider">
                Academia ImpulsaRed
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Capacitación de Líderes</h1>
            <p className="text-slate-400 text-sm">Desbloquea habilidades de prospección, liderazgo y escala tus comisiones.</p>
          </div>

          <button
            onClick={() => setShowCertificate(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 active:scale-95 transition-all self-start md:self-auto"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Ver Mi Certificado Digital</span>
          </button>
        </div>
      </div>

      {/* Progress & Certificate Banner */}
      <div className="px-6 -mt-12 relative z-20 mb-8">
        <div className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-xl border border-slate-100 dark:border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tu Progreso de Graduación</p>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                {completedCourses.length} de {courses.length} Cursos Completados
              </h3>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{completionPercentage}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-white/5 h-3 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${completionPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-gradient-to-r from-blue-600 to-emerald-500 h-full rounded-full"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              {completionPercentage === 100 ? '¡Graduación completa!' : 'Completa todos los módulos para tu insignia'}
            </span>
            <span className="font-bold text-amber-500">
              +{courses.reduce((acc, c) => acc + c.xp, 0)} XP Totales
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-6 mb-6">
        <div className="bg-white dark:bg-[#111] rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-white/5 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tema o habilidad..." 
              className="w-full pl-10 pr-4 py-3 bg-transparent focus:outline-none font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm"
            />
          </div>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 mb-8 overflow-x-auto flex gap-3 no-scrollbar">
        {["Todos", "Marketing", "Ventas", "Redes", "Liderazgo"].map((cat) => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-5 py-2.5 rounded-full font-bold text-xs whitespace-nowrap transition-all",
              selectedCategory === cat
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                : "bg-white dark:bg-[#111] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-blue-500/30"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Course List */}
      <div className="px-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Cursos Disponibles ({filteredCourses.length})
          </h2>
        </div>

        {filteredCourses.map((course, idx) => {
          const isCompleted = completedCourses.includes(course.id);
          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="bg-white dark:bg-[#111] rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5 group transition-all"
            >
              <div 
                onClick={() => setSelectedCourse(course)}
                className="relative h-48 overflow-hidden cursor-pointer"
              >
                <img 
                  src={course.image} 
                  alt={course.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest shadow-sm">
                    {course.category}
                  </span>
                  {isCompleted && (
                    <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1">
                      <Check className="w-3 h-3" /> Completado
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
                  <div className="flex items-center gap-4 text-white/90 text-xs font-bold">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {course.duration}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      {course.lessons} lecciones
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>

              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 
                    onClick={() => setSelectedCourse(course)}
                    className="text-lg font-bold text-slate-900 dark:text-slate-200 leading-tight flex-1 mr-2 cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-sm shrink-0">
                    <Star className="w-4 h-4 fill-amber-500" />
                    {course.rating}
                  </div>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-5 line-clamp-2">
                  {course.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Award className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">+{course.xp} XP</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSelectedCourse(course)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                    >
                      Ver Lecciones
                    </button>
                    <button 
                      onClick={() => completeCourse(course.id, course.xp)}
                      disabled={isCompleted || completingId === course.id}
                      className={cn(
                        "px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm",
                        isCompleted 
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95"
                      )}
                    >
                      {completingId === course.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isCompleted ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Completado</span>
                        </>
                      ) : (
                        <>
                          <span>Completar</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Course Detail & Player Modal */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#111] w-full max-w-lg rounded-3xl overflow-hidden border border-slate-100 dark:border-white/10 shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase">
                    {selectedCourse.category}
                  </span>
                  <span className="text-xs font-bold text-slate-400">+{selectedCourse.xp} XP</span>
                </div>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 space-y-6 flex-1">
                {/* Simulated Video Player */}
                <div className="aspect-video bg-slate-950 rounded-2xl relative overflow-hidden flex items-center justify-center group shadow-inner border border-white/5">
                  <img 
                    src={selectedCourse.image} 
                    alt={selectedCourse.title} 
                    className="w-full h-full object-cover opacity-40"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 mb-3 group-hover:scale-110 transition-transform cursor-pointer">
                      <Play className="w-7 h-7 fill-white ml-1" />
                    </div>
                    <p className="text-white font-bold text-sm drop-shadow">Reproducir Lección Magistral</p>
                    <p className="text-slate-300 text-xs mt-0.5">Duración estimada: {selectedCourse.duration}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedCourse.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                    {selectedCourse.description}
                  </p>
                </div>

                {/* Modules Checklist */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Módulos del Curso</h4>
                  {[
                    "1. Fundamentos y Mentalidad Ganadora",
                    "2. Métricas Clave y Retorno por Línea",
                    "3. Casos de Éxito de Líderes Destacados",
                    "4. Plan de Acción y Tareas de Duplicación"
                  ].slice(0, selectedCourse.lessons || 4).map((mod, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-between border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                          {i + 1}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{mod}</span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center justify-between">
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-700 dark:hover:text-white"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => completeCourse(selectedCourse.id, selectedCourse.xp)}
                  disabled={completedCourses.includes(selectedCourse.id) || completingId === selectedCourse.id}
                  className={cn(
                    "px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95",
                    completedCourses.includes(selectedCourse.id)
                      ? "bg-emerald-500 text-white shadow-emerald-500/20"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
                  )}
                >
                  {completingId === selectedCourse.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : completedCourses.includes(selectedCourse.id) ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Completado (+{selectedCourse.xp} XP)</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Completar y Recibir {selectedCourse.xp} XP</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Graduation Certificate Modal */}
      <AnimatePresence>
        {showCertificate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#111] w-full max-w-lg rounded-3xl overflow-hidden border border-amber-500/30 shadow-2xl p-6 space-y-6"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-amber-500" />
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Acreditación Oficial</span>
                </div>
                <button
                  onClick={() => setShowCertificate(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Certificate Canvas Box */}
              <div className="relative p-8 rounded-2xl bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 dark:from-[#18150f] dark:via-[#111] dark:to-[#18150f] border-2 border-amber-400/40 shadow-inner text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Award className="w-8 h-8 text-white" />
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    ACADEMIA OFICIAL {settings.app_name?.toUpperCase() || 'IMPULSARED'}
                  </p>
                  <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mt-1">
                    Certificado de Liderazgo y Crecimiento Digital
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Se otorga el presente reconocimiento oficial a:
                  </p>
                </div>

                <div className="py-2 border-b-2 border-amber-400/50 max-w-xs mx-auto">
                  <h4 className="text-2xl font-bold text-slate-900 dark:text-amber-200 tracking-tight">
                    {user?.name || 'Líder Destacado'}
                  </h4>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Por haber completado satisfactoriamente el programa integral de capacitación en prospección, estrategias multinivel y gestión de franquicia digital.
                </p>

                <div className="pt-4 flex justify-between items-center text-[10px] text-slate-400 border-t border-amber-200/50 dark:border-white/5">
                  <div className="text-left">
                    <p className="font-bold text-slate-700 dark:text-slate-300">Fecha de Emisión</p>
                    <p>{new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-700 dark:text-slate-300">Código de Verificación</p>
                    <p className="font-mono text-amber-600 dark:text-amber-400 font-bold">IMP-{user?.id?.slice(0, 8).toUpperCase() || '2026'}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    toast.success("¡Certificado guardado en tu dispositivo!");
                  }}
                  className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </button>
                <button
                  onClick={() => {
                    const text = `¡Acabo de certificarme como Líder en ${settings.app_name || 'ImpulsaRed'}! 🎓🚀 Únete a mi equipo: ${window.location.origin}/register?ref=${user?.referral_code || ''}`;
                    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartir Logro</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
