import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';
import { useSettings } from './SettingsContext';
import { toast } from 'sonner';
import OneSignal from 'react-onesignal';

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}

interface SocialActivity {
  id: string;
  user: string;
  avatar?: string;
  action: string;
  time: string;
}

interface ActivityConfig {
  enabled: boolean;
  interval: number;
  maxVisible: number;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface NotificationContextType {
  // System Notifications
  notifications: SystemNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  
  // Social/Live Activities
  liveActivities: SocialActivity[];
  broadcastActivity: (action: string) => void;
  removeLiveNotification: (id: string) => void;
  
  // Permission (Legacy/Compatibility)
  permission: NotificationPermission;
  requestPermission: () => Promise<void>;
  token: string | null;
  tokenError: string | null;
  
  // Legacy compatibility for LiveActivityNotifications component
  config: ActivityConfig;
  updateConfig: (patch: Partial<ActivityConfig>) => void;
  liveNotifications: SocialActivity[];
}

// ... (rest of imports)

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const defaultActivityConfig: ActivityConfig = {
  enabled: true,
  interval: 15,
  maxVisible: 3,
  position: 'bottom-left'
};

const ACTIONS = [
  'acaba de unirse',
  'activó un nuevo plan',
  'completó su primera tarea',
  'invitó a 3 personas',
  'retiró ganancias'
];

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { settings, refreshSettings } = useSettings();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [localConfig, setLocalConfig] = useState<ActivityConfig | null>(null);

  const config = React.useMemo(() => localConfig || {
    enabled: settings?.activity_enabled !== undefined ? settings.activity_enabled : true,
    interval: settings?.activity_interval !== undefined ? settings.activity_interval : 15,
    maxVisible: settings?.activity_max_visible !== undefined ? settings.activity_max_visible : 3,
    position: settings?.activity_position !== undefined ? settings.activity_position : 'bottom-left'
  }, [settings, localConfig]);

  const [liveActivities, setLiveActivities] = useState<SocialActivity[]>([]);
  const activityQueueRef = React.useRef<SocialActivity[]>([]);
  const [simulatedUsers, setSimulatedUsers] = useState<any[]>([]);

  // Seed simulated users and fetch them
  useEffect(() => {
    async function initSimulatedUsers() {
      const { data: existing, error } = await supabase.from('simulated_users').select('*');
      
      if (error || (existing && existing.length === 0)) {
        // Seed if empty
        const names = [
          'Carlos M.', 'Ana G.', 'Luis P.', 'María R.', 'Javier T.', 'Elena F.', 'Roberto S.', 'Diego H.', 'Sofia C.', 'Mateo V.',
          'Valentina L.', 'Andrés B.', 'Camila D.', 'Pedro P.', 'Laura M.', 'Carmen T.', 'Ricardo G.', 'Isabel W.', 'Fernando K.', 'Monica J.'
        ];
        
        const newUsers = names.map(name => ({
          name,
          avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(name)}`
        }));
        
        await supabase.from('simulated_users').insert(newUsers);
        setSimulatedUsers(newUsers);
      } else {
        setSimulatedUsers(existing || []);
      }
    }
    
    initSimulatedUsers();
  }, []);

  // Sync local config with settings if settings change
  useEffect(() => {
    setLocalConfig(null);
  }, [settings]);

  const updateConfig = async (patch: Partial<ActivityConfig>) => {
    // Optimistic UI update
    setLocalConfig({ ...config, ...patch });
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const updates = [];
      if ('enabled' in patch) updates.push({ key: 'activity_enabled', value: patch.enabled });
      if ('interval' in patch) updates.push({ key: 'activity_interval', value: patch.interval });
      if ('maxVisible' in patch) updates.push({ key: 'activity_max_visible', value: patch.maxVisible });
      if ('position' in patch) updates.push({ key: 'activity_position', value: patch.position });

      for (const update of updates) {
        const response = await fetch('/api/admin/app-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(update)
        });
        
        if (!response.ok) {
          throw new Error('Failed to update config on server');
        }
      }
      
      await refreshSettings();
      toast.success("Configuración de notificaciones guardada exitosamente.");
    } catch(err) {
      console.error("Error updates activity config:", err);
      // Revert on error
      setLocalConfig(null);
      toast.error("Error al guardar la configuración.");
    }
  };
// ... rest of the file

  // Listen to real activity broadcasts
  useEffect(() => {
    const channel = supabase.channel('public_activity', {
      config: {
        broadcast: { ack: false },
      },
    });

    channel.on('broadcast', { event: 'user_action' }, (payload) => {
      if (payload.payload) {
        activityQueueRef.current.push(payload.payload as SocialActivity);
      }
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [tick, setTick] = useState(0);
  const lastProcessedTickRef = React.useRef(-1);

  // Frequency ticker
  useEffect(() => {
    if (!config.enabled) {
      setTick(0);
      lastProcessedTickRef.current = -1;
      setLiveActivities([]);
      return;
    }

    const intervalId = setInterval(() => {
      setTick(t => t + 1);
    }, config.interval * 1000);

    // Initial tick after a short delay
    const initialTimeout = setTimeout(() => setTick(t => t + 1), 2000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(initialTimeout);
    };
  }, [config.enabled, config.interval]);

  // Process activity on each tick
  useEffect(() => {
    if (tick === 0 || !config.enabled || tick === lastProcessedTickRef.current) return;
    lastProcessedTickRef.current = tick;

    let nextActivity: SocialActivity;

    if (activityQueueRef.current.length > 0) {
      nextActivity = activityQueueRef.current.shift()!;
    } else {
      // Simulated fallback
      if (simulatedUsers.length === 0) return;
      const randomUser = simulatedUsers[Math.floor(Math.random() * simulatedUsers.length)];
      const randomAction = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
      const uniqueId = `sim-${crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now()}-${tick}`;
      nextActivity = {
        id: uniqueId,
        user: randomUser.name,
        avatar: randomUser.avatar_url,
        action: randomAction,
        time: 'hace unos momentos'
      };
    }

    setLiveActivities(current => {
      // Strict deduplication
      if (current.some(a => a.id === nextActivity.id)) return current;
      return [nextActivity, ...current].slice(0, config.maxVisible);
    });
    
    // Auto-hide
    const hideTimeout = setTimeout(() => {
      setLiveActivities(curr => curr.filter(a => a.id !== nextActivity.id));
    }, Math.max(5000, (config.interval * 1000) - 1000));

    return () => clearTimeout(hideTimeout);
  }, [tick, config.enabled, config.maxVisible, config.interval, simulatedUsers]);

  const removeLiveNotification = useCallback((id: string) => {
    setLiveActivities(curr => curr.filter(a => a.id !== id));
  }, []);

  const broadcastActivity = useCallback((action: string) => {
    if (!user) return;
    const userName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'Un usuario';
    const payload: SocialActivity = {
      id: `real-${crypto.randomUUID?.() || Math.random().toString(36).substring(2) + Date.now()}`,
      user: userName,
      action,
      time: 'justo ahora'
    };
    
    // Add to local queue immediately
    activityQueueRef.current.push(payload);
    
    // Broadcast to others
    const channel = supabase.channel('public_activity');
    channel.send({
      type: 'broadcast',
      event: 'user_action',
      payload
    }).catch(console.error);
  }, [user]);

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isOneSignalInitialized, setIsOneSignalInitialized] = useState(false);

  // Initialize OneSignal
  useEffect(() => {
    const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID;
    if (!oneSignalAppId) return;

    // Direct check if already initialized to avoid "SDK already initialized" error
    if (window.OneSignal && (window as any).OneSignal.initialized) {
      setIsOneSignalInitialized(true);
      setPermission(Notification.permission);
      return;
    }

    OneSignal.init({
      appId: oneSignalAppId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: 'OneSignalSDKWorker.js',
    }).then(() => {
      console.log('OneSignal Initialized');
      setIsOneSignalInitialized(true);
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
    }).catch(err => {
      // Gracefully handle domain, timeout, or browser/iframe constraints
      const errMsg = err?.message || String(err || '');
      if (errMsg.includes('already initialized')) {
        setIsOneSignalInitialized(true);
      } else {
        console.warn('OneSignal Init Notice (non-fatal):', errMsg);
      }
    });
  }, []);

  // Sync OneSignal with User ID
  useEffect(() => {
    if (!isOneSignalInitialized) return;

    const syncUser = async () => {
      try {
        // Double check if script is loaded and SDK is initialized
        if (typeof window === 'undefined' || !window.OneSignal) return;
        
        const os = window.OneSignal as any;
        
        if (user?.id) {
          // Check if login method exists and SDK is initialized
          if (os.login && typeof os.login === 'function') {
            await OneSignal.login(user.id);
            console.log('OneSignal User Synced (Login):', user.id);
          } else if ((os as any).setExternalUserId) {
            await (OneSignal as any).setExternalUserId(user.id);
            console.log('OneSignal User Synced (ExternalID):', user.id);
          }
        } else {
          if (os.logout && typeof os.logout === 'function') {
            await OneSignal.logout();
          }
        }
      } catch (err) {
        // Silence minified property errors that are common in dev during reloads
        console.warn('OneSignal Sync Warning:', err);
      }
    };

    syncUser();
  }, [user?.id, isOneSignalInitialized]);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notification history:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchHistory();

      // Subscribe to Realtime personal notifications
      const systemSub = supabase
        .channel('personal_notifs')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const newNotif = payload.new as SystemNotification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast(newNotif.title, {
            description: newNotif.message,
            duration: 5000,
            action: {
              label: 'Ver',
              onClick: () => window.location.href = '/notifications'
            }
          });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(systemSub);
      };
    }
  }, [user?.id, fetchHistory]);

  const markAsRead = async (id: string) => {
    // Optimistic local state update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) {
        console.warn('Notice marking as read in database:', error.message || error);
      }
    } catch (error) {
      console.warn('Network issue marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    // Optimistic local state update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.warn('Notice marking all as read in database:', error.message || error);
      }
    } catch (error) {
      console.warn('Network issue marking all as read:', error);
    }
  };

  const requestPermission = async () => {
    try {
      await OneSignal.Slidedown.promptPush();
      setPermission(Notification.permission);
    } catch (err) {
      console.error('Error requesting permission:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      markAsRead, 
      markAllAsRead,
      liveActivities,
      permission,
      requestPermission,
      token,
      tokenError,
      config,
      updateConfig,
      broadcastActivity,
      removeLiveNotification,
      liveNotifications: liveActivities
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
