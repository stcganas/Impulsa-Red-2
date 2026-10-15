import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "  app.post('/api/tasks/complete/:id', async (req, res) => {\n    const authHeader = req.headers.authorization;\n    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });\n\n      const token = authHeader.replace('Bearer ', '').trim();",
  "  app.post('/api/tasks/complete/:id', async (req, res) => {\n    const authHeader = req.headers.authorization;\n    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });\n\n    try {\n      const token = authHeader.replace('Bearer ', '').trim();"
);

content = content.replace(
  "  // Complete a course\n  app.post('/api/courses/complete/:id', async (req, res) => {\n    const authHeader = req.headers.authorization;\n    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });\n\n      const token = authHeader.replace('Bearer ', '').trim();",
  "  // Complete a course\n  app.post('/api/courses/complete/:id', async (req, res) => {\n    const authHeader = req.headers.authorization;\n    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado' });\n\n    try {\n      const token = authHeader.replace('Bearer ', '').trim();"
);

fs.writeFileSync('server.ts', content);
