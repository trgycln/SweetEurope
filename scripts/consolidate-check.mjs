import fs from 'fs';
import path from 'path';

// Let's inspect all SQL files in supabase-migrations and supabase/migrations
const dir1 = 'c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/supabase-migrations';
const dir2 = 'c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/supabase/migrations';

const files1 = fs.readdirSync(dir1).filter(f => f.endsWith('.sql'));
const files2 = fs.readdirSync(dir2).filter(f => f.endsWith('.sql'));

console.log(`Found ${files1.length} files in supabase-migrations and ${files2.length} in supabase/migrations`);
