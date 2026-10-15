import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Loader2, CheckCircle2 } from 'lucide-react';
import Logo from '../components/Logo';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have the recovery token in the URL hash
    const hash = window.location.hash;
    if (!hash || !hash.includes('type=recovery')) {
      // If not a recovery link, we might still be authenticated from the link click
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          setError('Enlace de recuperación inválido o expirado. Por favor solicita uno nuevo.');
        }
      });
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || 'Ocurrió un error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-white dark:bg-[#111] rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-white/5 transition-colors duration-300">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Nueva Contraseña
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Ingresa tu nueva contraseña para acceder a tu cuenta.
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">¡Contraseña actualizada!</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-all"
              >
                Ir al Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !!error?.includes('inválido')}
                className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Guardar Contraseña'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
