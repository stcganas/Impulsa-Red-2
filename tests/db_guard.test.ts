/**
 * IMPULSARED - UNIT TESTS FOR DATABASE SAFETY GUARD & MIGRATION RUNNER
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
console.log('   IMPULSARED — DB GUARD & MIGRATION RUNNER UNIT TESTS');
console.log('======================================================\n');

test('Accepts valid local test URL', () => {
  const valid = verifyDisposableLocalDb('postgres://postgres:pass@127.0.0.1:5433/impulsared_test');
  if (!valid) throw new Error('Expected true');
});

test('Accepts localhost test URL', () => {
  const valid = verifyDisposableLocalDb('postgres://postgres:pass@localhost:5433/test_db');
  if (!valid) throw new Error('Expected true');
});

test('Rejects empty or missing URL', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to throw on empty URL');
});

test('Rejects remote / production URLs containing forbidden keywords', () => {
  const forbidden = [
    'postgres://user:pass@db.prod.supabase.co:5432/postgres',
    'postgres://user:pass@aws-rds-cluster.amazon.com:5432/impulsared',
    'postgres://user:pass@live-cluster.neon.tech:5432/main'
  ];

  for (const url of forbidden) {
    let threw = false;
    try {
      verifyDisposableLocalDb(url);
    } catch {
      threw = true;
    }
    if (!threw) throw new Error(`Expected to throw on forbidden URL: ${url}`);
  }
});

test('Rejects local URLs without disposable test database name', () => {
  let threw = false;
  try {
    verifyDisposableLocalDb('postgres://postgres:pass@127.0.0.1:5433/production_db');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected to throw when database name lacks test keyword');
});

console.log('\n======================================================');
console.log(`TOTAL GUARD TESTS: PASSED = ${passed}, FAILED = ${failed}`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
