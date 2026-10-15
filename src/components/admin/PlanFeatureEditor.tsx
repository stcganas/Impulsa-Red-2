import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useFeatures } from '../../contexts/FeatureContext';
import { Save, Loader2 } from 'lucide-react';

export default function PlanFeatureEditor() {
  const { plans, features, planFeatures, refreshFeatures } = useFeatures();
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initialValues: Record<string, any> = {};
    planFeatures.forEach(pf => {
      initialValues[`${pf.plan_id}_${pf.feature_id}`] = JSON.stringify(pf.value);
    });
    setValues(initialValues);
  }, [planFeatures]);

  const handleChange = (planId: string, featureId: string, value: string) => {
    setValues(prev => ({
      ...prev,
      [`${planId}_${featureId}`]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [];
      for (const key in values) {
        const [plan_id, feature_id] = key.split('_');
        let parsedValue;
        try {
          parsedValue = JSON.parse(values[key]);
        } catch (e) {
          parsedValue = values[key];
        }
        
        updates.push({
          plan_id,
          feature_id,
          value: parsedValue
        });
      }

      if (updates.length === 0) {
        alert('No hay cambios para guardar');
        return;
      }

      // We use upsert to handle both inserts and updates
      const { error } = await supabase.from('plan_features').upsert(updates, { onConflict: 'plan_id,feature_id' });
      if (error) throw error;

      await refreshFeatures();
      alert('Configuración guardada con éxito');
    } catch (error) {
      console.error('Error saving plan features:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Matriz de Características por Plan</h3>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Guardar Cambios
        </button>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 dark:border-white/5">
              <th className="p-6 text-sm font-bold text-slate-400 uppercase tracking-widest">Característica</th>
              {plans.map(plan => (
                <th key={plan.id} className="p-6 text-sm font-bold text-slate-900 dark:text-white text-center">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map(feature => (
              <tr key={feature.id} className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                <td className="p-6">
                  <div className="font-bold text-slate-900 dark:text-white">{feature.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{feature.key}</div>
                </td>
                {plans.map(plan => {
                  const valKey = `${plan.id}_${feature.id}`;
                  const currentVal = values[valKey] !== undefined ? values[valKey] : JSON.stringify(feature.default_value);
                  
                  return (
                    <td key={plan.id} className="p-6">
                      <input 
                        type="text"
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-center focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        value={currentVal}
                        onChange={e => handleChange(plan.id, feature.id, e.target.value)}
                        placeholder={JSON.stringify(feature.default_value)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
