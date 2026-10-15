import fs from 'fs';
fs.writeFileSync('server.ts', fs.readFileSync('server.bak.ts'));
