"use server";

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addMyTaskAction(formData: FormData, locale: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const baslik = (formData.get('baslik') || '').toString().trim();
  const son_tarih = formData.get('son_tarih')?.toString() || null;
  if (!baslik) return { success: false, error: 'Başlık zorunludur.' };

  const { error } = await supabase.from('gorevler').insert({
    sahip_id: user.id,
    atanan_kisi_id: user.id,
    olusturan_kisi_id: user.id,
    baslik,
    son_tarih,
    tamamlandi: false,
  }).single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}

export async function toggleTaskAction(formData: FormData, locale: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const id = formData.get('id')?.toString();
  const tamamlandi = formData.get('tamamlandi')?.toString() === 'true';
  if (!id) return { success: false, error: 'Görev bulunamadı.' };

  const { error } = await supabase.from('gorevler')
    .update({ tamamlandi: !tamamlandi })
    .eq('id', id)
    .eq('sahip_id', user.id)
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${locale}/portal/gorevlerim`);
  return { success: true };
}
