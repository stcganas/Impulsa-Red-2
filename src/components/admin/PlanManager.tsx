import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useFeatures } from '../../contexts/FeatureContext';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function PlanManager() {
  const { plans, refreshFeatures } = useFeatures();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    level: 1,
    description: ''
  });

  const handleEdit = (plan: any) => {
    setEditingId(plan.id);
    setFormData({
      name: plan.name,
      price: plan.price,
      level: plan.level,
      description: plan.description || ''
    });
  };

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        const { error } = await supabase.from('plans').update(formData).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('plans').insert(formData);
        if (error) throw error;
      }
      await refreshFeatures();
      setEditingId(null);
      setIsAdding(false);
      setFormData({ name: '', price: 0, level: 1, description: '' });
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Error al guardar el plan');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este plan?')) return;
    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
      await refreshFeatures();
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Error al eliminar el plan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gestión de Planes</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdding && (
          <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border-2 border-emerald-500 shadow-xl space-y-4">
            <input 
              type="text" 
              placeholder="Nombre del Plan"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="Precio"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
              value={formData.price}
              onChange={e => setFormData({...formData, price: Number(e.target.value)})}
            />
            <input 
              type="number" 
              placeholder="Nivel"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
              value={formData.level}
              onChange={e => setFormData({...formData, level: Number(e.target.value)})}
            />
            <textarea 
              placeholder="Descripción"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
            <div className="flex gap-2">
              <button onClick={() => handleSave()} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl">Guardar</button>
              <button onClick={() => setIsAdding(false)} className="px-4 bg-slate-100 dark:bg-white/5 rounded-xl"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {plans.map(plan => (
          <div key={plan.id} className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
            {editingId === plan.id ? (
              <div className="space-y-4">
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <input 
                  type="number" 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                />
                <input 
                  type="number" 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
                  value={formData.level}
                  onChange={e => setFormData({...formData, level: Number(e.target.value)})}
                />
                <textarea 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
                <div className="flex gap-2">
                  <button onClick={() => handleSave(plan.id)} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Guardar</button>
                  <button onClick={() => setEditingId(null)} className="px-4 bg-slate-100 dark:bg-white/5 rounded-xl"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">{plan.name}</h4>
                    <p className="text-emerald-600 font-bold">${plan.price.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(plan)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(plan.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
                <div className="pt-2">
                  <span className="text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-slate-500">Nivel {plan.level}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
