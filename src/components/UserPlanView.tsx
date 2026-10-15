import React from 'react';
import { useUser } from '../contexts/UserContext';
import { useFeatures } from '../contexts/FeatureContext';
import { Check, Shield, Zap, Crown, Star } from 'lucide-react';
import { motion } from 'motion/react';

export default function UserPlanView() {
  const { user } = useUser();
  const { plans, features, getUserFeature } = useFeatures();

  const currentPlan = plans.find(p => p.id === user?.plan_id) || 
                      plans.find(p => p.name.toLowerCase() === (user?.plan || '').toLowerCase()) ||
                      (user?.plan ? { id: 'custom', name: user.plan, level: 2, price: 0, description: 'Plan de usuario activo.' } : null);

  if (!currentPlan) return null;

  const getPlanIcon = (level: number) => {
    if (level >= 4) return <Crown className="w-8 h-8 text-amber-500" />;
    if (level >= 3) return <Star className="w-8 h-8 text-purple-500" />;
    if (level >= 2) return <Zap className="w-8 h-8 text-blue-500" />;
    return <Shield className="w-8 h-8 text-slate-400" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 p-8 shadow-sm"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center shadow-inner">
            {getPlanIcon(currentPlan.level)}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Plan {currentPlan.name}</h3>
            <p className="text-slate-500 dark:text-slate-400">{currentPlan.description}</p>
          </div>
        </div>
        <div className="px-6 py-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl font-bold border border-emerald-500/20 text-center">
          Plan Activo
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(feature => {
          const value = getUserFeature(feature.key);
          const isEnabled = value === true || (typeof value === 'number' && value > 0);
          
          return (
            <div 
              key={feature.id}
              className={`p-4 rounded-2xl border transition-all ${
                isEnabled 
                  ? "bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10" 
                  : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center ${
                  isEnabled ? "bg-emerald-500 text-white" : "bg-slate-300 dark:bg-slate-700 text-white"
                }`}>
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{feature.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{feature.description}</div>
                  {typeof value !== 'boolean' && (
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Valor: {value}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
