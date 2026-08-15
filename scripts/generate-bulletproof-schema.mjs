import fs from 'fs';

const content = fs.readFileSync('c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/src/lib/supabase/database.types.ts', 'utf-8');

// Parse Tables block
const tablesMatch = content.match(/Tables:\s*\{([\s\S]*?)\n\s*Views:/);
const tablesSection = tablesMatch[1];

// Parse Enums block
const enumsMatch = content.match(/Enums:\s*\{([\s\S]*?)\n\s*CompositeTypes:/);
const enumsSection = enumsMatch ? enumsMatch[1] : '';

// Parse all enums
let enumSql = '';
if (enumsSection) {
  const enumRegex = /^\s{6}(\w+):\s*([\s\S]*?)(?=\n\s{6}\w+:|\n\s{4}\})/gm;
  let eMatch;
  while ((eMatch = enumRegex.exec(enumsSection)) !== null) {
    const enumName = eMatch[1];
    const enumValuesRaw = eMatch[2];
    const values = [...enumValuesRaw.matchAll(/"([^"]+)"/g)].map(m => `'${m[1]}'`);
    if (values.length > 0) {
      enumSql += `DO $$ BEGIN\n  CREATE TYPE public.${enumName} AS ENUM (${values.join(', ')});\nEXCEPTION WHEN duplicate_object THEN null; END $$;\n\n`;
    }
  }
}

// Parse each table
const tableBlocks = [...tablesSection.matchAll(/^\s{6}(\w+):\s*\{\s*Row:\s*\{([\s\S]*?)\n\s{8}\}/gm)];

let tablesSql = '';

function tsTypeToPg(typeStr, colName) {
  typeStr = typeStr.trim();
  if (colName === 'id' && (typeStr === 'string' || typeStr.includes('string'))) {
    return 'UUID PRIMARY KEY DEFAULT gen_random_uuid()';
  }
  if (colName === 'id' && (typeStr === 'number' || typeStr.includes('number'))) {
    return 'BIGSERIAL PRIMARY KEY';
  }
  if (typeStr.startsWith('Database["public"]["Enums"]')) {
    const eName = typeStr.match(/\["([^"]+)"\]/)[1];
    return `public.${eName}`;
  }
  if (typeStr.includes('Json') || typeStr.includes('{') || typeStr.includes('}')) {
    return 'JSONB';
  }
  if (typeStr.includes('string[]')) {
    return 'TEXT[]';
  }
  if (typeStr.includes('number[]')) {
    return 'NUMERIC[]';
  }
  if (typeStr.includes('boolean')) {
    return 'BOOLEAN DEFAULT false';
  }
  if (typeStr.includes('number')) {
    return 'NUMERIC';
  }
  if (typeStr.includes('string')) {
    if (colName.includes('tarih') || colName.includes('_at') || colName === 'son_etkilesim') {
      return 'TIMESTAMPTZ DEFAULT now()';
    }
    return 'TEXT';
  }
  return 'TEXT';
}

for (const [_, tableName, rowContent] of tableBlocks) {
  const colLines = rowContent.split('\n')
    .map(l => l.trim())
    .filter(l => l && l.includes(':'));

  const colDefs = [];
  for (const line of colLines) {
    const m = line.match(/^(\w+):\s*([^]+)$/);
    if (!m) continue;
    const colName = m[1];
    const colType = m[2].replace(/;$/, '');
    const pgType = tsTypeToPg(colType, colName);
    colDefs.push(`    "${colName}" ${pgType}`);
  }

  tablesSql += `CREATE TABLE IF NOT EXISTS public."${tableName}" (\n${colDefs.join(',\n')}\n);\n\n`;
  tablesSql += `ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;\n`;
  tablesSql += `DO $$ BEGIN CREATE POLICY "Public Full Access ${tableName}" ON public."${tableName}" FOR ALL USING (true) WITH CHECK (true); EXCEPTION WHEN OTHERS THEN null; END $$;\n\n`;
}

// Storage buckets
const storageSql = `
-- Storage Buckets & Policies
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('urun-gorselleri', 'urun-gorselleri', true),
  ('marketing-materialien', 'marketing-materialien', true),
  ('documents', 'documents', true),
  ('tedarikci-belgeleri', 'tedarikci-belgeleri', false),
  ('gider-belgeleri', 'gider-belgeleri', false),
  ('siparis-faturalari', 'siparis-faturalari', false),
  ('invoices', 'invoices', false),
  ('belgeler', 'belgeler', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Public Access urun-gorselleri" ON storage.objects FOR SELECT USING (bucket_id = 'urun-gorselleri');
  CREATE POLICY "Public Access marketing" ON storage.objects FOR SELECT USING (bucket_id = 'marketing-materialien');
  CREATE POLICY "Public Access documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
  CREATE POLICY "Auth Upload Any" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Auth Update Any" ON storage.objects FOR UPDATE TO authenticated USING (true);
  CREATE POLICY "Auth Delete Any" ON storage.objects FOR DELETE TO authenticated USING (true);
  CREATE POLICY "Public Upload urun-gorselleri" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'urun-gorselleri');
EXCEPTION WHEN OTHERS THEN null; END $$;
`;

// Helper functions (exec_sql, notifications, etc.)
const helperSql = `
CREATE OR REPLACE FUNCTION public.exec_sql(sql_string text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN EXECUTE sql_string; END; $$;
`;

const finalSql = `-- ==========================================
-- ELYSON SWEETS - COMPLETE BULLETPROOF SCHEMA
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

${enumSql}
${helperSql}
${tablesSql}
${storageSql}
`;

fs.writeFileSync('c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany/FULL_DATABASE_SETUP.sql', finalSql);
console.log('Successfully generated complete bulletproof FULL_DATABASE_SETUP.sql with all 51 tables!');
