/**
 * IMPULSARED - DATABASE SAFETY GUARD (FULLY HARDENED)
 * 
 * Validates connection strings using structured URL parsing to prevent
 * accidental execution against production or remote databases.
 * Enforces strict local host whitelist (localhost, 127.0.0.1, [::1]),
 * exact port (5433), and exact test database name (impulsared_test).
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

  // 1. Enforce postgres protocol
  const protocol = parsedUrl.protocol.toLowerCase();
  if (protocol !== 'postgres:' && protocol !== 'postgresql:') {
    throw new Error("SECURITY_GUARD_ERROR: Invalid protocol. Must be postgres or postgresql.");
  }

  // 2. Strict Host Whitelist
  // Must be exactly '127.0.0.1', 'localhost', or '[::1]' (or '::1')
  let hostname = parsedUrl.hostname.toLowerCase();
  // Remove square brackets if present in IPv6 URL representation
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  const allowedHosts = ['127.0.0.1', 'localhost', '::1'];
  if (!allowedHosts.includes(hostname)) {
    throw new Error(`SECURITY_GUARD_ERROR: Host '${hostname}' is forbidden. Only exact local hosts (127.0.0.1, localhost, ::1) are permitted.`);
  }

  // 3. Strict Port Enforcement (Must be 5433)
  const port = parsedUrl.port;
  if (port !== '5433') {
    throw new Error(`SECURITY_GUARD_ERROR: Port '${port}' is forbidden. Only port '5433' is permitted for test isolation.`);
  }

  // 4. Strict Database Name Enforcement (Must be 'impulsared_test')
  const dbName = parsedUrl.pathname.replace(/^\//, '').toLowerCase();
  if (dbName !== 'impulsared_test') {
    throw new Error(`SECURITY_GUARD_ERROR: Database name '${dbName}' is forbidden. Only 'impulsared_test' is permitted.`);
  }

  // 5. Anti-spoofing / Forbidden keyword check on entire string
  const lowerUrl = connectionStringOrUrl.toLowerCase();
  const forbiddenKeywords = ['prod', 'production', 'live', 'supabase.co', 'aws', 'rds', 'heroku', 'neon.tech'];
  for (const kw of forbiddenKeywords) {
    if (lowerUrl.includes(kw)) {
      throw new Error(`SECURITY_GUARD_ERROR: Connection string contains forbidden production keyword '${kw}'. Aborting.`);
    }
  }

  // 6. Fail closed if any ambiguity or wildcard like 0.0.0.0 is used (though hostname check already blocks it)
  if (hostname === '0.0.0.0') {
    throw new Error("SECURITY_GUARD_ERROR: Wildcard address 0.0.0.0 is forbidden.");
  }

  console.log("🔒 [DB SAFETY GUARD] Connection verified: Strictly local, port 5433, impulsared_test.");
  return true;
}
