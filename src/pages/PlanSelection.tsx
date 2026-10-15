import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, ArrowRight, X, Upload, Loader2, DollarSign, CreditCard, Wallet } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { useSettings } from "../contexts/SettingsContext";
import { useNotifications } from "../contexts/NotificationContext";
import { supabase } from "../lib/supabase";

interface Plan {
  id: string;
  name: string;
  price: number;
  level: number;
  description: string;
  features: any[];
}

export default function PlanSelection() {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const { settings } = useSettings();
  const { broadcastActivity } = useNotifications();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select(`
          *,
          plan_features (
            value,
            features (
              key,
              name,
              description
            )
          )
        `)
        .order('price', { ascending: true });

      if (error) throw error;
      
      // Filter out the basic plan (price 0) from the selection if they already have it
      const availablePlans = data?.filter(p => p.price > 0) || [];
      setPlans(availablePlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const getPlanStyling = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('elite') || name.includes('élite')) {
      return {
        color: "bg-gradient-to-br from-amber-100 to-amber-200",
        textColor: "text-amber-900",
        buttonColor: "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50",
        isPremium: true,
        iconColor: "dark:text-amber-400",
        iconBg: "dark:from-amber-500/20 dark:to-amber-500/10"
      };
    }
    if (name.includes('pro')) {
      return {
        color: "bg-emerald-50",
        textColor: "text-emerald-900",
        buttonColor: "bg-emerald-600 text-white hover:bg-emerald-700",
        isPremium: false,
        iconColor: "dark:text-emerald-400",
        iconBg: "dark:bg-emerald-500/10"
      };
    }
    if (name.includes('avanzado')) {
      return {
        color: "bg-blue-50",
        textColor: "text-blue-900",
        buttonColor: "bg-blue-600 text-white hover:bg-blue-700",
        isPremium: false,
        iconColor: "dark:text-blue-400",
        iconBg: "dark:bg-blue-500/10"
      };
    }
    return {
      color: "bg-slate-100",
      textColor: "text-slate-800",
      buttonColor: "bg-slate-800 text-white hover:bg-slate-700",
      isPremium: false,
      iconColor: "dark:text-slate-400",
      iconBg: "dark:bg-slate-800"
    };
  };

  const handleSelectPlan = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    if (!user?.id) {
      navigate("/login");
      return;
    }

    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen del comprobante.');
      return;
    }

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPurchase = async () => {
    if (!selectedPlan || !receiptFile) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      // 1. Upload receipt
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      
      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          bucket: 'receipts',
          fileName,
          base64Data: receiptPreview,
          contentType: receiptFile.type
        })
      });

      const uploadResult = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploadResult.error || 'Error uploading receipt');

      const publicUrl = uploadResult.publicUrl;

      // 2. Call API
      const response = await fetch('/api/plans/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          planId: selectedPlan.id,
          receiptUrl: publicUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al procesar la compra");
      }

      alert("¡Comprobante enviado con éxito! Un administrador revisará tu pago pronto.");
      broadcastActivity('compró un plan');
      setIsModalOpen(false);
      navigate("/dashboard");
    } catch (error) {
      console.error("Error updating plan:", error);
      alert(error instanceof Error ? error.message : "Error al procesar la compra");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-12 transition-colors duration-300">
      {/* Payment Modal */}
      {isModalOpen && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#111] rounded-[32px] p-8 w-full max-w-lg shadow-2xl relative overflow-hidden"
          >
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-slate-400 dark:text-slate-600" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", getPlanStyling(selectedPlan.name).color, getPlanStyling(selectedPlan.name).iconBg)}>
                <CreditCard className={cn("w-8 h-8", getPlanStyling(selectedPlan.name).textColor, getPlanStyling(selectedPlan.name).iconColor)} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Pagar Plan {selectedPlan.name}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Monto a transferir: <span className="text-slate-900 dark:text-white font-bold">${selectedPlan.price.toLocaleString('es-CO')} COP</span></p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-6 mb-8 border border-slate-100 dark:border-white/10">
              <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Datos de Transferencia</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Banco:</span>
                  <span className="text-slate-900 dark:text-white font-bold">Bancolombia</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Tipo de cuenta:</span>
                  <span className="text-slate-900 dark:text-white font-bold">Ahorros</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Número:</span>
                  <span className="text-slate-900 dark:text-white font-bold">123-456789-01</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Titular:</span>
                  <span className="text-slate-900 dark:text-white font-bold">{settings.app_name || "ImpulsaRed"} S.A.S</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <button
                disabled={uploading}
                onClick={async () => {
                  if (!selectedPlan) return;
                  if (!window.confirm(`¿Seguro que deseas usar el saldo de tu billetera para pagar el plan ${selectedPlan.name} por $${selectedPlan.price.toLocaleString('es-CO')}?`)) return;

                  setUploading(true);
                  try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) throw new Error("No session found");

                    const response = await fetch('/api/plans/purchase', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                      },
                      body: JSON.stringify({ 
                        planId: selectedPlan.id,
                        payWithBalance: true
                      })
                    });

                    const data = await response.json();
                    
                    if (!response.ok) {
                      throw new Error(data.error || "Error al procesar la compra");
                    }

                    alert("¡Plan adquirido con éxito usando el saldo de tu billetera!");
                    broadcastActivity('activó un nuevo plan');
                    await refreshUser();
                    setIsModalOpen(false);
                    navigate("/dashboard");
                  } catch (error: any) {
                    alert(error.message);
                  } finally {
                    setUploading(false);
                  }
                }}
                className={cn(
                  "w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                  "bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Wallet className="w-5 h-5" />
                Pagar con Saldo Interno
              </button>
            </div>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 dark:text-slate-500 font-medium text-sm">O transferencia bancaria</span>
              <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
            </div>

            <div className="space-y-4 mt-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Sube tu comprobante de pago:</p>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />

              {!receiptPreview ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-blue-400 dark:hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-500/5 transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
                    <Upload className="w-6 h-6 text-slate-400 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                  </div>
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">Haz clic para subir imagen</span>
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 aspect-video bg-slate-100 dark:bg-white/5">
                  <img src={receiptPreview} alt="Receipt Preview" className="w-full h-full object-contain" />
                  <button 
                    onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                onClick={handleSubmitPurchase}
                disabled={!receiptFile || uploading}
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Enviar Comprobante</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="bg-slate-900 dark:bg-[#111] text-white pt-16 pb-24 px-6 rounded-b-[40px] shadow-xl relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-[-50%] right-[-20%] w-[80%] h-[150%] bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-3 tracking-tight">
            Elige tu plan
          </h1>
          <p className="text-slate-300 dark:text-slate-400 text-lg leading-relaxed">
            Selecciona el punto de partida para tu crecimiento financiero. Todos
            los planes llegan al 70% en el Nivel 100.
          </p>
        </div>
      </div>

      <div className="px-6 -mt-16 space-y-6 relative z-20">
        {loadingPlans ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : plans.map((plan) => {
          const style = getPlanStyling(plan.name);
          const baseCommission = plan.plan_features?.find((f: any) => f.features?.key === 'commission_level_1')?.value || "0";
          const increment = plan.plan_features?.find((f: any) => f.features?.key === 'commission_increment')?.value || "0";
          
          return (
          <div
            key={plan.id}
            className={cn(
              "rounded-3xl p-6 shadow-xl transition-transform active:scale-[0.98]",
              style.color,
              style.isPremium
                ? "border-2 border-amber-300 dark:border-amber-500/30 shadow-amber-500/20 dark:shadow-amber-500/5"
                : "border border-white/50 dark:border-white/5 shadow-slate-200/50 dark:shadow-black/20",
            )}
          >
            {style.isPremium && (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm uppercase tracking-wider mb-4">
                <Crown className="w-5 h-5" />
                <span>Recomendado</span>
              </div>
            )}

            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className={cn("text-2xl font-bold mb-1", style.textColor)}>
                  {plan.name}
                </h2>
                <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  ${plan.price.toLocaleString('es-CO')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Comisión Base
                </div>
                <div className={cn("text-3xl font-black", style.textColor)}>
                  {Number(baseCommission) * 100}%
                </div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-black/20 rounded-2xl p-4 mb-6 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">
                  Incremento por nivel
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  +{Number(increment) * 100}%
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 mb-1 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    style.isPremium ? "bg-amber-500" : "bg-blue-500",
                  )}
                  style={{ width: `${Number(baseCommission) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-500 font-medium">
                <span>Nivel 1: {Number(baseCommission) * 100}%</span>
                <span>Nivel 100: 70%</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.description && (
                <li className="flex items-start gap-3">
                  <div className={cn("mt-0.5 rounded-full p-0.5", style.isPremium ? "bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400")}>
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium leading-tight">
                    {plan.description}
                  </span>
                </li>
              )}
              {plan.plan_features?.map((pf: any, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 rounded-full p-0.5",
                      style.isPremium
                        ? "bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                        : "bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400",
                    )}
                  >
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium leading-tight">
                    {pf.features?.name}: {pf.value === 'true' ? 'Sí' : pf.value === 'false' ? 'No' : pf.value}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(plan.id)}
              className={cn(
                "w-full py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2",
                style.buttonColor
              )}
            >
              <span>Elegir {plan.name}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )})}
      </div>
    </div>
  );
}
