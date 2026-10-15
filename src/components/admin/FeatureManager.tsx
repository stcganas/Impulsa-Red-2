import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useFeatures } from '../../contexts/FeatureContext';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

export default function FeatureManager() {
  const { features, refreshFeatures } = useFeatures();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    default_value: ''
  });

  const handleEdit = (feature: any) => {
    setEditingId(feature.id);
    setFormData({
      key: feature.key,
      name: feature.name,
      description: feature.description || '',
      default_value: JSON.stringify(feature.default_value)
    });
  };

  const handleSave = async (id?: string) => {
    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(formData.default_value);
      } catch (e) {
        parsedValue = formData.default_value; // Fallback to string if not valid JSON
      }

      const payload = {
        key: formData.key,
        name: formData.name,
        description: formData.description,
        default_value: parsedValue
      };

      if (id) {
        const { error } = await supabase.from('features').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('features').insert(payload);
        if (error) throw error;
      }
      await refreshFeatures();
      setEditingId(null);
      setIsAdding(false);
      setFormData({ key: '', name: '', description: '', default_value: '' });
    } catch (error) {
      console.error('Error saving feature:', error);
      alert('Error al guardar la característica');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta característica?')) return;
    try {
      const { error } = await supabase.from('features').delete().eq('id', id);
      if (error) throw error;
      await refreshFeatures();
    } catch (error) {
      console.error('Error deleting feature:', error);
      alert('Error al eliminar la característica');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gestión de Características</h3>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Característica
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isAdding && (
          <div className="bg-white dark:bg-[#111] p-6 rounded-3xl border-2 border-blue-500 shadow-xl space-y-4">
            <input 
              type="text" 
              placeholder="Key Única (ej: max_referrals)"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
              value={formData.key}
              onChange={e => setFormData({...formData, key: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="Nombre"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="Valor por Defecto (JSON o String)"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
              value={formData.default_value}
              onChange={e => setFormData({...formData, default_value: e.target.value})}
            />
            <textarea 
              placeholder="Descripción"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
            <div className="flex gap-2">
              <button onClick={() => handleSave()} className="flex-1 bg-blue-600 text-white py-2 rounded-xl">Guardar</button>
              <button onClick={() => setIsAdding(false)} className="px-4 bg-slate-100 dark:bg-white/5 rounded-xl"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {features.map(feature => (
          <div key={feature.id} className="bg-white dark:bg-[#111] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
            {editingId === feature.id ? (
              <div className="space-y-4">
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
                  value={formData.key}
                  onChange={e => setFormData({...formData, key: e.target.value})}
                />
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2"
                  value={formData.default_value}
                  onChange={e => setFormData({...formData, default_value: e.target.value})}
                />
                <div className="flex gap-2">
                  <button onClick={() => handleSave(feature.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-xl flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Guardar</button>
                  <button onClick={() => setEditingId(null)} className="px-4 bg-slate-100 dark:bg-white/5 rounded-xl"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">{feature.name}</h4>
                    <code className="text-xs text-blue-600 font-mono">{feature.key}</code>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(feature)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(feature.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{feature.description}</p>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Default:</span>
                  <code className="text-xs bg-slate-100 dark:bg-white/5 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                    {JSON.stringify(feature.default_value)}
                  </code>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
