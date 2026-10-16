/**
 * IMPULSARED - UNIT TESTS FOR HARDENED DATABASE SAFETY GUARD
 */

import { verifyDisposableLocalDb } from './db_guard.ts';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name} -> ${err.message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('   IMPULSARED — HARDENED DB GUARD UNIT TESTS');
console.log('======================================================\n');

test('Accepts strictly correct test URL (127.0.0.1:5433/impulsared_test)', () => {
  const valid = verifyDisposableLocalDb('postgres://postgres:pass@127.0.0.1:5433/impulsared_test');
  if (!valid) throw new Error('Expected true');
});

test('Rejects localhost (enforces 127.0.0.1)', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('postgres://postgres:pass@localhost:5433/impulsared_test');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject localhost');
});

test('Rejects 0.0.0.0 (enforces 127.0.0.1)', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('postgres://postgres:pass@0.0.0.0:5433/impulsared_test');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject 0.0.0.0');
});

test('Rejects incorrect port (enforces 5433)', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('postgres://postgres:pass@127.0.0.1:5432/impulsared_test');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject port 5432');
});

test('Rejects incorrect database name (enforces impulsared_test)', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('postgres://postgres:pass@127.0.0.1:5433/production_db');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject non-test database name');
});

test('Rejects remote production URLs', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('postgres://user:pass@db.prod.supabase.co:5433/impulsared_test');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject remote supabase URL');
});

console.log('\n======================================================');
console.log(`TOTAL HARDENED GUARD TESTS: PASSED = ${passed}, FAILED = ${failed}`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
