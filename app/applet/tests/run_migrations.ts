/**
 * IMPULSARED - CONTROLLED MIGRATION RUNNER (DRY-RUN / STATIC VALIDATION)
 * 
 * Validates migration file existence and connection string safety via db_guard.
 * Does NOT execute actual database writes or DDL statements in dry-run mode.
 */

import fs from 'fs';
import path from 'path';
import { verifyDisposableLocalDb } from './db_guard.ts';

const MIGRATION_FILES = [
  'migrations/20261016_01_revoke_and_drop_exec_sql.sql',
  'migrations/20261016_02_protect_users_system_fields.sql',
  'migrations/20261016_03_protect_user_tasks.sql',
  'migrations/20261016_04_consolidated_security_remediation.sql',
  'migrations/20261016_05_hardened_security_remediation_v2.sql',
  'migrations/20261016_06_financial_atomic_commission_and_wallet.sql'
];

export async function runMigrations(connectionString: string) {
  verifyDisposableLocalDb(connectionString);
  console.log('--- STARTING CONTROLLED MIGRATION DRY-RUN / STATIC VALIDATION ---');
  
  for (const file of MIGRATION_FILES) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${file}`);
    }
    const stat = fs.statSync(filePath);
    console.log(`[DRY-RUN MIGRATION] Verified file: ${file} (${stat.size} bytes)`);
  }
  
  console.log('--- ALL MIGRATION FILES VALIDATED SUCCESSFULLY (DRY-RUN ONLY: NO SQL EXECUTED) ---');
}
