import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supabase.from("kategoriler").select("id, ad, slug, ust_kategori_id").limit(500);
if (error) { console.error(error); process.exit(1); }
const rows = (data || []).map((c) => ({
  id: c.id,
  slug: c.slug,
  ust_kategori_id: c.ust_kategori_id,
  tr: typeof c.ad === 'object' ? c.ad.tr : c.ad,
  de: typeof c.ad === 'object' ? c.ad.de : null,
  en: typeof c.ad === 'object' ? c.ad.en : null,
}));
const filtered = rows.filter((r) => {
  const text = `${r.tr || ''} ${r.de || ''} ${r.en || ''} ${r.slug || ''}`.toLowerCase();
  return text.includes('püre') || text.includes('pure') || text.includes('pasta') || text.includes('puree');
});
console.log(JSON.stringify(filtered, null, 2));
