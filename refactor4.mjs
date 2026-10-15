import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// I will just read all lines, and if a line contains:
// '    try {'
// followed by '      const token = authHeader.replace('Bearer ', '').trim();'
// I will check if there's a 'catch' before the next 'app.post' or 'app.get' or 'app.put' or 'app.delete'.

// Actually, let me just undo ALL my changes from refactor3.mjs:
content = content.replace(/\n    try \{\n      const token = authHeader\.replace\('Bearer ', ''\)\.trim\(\);\n      if \(!token \|\| token === 'undefined' \|\| token === 'null'\) return res\.status\(401\)\.json\(\{ error: 'Malformed token' \}\);/g, 
  `\n      const token = authHeader.replace('Bearer ', '').trim();\n      if (!token || token === 'undefined' || token === 'null') return res.status(401).json({ error: 'Malformed token' });`);

fs.writeFileSync('server.ts', content);
console.log('Undid try blocks');
