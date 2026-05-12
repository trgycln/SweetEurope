// src/app/[locale]/products/types.ts

import { Tables } from '@/lib/supabase/database.types';

export type NaehrwertePortion = {
    energie_kj?: number;
    energie_kcal?: number;
    fett?: number;
    davon_gesaettigt?: number;
    kohlenhydrate?: number;
    davon_zucker?: number;
    ballaststoffe?: number;
    eiweiss?: number;
    salz?: number;
};

export type NaehrwerteData = {
    pro_100g?: NaehrwertePortion;
    pro_portion?: NaehrwertePortion & { portion_gramm?: number };
};

export type Urun = Pick<Tables<'urunler'>,
    | 'id' | 'ad' | 'slug' | 'ana_resim_url' | 'galeri_resim_urls'
    | 'kategori_id' | 'teknik_ozellikler' | 'urun_gami'
    | 'birim_agirlik_kg'
    | 'stok_kodu' | 'aciklamalar' | 'lojistik_sinifi'
    | 'stok_miktari'
    | 'created_at'
    // B2B Germany fields
    | 'ean_gtin'
    | 'herkunftsland'
    | 'mindest_bestellmenge'
    | 'mindest_bestellmenge_einheit'
    | 'lagertemperatur_min_celsius'
    | 'lagertemperatur_max_celsius'
    | 'haltbarkeit_monate'
    | 'haltbarkeit_nach_oeffnen_tage'
    | 'zertifikate'
    | 'inhaltsstoffe'
    | 'allergene'
    | 'naehrwerte'
    | 'lieferzeit_werktage'
    | 'produktdatenblatt_url'
    | 'hersteller_name'
    | 'hersteller_land'
    // Pricing & packaging
    | 'satis_fiyati_musteri'
    | 'satis_fiyati_toptanci'
    | 'satis_fiyati_alt_bayi'
    | 'koli_ici_adet'
    | 'palet_ici_adet'
    | 'palet_ici_koli_adet'
> & {
    kategoriler?: Pick<Tables<'kategoriler'>, 'ad' | 'slug' | 'urun_gami'> | null;
    ortalama_puan?: number | null;
    degerlendirme_sayisi?: number | null;
    // New flags (added via migration — optional until deployed)
    is_bestseller?: boolean | null;
    is_featured?: boolean | null;
};

export type Kategori = Pick<Tables<'kategoriler'>, 'id' | 'ad' | 'slug' | 'ust_kategori_id' | 'urun_gami'>;
