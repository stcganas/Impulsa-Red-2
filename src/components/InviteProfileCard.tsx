import React from "react";
import { User, ShieldCheck } from "lucide-react";
import { useSettings } from "../contexts/SettingsContext";

interface InviteProfileCardProps {
  name: string;
  photoUrl?: string;
  title?: string;
  message?: string;
}

export default function InviteProfileCard({ name, photoUrl, title, message }: InviteProfileCardProps) {
  const { settings } = useSettings();
  const displayName = name || "Líder de la Red";

  return (
    <div className="flex flex-col items-center text-center space-y-4">
      {/* Profile Photo */}
      <div className="relative">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-slate-800 shadow-2xl overflow-hidden bg-slate-800 flex items-center justify-center ring-4 ring-blue-500/20">
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt={displayName} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-black">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-wider flex items-center gap-1 border border-emerald-400/40">
          <ShieldCheck className="w-3 h-3" />
          <span>Líder Verificado</span>
        </div>
      </div>

      {/* Name & Title */}
      <div className="space-y-2 pt-2">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
          {title || `${displayName} te ha reservado un cupo VIP en ${settings.app_name || "ImpulsaRed"} 🚀`}
        </h1>
        <p className="text-slate-300 text-sm font-normal max-w-md mx-auto leading-relaxed">
          {message || "Genera ingresos diarios reales completando tareas sencillas desde tu celular y construyendo una red de afiliados con hasta 70% de comisiones directas a tu Nequi."}
        </p>
      </div>
    </div>
  );
}
