import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Home, CheckSquare, BookOpen, Wallet, User, Rocket, MoreHorizontal, Shield, Trophy, Award, MessageCircleQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../../contexts/UserContext";
import { motion, AnimatePresence } from "motion/react";

export default function MobileLayout() {
  const location = useLocation();
  const { user } = useUser();
  const isAdmin = user?.role === "admin";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const mainNavItems = [
    { name: "Inicio", path: "/dashboard", icon: Home, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500" },
    { name: "Tareas", path: "/tasks", icon: CheckSquare, color: "text-cyan-500 dark:text-cyan-400", bg: "bg-cyan-500" },
    { name: "Viral", path: "/referrals", icon: Rocket, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500" },
    { name: "Cursos", path: "/training", icon: BookOpen, color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-500" },
  ];

  const moreNavItems = [
    { name: "Mi Red (Líder)", path: "/team", icon: Shield, color: "text-emerald-500", bg: "bg-gradient-to-br from-emerald-400 to-teal-600", shadow: "shadow-emerald-500/40" },
    { name: "Billetera", path: "/wallet", icon: Wallet, color: "text-amber-500", bg: "bg-gradient-to-br from-amber-400 to-amber-600", shadow: "shadow-amber-500/40" },
    { name: "Ranking", path: "/ranking", icon: Trophy, color: "text-yellow-500", bg: "bg-gradient-to-br from-yellow-400 to-amber-500", shadow: "shadow-yellow-500/40" },
    { name: "Niveles", path: "/levels", icon: Award, color: "text-blue-500", bg: "bg-gradient-to-br from-blue-400 to-indigo-600", shadow: "shadow-blue-500/40" },
    { name: "Perfil", path: "/profile", icon: User, color: "text-purple-500", bg: "bg-gradient-to-br from-purple-400 to-purple-600", shadow: "shadow-purple-500/40" },
    { name: "Soporte", path: "/tickets", icon: MessageCircleQuestion, color: "text-rose-500", bg: "bg-gradient-to-br from-rose-400 to-red-600", shadow: "shadow-rose-500/40" },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white font-sans overflow-hidden">
      <main className={cn(
        "flex-1 overflow-y-auto pb-20",
        isAdmin && "pb-0"
      )}>
        <Outlet />
      </main>

      {!isAdmin && (
        <>
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 100, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 100, scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
                  className="absolute bottom-24 left-4 right-4 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 p-6 rounded-[2rem] shadow-2xl shadow-black/30 z-50 overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-y-8 gap-x-4">
                    {moreNavItems.map((item) => {
                      const isActive = location.pathname.startsWith(item.path);
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsMenuOpen(false)}
                          className="flex flex-col items-center gap-2 rounded-2xl group transition-all"
                        >
                          <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-300 transform group-hover:scale-110 group-active:scale-95 ${isActive ? `${item.bg} text-white shadow-lg ${item.shadow}` : `bg-slate-100 dark:bg-white/5 ${item.color} shadow-inner border border-slate-200/50 dark:border-white/5`}`}>
                            <item.icon className="w-6 h-6 drop-shadow-sm" style={{ filter: isActive ? 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))' : '' }} />
                          </div>
                          <span className={`text-[11px] font-bold tracking-wide ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>{item.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#111]/95 backdrop-blur-2xl border-t border-slate-200/50 dark:border-white/10 flex justify-around items-center p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] px-1 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
            {mainNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className="relative flex flex-col items-center justify-center w-[20%] h-16 group"
                >
                  <div className="flex flex-col items-center justify-center transition-all duration-400 ease-out h-full w-full relative">
                    <div className={`w-10 h-10 rounded-[0.9rem] flex items-center justify-center transition-all duration-400 relative z-10 ${isActive ? `${item.bg} text-white shadow-xl scale-110 -translate-y-1` : `${item.color} bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5`}`}>
                      <Icon className="w-5 h-5 transition-all duration-300" style={{ filter: isActive ? 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))' : '' }} />
                    </div>
                    <span className={`text-[9px] font-bold tracking-wide transition-all duration-400 mt-1.5 ${isActive ? 'text-slate-900 dark:text-white translate-y-0 opacity-100' : 'text-slate-500 dark:text-slate-400 opacity-80'}`}>
                      {item.name}
                    </span>
                    <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-slate-900 dark:bg-white transition-all duration-400 ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
                  </div>
                </NavLink>
              );
            })}
            
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative flex flex-col items-center justify-center w-[20%] h-16 group"
            >
              <div className="flex flex-col items-center justify-center transition-all duration-400 ease-out h-full w-full relative">
                <div className={`w-10 h-10 rounded-[0.9rem] flex items-center justify-center transition-all duration-400 relative z-10 ${isMenuOpen ? 'bg-gradient-to-br from-slate-700 to-slate-900 dark:from-white dark:to-slate-200 text-white dark:text-slate-900 shadow-xl scale-110 -translate-y-1' : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 border border-slate-200/50 dark:border-white/5'}`}>
                  <MoreHorizontal className={`w-5 h-5 transition-transform duration-400 ${isMenuOpen ? 'rotate-90' : ''}`} style={{ filter: isMenuOpen ? 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))' : '' }} />
                </div>
                <span className={`text-[9px] font-bold tracking-wide transition-all duration-400 mt-1.5 ${isMenuOpen ? 'text-slate-900 dark:text-white translate-y-0 opacity-100' : 'text-slate-500 dark:text-slate-400 opacity-80'}`}>
                  Más
                </span>
                <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-slate-900 dark:bg-white transition-all duration-400 ${isMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} />
              </div>
            </button>
          </nav>
        </>
      )}
    </div>
  );
}
