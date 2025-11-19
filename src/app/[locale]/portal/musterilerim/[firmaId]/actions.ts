"use server";

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Tables, Enums } from '@/lib/supabase/database.types';

type FirmaKategori = Enums<'firma_kategori'>;

type UpdateResult = {
  success: boolean;
  data?: Tables<'firmalar'>;
  error?: string;
};

export async function updateMyCustomerAction(formData: FormData, locale: string, firmaId: string): Promise<UpdateResult> {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const unvan = formData.get('unvan') as string | null;
  const kategori = formData.get('kategori') as FirmaKategori | null;
  const telefon = formData.get('telefon') as string | null;
  const email = formData.get('email') as string | null;
  const adres = formData.get('adres') as string | null;

  if (!unvan) {
    return { success: false, error: 'Firma adı gerekli.' };
  }

  const updatedData: Partial<Tables<'firmalar'>> = {};
  if (unvan) updatedData.unvan = unvan;
  if (kategori) updatedData.kategori = kategori; else updatedData.kategori = null;
  if (telefon) updatedData.telefon = telefon; else updatedData.telefon = null;
  if (email) updatedData.email = email; else updatedData.email = null;
  if (adres) updatedData.adres = adres; else updatedData.adres = null;

  const { data, error } = await supabase.from('firmalar')
    .update(updatedData)
    .eq('id', firmaId)
    .eq('sahip_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Müşteri güncelleme hatası:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/${locale}/portal/musterilerim`);
  revalidatePath(`/${locale}/portal/musterilerim/${firmaId}`);
  return { success: true, data };
}

export async function deleteMyCustomerAction(firmaId: string, locale: string): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const { error } = await supabase
    .from('firmalar')
    .delete()
    .eq('id', firmaId)
    .eq('sahip_id', user.id);

  if (error) {
    console.error('Müşteri silme hatası:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/${locale}/portal/musterilerim`);
  return { success: true };
}

export async function addFirmTaskAction(firmaId: string, formData: FormData) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const baslik = (formData.get('baslik') || '').toString().trim();
  const son_tarih = formData.get('son_tarih')?.toString() || null;
  const atanan_kisi_id = formData.get('atanan_kisi_id')?.toString() || user.id;
  const oncelik = (formData.get('oncelik')?.toString() || 'Orta') as 'Düşük' | 'Orta' | 'Yüksek';
  if (!baslik) return { success: false, error: 'Başlık zorunludur.' };

  const { error } = await supabase.from('gorevler').insert({
    sahip_id: user.id,
    atanan_kisi_id,
    olusturan_kisi_id: user.id,
    ilgili_firma_id: firmaId,
    baslik,
    son_tarih,
    oncelik,
    tamamlandi: false,
  }).single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/portal/musterilerim/${firmaId}/gorevler`);
  revalidatePath(`/portal/gorevlerim`);
  revalidatePath(`/portal`);
  return { success: true };
}

export async function yeniKisiEkleAction(firmaId: string, formData: FormData) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const ad_soyad = formData.get('ad_soyad') as string | null;
  const unvan = formData.get('unvan') as string | null;
  const email = formData.get('email') as string | null;
  const telefon = formData.get('telefon') as string | null;

  if (!ad_soyad) {
    return { success: false, error: 'Ad Soyad zorunludur.' };
  }

  const { error } = await supabase.from('dis_kontaklar').insert({
    firma_id: firmaId,
    ad_soyad,
    unvan,
    email,
    telefon,
  }).single();

  if (error) {
    console.error('Kişi ekleme hatası:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/portal/musterilerim/${firmaId}/kisiler`);
  return { success: true };
}

export async function yeniEtkinlikEkleAction(firmaId: string, formData: FormData) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const etkinlik_tipi = formData.get('etkinlik_tipi') as string;
  const aciklama = formData.get('aciklama') as string | null;

  if (!aciklama) {
    return { success: false, error: 'Açıklama zorunludur.' };
  }

  const { error } = await supabase.from('etkinlikler').insert({
    firma_id: firmaId,
    olusturan_personel_id: user.id,
    etkinlik_tipi: etkinlik_tipi as 'Not' | 'Telefon Görüşmesi' | 'Toplantı' | 'E-posta' | 'Teklif',
    aciklama,
  }).single();

  if (error) {
    console.error('Etkinlik ekleme hatası:', error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/portal/musterilerim/${firmaId}/etkinlikler`);
  return { success: true };
}
