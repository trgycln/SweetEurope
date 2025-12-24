"use server";

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type CreateOverridePayload = {
  urunId: string;
  firmaId: string;
  kanal: 'Müşteri' | 'Alt Bayi';
  ozelFiyatNet: number;
  baslangicTarihi?: string | null; // YYYY-MM-DD
  bitisTarihi?: string | null;     // YYYY-MM-DD
  aciklama?: string | null;
  locale?: string;
};

export async function createCustomerOverrideAction(p: CreateOverridePayload) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı' };

  const { error } = await (supabase as any)
    .from('musteri_fiyat_istisnalari')
    .insert({
      urun_id: p.urunId,
      firma_id: p.firmaId,
      kanal: p.kanal,
      ozel_fiyat_net: p.ozelFiyatNet,
      baslangic_tarihi: p.baslangicTarihi || null,
      bitis_tarihi: p.bitisTarihi || null,
      aciklama: p.aciklama || null,
    });
  if (error) {
    const e: any = error;
    console.error('Override eklenemedi:', { message: e?.message, details: e?.details, hint: e?.hint, code: e?.code });
    return { error: 'Veritabanı hatası' };
  }
  revalidatePath(`/${p.locale ?? ''}/admin/urun-yonetimi/fiyatlandirma-hub`);
  return { success: true };
}

export async function deleteCustomerOverrideAction(id: string, locale?: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { error } = await (supabase as any)
    .from('musteri_fiyat_istisnalari')
    .delete()
    .eq('id', id);
  if (error) {
    const e: any = error;
    console.error('Override silinemedi:', { message: e?.message, details: e?.details, hint: e?.hint, code: e?.code });
    return { error: 'Veritabanı hatası' };
  }
  revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/fiyatlandirma-hub`);
  return { success: true };
}

export type CreateRulePayload = {
  ad: string;
  kapsam: 'global' | 'kategori' | 'urun';
  kanal: 'Müşteri' | 'Alt Bayi';
  firmaId?: string | null;
  kategoriId?: string | null;
  urunId?: string | null;
  minAdet?: number | null;
  yuzdeDegisim: number; // negatif indirim, pozitif artış
  oncelik?: number | null;
  baslangicTarihi?: string | null;
  bitisTarihi?: string | null;
  aciklama?: string | null;
  locale?: string;
};

export async function createPricingRuleAction(p: CreateRulePayload) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı' };

  const { error } = await (supabase as any)
    .from('fiyat_kurallari')
    .insert({
      ad: p.ad,
      kapsam: p.kapsam,
      kanal: p.kanal,
      firma_id: p.firmaId || null,
      kategori_id: p.kategoriId || null,
      urun_id: p.urunId || null,
      min_adet: p.minAdet ?? 0,
      yuzde_degisim: p.yuzdeDegisim,
      oncelik: p.oncelik ?? 100,
      baslangic_tarihi: p.baslangicTarihi || null,
      bitis_tarihi: p.bitisTarihi || null,
      aciklama: p.aciklama || null,
    });
  if (error) {
    const e: any = error;
    console.error('Kural eklenemedi:', { message: e?.message, details: e?.details, hint: e?.hint, code: e?.code });
    return { error: 'Veritabanı hatası' };
  }
  revalidatePath(`/${p.locale ?? ''}/admin/urun-yonetimi/fiyatlandirma-hub`);
  return { success: true };
}

export async function deletePricingRuleAction(id: string, locale?: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { error } = await (supabase as any)
    .from('fiyat_kurallari')
    .delete()
    .eq('id', id);
  if (error) {
    const e: any = error;
    console.error('Kural silinemedi:', { message: e?.message, details: e?.details, hint: e?.hint, code: e?.code });
    return { error: 'Veritabanı hatası' };
  }
  revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/fiyatlandirma-hub`);
  return { success: true };
}
