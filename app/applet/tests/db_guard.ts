/**
 * IMPULSARED - DATABASE SAFETY GUARD (HARDENED)
 * 
 * Strictly validates connection strings to prevent accidental connection
 * to production, shared databases, or incorrect local ports/hosts.
 * Enforces: Host = 127.0.0.1, Port = 5433, Database = impulsared_test.
 */

export function verifyDisposableLocalDb(connectionStringOrUrl: string): boolean {
  if (!connectionStringOrUrl || typeof connectionStringOrUrl !== 'string') {
    throw new Error("SECURITY_GUARD_ERROR: Connection string is empty, missing, or invalid type.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(connectionStringOrUrl);
  } catch (err: any) {
    throw new Error("SECURITY_GUARD_ERROR: Malformed or unparseable database connection URL.");
  }

  // 1. Enforce protocol
  if (!parsedUrl.protocol.startsWith('postgres') && !parsedUrl.protocol.startsWith('postgresql')) {
    throw new Error("SECURITY_GUARD_ERROR: Invalid protocol. Must be postgres or postgresql.");
  }

  // 2. Enforce exact host restriction (Strictly 127.0.0.1, reject localhost or 0.0.0.0)
  const host = parsedUrl.hostname.toLowerCase();
  if (host !== '127.0.0.1') {
    throw new Error(`SECURITY_GUARD_ERROR: Host '${host}' is forbidden. Only exact local host '127.0.0.1' is permitted.`);
  }

  // 3. Enforce exact port restriction (Strictly 5433)
  const port = parsedUrl.port;
  if (port !== '5433') {
    throw new Error(`SECURITY_GUARD_ERROR: Port '${port}' is forbidden. Only port '5433' is permitted for test isolation.`);
  }

  // 4. Enforce exact test database name (Strictly 'impulsared_test')
  const dbName = parsedUrl.pathname.replace(/^\//, '').toLowerCase();
  if (dbName !== 'impulsared_test') {
    throw new Error(`SECURITY_GUARD_ERROR: Database name '${dbName}' is forbidden. Only 'impulsared_test' is permitted.`);
  }

  // 5. Reject any production keywords in search params or user info just in case
  const lowerUrl = connectionStringOrUrl.toLowerCase();
  const forbiddenKeywords = ['prod', 'production', 'live', 'supabase.co', 'aws', 'rds', 'heroku', 'neon.tech'];
  for (const kw of forbiddenKeywords) {
    if (lowerUrl.includes(kw)) {
      throw new Error(`SECURITY_GUARD_ERROR: Connection string contains forbidden production keyword '${kw}'. Aborting.`);
    }
  }

  console.log("🔒 [DB SAFETY GUARD] Connection verified: Strictly 127.0.0.1:5433/impulsared_test.");
  return true;
}
