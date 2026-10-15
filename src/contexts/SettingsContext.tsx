import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface SettingsContextType {
  settings: Record<string, any>;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  isMaintenanceMode: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Record<string, any>>(() => {
    try {
      const savedSettings = localStorage.getItem('impulsa_settings');
      return savedSettings ? JSON.parse(savedSettings) : {};
    } catch (e) {
      return {};
    }
  });
  
  // Only set loading to true initially if we have no cached settings
  // This prevents the UI from blocking on initial load if we already have the cache
  const [loading, setLoading] = useState(() => !localStorage.getItem('impulsa_settings'));

  const fetchSettings = async () => {
    console.log("SettingsContext: Iniciando fetchSettings...");
    try {
      const response = await fetch('/api/app-config?t=' + Date.now()).catch(err => {
        console.warn("Settings fetch error (network level):", err.message);
        throw new Error(`Error de red al obtener configuraciones: ${err.message}`);
      });

      console.log("Settings response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor (${response.status})`);
      }

      const data = await response.json();
      console.log("Settings fetched successfully:", data);
      localStorage.setItem('impulsa_settings', JSON.stringify(data));
      setSettings(data);
    } catch (error: any) {
      if (error?.message?.includes('Failed to fetch')) {
        console.warn('Advertencia (Red) al obtener configuraciones:', error.message);
      } else {
        console.error('Error fetching settings:', error);
      }
    } finally {
      console.log("SettingsContext: fetchSettings finalizado, loading=false");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Safety fallback: increased to 15s
    const safetyTimeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn("Settings safety timeout: forcing loading to false after 15s");
          return false;
        }
        return prev;
      });
    }, 15000);

    return () => clearTimeout(safetyTimeout);
  }, []);

  const isMaintenanceMode = settings.maintenance_mode === true;
  console.log("Maintenance mode check:", { isMaintenanceMode, settings });

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, isMaintenanceMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
