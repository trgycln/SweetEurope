"use server";

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addMyCustomerAction(formData: FormData, locale: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Oturum bulunamadı.' };

  const unvan = (formData.get('unvan') || '').toString().trim();
  const telefon = (formData.get('telefon') || '').toString().trim() || null;
  const email = (formData.get('email') || '').toString().trim() || null;
  const adres = (formData.get('adres') || '').toString().trim() || null;

  if (!unvan) return { success: false, error: 'Firma adı zorunludur.' };

  const { error } = await supabase
    .from('firmalar')
    .insert({ unvan, telefon, email, adres, sahip_id: user.id })
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${locale}/portal/musterilerim`);
  return { success: true };
}
