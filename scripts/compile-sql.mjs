import fs from 'fs';
import path from 'path';

const dirs = [
  'c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/supabase-migrations',
  'c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/supabase/migrations'
];

let allSql = [];

// Order of priority or just collection
for (const dir of dirs) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));
    for (const f of files) {
      const content = fs.readFileSync(path.join(dir, f), 'utf-8');
      allSql.push({ file: f, content });
    }
  }
}

console.log(`Read ${allSql.length} SQL files total.`);
