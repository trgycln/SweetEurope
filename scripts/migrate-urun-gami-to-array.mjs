import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  console.log('Starting migration...');
  
  // Use direct PostgreSQL connection to run schema modifications
  if (!process.env.SUPABASE_DB_URL && !process.env.POSTGRES_URL) {
    console.error('No database URL found in .env.local');
    // Let's check for SUPABASE_DB_URL or DATABASE_URL
    process.exit(1);
  }

  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  const client = new pg.Client({
    connectionString: connectionString,
  });

  await client.connect();

  try {
    console.log('Dropping constraints...');
    await client.query('ALTER TABLE urunler DROP CONSTRAINT IF EXISTS urunler_urun_gami_check;');
    await client.query('ALTER TABLE kategoriler DROP CONSTRAINT IF EXISTS kategoriler_urun_gami_check;');
    
    console.log('Altering urun_gami column type to text[]...');
    await client.query(`
      ALTER TABLE urunler 
      ALTER COLUMN urun_gami TYPE text[] 
      USING CASE 
        WHEN urun_gami IS NOT NULL AND urun_gami != '' THEN ARRAY[urun_gami] 
        ELSE '{}'::text[] 
      END;
    `);

    await client.query(`
      ALTER TABLE kategoriler 
      ALTER COLUMN urun_gami TYPE text[] 
      USING CASE 
        WHEN urun_gami IS NOT NULL AND urun_gami != '' THEN ARRAY[urun_gami] 
        ELSE '{}'::text[] 
      END;
    `);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}
run();
