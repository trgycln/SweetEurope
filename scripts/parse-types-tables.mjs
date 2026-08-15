import fs from 'fs';

// Read database.types.ts
const content = fs.readFileSync('c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/src/lib/supabase/database.types.ts', 'utf-8');

// Parse Tables block
const tablesMatch = content.match(/Tables:\s*\{([\s\S]*?)\n\s*Views:/);
if (!tablesMatch) {
  console.error('Could not find Tables block');
  process.exit(1);
}

const tablesSection = tablesMatch[1];
// Find all table names
const tableRegex = /^\s{6}(\w+):\s*\{/gm;
let match;
const tables = [];
while ((match = tableRegex.exec(tablesSection)) !== null) {
  tables.push(match[1]);
}

console.log(`Found ${tables.length} tables in database.types.ts:`, tables);
