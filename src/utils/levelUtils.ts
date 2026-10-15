/**
 * Modelo Matemático Calibrado para Nivel 100 en 90 Días (3 Meses)
 * 
 * Desglose por Meses y Curva Progresiva:
 * - Mes 1 (Niveles 1 a 30):   250 XP por nivel  -> 7,250 XP acumulados
 * - Mes 2 (Niveles 31 a 70):  450 XP por nivel  -> 25,250 XP acumulados
 * - Mes 3 (Niveles 71 a 100): 650 XP por nivel  -> 44,750 XP acumulados (Meta Nivel 100)
 * 
 * Promedio diario necesario: ~500 XP / día
 */

export const LEVEL_100_TOTAL_XP = 44750;
export const MONTH_1_TARGET_XP = 7250;  // Nivel 30 (Día 30)
export const MONTH_2_TARGET_XP = 25250; // Nivel 70 (Día 60)
export const MONTH_3_TARGET_XP = 44750; // Nivel 100 (Día 90)

/**
 * Calcula el XP acumulado requerido para alcanzar un nivel dado (1 - 100).
 */
export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > 100) level = 100;

  if (level <= 30) {
    return (level - 1) * 250;
  } else if (level <= 70) {
    return 7250 + (level - 30) * 450;
  } else {
    return 25250 + (level - 70) * 650;
  }
}

/**
 * Calcula el nivel actual de un usuario a partir de sus puntos XP acumulados.
 */
export function calculateLevelFromXP(xp: number): number {
  if (!xp || xp <= 0) return 1;

  if (xp < 7250) {
    return Math.min(30, Math.floor(xp / 250) + 1);
  } else if (xp < 25250) {
    return Math.min(70, Math.floor((xp - 7250) / 450) + 30);
  } else if (xp < 44750) {
    return Math.min(100, Math.floor((xp - 25250) / 650) + 70);
  } else {
    return 100;
  }
}

/**
 * Calcula el desglose detallado del progreso de nivel y XP actual del usuario.
 */
export function getXPProgressInCurrentLevel(xp: number = 0) {
  const currentLevel = calculateLevelFromXP(xp);
  
  if (currentLevel >= 100) {
    return {
      currentLevel: 100,
      nextLevel: 100,
      currentLevelXP: getXPForLevel(100),
      nextLevelXP: getXPForLevel(100),
      xpInLevel: 0,
      xpRequiredForNext: 0,
      progressPercent: 100,
      isMaxLevel: true,
      remainingTo100: 0,
    };
  }

  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  const xpInLevel = Math.max(0, xp - currentLevelXP);
  const xpRequiredForNext = nextLevelXP - currentLevelXP;
  const progressPercent = Math.min(100, Math.max(0, (xpInLevel / xpRequiredForNext) * 100));
  const remainingTo100 = Math.max(0, LEVEL_100_TOTAL_XP - xp);

  return {
    currentLevel,
    nextLevel: currentLevel + 1,
    currentLevelXP,
    nextLevelXP,
    xpInLevel,
    xpRequiredForNext,
    progressPercent: Number(progressPercent.toFixed(1)),
    isMaxLevel: false,
    remainingTo100,
  };
}

/**
 * Calcula el porcentaje de comisión según el nivel y el plan del usuario.
 * Escala suavemente desde la base del plan (5% - 30%) hasta el 70% en Nivel 100.
 */
export function calculatePercentage(level: number, plan: string = 'básico'): number {
  if (level >= 100) return 70.00;
  
  let baseCommission = 5;
  const planLower = plan?.toLowerCase() || 'básico';
  
  if (planLower.includes('avanzado')) baseCommission = 10;
  else if (planLower.includes('pro')) baseCommission = 20;
  else if (planLower.includes('elite') || planLower.includes('élite')) baseCommission = 30;
  
  const increment = (70 - baseCommission) / 99;
  const percentage = baseCommission + (level - 1) * increment;
  
  return Number(percentage.toFixed(2));
}

/**
 * Proyecciones de ritmo para el objetivo de 90 días hacia el Nivel 100.
 */
export function getDailyPacingGoal(currentXP: number, daysActive: number = 0) {
  const targetDays = 90;
  const daysRemaining = Math.max(1, targetDays - daysActive);
  const xpRemaining = Math.max(0, LEVEL_100_TOTAL_XP - currentXP);
  const recommendedDailyXP = Math.ceil(xpRemaining / daysRemaining);

  return {
    daysRemaining,
    xpRemaining,
    recommendedDailyXP,
    isOnTrack: currentXP >= (daysActive * (LEVEL_100_TOTAL_XP / targetDays)),
  };
}

