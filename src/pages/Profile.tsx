import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Settings,
  BookOpen,
  Crown,
  ChevronRight,
  LogOut,
  ShieldCheck,
  Shield,
  Wallet,
  Sparkles,
  Edit2,
  X,
  Phone,
  MapPin,
  Loader2,
  Moon,
  Sun,
  ArrowLeft,
  FileText,
  Upload,
  Camera
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";

import { TaskEngine } from "../utils/TaskEngine";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useUser();
  const { theme, toggleTheme } = useTheme();
  const { permission, requestPermission } = useNotifications();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    birth_date: user?.birth_date || "",
    neighborhood: user?.neighborhood || "",
    nequi_number: user?.nequi_number || ""
  });

  // Triplet date state
  const initialBirthDate = user?.birth_date ? new Date(user.birth_date) : null;
  const [dateTriplet, setDateTriplet] = useState({
    day: initialBirthDate ? initialBirthDate.getUTCDate().toString() : "",
    month: initialBirthDate ? (initialBirthDate.getUTCMonth() + 1).toString() : "",
    year: initialBirthDate ? initialBirthDate.getUTCFullYear().toString() : ""
  });

  // Update formData when triplet changes
  React.useEffect(() => {
    if (dateTriplet.day && dateTriplet.month && dateTriplet.year) {
      const formattedDate = `${dateTriplet.year}-${dateTriplet.month.padStart(2, '0')}-${dateTriplet.day.padStart(2, '0')}`;
      setFormData(prev => ({ ...prev, birth_date: formattedDate }));
    }
  }, [dateTriplet]);

  // Constants for date selection
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" }
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  // Calculate age if birth_date exists
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(formData.birth_date);

  // Profile completion progress
  const requiredFields = ['name', 'phone', 'address', 'birth_date', 'neighborhood', 'avatar_url', 'document_url', 'document_back_url'];
  const filledRequiredCount = requiredFields.filter(f => {
    if (f === 'avatar_url') return !!user?.avatar_url;
    if (f === 'document_url') return !!user?.document_url;
    if (f === 'document_back_url') return !!user?.document_back_url;
    return !!formData[f as keyof typeof formData];
  }).length;
  const completionPercentage = Math.round((filledRequiredCount / requiredFields.length) * 100);

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  type UploadActionTypes = 'front-upload' | 'front-capture' | 'back-upload' | 'back-capture';
  const [uploadingAction, setUploadingAction] = React.useState<UploadActionTypes | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const docInputRef = React.useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success("Contraseña actualizada con éxito");
      setIsChangingPassword(false);
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Error al cambiar contraseña");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 2MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session");

        const response = await fetch(`/api/upload-image?t=${Date.now()}`, {
          method: 'POST',
          cache: 'no-cache',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            bucket: 'avatars',
            fileName,
            base64Data,
            contentType: file.type
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error uploading image');

        const { error: updateError } = await supabase
          .from('users')
          .update({ avatar_url: result.publicUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;

        await refreshUser();
        setUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Error al subir la foto de perfil");
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check required fields
    const missing = requiredFields.filter(f => {
      if (f === 'avatar_url') return !user?.avatar_url;
      if (f === 'document_url') return !user?.document_url;
      if (f === 'document_back_url') return !user?.document_back_url;
      return !formData[f as keyof typeof formData];
    });
    
    if (missing.length > 0) {
      toast.error("Por favor completa todos los campos obligatorios y sube los documentos requeridos");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          birth_date: formData.birth_date,
          neighborhood: formData.neighborhood,
          nequi_number: formData.nequi_number
        })
        .eq('id', user.id);

      if (error) throw error;
      
      // Trigger PROFILE_COMPLETED event if all required fields are filled
      if (filledRequiredCount === requiredFields.length) {
        await TaskEngine.triggerEvent('PROFILE_COMPLETED', 1, {
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          birth_date: formData.birth_date,
          neighborhood: formData.neighborhood,
          age: age
        });
        toast.success("¡Tarea inteligente completada: Perfil actualizado!");
      }

      await refreshUser();
      setIsEditing(false);
      toast.success("Perfil actualizado con éxito");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>, action: UploadActionTypes) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen válida.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5MB.');
      return;
    }

    const side = action.startsWith('front') ? 'front' : 'back';
    setUploadingAction(action);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result as string;
        const fileExt = file.name.split('.').pop() || 'jpg';
        const side = action.startsWith('front') ? 'front' : 'back';
        const fileName = `user-documents/${user.id}-${side}-${Date.now()}.${fileExt}`;
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No se pudo obtener la sesión de usuario");

        // Force cache: 'no-cache' and add a timestamp to avoid any internal redirects or caching
        const response = await fetch(`/api/upload-image?t=${Date.now()}`, {
          method: 'POST',
          cache: 'no-cache',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: JSON.stringify({
            bucket: 'avatars',
            fileName,
            base64Data,
            contentType: file.type
          })
        });

        if (!response.ok) {
          const status = response.status;
          let errorMessage = `Error ${status}`;
          
          try {
            const result = await response.json();
            errorMessage = `${errorMessage}: ${result.error || result.details || 'Error al subir el documento'}`;
          } catch (e) {
            errorMessage = `${errorMessage}: Error de red o servidor no disponible.`;
          }
          throw new Error(errorMessage);
        }

        const result = await response.json();
        const column = side === 'front' ? 'document_url' : 'document_back_url';
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ [column]: result.publicUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;
        
        await refreshUser();
        toast.success(`${side === 'front' ? 'Frente' : 'Dorso'} del documento cargado correctamente`);
      } catch (error: any) {
        console.error('Error uploading document:', error);
        let errorMessage = "Error desconocido al cargar el documento";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object') {
          errorMessage = error.message || error.error || JSON.stringify(error);
        }
        toast.error(errorMessage);
      } finally {
        setUploadingAction(null);
      }
    };
    reader.onerror = () => {
      toast.error("Error al leer el archivo");
      setUploadingAction(null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24 relative overflow-hidden transition-colors duration-300">
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center p-6 pb-4 border-b border-slate-100 dark:border-white/5 shrink-0">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Editar Perfil</h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-3 mb-4">
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2">
                      <Shield className="w-3 h-3" />
                      IMPORTANTE: Es obligatorio subir una foto de perfil real y documento de identidad para validar tu cuenta.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500" />
                        Documento de Identidad (Obligatorio) *
                      </label>
                      
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl mb-4 border border-blue-100 dark:border-blue-800/30">
                        <ul className="text-[10px] text-blue-700 dark:text-blue-300 space-y-1 font-medium">
                          <li className="flex items-center gap-1.5">• Foto nítida y sin reflejos de luz</li>
                          <li className="flex items-center gap-1.5">• Texto y números totalmente legibles</li>
                          <li className="flex items-center gap-1.5">• Documento centrado y bien iluminado</li>
                          <li className="flex items-center gap-1.5">• Subir ambas caras (Frente y Reverso)</li>
                        </ul>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {/* FRONT SIDE */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter text-center">Cara Frontal</p>
                          {user.document_url ? (
                            <div className="relative group aspect-[3/2]">
                              <img 
                                src={user.document_url} 
                                alt="Frente" 
                                className="w-full h-full object-cover rounded-xl border border-slate-200 dark:border-white/10"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e: any) => handleUploadDocument(e, 'front-upload');
                                  input.click();
                                }}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-[10px] font-bold"
                              >
                                Reemplazar
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                disabled={uploadingAction !== null}
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e: any) => handleUploadDocument(e, 'front-upload');
                                  input.click();
                                }}
                                className="aspect-[3/2] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-500 transition-colors text-slate-400"
                              >
                                {uploadingAction === 'front-upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-5 h-5" />}
                                <span className="text-[9px] font-bold uppercase tracking-tighter">Subir Frente</span>
                              </button>
                              <button
                                type="button"
                                disabled={uploadingAction !== null}
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.capture = 'environment';
                                  input.onchange = (e: any) => handleUploadDocument(e, 'front-capture');
                                  input.click();
                                }}
                                className="py-2 bg-slate-100 dark:bg-white/5 rounded-lg flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-colors"
                              >
                                {uploadingAction === 'front-capture' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                                <span className="text-[9px] font-bold uppercase">Capturar</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* BACK SIDE */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter text-center">Cara Reverso</p>
                          {user.document_back_url ? (
                            <div className="relative group aspect-[3/2]">
                              <img 
                                src={user.document_back_url} 
                                alt="Dorso" 
                                className="w-full h-full object-cover rounded-xl border border-slate-200 dark:border-white/10"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e: any) => handleUploadDocument(e, 'back-upload');
                                  input.click();
                                }}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white text-[10px] font-bold"
                              >
                                Reemplazar
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                disabled={uploadingAction !== null}
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.onchange = (e: any) => handleUploadDocument(e, 'back-upload');
                                  input.click();
                                }}
                                className="aspect-[3/2] border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-500 transition-colors text-slate-400"
                              >
                                {uploadingAction === 'back-upload' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-5 h-5" />}
                                <span className="text-[9px] font-bold uppercase tracking-tighter">Subir Reverso</span>
                              </button>
                              <button
                                type="button"
                                disabled={uploadingAction !== null}
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = 'image/*';
                                  input.capture = 'environment';
                                  input.onchange = (e: any) => handleUploadDocument(e, 'back-capture');
                                  input.click();
                                }}
                                className="py-2 bg-slate-100 dark:bg-white/5 rounded-lg flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 transition-colors"
                              >
                                {uploadingAction === 'back-capture' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                                <span className="text-[9px] font-bold uppercase">Capturar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nombre Completo *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
                        <input
                          type="text"
                          value={formData.name}
                          required
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                          placeholder="Nombre y Apellidos"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Fecha de Nacimiento *</label>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={dateTriplet.day}
                          required
                          onChange={(e) => setDateTriplet({ ...dateTriplet, day: e.target.value })}
                          className="w-full px-3 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                        >
                          <option value="">Día</option>
                          {days.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select
                          value={dateTriplet.month}
                          required
                          onChange={(e) => setDateTriplet({ ...dateTriplet, month: e.target.value })}
                          className="w-full px-3 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                        >
                          <option value="">Mes</option>
                          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <select
                          value={dateTriplet.year}
                          required
                          onChange={(e) => setDateTriplet({ ...dateTriplet, year: e.target.value })}
                          className="w-full px-3 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                        >
                          <option value="">Año</option>
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      {age !== null && (
                        <p className="text-[10px] text-slate-500 mt-1 ml-1 font-bold">Edad: {age} años</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Teléfono *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
                        <input
                          type="tel"
                          value={formData.phone}
                          required
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                          placeholder="+57 300 000 0000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Número Nequi (Opcional)</label>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
                        <input
                          type="text"
                          value={formData.nequi_number}
                          onChange={(e) => setFormData({ ...formData, nequi_number: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                          placeholder="Número de celular"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Dirección Residencial *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
                      <input
                        type="text"
                        value={formData.address}
                        required
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                        placeholder="Ej: Calle 50 #10-20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Barrio *</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
                      <input
                        type="text"
                        value={formData.neighborhood}
                        required
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                        placeholder="Nombre del barrio"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isChangingPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#111] rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Cambiar Contraseña</h3>
                <button 
                  onClick={() => setIsChangingPassword(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Confirmar Contraseña</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900 dark:text-white"
                    placeholder="Repite la contraseña"
                    minLength={6}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 rounded-xl bg-slate-900 dark:bg-blue-600 text-white font-bold shadow-lg shadow-slate-200 dark:shadow-blue-500/20 hover:bg-slate-800 dark:hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Actualizar Contraseña"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-32 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {user.role === 'admin' && (
              <button 
                onClick={() => navigate("/admin")}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                title="Volver al Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </button>
            )}
            <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
          </div>
          <button 
            onClick={() => setIsEditing(true)}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <Edit2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-6 -mt-24 relative z-20 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-white/5 text-center"
        >
          <div className="relative inline-block mb-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarUpload} 
              className="hidden" 
              accept="image/*" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="relative group cursor-pointer"
            >
              {user.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name} 
                  className="w-24 h-24 rounded-full border-4 border-white dark:border-[#111] shadow-lg object-cover group-hover:opacity-75 transition-opacity"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-500/10 border-4 border-white dark:border-[#111] shadow-lg flex items-center justify-center text-blue-600 dark:text-blue-400 text-3xl font-black group-hover:bg-blue-200 dark:group-hover:bg-blue-500/20 transition-colors">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Edit2 className="w-8 h-8 text-white drop-shadow-md" />
                )}
              </div>
            </button>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-2 uppercase tracking-tighter animate-pulse">
              Requerido: Sube tu foto real (no avatar)
            </p>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 rounded-full border-2 border-white dark:border-[#111] flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            {user.name}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">{user.email}</p>
          
          {completionPercentage < 100 && (
            <div className="mb-6 px-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Completa tu perfil</span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{completionPercentage}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercentage}%` }}
                  className="h-full bg-amber-500 rounded-full"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Completa todos los datos para activar todas las funciones del sistema.</p>
            </div>
          )}
          
          {(user.phone || user.address || user.neighborhood) && (
            <div className="flex flex-col items-center gap-1 mb-6 text-sm text-slate-400 dark:text-slate-500">
              {user.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.phone}</span>}
              {(user.address || user.neighborhood) && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {user.address}{user.neighborhood ? `, ${user.neighborhood}` : ''}
                </span>
              )}
              {user.birth_date && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" /> {age} años
                </span>
              )}
            </div>
          )}
          {!user.phone && !user.address && <div className="mb-6" />}

          <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-white/5 rounded-2xl p-4 mb-6">
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Plan
              </p>
              <p className="font-black text-slate-900 dark:text-white">{user.plan}</p>
            </div>
            <div className="border-x border-slate-200 dark:border-white/10">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Nivel
              </p>
              <p className="font-black text-slate-900 dark:text-white">{user.level}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Comisión
              </p>
              <p className="font-black text-emerald-600 dark:text-emerald-400">
                {user.percentage}%
              </p>
            </div>
          </div>

          {/* Gamification Stats */}
          <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-5 mb-6 text-left border border-slate-100 dark:border-white/5">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Progreso y Logros
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-1">🔥</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Racha Actual</p>
                <p className="font-black text-slate-900 dark:text-white text-lg">{user.current_streak || 0} Días</p>
              </div>
              <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-1">⚡</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mejor Racha</p>
                <p className="font-black text-slate-900 dark:text-white text-lg">{user.longest_streak || 0} Días</p>
              </div>
            </div>

            {user.badges && user.badges.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Insignias Desbloqueadas</p>
                <div className="flex flex-wrap gap-2">
                  {user.badges.map((badge: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-[#1a1a1a] px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                      <span className="text-xl">{badge.icon}</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{badge.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {user.role !== 'admin' && user.plan !== 'Élite' && (
            <button 
              onClick={() => navigate("/plan-selection")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Crown className="w-5 h-5" />
              <span>Mejorar Plan</span>
            </button>
          )}
        </motion.div>
      </div>

      {/* Stats & Links */}
      <div className="px-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#111] rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-white/5 flex justify-between items-center"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total Generado
            </p>
            <p className="font-black text-2xl text-slate-900 dark:text-white">
              ${(user.totalEarned || 0).toLocaleString("es-CO")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Código
            </p>
            <p className="font-bold text-slate-700 dark:text-slate-300">{user.referral_code}</p>
          </div>
        </motion.div>

        <div className="bg-white dark:bg-[#111] rounded-2xl shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-white/5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Preferencias</h3>
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                  {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div className="text-left">
                  <span className="font-bold text-slate-800 dark:text-white block">Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                  <span className="text-[10px] text-slate-500">Cambiar apariencia de la app</span>
                </div>
              </div>
              <div className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-300",
                theme === 'dark' ? "bg-blue-600" : "bg-slate-200"
              )}>
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                  theme === 'dark' ? "left-7" : "left-1"
                )} />
              </div>
            </button>
            
            <button 
              onClick={requestPermission}
              className="w-full flex items-center justify-between group mt-4 pt-4 border-t border-slate-100 dark:border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  permission === 'granted' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600" : "bg-blue-50 dark:bg-blue-500/10 text-blue-600"
                )}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="font-bold text-slate-800 dark:text-white block">
                    {permission === 'granted' ? 'Notificaciones Activas' : 'Activar Notificaciones'}
                  </span>
                  <span className="text-[10px] text-slate-500">Recibe alertas con la app cerrada</span>
                </div>
              </div>
              {permission !== 'granted' && (
                <div className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                  ACTIVAR
                </div>
              )}
            </button>
          </div>

          <button 
            onClick={() => navigate("/team")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">
                Mi Red (Equipo)
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/wallet")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">
                Mi Billetera
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/training")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">
                Centro de Capacitación
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/mentor")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">
                Mentor IA (Gemini)
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => navigate("/tickets")}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">
                Soporte (Tickets)
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => setIsChangingPassword(true)}
            className="w-full p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400">
                <Settings className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">Cambiar Contraseña</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={() => window.open("https://wa.me/573000000000", "_blank")}
            className="w-full p-5 flex items-center justify-between hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors border-b border-slate-100 dark:border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Phone className="w-5 h-5" />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">Soporte WhatsApp</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          <button 
            onClick={handleLogout}
            className="w-full p-5 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-red-600 dark:text-red-400"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-bold">Cerrar Sesión</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
