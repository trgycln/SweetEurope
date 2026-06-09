"use server";

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export async function addMyTaskAction(formData: FormData, locale: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await getGlobalCachedUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const baslik = (formData.get('baslik') || '').toString().trim();
  const son_tarih = formData.get('son_tarih')?.toString() || null;
  const oncelikRaw = formData.get('oncelik');
  const oncelik = (oncelikRaw === 'Düşük' || oncelikRaw === 'Yüksek') ? (oncelikRaw as any) : 'Orta';
  if (!baslik) return { success: false, error: 'Başlık zorunludur.' };

  const { error } = await supabase.from('gorevler').insert({
    sahip_id: user.id,
    olusturan_kisi_id: user.id,
    atanan_kisi_id: user.id,
    baslik,
    son_tarih: son_tarih || null,
    oncelik,
    tamamlandi: false,
    durum: 'Yapılacak',
  } as any);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}

export async function toggleTaskAction(formData: FormData, locale: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await getGlobalCachedUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const id = formData.get('id')?.toString();
  const tamamlandi = formData.get('tamamlandi')?.toString() === 'true';
  if (!id) return { success: false, error: 'Görev bulunamadı.' };

  const yeniTamamlandi = !tamamlandi;
  const { error } = await supabase.from('gorevler')
    .update({
      tamamlandi: yeniTamamlandi,
      durum: yeniTamamlandi ? 'Tamamlandı' : 'Yapılacak',
    })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}

export async function deleteTaskAction(formData: FormData, locale: string) {
  const id = (formData.get('id') || '').toString();
  if (!id) return { success: false, error: 'Görev bulunamadı.' };

  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await getGlobalCachedUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const { error } = await supabase.from('gorevler')
    .delete()
    .eq('id', id)
    .eq('sahip_id', user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}

// Görev durumu güncelle (Kanban kolon değiştirme)
export async function updateGorevDurumAction(
  gorevId: string,
  yeniDurum: string,
  locale: string
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await getGlobalCachedUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const tamamlandi = yeniDurum === 'Tamamlandı';
  const { error } = await supabase
    .from('gorevler')
    .update({ durum: yeniDurum, tamamlandi })
    .eq('id', gorevId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}

// Alt görev ekle
export async function addAltGorevAction(
  gorevId: string,
  baslik: string,
  locale: string
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await getGlobalCachedUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const { error } = await supabase
    .from('alt_gorevler')
    .insert({ gorev_id: gorevId, baslik, tamamlandi: false });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}

// Alt görev tamamla/geri al
export async function toggleAltGorevAction(
  altGorevId: string,
  tamamlandi: boolean,
  locale: string
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { error } = await supabase
    .from('alt_gorevler')
    .update({ tamamlandi: !tamamlandi })
    .eq('id', altGorevId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}

// Alt görev düzenle
export async function editAltGorevAction(
  altGorevId: string,
  baslik: string,
  locale: string
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { error } = await supabase
    .from('alt_gorevler')
    .update({ baslik })
    .eq('id', altGorevId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}

// Alt görev sil
export async function deleteAltGorevAction(
  altGorevId: string,
  locale: string
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { error } = await supabase
    .from('alt_gorevler')
    .delete()
    .eq('id', altGorevId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}


// Not ekle
export async function addGorevNotuAction(
  gorevId: string,
  notMetni: string,
  locale: string
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await getGlobalCachedUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const { error } = await supabase
    .from('gorev_notlari')
    .insert({ gorev_id: gorevId, kullanici_id: user.id, not_metni: notMetni });

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}

// Not sil
export async function deleteGorevNotuAction(
  notId: string,
  locale: string
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { error } = await supabase
    .from('gorev_notlari')
    .delete()
    .eq('id', notId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}

// Görev güncelle (tarih, öncelik, başlık)
export async function updateGorevAction(
  gorevId: string,
  updates: { baslik?: string; son_tarih?: string | null; oncelik?: string; aciklama?: string },
  locale: string
) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await getGlobalCachedUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const { error } = await supabase
    .from('gorevler')
    .update(updates)
    .eq('id', gorevId);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}
