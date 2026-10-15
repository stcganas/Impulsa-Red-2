import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// Replace standard inline auth checks with robust ones
content = content.replace(/const authHeader = req\.headers\.authorization;\s*if \(!authHeader\) return res\.status\(401\)\.json\({ error: 'No authorization header' }\);\s*const token = authHeader\.split\(' '\)\[1\];/g, 
  `const authHeader = req.headers.authorization;\n      if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No authorization header' });\n      const token = authHeader.replace('Bearer ', '').trim();\n      if (!token || token === 'undefined' || token === 'null') return res.status(401).json({ error: 'Malformed token' });`);

// There might be some variants, like 'No token provided'
content = content.replace(/const authHeader = req\.headers\.authorization;\s*if \(!authHeader\) return res\.status\(401\)\.json\({ error: 'No token provided' }\);\s*const token = authHeader\.split\(' '\)\[1\];/g, 
  `const authHeader = req.headers.authorization;\n      if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });\n      const token = authHeader.replace('Bearer ', '').trim();\n      if (!token || token === 'undefined' || token === 'null') return res.status(401).json({ error: 'Malformed token' });`);

fs.writeFileSync('server.ts', content);
console.log('Refactored inline auth checks');
