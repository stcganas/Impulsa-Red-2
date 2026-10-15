import React from 'react';
import { useFeatures } from '../contexts/FeatureContext';
import { Check, X, Shield, Zap, Crown, Star } from 'lucide-react';

export default function PlanComparison() {
  const { plans, features, planFeatures } = useFeatures();

  const getPlanFeatureValue = (planId: string, featureId: string, defaultValue: any) => {
    const pf = planFeatures.find(pf => pf.plan_id === planId && pf.feature_id === featureId);
    return pf ? pf.value : defaultValue;
  };

  const renderValue = (value: any) => {
    if (value === true) return <Check className="w-5 h-5 text-emerald-500 mx-auto" />;
    if (value === false) return <X className="w-5 h-5 text-red-500 mx-auto" />;
    return <span className="font-bold text-slate-900 dark:text-white">{value}</span>;
  };

  const getPlanIcon = (level: number) => {
    if (level >= 4) return <Crown className="w-5 h-5 text-amber-500" />;
    if (level >= 3) return <Star className="w-5 h-5 text-purple-500" />;
    if (level >= 2) return <Zap className="w-5 h-5 text-blue-500" />;
    return <Shield className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/5">
              <th className="p-6 text-left text-sm font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 dark:bg-white/2">
                Característica
              </th>
              {plans.map(plan => (
                <th key={plan.id} className="p-6 min-w-[150px]">
                  <div className="flex flex-col items-center gap-2">
                    {getPlanIcon(plan.level)}
                    <div className="font-bold text-slate-900 dark:text-white">{plan.name}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      ${plan.price}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map(feature => (
              <tr key={feature.id} className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                <td className="p-6 text-left">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{feature.name}</div>
                  <div className="text-[10px] text-slate-400">{feature.description}</div>
                </td>
                {plans.map(plan => (
                  <td key={plan.id} className="p-6">
                    {renderValue(getPlanFeatureValue(plan.id, feature.id, feature.default_value))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
