import fs from 'fs';

const filePath = 'server.ts';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  // If we find the endpoint has 'authenticate, async (req: any, res: any) => {'
  // we check if inside it queries the role
  if (lines[i].includes('authenticate, async (req: any, res: any) => {')) {
    let adminAuthCheckStart = -1;
    let adminAuthCheckEnd = -1;

    for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
      if (lines[j].includes('const { data: profile } = await supabase.from(\'users\').select(\'role\').eq(\'id\',') || lines[j].includes('const { data: profile } = await supabase.from("users").select("role").eq("id"')) {
        adminAuthCheckStart = j;
      }
      if (lines[j].includes("if (profile?.role !== 'admin')") || lines[j].includes('if (profile?.role !== "admin")')) {
         adminAuthCheckEnd = j;
         break;
      }
    }

    if (adminAuthCheckStart !== -1 && adminAuthCheckEnd !== -1) {
      lines[i] = lines[i].replace('authenticate, async', 'authenticate, authorizeAdmin, async');
      
      // If there's a comment right before start (like `// Check if user is admin`), remove it too.
      let startClear = adminAuthCheckStart;
      if (lines[adminAuthCheckStart - 1].includes('// Check if user is admin') || lines[adminAuthCheckStart - 1].includes('// Verify admin')) {
         startClear = adminAuthCheckStart - 1;
      }

      for (let j = startClear; j <= adminAuthCheckEnd; j++) {
        lines[j] = ''; // blank them out
      }
    }
  }
}

fs.writeFileSync('server_refactored_admin.ts', lines.join('\n'));
console.log('Saved to server_refactored_admin.ts');
