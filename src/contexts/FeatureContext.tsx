import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';

interface Feature {
  id: string;
  key: string;
  name: string;
  description: string;
  default_value: any;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  level: number;
  description: string;
}

interface PlanFeature {
  plan_id: string;
  feature_id: string;
  value: any;
}

interface FeatureContextType {
  plans: Plan[];
  features: Feature[];
  planFeatures: PlanFeature[];
  getUserFeature: (key: string) => any;
  loading: boolean;
  refreshFeatures: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export const FeatureProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [plans, setPlans] = useState<Plan[]>(() => {
    try {
      const saved = localStorage.getItem('impulsa_plans');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [features, setFeatures] = useState<Feature[]>(() => {
    try {
      const saved = localStorage.getItem('impulsa_features');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [planFeatures, setPlanFeatures] = useState<PlanFeature[]>(() => {
    try {
      const saved = localStorage.getItem('impulsa_plan_features');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [loading, setLoading] = useState(true);
  const featureCache = React.useRef<Record<string, any>>({});

  const refreshFeatures = useCallback(async () => {
    // If we have cached data, don't block with a loading spinner
    if (plans.length === 0) setLoading(true);
    
    try {
      const [plansRes, featuresRes, planFeaturesRes] = await Promise.all([
        supabase.from('plans').select('*').order('level', { ascending: true }),
        supabase.from('features').select('*'),
        supabase.from('plan_features').select('*')
      ]);

      if (plansRes.data) {
        setPlans(plansRes.data);
        localStorage.setItem('impulsa_plans', JSON.stringify(plansRes.data));
      }
      if (featuresRes.data) {
        setFeatures(featuresRes.data);
        localStorage.setItem('impulsa_features', JSON.stringify(featuresRes.data));
      }
      if (planFeaturesRes.data) {
        setPlanFeatures(planFeaturesRes.data);
        localStorage.setItem('impulsa_plan_features', JSON.stringify(planFeaturesRes.data));
      }
      
      // Clear cache on refresh
      featureCache.current = {};
    } catch (error: any) {
      if (error?.message?.includes('Failed to fetch')) {
        console.warn('Advertencia (Red/Supabase) al obtener características:', error.message);
      } else {
        console.error('Error fetching features:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [plans.length]);

  useEffect(() => {
    refreshFeatures();

    // Safety fallback: increased to 15s
    const safetyTimeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn("FeatureContext safety timeout: forcing loading to false after 15s");
          return false;
        }
        return prev;
      });
    }, 15000);

    return () => clearTimeout(safetyTimeout);
  }, [refreshFeatures]);

  // Clear cache when plan or features change
  useEffect(() => {
    featureCache.current = {};
  }, [planFeatures, user?.plan_id]);

  const getUserFeature = useCallback((key: string) => {
    if (featureCache.current[key] !== undefined) {
      return featureCache.current[key];
    }

    // If no user, return null or default if we can find it
    const feature = features.find(f => f.key === key);
    if (!feature) return null;

    if (!user) return feature.default_value;

    const userPlanId = user.plan_id || '00000000-0000-0000-0000-000000000000';
    const planFeature = planFeatures.find(pf => pf.plan_id === userPlanId && pf.feature_id === feature.id);

    const result = planFeature ? planFeature.value : feature.default_value;
    featureCache.current[key] = result;
    return result;
  }, [user, features, planFeatures]);

  return (
    <FeatureContext.Provider value={{ plans, features, planFeatures, getUserFeature, loading, refreshFeatures }}>
      {children}
    </FeatureContext.Provider>
  );
};

export const useFeatures = () => {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
};
