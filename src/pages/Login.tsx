import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, ArrowRight, ArrowLeft, Home } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "../contexts/UserContext";
import Logo from "../components/Logo";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "motion/react";

import { TaskEngine } from "../utils/TaskEngine";

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, refreshUser } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    console.log("Login state check:", { loading, hasUser: !!user, role: user?.role, showSplash, isLoading });
    let timeoutId: NodeJS.Timeout;
    
    // Evitamos el redirect automático por onAuthStateChanged si estamos en medio del proceso de login
    if (isLoading) return;

    if (!loading && user) {
      if (showSplash) {
        timeoutId = setTimeout(() => {
          if (user.role === 'admin') {
            navigate("/admin", { replace: true });
          } else {
            navigate("/dashboard", { replace: true });
          }
        }, 50); // Mínima demora para asegurar que el estado se procese
      } else {
        if (user.role === 'admin') {
          navigate("/admin", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      }
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, loading, navigate, showSplash, isLoading]);

  if (isLoading || showSplash) {
    return (
      <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white px-6 py-12 justify-center items-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center"
        >
          <Logo size="xl" className="mb-8" />
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="text-3xl font-bold mb-3 text-center tracking-tight text-slate-900 dark:text-white"
          >
            {!showSplash && isLoading ? "Iniciando sesión..." : "¡Bienvenido!"}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="text-slate-500 text-lg mb-8"
          >
            {!showSplash && isLoading ? "Verificando datos..." : "Entrando al sistema..."}
          </motion.p>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full w-48 overflow-hidden"
          >
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}
              className="h-full bg-blue-500 rounded-full w-1/2"
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Si ya tenemos usuario pero no Splash (ej: el usuario vuelve a entrar a /login), redirigimos rápido
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (user && !showSplash) {
    return null; // El useEffect se encarga de redirigir instantáneamente
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    console.log("Iniciando login para:", email);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("Error de Supabase Auth (Completo):", signInError);
        const errorMsg = signInError.message || (typeof signInError === 'object' ? JSON.stringify(signInError) : String(signInError));
        throw new Error(errorMsg.includes('Invalid login credentials') 
          ? 'Contraseña incorrecta o el correo no existe. Verifica tus datos e inténtalo de nuevo.' 
          : errorMsg);
      }
      
      console.log("Login exitoso, forzando refreshUser...", data.user?.id);
      setShowSplash(true);
      await refreshUser(data.session?.access_token);
      
      // Trigger LOGIN_STREAK event in background
      TaskEngine.triggerEvent('LOGIN_STREAK', 1).catch(err => console.error("Event error:", err));
    } catch (err: any) {
      console.error("Login catch error:", err);
      // Detailed error reporting
      let displayError = "Error desconocido";
      if (err.message) {
        displayError = err.message;
      } else if (typeof err === 'string') {
        displayError = err;
      } else {
        try {
          displayError = JSON.stringify(err);
        } catch (e) {
          displayError = "Error no serializable";
        }
      }
      
      if (displayError === "{}" || !displayError) {
        displayError = "Error de conexión o credenciales inválidas (Objeto de error vacío)";
      }
      
      setError(displayError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white px-6 py-6 sm:py-12 relative">
      {/* Top Bar with Return to Home Button */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la página principal</span>
        </Link>
        <Link
          to="/"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          title="Ir al inicio"
        >
          <Home className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="mb-8 text-center flex flex-col items-center">
          <Logo className="mb-6" size="xl" />
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
            Bienvenido de nuevo
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base">
            Ingresa para continuar tu crecimiento.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                placeholder="Correo electrónico"
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-slate-900 dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                placeholder="Contraseña"
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm text-slate-900 dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Recordarme</span>
            </label>
            <Link to="/forgot-password" className="text-blue-600 font-medium hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold text-lg shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span>{isLoading ? "Iniciando..." : "Iniciar Sesión"}</span>
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setEmail("ericcharris432@gmail.com");
              setPassword("password123");
            }}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 font-medium hover:border-blue-400 hover:text-blue-600 transition-all"
          >
            Usar cuenta de prueba (Demo)
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-slate-500">
            ¿No tienes una cuenta?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-blue-600 font-semibold hover:underline"
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
