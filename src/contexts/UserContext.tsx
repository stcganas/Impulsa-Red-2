import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  plan_id?: string;
  level: number;
  xp: number;
  percentage: number;
  totalEarned: number;
  badge?: string;
  role: 'user' | 'admin';
  referral_code?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  birth_date?: string;
  neighborhood?: string;
  nequi_number?: string;
  document_url?: string;
  document_back_url?: string;
  is_tasks_active?: boolean;
  task_start_date?: string;
  task_end_date?: string;
  wallet_balance?: number;
  inventory_status?: string;
  compliance_score?: number;
  trust_score?: number;
  leader_level?: string;
  current_streak?: number;
  longest_streak?: number;
  badges?: any[];
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Try to load user from localStorage for immediate rendering
    try {
      const savedUser = localStorage.getItem('impulsa_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Error loading user from localStorage:", e);
      return null;
    }
  });
  const [loading, setLoading] = useState(() => !localStorage.getItem('impulsa_user'));
  const [error, setError] = useState<string | null>(null);
  const refreshPromise = useRef<Promise<void> | null>(null);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem('impulsa_user');
      await supabase.auth.signOut();
      setUser(null);
      toast.success("Sesión cerrada correctamente", { position: 'top-center' });
    } catch (err) {
      console.error('Error logging out', err);
      localStorage.removeItem('impulsa_user');
      setUser(null);
      toast.success("Sesión cerrada correctamente", { position: 'top-center' });
    }
  }, []);

  const refreshUser = useCallback(async (token?: string) => {
    if (refreshPromise.current) {
      return refreshPromise.current;
    }

    refreshPromise.current = (async () => {
      // Use a functional check or a ref if we need the current user state without triggering re-renders
      setLoading(prevLoading => {
        // If we already have a user in state or a token, we don't show the global loader
        // except when explicitly starting with nothing.
        // We can check the current user using the state variable from the outer scope
        // but to avoid the dependency, we can use the localStorage as a proxy or just rely on the initial state.
        return prevLoading; 
      });
      
      setError(null);
      
      try {
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          throw new Error("Faltan las credenciales de Supabase.");
        }

        let authToken = token;
        
        if (!authToken) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!session?.user) {
            localStorage.removeItem('impulsa_user');
            setUser(null);
            return;
          }
          authToken = session.access_token;
        }

        // Fetch user profile
        const profileResponse = await fetch('/api/account/data', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!profileResponse.ok) {
          if (profileResponse.status === 401) {
            localStorage.removeItem('impulsa_user');
            setUser(null);
            await supabase.auth.signOut();
            return;
          }
          throw new Error(`Error del servidor (${profileResponse.status})`);
        }

        const profile = await profileResponse.json();
        localStorage.setItem('impulsa_user', JSON.stringify(profile));
        setUser(profile as User);
      } catch (err: any) {
        let errorMessage = err.message || 'Error de conexión';
        if (errorMessage.includes('Auth session missing') || 
            errorMessage.includes('Sesión expirada') ||
            errorMessage.includes('invalid refresh token')) {
          localStorage.removeItem('impulsa_user');
          setUser(null);
          return;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
        refreshPromise.current = null;
      }
    })();

    return refreshPromise.current;
  }, []); // Remove user dependency

  useEffect(() => {
    refreshUser();

    // Safety fallback: if loading is still true after 35 seconds, force it to false
    const safetyTimeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn("UserContext Safety timeout: forcing loading to false after 35s");
          return false;
        }
        return prev;
      });
    }, 35000);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false); // Ensure loading is false on sign out
      }
    });

    // Realtime channel for profile updates
    let profileChannel: any = null;
    if (user?.id) {
      profileChannel = supabase
        .channel(`public:users:id=eq.${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        }, (payload) => {
          console.log("Realtime profile update received:", payload.new);
          setUser(prev => {
            if (!prev) return (payload.new as User);
            const updated = { ...prev, ...payload.new } as User;
            localStorage.setItem('impulsa_user', JSON.stringify(updated));
            return updated;
          });
        })
        .subscribe();
    }

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [refreshUser, user?.id]);

  return (
    <UserContext.Provider value={{ user, loading, error, refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
