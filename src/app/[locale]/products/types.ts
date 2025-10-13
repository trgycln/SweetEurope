// src/app/[locale]/products/types.ts
import { Tables } from '@/lib/supabase/database.types';

export type Urun = Pick<Tables<'urunler'>, 'id' | 'ad' | 'slug'> & {
    kategoriler: Pick<Tables<'kategoriler'>, 'ad' | 'slug'> | null
};

export type Kategori = Pick<Tables<'kategoriler'>, 'id' | 'ad' | 'slug' | 'ust_kategori_id'>;