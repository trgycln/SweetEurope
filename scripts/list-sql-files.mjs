import fs from 'fs';
import path from 'path';

const migrationsDir = 'c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/supabase-migrations';
const supabaseMigDir = 'c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/supabase/migrations';

const allFiles = [];

if (fs.existsSync(migrationsDir)) {
  fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .forEach(f => allFiles.push({ path: path.join(migrationsDir, f), name: f }));
}

if (fs.existsSync(supabaseMigDir)) {
  fs.readdirSync(supabaseMigDir)
    .filter(f => f.endsWith('.sql'))
    .forEach(f => allFiles.push({ path: path.join(supabaseMigDir, f), name: f }));
}

console.log(`Found ${allFiles.length} total SQL files.`);
