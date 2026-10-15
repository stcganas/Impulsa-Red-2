import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  User,
  TrendingUp,
  DollarSign,
  Settings,
  Bell,
  Search,
  ShieldCheck,
  BarChart3,
  Activity,
  LogOut,
  CheckCircle,
  XCircle,
  Loader2,
  CheckSquare,
  Video,
  MessageSquare,
  Moon,
  Sun,
  MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useUser } from "../contexts/UserContext";
import Logo from "../components/Logo";
import { useTheme } from "../contexts/ThemeContext";
import { useSettings } from "../contexts/SettingsContext";
import { supabase } from "../lib/supabase";
import UserManagement from "../components/UserManagement";
import TaskManagement from "../components/TaskManagement";
import TaskSubmissionsManagement from "../components/TaskSubmissionsManagement";
import TransactionManagement from "../components/TransactionManagement";
import CourseManagement from "../components/CourseManagement";
import SettingsManagement from "../components/SettingsManagement";
import TicketManagement from "../components/TicketManagement";
import PlanManager from "../components/admin/PlanManager";
import FeatureManager from "../components/admin/FeatureManager";
import PlanFeatureEditor from "../components/admin/PlanFeatureEditor";
import NotificationSettings from "../components/NotificationSettings";
import GlobalNotificationSender from "../components/admin/GlobalNotificationSender";
import NotificationScheduler from "../components/admin/NotificationScheduler";
import CustomNotificationScheduler from "../components/admin/CustomNotificationScheduler";
import SystemManagement from "../components/SystemManagement";
import AppLogicProjection from "./admin/AppLogicProjection";

interface AdminStats {
  totalUsers: number;
  totalTransactions: number;
  totalVolume: number;
  activeUsers: number;
}

interface SystemStatus {
  database: 'up' | 'down';
  gemini_api: 'up' | 'down';
  auth_server: 'up' | 'down';
  server: 'up' | 'down';
  timestamp: string;
}

import NotificationCenter from "../components/NotificationCenter";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading, logout } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [pendingTickets, setPendingTickets] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTransactions: 0,
    totalVolume: 0,
    activeUsers: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const statsRes = await fetch('/api/admin/dashboard-data', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          // No cache to ensure we get fresh data
          cache: 'no-store'
        }).catch(err => {
          console.warn("Network error fetching admin stats (server may be restarting):", err);
          return null;
        });

        if (!statsRes) {
          return; // Stop execution if it's a network error, don't crash
        }

        if (!statsRes.ok) {
          const text = await statsRes.text();
          console.error(`Admin stats response not OK: ${statsRes.status} ${statsRes.statusText}`, text);
          throw new Error(`Error ${statsRes.status}: ${statsRes.statusText}`);
        }

        const data = await statsRes.json();

        setStats({
          totalUsers: data.totalUsers || 0,
          totalTransactions: data.totalTransactions || 0,
          totalVolume: data.totalVolume || 0,
          activeUsers: data.activeUsers || 0
        });

        const formattedActivity = (data.recentActivity || []).map((tx: any) => {
          let action = "";
          if (tx.type === 'withdrawal') action = "Retiro Solicitado";
          else if (tx.type === 'deposit') action = "Depósito";
          else if (tx.type === 'referral_bonus') action = "Bono de Referido";
          else if (tx.type === 'task_reward') action = "Recompensa de Tarea";
          else if (tx.type === 'plan_purchase') action = "Compra de Plan";
          else if (tx.type === 'referral_commission') action = "Comisión de Referido";
          else action = tx.type;

          const date = new Date(tx.created_at);
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);

          let timeStr = "";
          if (diffMins < 60) timeStr = `Hace ${diffMins} min`;
          else if (diffHours < 24) timeStr = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
          else timeStr = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;

          return {
            id: tx.id,
            user: (tx.users as any)?.name || "Usuario Desconocido",
            action: action,
            time: timeStr,
            amount: `$${Number(tx.amount).toLocaleString()}`
          };
        });

        setRecentActivity(formattedActivity);
        setPendingTickets(data.pendingTickets || 0);
        setPendingSubmissions(data.pendingSubmissions || 0);

        try {
          // Fetch System Status
          const statusRes = await fetch('/api/admin/system-status', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          }).catch(err => {
             console.warn("Network error for system status:", err);
             return null;
          });
          if (statusRes && statusRes.ok) {
            const statusData = await statusRes.json();
            setSystemStatus(statusData);
          }
        } catch (statusError) {
          console.error("Error fetching system status:", statusError);
        }

      } catch (error) {
        console.error("Error fetching admin stats:", error);
      }
    };

    if (user && user.role === 'admin') {
      fetchStats();

      // Realtime listeners for admin
      const transactionsChannel = supabase
        .channel('admin_transactions')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'transactions' 
        }, (payload) => {
          console.log("Admin: New transaction detected", payload.new);
          toast.info("Nueva transacción", {
            description: `Se ha registrado una nueva actividad de ${(payload.new as any).type}`
          });
          fetchStats(); // Refresh stats and activity
        })
        .subscribe();

      const ticketsChannel = supabase
        .channel('admin_tickets')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'tickets' 
        }, (payload) => {
          console.log("Admin: New ticket detected", payload.new);
          toast.warning("Nuevo Ticket de Soporte", {
            description: (payload.new as any).subject
          });
          setPendingTickets(prev => prev + 1);
        })
        .subscribe();

      const submissionsChannel = supabase
        .channel('admin_submissions')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'task_submissions' 
        }, (payload) => {
          console.log("Admin: New submission detected", payload.new);
          toast.success("Nuevo Envío de Tarea", {
            description: "Un usuario ha enviado una prueba para revisión."
          });
          fetchStats();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(transactionsChannel);
        supabase.removeChannel(ticketsChannel);
        supabase.removeChannel(submissionsChannel);
      };
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white font-sans selection:bg-emerald-500/30 pb-20 lg:pb-0">
      {/* Sidebar Navigation (Desktop) */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#111] border-r border-slate-200 dark:border-white/5 flex-col p-6 z-50 overflow-y-auto">
        <div className="flex items-center gap-3 mb-12 px-2">
          <Logo />
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { icon: BarChart3, label: "Dashboard" },
            { icon: Users, label: "Usuarios" },
            { icon: TrendingUp, label: "Transacciones" },
            { icon: MessageSquare, label: "Tickets" },
            { icon: Activity, label: "Sistema" },
            { icon: CheckSquare, label: "Tareas" },
            { icon: MessageSquare, label: "Envíos" },
            { icon: BarChart3, label: "Lógica App" },
            { icon: Video, label: "Cursos" },
            { icon: ShieldCheck, label: "Planes" },
            { icon: Bell, label: "Notificaciones" },
            { icon: Settings, label: "Configuración" },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(item.label)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.label 
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                  : "text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.label === "Tickets" && pendingTickets > 0 && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingTickets}
                </span>
              )}
              {item.label === "Envíos" && pendingSubmissions > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingSubmissions}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.95 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
                className="absolute bottom-24 left-4 right-4 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 p-6 rounded-[2rem] shadow-2xl shadow-black/30 z-50 overflow-hidden"
              >
                <div className="grid grid-cols-3 gap-y-8 gap-x-4">
                  {[
                    { icon: Activity, label: "Sistema", color: "text-rose-500", bg: "bg-gradient-to-br from-rose-400 to-rose-600", shadow: "shadow-rose-500/40" },
                    { icon: CheckSquare, label: "Tareas", color: "text-cyan-500", bg: "bg-gradient-to-br from-cyan-400 to-cyan-600", shadow: "shadow-cyan-500/40" },
                    { icon: MessageSquare, label: "Envíos", color: "text-emerald-500", bg: "bg-gradient-to-br from-emerald-400 to-emerald-600", shadow: "shadow-emerald-500/40" },
                    { icon: BarChart3, label: "Lógica App", color: "text-amber-500", bg: "bg-gradient-to-br from-amber-400 to-amber-600", shadow: "shadow-amber-500/40" },
                    { icon: Video, label: "Cursos", color: "text-indigo-500", bg: "bg-gradient-to-br from-indigo-400 to-indigo-600", shadow: "shadow-indigo-500/40" },
                    { icon: ShieldCheck, label: "Planes", color: "text-pink-500", bg: "bg-gradient-to-br from-pink-400 to-pink-600", shadow: "shadow-pink-500/40" },
                    { icon: Bell, label: "Notifs", color: "text-orange-500", bg: "bg-gradient-to-br from-orange-400 to-orange-600", shadow: "shadow-orange-500/40" },
                    { icon: Settings, label: "Ajustes", color: "text-slate-500", bg: "bg-gradient-to-br from-slate-400 to-slate-600", shadow: "shadow-slate-500/40" },
                  ].map((item, idx) => {
                    const isActive = activeTab === item.label || (activeTab === "Configuración" && item.label === "Ajustes") || (activeTab === "Notificaciones" && item.label === "Notifs");
                    const actualLabel = item.label === "Ajustes" ? "Configuración" : item.label === "Notifs" ? "Notificaciones" : item.label;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveTab(actualLabel);
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex flex-col items-center gap-2 rounded-2xl group transition-all"
                      >
                        <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 transform group-hover:scale-110 group-active:scale-95 ${isActive ? `${item.bg} text-white shadow-lg ${item.shadow}` : `bg-slate-100 dark:bg-white/5 ${item.color} shadow-inner border border-slate-200/50 dark:border-white/5`}`}>
                          <item.icon className="w-6 h-6 drop-shadow-sm" style={{ filter: isActive ? 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))' : '' }} />
                        </div>
                        <span className={`text-[11px] font-bold tracking-wide ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <nav className="bg-white/95 dark:bg-[#111]/95 backdrop-blur-2xl border-t border-slate-200/50 dark:border-white/10 flex justify-around items-center p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] px-1 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
          {[
            { icon: BarChart3, label: "Dashboard", color: "text-blue-500 dark:text-blue-400", bg: "bg-gradient-to-br from-blue-400 to-blue-600", shadow: "shadow-blue-500/40" },
            { icon: Users, label: "Usuarios", color: "text-emerald-500 dark:text-emerald-400", bg: "bg-gradient-to-br from-emerald-400 to-emerald-600", shadow: "shadow-emerald-500/40" },
            { icon: TrendingUp, label: "Transacciones", color: "text-amber-500 dark:text-amber-400", bg: "bg-gradient-to-br from-amber-400 to-amber-600", shadow: "shadow-amber-500/40" },
            { icon: MessageSquare, label: "Tickets", color: "text-purple-500 dark:text-purple-400", bg: "bg-gradient-to-br from-purple-400 to-purple-600", shadow: "shadow-purple-500/40" },
          ].map((item, idx) => {
            const isActive = activeTab === item.label;
            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveTab(item.label);
                  setIsMobileMenuOpen(false);
                }}
                className="relative flex flex-col items-center justify-center w-[20%] h-16 group"
              >
                <div className="flex flex-col items-center justify-center transition-all duration-400 ease-out h-full w-full relative">
                  <div className={`w-10 h-10 rounded-[0.9rem] flex items-center justify-center transition-all duration-400 relative z-10 ${isActive ? `${item.bg} text-white shadow-xl ${item.shadow} scale-110 -translate-y-1` : `${item.color} bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5`}`}>
                    <item.icon className="w-5 h-5 transition-all duration-300" style={{ filter: isActive ? 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))' : '' }} />
                    {item.label === "Tickets" && pendingTickets > 0 && !isActive && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#1a1a1a]" />
                    )}
                  </div>
                  <span className={`text-[9px] whitespace-nowrap font-bold tracking-wide transition-all duration-400 mt-1.5 ${isActive ? 'text-slate-900 dark:text-white translate-y-0 opacity-100' : 'text-slate-500 dark:text-slate-400 opacity-80'}`}>
                    {item.label === "Transacciones" ? "Transacc." : item.label}
                  </span>
                  {/* Indicator Dot */}
                  <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-slate-900 dark:bg-white transition-all duration-400 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
                </div>
              </button>
            );
          })}
          
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="relative flex flex-col items-center justify-center w-[20%] h-16 group"
          >
            <div className="flex flex-col items-center justify-center transition-all duration-400 ease-out h-full w-full relative">
              <div className={`w-10 h-10 rounded-[0.9rem] flex items-center justify-center transition-all duration-400 relative z-10 ${isMobileMenuOpen ? 'bg-gradient-to-br from-slate-700 to-slate-900 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 shadow-xl shadow-black/20 dark:shadow-white/20 scale-110 -translate-y-1' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5'}`}>
                <MoreHorizontal className={`w-5 h-5 transition-transform duration-400 ${isMobileMenuOpen ? 'rotate-90' : ''}`} style={{ filter: isMobileMenuOpen ? 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))' : '' }} />
              </div>
              <span className={`text-[9px] font-bold tracking-wide transition-all duration-400 mt-1.5 ${isMobileMenuOpen ? 'text-slate-900 dark:text-white translate-y-0 opacity-100' : 'text-slate-500 dark:text-slate-400 opacity-80'}`}>
                Más
              </span>
              {/* Indicator Dot */}
              <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-slate-900 dark:bg-white transition-all duration-400 ${isMobileMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
            </div>
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="lg:pl-64 min-h-screen">
        {/* Top Header */}
        <header className="h-16 lg:h-20 border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-4 lg:px-8 sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-40">
          <h1 className="text-lg font-bold lg:hidden">{activeTab}</h1>
          <div className="hidden lg:flex items-center gap-4 bg-slate-100 dark:bg-white/5 px-4 py-2 rounded-full border border-slate-200 dark:border-white/5 w-96">
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar usuarios, transacciones..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-white/5"
              title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <NotificationCenter />
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <button 
                onClick={() => navigate("/profile")}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all overflow-hidden"
                title="Mi Perfil"
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </button>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          {activeTab === "Dashboard" && (
            <>
              <div className="mb-10">
                <h2 className="text-3xl font-bold mb-2">Panel de Control</h2>
                <p className="text-slate-500">Bienvenido al centro de mando de {settings.app_name || "ImpulsaRed"}.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                {[
                  { label: "Usuarios", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Transacciones", value: stats.totalTransactions.toLocaleString(), icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { label: "Volumen", value: `$${(stats.totalVolume / 1000000).toFixed(1)}M`, icon: DollarSign, color: "text-amber-500", bg: "bg-amber-500/10" },
                  { label: "Activos", value: stats.activeUsers.toLocaleString(), icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10" },
                ].map((stat, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5"
                  >
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <p className="text-slate-500 text-xs font-medium mb-1">{stat.label}</p>
                    <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{stat.value}</h3>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Actividad Reciente</h3>
                    <button 
                      onClick={() => setActiveTab("Transacciones")}
                      className="text-[10px] font-bold text-emerald-500 hover:underline uppercase tracking-widest"
                    >
                      Ver Todo
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {recentActivity.length > 0 ? recentActivity.map((item, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" />
                          <div>
                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.user}</p>
                            <p className="text-[10px] text-slate-500">{item.action}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.amount && <p className="text-xs font-bold text-emerald-500">{item.amount}</p>}
                          <p className="text-[9px] text-slate-400 dark:text-slate-600 font-medium">{item.time}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-500 text-sm">
                        No hay actividad reciente.
                      </div>
                    )}
                  </div>
                </div>

                {/* System Health & Support */}
                <div className="space-y-6">
                  <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 p-6">
                    <h3 className="font-bold text-base mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                      <Activity className="w-5 h-5 text-emerald-500" />
                      Estado del Sistema
                    </h3>
                    <div className="space-y-5">
                      {[
                        { label: "Base de Datos", status: !systemStatus ? "Cargando..." : (systemStatus.database === 'up' ? "Online" : "Offline"), color: !systemStatus ? "bg-slate-500" : (systemStatus.database === 'up' ? "bg-emerald-500" : "bg-red-500") },
                        { label: "API Gemini", status: !systemStatus ? "Cargando..." : (systemStatus.gemini_api === 'up' ? "Estable" : "Error"), color: !systemStatus ? "bg-slate-500" : (systemStatus.gemini_api === 'up' ? "bg-emerald-500" : "bg-red-500") },
                        { label: "Servidor Auth", status: !systemStatus ? "Cargando..." : (systemStatus.auth_server === 'up' ? "Online" : "Offline"), color: !systemStatus ? "bg-slate-500" : (systemStatus.auth_server === 'up' ? "bg-emerald-500" : "bg-red-500") },
                        { label: "Servidor App", status: !systemStatus ? "Cargando..." : (systemStatus.server === 'up' ? "Online" : "Offline"), color: !systemStatus ? "bg-slate-500" : (systemStatus.server === 'up' ? "bg-emerald-500" : "bg-red-500") },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-bold ${item.status === 'Online' || item.status === 'Estable' ? 'text-emerald-500' : 'text-red-500'}`}>
                              {item.status}
                            </span>
                            <div className={`w-2 h-2 rounded-full ${item.color} shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:shadow-[0_0_8px_rgba(0,0,0,0.5)] ${item.color === 'bg-emerald-500' ? 'shadow-emerald-500/50' : 'shadow-red-500/50'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-6 text-center italic">
                      Última actualización: {systemStatus ? new Date(systemStatus.timestamp).toLocaleTimeString() : 'Cargando...'}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/10">
                    <h3 className="font-bold text-lg mb-1">Centro de Soporte</h3>
                    <p className="text-emerald-100 text-sm mb-6">
                      {pendingTickets > 0 
                        ? `Tienes ${pendingTickets} ticket${pendingTickets > 1 ? 's' : ''} pendiente${pendingTickets > 1 ? 's' : ''} por resolver.`
                        : "No hay tickets pendientes por ahora."}
                    </p>
                    <button 
                      onClick={() => setActiveTab("Tickets")}
                      className="w-full py-3 bg-white text-emerald-600 font-bold rounded-2xl text-sm hover:bg-emerald-50 transition-all shadow-lg shadow-black/10"
                    >
                      Gestionar Tickets
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "Usuarios" && <UserManagement />}
          {activeTab === "Transacciones" && <TransactionManagement />}
          {activeTab === "Tickets" && <TicketManagement />}
          {activeTab === "Envíos" && <TaskSubmissionsManagement />}
          {activeTab === "Sistema" && <SystemManagement />}
          {activeTab === "Tareas" && <TaskManagement />}
          {activeTab === "Cursos" && <CourseManagement />}
          {activeTab === "Lógica App" && <AppLogicProjection />}
          {activeTab === "Planes" && (
            <div className="space-y-12 pb-20">
              <section>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Gestión de Planes</h2>
                <PlanManager />
              </section>
              
              <section>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Definición de Características</h2>
                <FeatureManager />
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Matriz de Configuración</h2>
                <PlanFeatureEditor />
              </section>
            </div>
          )}
          {activeTab === "Configuración" && <SettingsManagement />}
          {activeTab === "Notificaciones" && (
            <div className="max-w-4xl mx-auto space-y-12">
              <GlobalNotificationSender />
              
              <div className="space-y-6">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Programación Avanzada</h2>
                  <p className="text-sm text-slate-500">Gestiona envíos automáticos y personalizados</p>
                </div>
                <CustomNotificationScheduler />
                <NotificationScheduler />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Configuración de Notificaciones en Vivo</h2>
                <NotificationSettings />
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
