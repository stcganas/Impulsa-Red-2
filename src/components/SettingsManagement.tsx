import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { Loader2, CheckCircle, Image as ImageIcon, Upload, DollarSign, Percent, Settings as SettingsIcon, Zap } from 'lucide-react';

export default function SettingsManagement() {
  const { settings, refreshSettings } = useSettings();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Additional settings
  const [formData, setFormData] = useState({
    referral_percentage: 10,
    min_withdrawal: 50000,
    plan_price: 150000,
    maintenance_mode: false,
    double_xp_active: false
  });

  useEffect(() => {
    // Load existing settings into form
    setFormData({
      referral_percentage: settings.referral_percentage || 10,
      min_withdrawal: settings.min_withdrawal || 50000,
      plan_price: settings.plan_price || 150000,
      maintenance_mode: settings.maintenance_mode === true,
      double_xp_active: settings.double_xp_active === true
    });
  }, [settings]);

  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/png');
        setLogoPreview(dataUrl);
        setLogoFile(file);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updates = [];
      
      if (logoFile && logoPreview) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession) throw new Error("No session found");

        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentSession.access_token}`
          },
          body: JSON.stringify({
            bucket: 'app-assets',
            fileName,
            base64Data: logoPreview,
            contentType: logoFile.type
          })
        });

        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadResult.error || 'Error uploading logo');
          
        updates.push({ key: 'app_logo', value: uploadResult.publicUrl });
      }
      
      updates.push({ key: 'referral_percentage', value: formData.referral_percentage });
      updates.push({ key: 'min_withdrawal', value: formData.min_withdrawal });
      updates.push({ key: 'plan_price', value: formData.plan_price });
      updates.push({ key: 'maintenance_mode', value: formData.maintenance_mode });
      updates.push({ key: 'double_xp_active', value: formData.double_xp_active });

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

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
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error saving setting');
        }
      }

      alert('Configuración guardada con éxito');
      await refreshSettings();
      setLogoPreview(null); // Reset preview so it uses the actual setting
      setLogoFile(null);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración General</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Administra los ajustes globales de la plataforma.</p>
      </div>

      {/* Branding Settings */}
      <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-white">
            <ImageIcon className="w-5 h-5 text-emerald-500" />
            Logo de la Aplicación
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sube el logo que se mostrará en la barra de navegación y en la página de inicio.
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <p className="text-sm font-medium mb-2 text-slate-900 dark:text-white">Recomendaciones de imagen:</p>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-disc pl-4">
                  <li>Resolución recomendada: <strong className="text-slate-900 dark:text-white">400x120 píxeles</strong> (o proporción similar).</li>
                  <li>Formato: <strong className="text-slate-900 dark:text-white">PNG con fondo transparente</strong>.</li>
                  <li>Tamaño máximo: <strong className="text-slate-900 dark:text-white">2MB</strong>.</li>
                </ul>
              </div>
              
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/svg+xml"
                className="hidden"
                ref={fileInputRef}
                onChange={handleLogoUpload}
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-medium text-slate-700 dark:text-white"
              >
                <Upload className="w-4 h-4" />
                Seleccionar Imagen
              </button>
            </div>
            
            <div className="w-full md:w-64 shrink-0">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Vista Previa</p>
              <div className="h-32 bg-slate-50 dark:bg-[#0a0a0a] rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-center p-4 relative overflow-hidden group">
                {logoPreview || settings.app_logo ? (
                  <img 
                    src={logoPreview || settings.app_logo} 
                    alt="Logo Preview" 
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-slate-400 dark:text-slate-600 text-sm font-medium">Sin logo</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Settings */}
      <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-white">
            <SettingsIcon className="w-5 h-5 text-emerald-500" />
            Parámetros Financieros
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configura los valores globales para comisiones, retiros y planes.
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-500" />
                Porcentaje de Comisión Base (%)
              </label>
              <input 
                type="number" 
                min="0"
                max="100"
                value={formData.referral_percentage}
                onChange={(e) => setFormData({...formData, referral_percentage: Number(e.target.value)})}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Porcentaje que gana un usuario por invitar a otro.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Mínimo de Retiro (COP)
              </label>
              <input 
                type="number" 
                min="0"
                value={formData.min_withdrawal}
                onChange={(e) => setFormData({...formData, min_withdrawal: Number(e.target.value)})}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Monto mínimo que un usuario puede solicitar retirar.</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Precio del Plan Pro (COP)
              </label>
              <input 
                type="number" 
                min="0"
                value={formData.plan_price}
                onChange={(e) => setFormData({...formData, plan_price: Number(e.target.value)})}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white"
              />
              <p className="text-xs text-slate-500 mt-1">Costo de la suscripción a la plataforma.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-white">
            <Zap className="w-5 h-5 text-purple-500" />
            Eventos y Bonificaciones
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configura eventos temporales para incentivar a los usuarios.
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-500/5 rounded-2xl border border-purple-200 dark:border-purple-500/20">
            <div>
              <p className="font-bold text-purple-900 dark:text-purple-300">Evento de Doble XP (XP x2)</p>
              <p className="text-xs text-purple-700/70 dark:text-purple-400/70 mt-1">
                Al activar esto, todas las tareas otorgarán el doble de experiencia (XP). Ideal para fines de semana.
              </p>
            </div>
            <button 
              onClick={() => setFormData({...formData, double_xp_active: !formData.double_xp_active})}
              className={`w-14 h-7 rounded-full transition-all relative shrink-0 ${formData.double_xp_active ? 'bg-purple-500' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${formData.double_xp_active ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Payment Gateways */}
      <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-white">
            <DollarSign className="w-5 h-5 text-blue-500" />
            Integraciones de Pago (Próximamente)
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configura las pasarelas para automatizar compras de planes y retiros.
          </p>
        </div>
        
        <div className="p-6 space-y-4 opacity-75 grayscale pointer-events-none">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Stripe / Wompi</p>
              <p className="text-xs text-slate-500 mt-1">
                Automatiza la compra de planes y pagos con tarjeta.
              </p>
            </div>
            <button className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-lg text-sm font-bold">
              Configurar Keys
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">API de Retiros (Bancos/Crypto)</p>
              <p className="text-xs text-slate-500 mt-1">
                Automatiza el pago a los usuarios cuando soliciten retiro.
              </p>
            </div>
            <button className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-lg text-sm font-bold">
              Configurar Keys
            </button>
          </div>
        </div>
      </div>

      {/* System Status Settings */}
      <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-white">
            <SettingsIcon className="w-5 h-5 text-amber-500" />
            Estado del Sistema
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Controla la disponibilidad global de la plataforma.
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">Modo Mantenimiento</p>
              <p className="text-xs text-slate-500 mt-1">
                Si se activa, los usuarios no podrán acceder a la plataforma (excepto administradores).
              </p>
            </div>
            <button 
              onClick={() => setFormData({...formData, maintenance_mode: !formData.maintenance_mode})}
              className={`w-14 h-7 rounded-full transition-all relative ${formData.maintenance_mode ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${formData.maintenance_mode ? 'left-8' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSaveSettings}
          disabled={savingSettings}
          className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
          Guardar Toda la Configuración
        </button>
      </div>
    </div>
  );
}
