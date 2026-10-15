import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf8');
const routes = content.match(/app\.(get|post|put|delete|patch)\('\/api\/[^']+'/g);
const uniqueRoutes = [...new Set(routes)].sort();
console.log(uniqueRoutes.join('\n'));
