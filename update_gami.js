const { Client } = require('pg');
require('dotenv').config({path: '.env.local'});
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(async () => {
  await client.query('ALTER TABLE urunler DROP CONSTRAINT IF EXISTS urunler_urun_gami_check');
  await client.query('ALTER TABLE kategoriler DROP CONSTRAINT IF EXISTS kategoriler_urun_gami_check');
  console.log('Dropped constraints');
  const r1 = await client.query("UPDATE urunler SET urun_gami = 'barista-bakery-essentials'");
  console.log('Urunler:', r1.rowCount);
  const r2 = await client.query("UPDATE kategoriler SET urun_gami = 'barista-bakery-essentials'");
  console.log('Kategoriler:', r2.rowCount);
  await client.query("ALTER TABLE urunler ADD CONSTRAINT urunler_urun_gami_check CHECK (urun_gami IN ('barista-bakery-essentials', 'frozen-desserts', 'dondurma', 'pastaci', 'barista', 'icecek'))");
  await client.query("ALTER TABLE kategoriler ADD CONSTRAINT kategoriler_urun_gami_check CHECK (urun_gami IN ('barista-bakery-essentials', 'frozen-desserts', 'dondurma', 'pastaci', 'barista', 'icecek'))");
  console.log('Added constraints back');
}).catch(console.error).finally(() => client.end());
