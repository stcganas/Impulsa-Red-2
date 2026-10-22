/**
 * IMPULSARED - REAL CONTROLLED MIGRATION RUNNER
 * 
 * Validates connection string safety via db_guard, connects using 'pg' client,
 * executes migrations 01 to 06 sequentially within transactions, and stops on error.
 */

import fs from 'fs';
import path from 'path';
import pkg from 'pg';
const { Client } = pkg;
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
  // 1. Guard check before opening any connection
  verifyDisposableLocalDb(connectionString);
  
  console.log('--- STARTING REAL CONTROLLED MIGRATION EXECUTION ---');
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('[MIGRATION] Connected successfully to disposable local PostgreSQL database.');

    for (const file of MIGRATION_FILES) {
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Migration file not found: ${file}`);
      }
      
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      console.log(`[MIGRATION] Executing: ${file} ...`);
      
      // Execute migration SQL
      await client.query(sqlContent);
      
      console.log(`[MIGRATION] ✅ CONFIRMED SUCCESS: ${file}`);
    }
    
    console.log('--- ALL MIGRATIONS EXECUTED AND CONFIRMED SUCCESSFULLY ---');
  } catch (err: any) {
    console.error(`[MIGRATION ERROR] Migration sequence halted due to error: ${err.message}`);
    throw err;
  } finally {
    await client.end();
    console.log('[MIGRATION] Database connection closed.');
  }
}
