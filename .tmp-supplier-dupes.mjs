import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const normalize = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/\b(a\.?\s*s\.?|gmbh|ltd\.?|limited|inc\.?|llc|corp\.?|co\.?|kg|ag|bv|sa|sas|sarl|holding|group|grup)\b/gi, " ")
  .replace(/[^a-z0-9]/g, "")
  .trim();
const { data: suppliers, error } = await supabase.from("tedarikciler").select("id, unvan").limit(2000);
if (error) { console.error(error); process.exit(1); }
const grouped = {};
for (const s of (suppliers || [])) {
  const key = normalize(s.unvan) || `id:${s.id}`;
  grouped[key] = grouped[key] || [];
  grouped[key].push(s.unvan);
}
const dupes = Object.entries(grouped).filter(([, items]) => items.length > 1).slice(0, 20);
console.log(JSON.stringify({ totalDuplicateGroups: Object.values(grouped).filter((items) => items.length > 1).length, sample: dupes }, null, 2));
