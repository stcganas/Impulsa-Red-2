/**
 * IMPULSARED - DATABASE SAFETY GUARD
 * 
 * Prevents accidental execution of migrations or integration tests against production
 * or shared remote databases. Ensures connections are strictly local and disposable.
 */

export function verifyDisposableLocalDb(connectionStringOrUrl: string): boolean {
  if (!connectionStringOrUrl) {
    throw new Error("SECURITY_GUARD_ERROR: Database connection string is empty or not provided.");
  }

  const lowerUrl = connectionStringOrUrl.toLowerCase();

  // 1. Reject obvious production keywords
  const forbiddenKeywords = ['prod', 'production', 'live', 'supabase.co', 'aws', 'rds', 'heroku', 'neon.tech'];
  for (const kw of forbiddenKeywords) {
    if (lowerUrl.includes(kw)) {
      throw new Error(`SECURITY_GUARD_ERROR: Connection string contains forbidden production keyword '${kw}'. Aborting.`);
    }
  }

  // 2. Enforce local host restriction
  const isLocal = lowerUrl.includes('127.0.0.1') || lowerUrl.includes('localhost') || lowerUrl.includes('0.0.0.0');
  if (!isLocal) {
    throw new Error("SECURITY_GUARD_ERROR: Connection string does not point to localhost (127.0.0.1 or localhost). Aborting.");
  }

  // 3. Enforce disposable test database name
  const isTestDb = lowerUrl.includes('test') || lowerUrl.includes('impulsared_test');
  if (!isTestDb) {
    throw new Error("SECURITY_GUARD_ERROR: Database name must be explicitly disposable (e.g. containing 'test'). Aborting.");
  }

  console.log("🔒 [DB SAFETY GUARD] Connection verified: Strictly local and disposable.");
  return true;
}
