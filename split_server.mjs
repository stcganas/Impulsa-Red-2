import fs from 'fs';
import path from 'path';

const serverCode = fs.readFileSync('server.ts', 'utf8');

// Find the API routes definition start comment
const apiRoutesStartId = "// API ROUTES definition starts here...";
const apiRoutesStartIndex = serverCode.indexOf(apiRoutesStartId);
if (apiRoutesStartIndex === -1) {
  console.log("Could not find api routes start marker");
  process.exit(1);
}

// Find the vite middleware block which indicates the end of routes
const viteMiddlewareStr = "if (process.env.NODE_ENV !== 'production')";
const viteIndex = serverCode.indexOf(viteMiddlewareStr);

const startIdx = apiRoutesStartIndex + apiRoutesStartId.length;
const routesBlock = serverCode.substring(startIdx, viteIndex);

// We need a smart way to extract route blocks.
// We can find occurrences of "\n  app." or "\n  // " or "\napp."
// Alternatively, parse top-level statements inside startServer() between startIdx and viteIndex.

let currentIdx = 0;
const chunks = [];
let braceCount = 0;
let inString = false;
let stringChar = '';
let inBlockComment = false;
let inLineComment = false;

let chunkStart = 0;

for (let i = 0; i < routesBlock.length; i++) {
  const char = routesBlock[i];
  const nextChar = routesBlock[i+1] || '';
  const prevChar = routesBlock[i-1] || '';

  if (inBlockComment) {
    if (char === '*' && nextChar === '/') {
      inBlockComment = false;
      i++;
    }
    continue;
  }
  if (inLineComment) {
    if (char === '\n') {
      inLineComment = false;
    }
    continue;
  }

  if (inString) {
    if (char === '\\') {
      i++; // skip escaped char
      continue;
    }
    if (char === stringChar) {
      inString = false;
    }
    continue;
  }

  if (char === '/' && nextChar === '*') {
    inBlockComment = true;
    i++;
    continue;
  }
  if (char === '/' && nextChar === '/') {
    inLineComment = true;
    i++;
    continue;
  }

  if (char === "'" || char === '"' || char === '`') {
    inString = true;
    stringChar = char;
    continue;
  }

  if (char === '{') {
    braceCount++;
  } else if (char === '}') {
    braceCount--;
    if (braceCount === 0) {
      // Possible end of a top level block (e.g. app.get(... { ... }))
      // But wait, there's `);` after the `}` for `app.get()`.
      // Let's find the closing `;` or newline.
      let j = i + 1;
      while (j < routesBlock.length && /\s/.test(routesBlock[j])) j++;
      if (routesBlock[j] === ')') {
        j++;
        while (j < routesBlock.length && /\s/.test(routesBlock[j])) j++;
        if (routesBlock[j] === ';') j++;
      }
      
      chunks.push(routesBlock.substring(chunkStart, j));
      chunkStart = j;
      i = j - 1;
    }
  }
}
// Any remaining
if (chunkStart < routesBlock.length) {
  chunks.push(routesBlock.substring(chunkStart));
}

console.log("Found chunks: ", chunks.length);

const groupedRoutes = {};
// categories: admin, users, tasks, system, etc.
let otherMiddlewares = [];

// Middlewares: authenticate, authorizeAdmin
let middlewaresCode = '';

for (const chunk of chunks) {
  let text = chunk.trim();
  if (!text) continue;

  if (text.startsWith('const authenticate') || text.startsWith('const authorizeAdmin')) {
    middlewaresCode += chunk + '\n';
    continue;
  }
  
  const match = text.match(/app\.(get|post|put|delete|patch|use)\s*\(\s*['"`]([^'"`]+)['"`]/);
  if (match) {
    const route = match[2];
    let group = 'system';
    
    if (route.startsWith('/api/admin')) group = 'admin';
    else if (route.startsWith('/api/user') || route.startsWith('/api/account')) group = 'users';
    else if (route.startsWith('/api/task')) group = 'tasks';
    else if (route.startsWith('/api/plan')) group = 'plans';
    else if (route.startsWith('/api/referral') || route.startsWith('/api/team')) group = 'referrals';
    else if (route.startsWith('/api/ticket')) group = 'tickets';
    else if (route.startsWith('/api/withdraw') || route.startsWith('/api/transaction')) group = 'wallet';
    else if (route.startsWith('/api/course')) group = 'courses';
    else if (route.startsWith('/api/event')) group = 'events';
    else if (route.startsWith('/api/mentor')) group = 'mentor';
    else if (route.startsWith('/api/upload')) group = 'upload';
    else if (route.startsWith('/api/auth')) group = 'auth';
    
    if (!groupedRoutes[group]) groupedRoutes[group] = [];
    // replace `app.` with `router.`
    let replacedChunk = chunk.replace(/app\.(get|post|put|delete|patch|use)\s*\(/, 'router.$1(');
    groupedRoutes[group].push(replacedChunk);
  } else {
    otherMiddlewares.push(chunk);
  }
}

// Generate files!
fs.mkdirSync('src/server/routes', { recursive: true });

let indexExports = '';
let appUses = '';

for (const group in groupedRoutes) {
  let fileContent = `import { Router } from 'express';\n\n`;
  fileContent += `export function ${group}Routes(services: any) {\n`;
  fileContent += `  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;\n`;
  fileContent += `  const router = Router();\n\n`;
  
  for (const chunk of groupedRoutes[group]) {
    fileContent += chunk + '\n';
  }
  
  fileContent += `  return router;\n}\n`;
  fs.writeFileSync(`src/server/routes/${group}.ts`, fileContent);
  
  indexExports += `export { ${group}Routes } from './${group}.ts';\n`;
  appUses += `  app.use(${group}Routes({ supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile }));\n`;
}

fs.writeFileSync('src/server/routes/index.ts', indexExports);

// Now rewrite server.ts
const pre = serverCode.substring(0, startIdx);
const stringToInject = `\n` + middlewaresCode + `\n` + otherMiddlewares.join('\n') + `\n\n  // Modular Routes\n` + appUses + `\n`;
const post = serverCode.substring(viteIndex);

// wait, we need to add import to server.ts
const importsToInject = `\nimport {\n  ${Object.keys(groupedRoutes).map(k => `${k}Routes`).join(',\n  ')}\n} from './src/server/routes/index.ts';\n`;

const finalServerTs = serverCode.substring(0, serverCode.indexOf('dotenv.config();')) + importsToInject + serverCode.substring(serverCode.indexOf('dotenv.config();'), startIdx) + stringToInject + post;

fs.writeFileSync('server_modularized.ts', finalServerTs);
console.log('Modularization complete: server_modularized.ts');

