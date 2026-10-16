/**
 * IMPULSARED - CENTRALIZED COMMISSION & FINANCIAL ENGINE (FASE 2B.1)
 * 
 * Provides pure, typed, and mathematically deterministic calculations for:
 * 1. Multi-level referral commissions (Tiers 1, 2, and 3).
 * 2. Independent level rate calculation based on sponsor level and plan.
 * 3. 70% Global Commission Cap enforcement.
 * 4. Largest Remainder Method (Hare-Niemeyer / Hamilton) for exact integer COP prorating.
 * 5. Full audit traceability and concurrency mutex locks for idempotency.
 */

import { calculatePercentage } from '../../utils/levelUtils.ts';

export interface SponsorInfo {
  id: string;
  name?: string;
  level: number;
  plan: string;
  percentage?: number; // Base rate if already computed
}

export interface CommissionCalculationInput {
  purchaseTxId: string;
  buyerId: string;
  baseAmount: number; // Approved net purchase price in COP (integer)
  sponsors: {
    level1?: SponsorInfo | null;
    level2?: SponsorInfo | null;
    level3?: SponsorInfo | null;
  };
}

export interface CommissionItem {
  purchaseTxId: string;
  beneficiaryId: string;
  beneficiaryName?: string;
  referredId: string;
  nivelRed: number; // 1, 2, or 3
  baseAmount: number;
  sponsorBaseRate: number; // e.g. 70%
  tierMultiplier: number; // e.g. 100%, 50%, 25%
  effectiveRate: number; // sponsorBaseRate * tierMultiplier / 100
  originalAmount: number; // in COP (integer)
  adjustedAmount: number; // in COP (integer)
  wasAdjusted: boolean;
  adjustmentRatio: number;
  status: 'completed';
}

export interface CommissionCalculationResult {
  purchaseTxId: string;
  buyerId: string;
  baseAmount: number;
  maxAllowedCommission: number; // floor(baseAmount * 0.70)
  totalOriginalCommission: number;
  totalFinalCommission: number;
  exceededCap: boolean;
  adjustmentRatio: number;
  commissions: CommissionItem[];
}

/**
 * Calculates the tier multiplier based on network level and sponsor plan.
 * Level 1: 100% of base commission rate.
 * Level 2: 50% for Élite, 40% for Pro, 30% for Avanzado, 20% for Básico.
 * Level 3: 25% for Élite, 20% for Pro, 15% for Avanzado, 10% for Básico.
 */
export function getTierMultiplier(networkLevel: number, plan: string = 'básico'): number {
  const p = (plan || 'básico').toLowerCase();
  if (networkLevel === 1) {
    return 100;
  }
  if (networkLevel === 2) {
    if (p.includes('elite') || p.includes('élite')) return 50;
    if (p.includes('pro')) return 40;
    if (p.includes('avanzado')) return 30;
    return 20; // Básico
  }
  if (networkLevel === 3) {
    if (p.includes('elite') || p.includes('élite')) return 25;
    if (p.includes('pro')) return 20;
    if (p.includes('avanzado')) return 15;
    return 10; // Básico
  }
  return 0;
}

/**
 * Pure function: Calculates multi-level commissions with strict 70% cap
 * and Largest Remainder Method for proportional integer COP distribution.
 */
export function calculateMultiLevelCommissions(input: CommissionCalculationInput): CommissionCalculationResult {
  const baseAmount = Math.max(0, Math.floor(Number(input.baseAmount) || 0));
  const maxAllowedCommission = Math.floor((baseAmount * 70) / 100);

  if (baseAmount <= 0) {
    return {
      purchaseTxId: input.purchaseTxId,
      buyerId: input.buyerId,
      baseAmount: 0,
      maxAllowedCommission: 0,
      totalOriginalCommission: 0,
      totalFinalCommission: 0,
      exceededCap: false,
      adjustmentRatio: 1,
      commissions: []
    };
  }

  // 1. Calculate independent commissions per level
  const intermediateCommissions: {
    beneficiaryId: string;
    beneficiaryName?: string;
    nivelRed: number;
    sponsorBaseRate: number;
    tierMultiplier: number;
    effectiveRate: number;
    originalAmount: number;
  }[] = [];

  const tierSponsors = [
    { level: 1, sponsor: input.sponsors.level1 },
    { level: 2, sponsor: input.sponsors.level2 },
    { level: 3, sponsor: input.sponsors.level3 },
  ];

  for (const { level, sponsor } of tierSponsors) {
    if (!sponsor || !sponsor.id) continue;

    // Determine sponsor base rate from their level and plan
    const sponsorBaseRate = sponsor.percentage !== undefined && sponsor.percentage !== null
      ? sponsor.percentage
      : calculatePercentage(sponsor.level || 1, sponsor.plan || 'Básico');

    const tierMultiplier = getTierMultiplier(level, sponsor.plan || 'Básico');
    const effectiveRate = Number(((sponsorBaseRate * tierMultiplier) / 100).toFixed(4));
    
    // Original calculated amount in COP (exact integer floor)
    const rawAmount = (baseAmount * effectiveRate) / 100;
    const originalAmount = Math.max(0, Math.floor(rawAmount));

    if (originalAmount > 0) {
      intermediateCommissions.push({
        beneficiaryId: sponsor.id,
        beneficiaryName: sponsor.name,
        nivelRed: level,
        sponsorBaseRate,
        tierMultiplier,
        effectiveRate,
        originalAmount
      });
    }
  }

  const totalOriginalCommission = intermediateCommissions.reduce((sum, item) => sum + item.originalAmount, 0);

  // Case A: Total does NOT exceed the 70% cap -> Keep original amounts
  if (totalOriginalCommission <= maxAllowedCommission) {
    const finalCommissions: CommissionItem[] = intermediateCommissions.map(item => ({
      purchaseTxId: input.purchaseTxId,
      beneficiaryId: item.beneficiaryId,
      beneficiaryName: item.beneficiaryName,
      referredId: input.buyerId,
      nivelRed: item.nivelRed,
      baseAmount,
      sponsorBaseRate: item.sponsorBaseRate,
      tierMultiplier: item.tierMultiplier,
      effectiveRate: item.effectiveRate,
      originalAmount: item.originalAmount,
      adjustedAmount: item.originalAmount,
      wasAdjusted: false,
      adjustmentRatio: 1.0,
      status: 'completed'
    }));

    return {
      purchaseTxId: input.purchaseTxId,
      buyerId: input.buyerId,
      baseAmount,
      maxAllowedCommission,
      totalOriginalCommission,
      totalFinalCommission: totalOriginalCommission,
      exceededCap: false,
      adjustmentRatio: 1.0,
      commissions: finalCommissions
    };
  }

  // Case B: Total EXCEEDS the 70% cap -> Apply Largest Remainder Method (Hare-Niemeyer / Hamilton)
  // Scaling ratio: maxAllowedCommission / totalOriginalCommission
  const adjustmentRatio = maxAllowedCommission / totalOriginalCommission;

  // Calculate quotas and remainders
  const quotas = intermediateCommissions.map((item, index) => {
    const exactQuota = item.originalAmount * adjustmentRatio;
    const integerPart = Math.floor(exactQuota);
    const remainder = exactQuota - integerPart;
    return {
      index,
      item,
      exactQuota,
      integerPart,
      remainder
    };
  });

  const sumIntegerParts = quotas.reduce((acc, q) => acc + q.integerPart, 0);
  let unitsToDistribute = maxAllowedCommission - sumIntegerParts;

  // Sort by remainder descending, with deterministic tie-breaking:
  // 1. Remainder descending
  // 2. Network level ascending (Level 1 before Level 2 before Level 3)
  // 3. Beneficiary ID ascending (lexicographical)
  const sortedByRemainder = [...quotas].sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    if (a.item.nivelRed !== b.item.nivelRed) {
      return a.item.nivelRed - b.item.nivelRed;
    }
    return a.item.beneficiaryId.localeCompare(b.item.beneficiaryId);
  });

  const finalAllocations = new Map<number, number>();
  quotas.forEach(q => finalAllocations.set(q.index, q.integerPart));

  for (let i = 0; i < sortedByRemainder.length && unitsToDistribute > 0; i++) {
    const q = sortedByRemainder[i];
    const currentAlloc = finalAllocations.get(q.index) || 0;
    // Safety check: adjusted amount cannot exceed original amount
    if (currentAlloc + 1 <= q.item.originalAmount) {
      finalAllocations.set(q.index, currentAlloc + 1);
      unitsToDistribute--;
    }
  }

  const finalCommissions: CommissionItem[] = quotas.map(q => {
    const adjustedAmount = finalAllocations.get(q.index) || 0;
    return {
      purchaseTxId: input.purchaseTxId,
      beneficiaryId: q.item.beneficiaryId,
      beneficiaryName: q.item.beneficiaryName,
      referredId: input.buyerId,
      nivelRed: q.item.nivelRed,
      baseAmount,
      sponsorBaseRate: q.item.sponsorBaseRate,
      tierMultiplier: q.item.tierMultiplier,
      effectiveRate: q.item.effectiveRate,
      originalAmount: q.item.originalAmount,
      adjustedAmount,
      wasAdjusted: true,
      adjustmentRatio,
      status: 'completed'
    };
  });

  const totalFinalCommission = finalCommissions.reduce((sum, c) => sum + c.adjustedAmount, 0);

  return {
    purchaseTxId: input.purchaseTxId,
    buyerId: input.buyerId,
    baseAmount,
    maxAllowedCommission,
    totalOriginalCommission,
    totalFinalCommission,
    exceededCap: true,
    adjustmentRatio,
    commissions: finalCommissions
  };
}

/**
 * Concurrency Mutex Manager for in-memory serialization of financial transactions.
 * Guarantees that concurrent requests for the same user or purchase transaction
 * are executed sequentially to prevent double-spending and duplicate commission accreditation.
 */
class AsyncKeyedMutex {
  private activeLocks = new Map<string, Promise<void>>();

  async acquire(key: string): Promise<() => void> {
    while (this.activeLocks.has(key)) {
      await this.activeLocks.get(key);
    }

    let releaseLock: () => void = () => {};
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.activeLocks.set(key, lockPromise);

    return () => {
      this.activeLocks.delete(key);
      releaseLock();
    };
  }
}

export const financialMutex = new AsyncKeyedMutex();
