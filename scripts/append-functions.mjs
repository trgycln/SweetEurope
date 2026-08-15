import fs from 'fs';
import path from 'path';

const basePath = 'c:/Users/User/Projeler (Web Sayfalari)/sweetheaven-germany';
let currentSql = fs.readFileSync(path.join(basePath, 'FULL_DATABASE_SETUP.sql'), 'utf-8');

const functionFiles = [
  'create_notification_function.sql',
  'create_detailed_pl_report_function.sql',
  'auto_finance_and_stock_on_siparis_teslim.sql',
  'create_satis_ve_stok_guncelleme_fonksiyonu.sql',
  'trigger_auto_update_son_etkilesim.sql'
];

currentSql += '\n-- ========================================================\n-- 4. CUSTOM FUNCTIONS & TRIGGERS\n-- ========================================================\n';

for (const f of functionFiles) {
  const filePath = path.join(basePath, 'supabase-migrations', f);
  if (fs.existsSync(filePath)) {
    currentSql += `\n-- Function from ${f}:\n` + fs.readFileSync(filePath, 'utf-8') + '\n';
  }
}

fs.writeFileSync(path.join(basePath, 'FULL_DATABASE_SETUP.sql'), currentSql);
console.log('Appended functions to FULL_DATABASE_SETUP.sql');
