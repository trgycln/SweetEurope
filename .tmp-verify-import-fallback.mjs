import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: category } = await supabase.from("kategoriler").select("id").limit(1).single();
const slug = `copilot-import-test-${Date.now()}`;
const payload = {
  ad: { tr: "Copilot Test", de: "Copilot Test", en: "Copilot Test", ar: "??????" },
  aktif: true,
  distributor_alis_fiyati: 10,
  satis_fiyati_alt_bayi: 11,
  satis_fiyati_musteri: 12,
  satis_fiyati_toptanci: 11.5,
  kategori_id: category.id,
  slug,
  stok_miktari: 0,
  stok_esigi: 0,
  urun_gami: "barista-bakery-essentials",
  alis_fiyat_seviyesi: "kutu"
};
const firstTry = await supabase.from("urunler").insert(payload).select("id").single();
console.log("firstTryError=", JSON.stringify(firstTry.error, null, 2));
const { urun_gami, alis_fiyat_seviyesi, satis_fiyati_toptanci, ...fallback } = payload;
const secondTry = await supabase.from("urunler").insert(fallback).select("id").single();
console.log("secondTryError=", JSON.stringify(secondTry.error, null, 2));
console.log("secondTryData=", JSON.stringify(secondTry.data, null, 2));
if (secondTry.data?.id) {
  await supabase.from("urunler").delete().eq("id", secondTry.data.id);
  console.log("cleanup=deleted");
}
