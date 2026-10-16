/**
 * IMPULSARED - COMPREHENSIVE UNIT TESTS FOR HARDENED DATABASE SAFETY GUARD
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
console.log('   IMPULSARED — COMPREHENSIVE DB GUARD TESTS');
console.log('======================================================\n');

test('Accepts valid local test URL (127.0.0.1:5433/impulsared_test)', () => {
  const valid = verifyDisposableLocalDb('postgres://postgres:pass@127.0.0.1:5433/impulsared_test');
  if (!valid) throw new Error('Expected true');
});

test('Accepts valid local test URL (localhost:5433/impulsared_test)', () => {
  const valid = verifyDisposableLocalDb('postgres://postgres:pass@localhost:5433/impulsared_test');
  if (!valid) throw new Error('Expected true');
});

test('Accepts valid local test URL (IPv6 [::1]:5433/impulsared_test)', () => {
  const valid = verifyDisposableLocalDb('postgres://postgres:pass@[::1]:5433/impulsared_test');
  if (!valid) throw new Error('Expected true');
});

test('Rejects malformed URLs', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('not-a-valid-url-string');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject malformed URL');
});

test('Rejects empty or missing URL', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject empty URL');
});

test('Rejects remote hosts even if URL contains test keyword', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('postgres://user:pass@db.prod.supabase.co:5433/impulsared_test');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject remote host supabase.co');
});

test('Rejects localhost.evil.example spoofing domain', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('postgres://user:pass@localhost.evil.example:5433/impulsared_test');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject localhost.evil.example');
});

test('Rejects wildcard address 0.0.0.0', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('postgres://user:pass@0.0.0.0:5433/impulsared_test');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject 0.0.0.0');
});

test('Rejects production database names', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('postgres://postgres:pass@127.0.0.1:5433/production_db');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject production_db');
});

test('Rejects when test keyword is only in password but DB is production', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('postgres://user:testpassword@127.0.0.1:5433/production_db');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject production_db even with test in password');
});

test('Rejects non-postgres protocol/schemas (http)', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('http://127.0.0.1:5433/impulsared_test');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to reject non-postgres protocol');
});

console.log('\n======================================================');
console.log(`TOTAL COMPREHENSIVE GUARD TESTS: PASSED = ${passed}, FAILED = ${failed}`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
