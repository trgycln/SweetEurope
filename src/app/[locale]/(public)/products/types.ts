// src/app/[locale]/products/types.ts

import { Tables } from '@/lib/supabase/database.types';

// Urun tipine ana_resim_url alanını ekliyoruz.
// Ayrıca, diğer resimler için "galeri_resim_urls" alanını da ekleyelim (ileride lazım olabilir).
// Review sistemi için ortalama_puan ve degerlendirme_sayisi eklendi
export type Urun = Pick<Tables<'urunler'>, 'id' | 'ad' | 'slug' | 'ana_resim_url' | 'galeri_resim_urls' | 'kategori_id'> & {
    kategoriler?: Pick<Tables<'kategoriler'>, 'ad' | 'slug'> | null;
    ortalama_puan?: number | null;
    degerlendirme_sayisi?: number | null;
};

// Kategori tipi değişmedi
export type Kategori = Pick<Tables<'kategoriler'>, 'id' | 'ad' | 'slug' | 'ust_kategori_id'>;