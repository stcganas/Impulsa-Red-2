import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  imgClassName?: string;
  showText?: boolean;
  textClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Logo({ 
  className, 
  imgClassName, 
  showText = false,
  textClassName,
  size = "md"
}: LogoProps) {
  const { settings } = useSettings();

  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-10",
    xl: "h-12"
  };

  const iconSizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12"
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl"
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {settings.app_logo ? (
        <img 
          src={settings.app_logo} 
          alt={settings.app_name || "Logo"} 
          className={cn(sizeClasses[size], "w-auto object-contain max-w-[200px]", imgClassName)} 
        />
      ) : (
        <>
          <div className={cn(iconSizeClasses[size], "bg-gradient-to-br from-blue-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0")}>
            <TrendingUp className="text-white w-2/3 h-2/3" />
          </div>
          {showText && settings.app_name && (
            <span className={cn(textSizeClasses[size], "font-black tracking-tighter text-slate-900 dark:text-white", textClassName)}>
              {settings.app_name}
            </span>
          )}
        </>
      )}
    </div>
  );
}
