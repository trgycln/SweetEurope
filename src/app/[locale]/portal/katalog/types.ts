import { Tables } from "@/lib/supabase/database.types";

export type ProduktMitPreis = Tables<'urunler'> & { partnerPreis: number | null };
export type Kategorie = Pick<Tables<'kategoriler'>, 'id' | 'ad' | 'ust_kategori_id' | 'slug'>;
