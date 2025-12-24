import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL exists");
} else {
    console.log("DATABASE_URL missing");
}

if (process.env.POSTGRES_URL) {
    console.log("POSTGRES_URL exists");
} else {
    console.log("POSTGRES_URL missing");
}

if (process.env.SUPABASE_ACCESS_TOKEN) {
    console.log("SUPABASE_ACCESS_TOKEN exists");
} else {
    console.log("SUPABASE_ACCESS_TOKEN missing");
}

if (process.env.SUPABASE_DB_PASSWORD) {
    console.log("SUPABASE_DB_PASSWORD exists");
} else {
    console.log("SUPABASE_DB_PASSWORD missing");
}
