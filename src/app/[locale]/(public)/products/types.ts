// src/app/[locale]/products/types.ts

import { Tables } from '@/lib/supabase/database.types';

// Urun tipine ana_resim_url alanını ekliyoruz.
// Ayrıca, diğer resimler için "galeri_resim_urls" alanını da ekleyelim (ileride lazım olabilir).
export type Urun = Pick<Tables<'urunler'>, 'id' | 'ad' | 'slug' | 'ana_resim_url' | 'galeri_resim_urls'> & {
    kategoriler: Pick<Tables<'kategoriler'>, 'ad' | 'slug'> | null
};

// Kategori tipi değişmedi
export type Kategori = Pick<Tables<'kategoriler'>, 'id' | 'ad' | 'slug' | 'ust_kategori_id'>;