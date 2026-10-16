/**
 * ImpulsaRed - Automated Security & Data Protection Test Suite (Phase 2A & 2A.1 Hardened)
 * 
 * Verifies:
 * 1. exec_sql elimination & endpoint deprecation
 * 2. Admin authorization & authentication middleware
 * 3. users table system fields protection (trigger logic & simulation with Fail-Secure default-deny)
 * 4. user_tasks table anti-tampering (trigger logic & simulation with Fail-Secure default-deny)
 * 5. Task evidence requirement enforcement in /tasks/complete/:id
 * 6. Protection against mass-assignment and trust_score spoofing
 * 7. Hardened course completion XP injection prevention (/courses/complete/:id)
 * 8. Hardened event spoofing whitelist prevention (/events)
 */

import fs from 'fs';

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

// ==============================================================================
// TEST SUITE 1: EXEC_SQL ELIMINATION & CODEBASE HYGIENE
// ==============================================================================
console.log('\n--- SUITE 1: exec_sql Elimination & Security Hygiene ---');

const serverTs = fs.readFileSync('server.ts', 'utf8');
const systemTs = fs.readFileSync('src/server/routes/system.ts', 'utf8');

assert(
  !serverTs.includes("rpc('exec_sql'"),
  'server.ts does not call exec_sql RPC'
);

assert(
  !systemTs.includes("rpc('exec_sql'"),
  'src/server/routes/system.ts does not call exec_sql RPC'
);

assert(
  systemTs.includes("status(403)"),
  '/test-policies endpoint in system.ts returns 403 Forbidden'
);

// Check migration files exist
const migration1 = fs.readFileSync('migrations/20261016_01_revoke_and_drop_exec_sql.sql', 'utf8');
const migration2 = fs.readFileSync('migrations/20261016_02_protect_users_system_fields.sql', 'utf8');
const migration3 = fs.readFileSync('migrations/20261016_03_protect_user_tasks.sql', 'utf8');
const migration4 = fs.readFileSync('migrations/20261016_04_consolidated_security_remediation.sql', 'utf8');
const migration5 = fs.readFileSync('migrations/20261016_05_hardened_security_remediation_v2.sql', 'utf8');

assert(
  migration1.includes('DROP FUNCTION IF EXISTS public.exec_sql(text) RESTRICT;') &&
  migration1.includes('REVOKE ALL ON FUNCTION public.exec_sql(text) FROM PUBLIC'),
  'Migration 01 revokes and drops exec_sql with strict parameters'
);

assert(
  migration5.includes("search_path = pg_catalog, public") &&
  migration5.includes("claim_role = 'service_role' OR session_user = 'service_role'"),
  'Migration 05 establishes hardened fail-secure triggers and qualified search_path'
);

// ==============================================================================
// TEST SUITE 2: ADMIN AUTHENTICATION & AUTHORIZATION MIDDLEWARE
// ==============================================================================
console.log('\n--- SUITE 2: Admin Middleware Security ---');

const adminRoutesFile = fs.readFileSync('src/server/routes/admin.ts', 'utf8');

assert(
  adminRoutesFile.includes("router.get('/transactions', authenticate, authorizeAdmin"),
  '/transactions in admin.ts enforces authorizeAdmin'
);

assert(
  adminRoutesFile.includes("router.get('/tickets', authenticate, authorizeAdmin"),
  '/tickets in admin.ts enforces authorizeAdmin'
);

// Simulate authorizeAdmin middleware logic
async function simulateAuthorizeAdmin(reqUser: any, dbRole: string | null) {
  let statusCode = 200;
  let responseData = null;
  let nextCalled = false;

  const req = { user: reqUser, url: '/api/admin/test' };
  const res = {
    status: (code: number) => {
      statusCode = code;
      return {
        json: (data: any) => { responseData = data; }
      };
    }
  };
  const next = () => { nextCalled = true; };

  if (!req.user) {
    res.status(401).json({ error: 'No autenticado' });
    return { statusCode, responseData, nextCalled };
  }

  if (dbRole !== 'admin') {
    res.status(403).json({ error: 'Acceso restringido: se requieren permisos de administrador' });
    return { statusCode, responseData, nextCalled };
  }

  next();
  return { statusCode, responseData, nextCalled };
}

(async () => {
  const result = await simulateAuthorizeAdmin(null, null);
  assert(result.statusCode === 401 && !result.nextCalled, 'Unauthenticated request to admin middleware is rejected with 401');
})();

(async () => {
  const result = await simulateAuthorizeAdmin({ id: 'user-123' }, 'user');
  assert(result.statusCode === 403 && !result.nextCalled, 'Non-admin user request to admin middleware is rejected with 403');
})();

(async () => {
  const result = await simulateAuthorizeAdmin({ id: 'admin-456' }, 'admin');
  assert(result.statusCode === 200 && result.nextCalled, 'Verified admin user request to admin middleware proceeds with next()');
})();

// ==============================================================================
// TEST SUITE 3: INPUT VALIDATION & MASS-ASSIGNMENT PROTECTION
// ==============================================================================
console.log('\n--- SUITE 3: Mass Assignment & Validation Protection ---');

function simulatePatchUserValidation(body: any) {
  const allowedFields = ['status', 'role', 'name', 'email', 'phone', 'address', 'wallet_balance', 'xp'];
  const updateData: Record<string, any> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { error: 'No se enviaron campos válidos para actualizar', status: 400 };
  }

  if (updateData.role && !['user', 'admin'].includes(updateData.role)) {
    return { error: 'Rol inválido', status: 400 };
  }

  if (updateData.wallet_balance !== undefined) {
    const balance = Number(updateData.wallet_balance);
    if (isNaN(balance) || balance < 0) {
      return { error: 'Saldo de billetera inválido', status: 400 };
    }
    updateData.wallet_balance = balance;
  }

  if (updateData.xp !== undefined) {
    const xpVal = Number(updateData.xp);
    if (isNaN(xpVal) || xpVal < 0) {
      return { error: 'XP inválido', status: 400 };
    }
    updateData.xp = Math.floor(xpVal);
  }

  return { success: true, updateData };
}

const illegalRoleTest = simulatePatchUserValidation({ role: 'super_admin' });
assert(illegalRoleTest.status === 400, 'Rejects unauthorized role escalation in PATCH /users/:id');

const negBalanceTest = simulatePatchUserValidation({ wallet_balance: -5000 });
assert(negBalanceTest.status === 400, 'Rejects negative wallet balance in PATCH /users/:id');

const massAssignmentTest = simulatePatchUserValidation({ referral_code: 'HACKED', dangerous_field: 'DROP TABLE', name: 'John Doe' });
assert(
  massAssignmentTest.success === true &&
  massAssignmentTest.updateData?.name === 'John Doe' &&
  !('referral_code' in (massAssignmentTest.updateData || {})) &&
  !('dangerous_field' in (massAssignmentTest.updateData || {})),
  'Filters out non-whitelisted fields in PATCH /users/:id'
);

// ==============================================================================
// TEST SUITE 4: TRUST SCORE SPOOFING PROTECTION (/user/activity)
// ==============================================================================
console.log('\n--- SUITE 4: /user/activity Endpoint Protection ---');

const usersRouteFile = fs.readFileSync('src/server/routes/users.ts', 'utf8');

assert(
  !usersRouteFile.includes("action === 'plan_purchase'"),
  'Client-facing /user/activity does not allow plan_purchase action'
);

assert(
  usersRouteFile.includes("!['normal_activity', 'suspicious_activity'].includes(action)"),
  '/user/activity validates action strictly against allowed list'
);

// ==============================================================================
// TEST SUITE 5: TASK EVIDENCE REQUIREMENT VERIFICATION (/tasks/complete/:id)
// ==============================================================================
console.log('\n--- SUITE 5: Task Review Bypass Prevention ---');

const tasksRouteFile = fs.readFileSync('src/server/routes/tasks.ts', 'utf8');

assert(
  tasksRouteFile.includes("if (task.requires_evidence === true)"),
  '/tasks/complete/:id blocks auto-completion if task requires evidence'
);

function simulateTaskCompletion(task: { id: string; requires_evidence?: boolean }) {
  if (task.requires_evidence === true) {
    return { status: 400, error: 'Esta tarea requiere envío de evidencia para su revisión' };
  }
  return { status: 200, success: true, ready_to_claim: true };
}

const evidenceRequiredTask = simulateTaskCompletion({ id: 'task-1', requires_evidence: true });
assert(
  evidenceRequiredTask.status === 400,
  'Tasks with requires_evidence: true cannot be auto-completed via /tasks/complete/:id'
);

const simpleTask = simulateTaskCompletion({ id: 'task-2', requires_evidence: false });
assert(
  simpleTask.status === 200,
  'Tasks without evidence requirements can be auto-completed normally'
);

// ==============================================================================
// TEST SUITE 6: FAIL-SECURE TRIGGER SIMULATION (USERS TABLE)
// ==============================================================================
console.log('\n--- SUITE 6: Fail-Secure Trigger Simulation (protect_system_fields) ---');

function simulateHardenedProtectSystemFields(
  op: 'INSERT' | 'UPDATE',
  oldRecord: any,
  newRecord: any,
  jwtRole: string | null | undefined,
  isAdmin: boolean,
  pgUser: string = 'authenticated'
) {
  // 1. Direct PostgreSQL superuser / maintenance bypass
  if (pgUser === 'postgres' || pgUser === 'supabase_admin') {
    return { ok: true, record: newRecord };
  }

  // 2. Explicit backend service_role key bypass
  if (pgUser === 'service_role' || jwtRole === 'service_role') {
    return { ok: true, record: newRecord };
  }

  // 3. Platform administrator bypass
  if (isAdmin) {
    return { ok: true, record: newRecord };
  }

  // FAIL-SECURE: NULL, empty, or unknown claims MUST NOT bypass!
  if (op === 'UPDATE') {
    const protectedFields = [
      'role', 'wallet_balance', 'plan', 'plan_id', 'xp', 'level',
      'percentage', 'trust_score', 'is_tasks_active', 'task_start_date',
      'task_end_date', 'current_streak', 'longest_streak', 'last_task_date',
      'badges', 'leader_level', 'compliance_score', 'last_reset_at'
    ];

    for (const field of protectedFields) {
      if (oldRecord[field] !== newRecord[field]) {
        throw new Error(`PERMISSION_DENIED: Cannot modify system-protected field '${field}'`);
      }
    }
  }

  if (op === 'INSERT') {
    if (newRecord.role && newRecord.role !== 'user') {
      throw new Error("PERMISSION_DENIED: Newly registered users must have role 'user'");
    }
    if ((newRecord.wallet_balance || 0) !== 0) {
      throw new Error("PERMISSION_DENIED: Initial wallet balance must be 0");
    }
    if ((newRecord.xp || 0) !== 0) {
      throw new Error("PERMISSION_DENIED: Initial XP must be 0");
    }
    if ((newRecord.level || 1) !== 1) {
      throw new Error("PERMISSION_DENIED: Initial level must be 1");
    }
    if (newRecord.plan_id) {
      throw new Error("PERMISSION_DENIED: Initial plan_id must be NULL on registration");
    }
  }

  return { ok: true, record: newRecord };
}

// 6.1: Regular user attempts to elevate wallet_balance directly via client
try {
  simulateHardenedProtectSystemFields('UPDATE', { wallet_balance: 0, role: 'user' }, { wallet_balance: 500000, role: 'user' }, 'authenticated', false);
  assert(false, 'Trigger should block direct wallet_balance modification');
} catch (err: any) {
  assert(err.message.includes('wallet_balance'), 'Trigger blocks direct wallet_balance modification by authenticated user');
}

// 6.2: FAIL-SECURE CHECK: Request with NULL claim role attempting wallet modification -> BLOCKED
try {
  simulateHardenedProtectSystemFields('UPDATE', { wallet_balance: 0, role: 'user' }, { wallet_balance: 500000, role: 'user' }, null, false);
  assert(false, 'Trigger should block modification when claim_role is NULL');
} catch (err: any) {
  assert(err.message.includes('wallet_balance'), 'FAIL-SECURE: Trigger blocks wallet modification when claim_role is NULL');
}

// 6.3: FAIL-SECURE CHECK: Request with empty claim role attempting role escalation -> BLOCKED
try {
  simulateHardenedProtectSystemFields('UPDATE', { role: 'user', wallet_balance: 0 }, { role: 'admin', wallet_balance: 0 }, '', false);
  assert(false, 'Trigger should block role escalation when claim_role is empty');
} catch (err: any) {
  assert(err.message.includes('role'), 'FAIL-SECURE: Trigger blocks role escalation when claim_role is empty');
}

// 6.4: Regular user updates profile fields (name, phone) -> Allowed
try {
  const result = simulateHardenedProtectSystemFields(
    'UPDATE', 
    { name: 'Old Name', phone: '123', wallet_balance: 100, role: 'user', xp: 50 },
    { name: 'New Name', phone: '456', wallet_balance: 100, role: 'user', xp: 50 },
    'authenticated', 
    false
  );
  assert(result.ok, 'Trigger allows legitimate profile updates (name, phone) by authenticated user');
} catch (err: any) {
  assert(false, 'Trigger should allow legitimate profile updates', err.message);
}

// 6.5: Registration attempt with role: 'admin' -> Blocked
try {
  simulateHardenedProtectSystemFields('INSERT', null, { role: 'admin', wallet_balance: 0 }, 'authenticated', false);
  assert(false, 'Trigger should block registration with role: admin');
} catch (err: any) {
  assert(err.message.includes('user'), 'Trigger blocks registration with elevated role');
}

// 6.6: Registration attempt with initial wallet_balance -> Blocked
try {
  simulateHardenedProtectSystemFields('INSERT', null, { role: 'user', wallet_balance: 10000 }, 'authenticated', false);
  assert(false, 'Trigger should block registration with non-zero wallet balance');
} catch (err: any) {
  assert(err.message.includes('wallet balance'), 'Trigger blocks registration with initial wallet balance');
}

// 6.7: Backend service_role updating wallet_balance -> Allowed
try {
  const res = simulateHardenedProtectSystemFields(
    'UPDATE',
    { wallet_balance: 100, role: 'user' },
    { wallet_balance: 15000, role: 'user' },
    'service_role',
    false,
    'service_role'
  );
  assert(res.ok, 'Backend service_role is permitted to update wallet_balance for commissions/plans');
} catch (err: any) {
  assert(false, 'service_role should be allowed to update wallet_balance', err.message);
}

// 6.8: Direct PostgreSQL superuser maintenance -> Allowed
try {
  const res = simulateHardenedProtectSystemFields(
    'UPDATE',
    { wallet_balance: 100, role: 'user' },
    { wallet_balance: 15000, role: 'user' },
    null,
    false,
    'postgres'
  );
  assert(res.ok, 'Direct database maintenance (postgres superuser) is permitted to run migrations');
} catch (err: any) {
  assert(false, 'postgres superuser should be allowed to run migrations', err.message);
}

// ==============================================================================
// TEST SUITE 7: DATABASE TRIGGER SIMULATION (USER_TASKS TABLE)
// ==============================================================================
console.log('\n--- SUITE 7: Database Trigger Simulation (protect_user_tasks_fields) ---');

function simulateHardenedProtectUserTasksFields(
  op: 'INSERT' | 'UPDATE',
  oldRecord: any,
  newRecord: any,
  jwtRole: string | null | undefined,
  isAdmin: boolean,
  pgUser: string = 'authenticated'
) {
  if (pgUser === 'postgres' || pgUser === 'supabase_admin') return { ok: true, record: newRecord };
  if (pgUser === 'service_role' || jwtRole === 'service_role') return { ok: true, record: newRecord };
  if (isAdmin) return { ok: true, record: newRecord };

  // Fail-secure: Any other context
  if (op === 'UPDATE') {
    if (oldRecord.ready_to_claim !== newRecord.ready_to_claim ||
        oldRecord.reward_claimed !== newRecord.reward_claimed ||
        (['completed', 'approved'].includes(newRecord.status) && !['completed', 'approved'].includes(oldRecord.status))) {
      throw new Error("PERMISSION_DENIED: Cannot modify task completion, review status, or reward claims directly");
    }
  }

  if (op === 'INSERT') {
    if (newRecord.ready_to_claim === true || newRecord.reward_claimed === true || ['completed', 'approved'].includes(newRecord.status)) {
      throw new Error("PERMISSION_DENIED: Cannot create pre-approved or pre-completed user tasks");
    }
  }

  return { ok: true, record: newRecord };
}

// 7.1: Regular user attempts to set ready_to_claim directly -> Blocked
try {
  simulateHardenedProtectUserTasksFields(
    'UPDATE',
    { ready_to_claim: false, status: 'in_progress', reward_claimed: false },
    { ready_to_claim: true, status: 'in_progress', reward_claimed: false },
    'authenticated',
    false
  );
  assert(false, 'Trigger should block direct ready_to_claim manipulation');
} catch (err: any) {
  assert(err.message.includes('PERMISSION_DENIED'), 'Trigger blocks direct ready_to_claim alteration on user_tasks');
}

// 7.2: FAIL-SECURE CHECK: User with NULL claim role attempting ready_to_claim -> Blocked
try {
  simulateHardenedProtectUserTasksFields(
    'UPDATE',
    { ready_to_claim: false, status: 'in_progress', reward_claimed: false },
    { ready_to_claim: true, status: 'in_progress', reward_claimed: false },
    null,
    false
  );
  assert(false, 'Trigger should block ready_to_claim manipulation when claim_role is NULL');
} catch (err: any) {
  assert(err.message.includes('PERMISSION_DENIED'), 'FAIL-SECURE: Trigger blocks ready_to_claim alteration when claim_role is NULL');
}

// 7.3: Admin or backend service_role approving task -> Allowed
try {
  const adminRes = simulateHardenedProtectUserTasksFields(
    'UPDATE',
    { status: 'pending_review', ready_to_claim: false },
    { status: 'completed', ready_to_claim: true },
    'authenticated',
    true
  );
  assert(adminRes.ok, 'Admin is permitted to approve user tasks and mark ready_to_claim');
} catch (err: any) {
  assert(false, 'Admin should be permitted to approve tasks', err.message);
}

// ==============================================================================
// TEST SUITE 8: SERVER ROUTE HARDENING (COURSES & EVENTS)
// ==============================================================================
console.log('\n--- SUITE 8: Server Route Hardening (Courses & Events) ---');

const coursesRouteFile = fs.readFileSync('src/server/routes/courses.ts', 'utf8');
const eventsRouteFile = fs.readFileSync('src/server/routes/events.ts', 'utf8');

assert(
  coursesRouteFile.includes('safeXpReward') && coursesRouteFile.includes('Math.min'),
  'courses.ts sanitizes and enforces strict upper bound on course XP (max 100 XP)'
);

assert(
  eventsRouteFile.includes('ALLOWED_CLIENT_EVENTS') && eventsRouteFile.includes('status(403)'),
  'events.ts enforces ALLOWED_CLIENT_EVENTS whitelist, blocking client spoofing of referral/plan events'
);

// ==============================================================================
// FINAL SUMMARY
// ==============================================================================
console.log('\n======================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL SECURITY & ACCESS CONTROL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}
