import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// The regex matched `(?:\s*try\s*\{\s*)?` and removed it.
// Let's add it back right before `const token = `.
// But wait, it could be that I removed the `try {` that was between `if (!authHeader)` and `const token = 
// Actually, let's just make sure every endpoint has a `try {` right after `const token = ...`?
// No, the original code had:
/*
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

    try {
      const token = authHeader.split(' ')[1];
*/

// Let's replace the inserted code:
content = content.replace(/const authHeader = req\.headers\.authorization;\s*if \(!authHeader \|\| !authHeader\.startsWith\('Bearer '\)\) return res\.status\(401\)\.json\(\{ error: '([^']+)' \}\);\s*const token = authHeader\.replace\('Bearer ', ''\)\.trim\(\);\s*if \(!token \|\| token === 'undefined' \|\| token === 'null'\) return res\.status\(401\)\.json\(\{ error: 'Malformed token' \}\);/g, 
  `const authHeader = req.headers.authorization;\n    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: '$1' });\n\n    try {\n      const token = authHeader.replace('Bearer ', '').trim();\n      if (!token || token === 'undefined' || token === 'null') return res.status(401).json({ error: 'Malformed token' });`);

fs.writeFileSync('server.ts', content);
