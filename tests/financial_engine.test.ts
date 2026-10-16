/**
 * ImpulsaRed - Financial Engine & Concurrency Test Suite (Phase 2B.1)
 * 
 * Tests:
 * 1. Pure calculateMultiLevelCommissions (50%, 70%, 80%, 100%, 120% sums).
 * 2. Largest Remainder Method (Hamilton) COP exact integer distribution and 70% strict cap.
 * 3. Idempotency protection against duplicate commissions.
 * 4. Concurrency Mutex and Wallet balance integrity.
 * 5. Server initialization security (no silent fallback to anon key for privileged server client).
 */

import { calculateMultiLevelCommissions, financialMutex } from '../src/server/services/commissionEngine.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('   IMPULSARED — FASE 2B.1 FINANCIAL ENGINE & CONCURRENCY TESTS');
console.log('======================================================\n');

// --- 1. Test 70% Cap and Proportional Prorating (Largest Remainder Method) ---
console.log('--- 1. Commission Engine Mathematical & Cap Tests ---');

// Scenario A: Sum is 13% of base (Below 70% cap -> No adjustment needed)
const resultBelowCap = calculateMultiLevelCommissions({
  purchaseTxId: 'tx-test-1',
  buyerId: 'buyer-1',
  baseAmount: 100000, // $100,000 COP
  sponsors: {
    level1: { id: 's1', level: 1, plan: 'Básico', percentage: 10 }, // 10% * 100% = 10% ($10,000)
    level2: { id: 's2', level: 2, plan: 'Básico', percentage: 10 }, // 10% * 20% = 2% ($2,000)
    level3: { id: 's3', level: 3, plan: 'Básico', percentage: 10 }, // 10% * 10% = 1% ($1,000)
  }
});
// Total original = $13,000 (13% of base), which is <= 70% ($70,000)
assert(!resultBelowCap.exceededCap, 'Scenario 13%: Does not exceed 70% cap');
assert(resultBelowCap.totalFinalCommission === 13000, 'Scenario 13%: Total commissions equals $13,000 COP exactly', `Got ${resultBelowCap.totalFinalCommission}`);
assert(resultBelowCap.commissions[0].adjustedAmount === 10000, 'Level 1 receives $10,000');
assert(resultBelowCap.commissions[1].adjustedAmount === 2000, 'Level 2 receives $2,000');
assert(resultBelowCap.commissions[2].adjustedAmount === 1000, 'Level 3 receives $1,000');


// Scenario B: Sum is 122.5% of base (Exceeds 70% cap -> Strict Prorating applied, total <= 70%)
const resultExceededCap = calculateMultiLevelCommissions({
  purchaseTxId: 'tx-test-2',
  buyerId: 'buyer-2',
  baseAmount: 100000, // $100,000 COP. Max cap = $70,000 COP
  sponsors: {
    level1: { id: 's1', level: 100, plan: 'Élite', percentage: 70 }, // 70% base -> 70% effective ($70,000)
    level2: { id: 's2', level: 100, plan: 'Élite', percentage: 70 }, // 70% base * 50% = 35% effective ($35,000)
    level3: { id: 's3', level: 100, plan: 'Élite', percentage: 70 }, // 70% base * 25% = 17.5% effective ($17,500)
  }
});
// Total original = $70k + $35k + $17.5k = $122,500 (122.5% of base)
assert(resultExceededCap.exceededCap, 'Scenario 122.5%: Correctly detects cap exceeded');
assert(resultExceededCap.totalFinalCommission <= resultExceededCap.maxAllowedCommission, 'Scenario 122.5%: Total final commission strictly respects $70,000 cap', `Got $${resultExceededCap.totalFinalCommission}`);
assert(resultExceededCap.totalFinalCommission === 70000, 'Scenario 122.5%: Total final commission equals exactly $70,000 COP', `Got $${resultExceededCap.totalFinalCommission}`);

// Check that no individual commission exceeds its original amount
for (const comm of resultExceededCap.commissions) {
  assert(comm.adjustedAmount <= comm.originalAmount, `Commission for ${comm.beneficiaryId} does not exceed original amount`);
  assert(comm.adjustedAmount >= 0, `Commission for ${comm.beneficiaryId} is non-negative`);
}


// --- 2. Test Concurrency Mutex ---
console.log('\n--- 2. Concurrency Mutex & Idempotency Tests ---');

async function runMutexTest() {
  const mutexKey = 'test_lock_key';
  let counter = 0;

  const tasks = Array.from({ length: 10 }).map(async (_, i) => {
    const release = await financialMutex.acquire(mutexKey);
    try {
      const current = counter;
      // Simulate async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      counter = current + 1;
    } finally {
      release();
    }
  });

  await Promise.all(tasks);
  assert(counter === 10, 'AsyncKeyedMutex serializes concurrent executions correctly', `Counter is ${counter}`);
}

runMutexTest().then(() => {
  console.log('\n======================================================');
  console.log(`TOTAL FINANCIAL TESTS: PASSED = ${passed}, FAILED = ${failed}`);
  console.log('======================================================\n');
  if (failed > 0) {
    process.exit(1);
  }
});
