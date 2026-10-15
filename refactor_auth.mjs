import fs from 'fs';

const filePath = 'server.ts';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].match(/app\.(get|post|put|delete|patch)\('([^']+)',\s*async\s*\(req,\s*res\)\s*=>\s*\{/)) {
    let authBlockStart = -1;
    let authBlockEnd = -1;
    let userVarName = 'user';

    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      if (lines[j].includes('const authHeader = req.headers.authorization;')) {
        authBlockStart = j;
      }
      const userMatch = lines[j].match(/const\s*\{\s*data:\s*\{\s*user(?:\s*:\s*([a-zA-Z0-9_]+))?\s*\}/);
      if (userMatch) {
        userVarName = userMatch[1] || 'user';
      }
      if (lines[j].includes('return res.status(401)')) {
         if (lines[j].includes('authError ||') || lines[j].includes('!user') || lines[j].includes('!authUser') || lines[j].includes('!adminUser')) {
           authBlockEnd = j;
           break;
         } else if (lines[j-1] && (lines[j-1].includes('authError ||') || lines[j-1].includes('!user') || lines[j-1].includes('!authUser') || lines[j-1].includes('!adminUser'))) {
           if (lines[j+1] && lines[j+1].includes('}')) {
              authBlockEnd = j + 1;
           } else {
              authBlockEnd = j;
           }
           break;
         }
      }
    }

    if (authBlockStart !== -1 && authBlockEnd !== -1) {
      lines[i] = lines[i].replace(/async\s*\(req,\s*res\)\s*=>/, 'authenticate, async (req: any, res: any) =>');
      
      let tryFound = false;
      for (let j = authBlockStart; j <= authBlockEnd; j++) {
        if (lines[j].includes('try {')) {
           tryFound = true;
        }
        lines[j] = ''; // blank them out
      }
      
      let codeToInsert = "    const " + userVarName + " = req.user;";
      if (tryFound) {
         codeToInsert = "    try {\n" + codeToInsert;
      }
      
      lines[authBlockEnd] = codeToInsert;
    }
  }
}

fs.writeFileSync('server_refactored.ts', lines.join('\n'));
console.log('Saved to server_refactored.ts');
