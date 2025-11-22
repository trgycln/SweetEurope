"use server";

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addGiderAction(formData: FormData, locale: string) {
  const cookieStore = cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const tarih = formData.get('gider_tarih')?.toString() || '';
  const kategori = formData.get('gider_kategori')?.toString() || null;
  const aciklama = formData.get('gider_aciklama')?.toString() || null;
  const tutar = Number(formData.get('gider_tutar') || 0);

  if (!tarih || !tutar) return { success: false, error: 'Tarih ve tutar zorunludur.' };

  const { error } = await supabase
    .from('alt_bayi_giderleri')
    .insert({ sahip_id: user.id, tarih, kategori, aciklama, tutar })
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${locale}/portal/finanslarim`);
  return { success: true };
}

export async function updateGiderAction(giderId: string, formData: FormData, locale: string) {
  const cookieStore = cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const tarih = formData.get('gider_tarih')?.toString() || '';
  const kategori = formData.get('gider_kategori')?.toString() || null;
  const aciklama = formData.get('gider_aciklama')?.toString() || null;
  const tutar = Number(formData.get('gider_tutar') || 0);

  if (!tarih || !tutar) return { success: false, error: 'Tarih ve tutar zorunludur.' };

  const { error } = await supabase
    .from('alt_bayi_giderleri')
    .update({ tarih, kategori, aciklama, tutar })
    .eq('id', giderId)
    .eq('sahip_id', user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${locale}/portal/finanslarim`);
  return { success: true };
}

export async function deleteGiderAction(giderId: string, locale: string) {
  const cookieStore = cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const { error } = await supabase
    .from('alt_bayi_giderleri')
    .delete()
    .eq('id', giderId)
    .eq('sahip_id', user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${locale}/portal/finanslarim`);
  return { success: true };
}

type AddSatisPayload = {
  bayiFirmaId: string;
  musteriId: string;
  items: {
    urun_id: string;
    adet: number;
    birim_fiyat_net: number;
  }[];
  locale: string;
};

export async function addSatisAction(payload: AddSatisPayload) {
  const { bayiFirmaId, musteriId, items, locale } = payload;
  
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  if (!bayiFirmaId || !musteriId || !items || items.length === 0) {
    return { success: false, error: 'Eksik bilgi: Müşteri ve ürünler zorunludur.' };
  }

  try {
    // RPC fonksiyonunu çağır
    const { data, error } = await supabase.rpc('alt_bayi_satis_olustur_ve_stok_dus', {
      p_bayi_firma_id: bayiFirmaId,
      p_musteri_id: musteriId,
      p_satis_detaylari: items
    });

    if (error) {
      console.error('Satış oluşturma RPC hatası:', error);
      throw new Error(error.message);
    }

    revalidatePath(`/${locale}/portal/finanslarim`);
    revalidatePath(`/${locale}/portal/stoklarim`);
    revalidatePath(`/${locale}/portal/musterilerim/${musteriId}/siparisler`);
    revalidatePath(`/${locale}/portal/musterilerim/${musteriId}`);
    
    return { success: true, data };

  } catch (error: any) {
    console.error('Satış ekleme işlemi sırasında genel hata:', error);
    return { success: false, error: error.message || 'Bilinmeyen bir hata oluştu.' };
  }
}
