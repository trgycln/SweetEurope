'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function updateUserLanguage(language: 'de' | 'tr' | 'en' | 'ar') {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Kullanıcı bulunamadı' };
  }

  const { error } = await supabase
    .from('profiller')
    .update({ tercih_edilen_dil: language })
    .eq('id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateUserPassword(currentPassword: string, newPassword: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Kullanıcı bulunamadı' };
  }

  // Mevcut şifreyi doğrula
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    return { success: false, error: 'Mevcut şifre yanlış' };
  }

  // Yeni şifreyi güncelle
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function getUserProfile() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { data: null, error: 'Kullanıcı bulunamadı' };
  }

  const { data: profile, error } = await supabase
    .from('profiller')
    .select('tam_ad, tercih_edilen_dil, rol')
    .eq('id', user.id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Auth'dan email al, profiller'den tam_ad al
  return { 
    data: {
      tam_ad: profile.tam_ad || '',
      email: user.email || '',
      telefon: null, // profiller tablosunda yok
      tercih_edilen_dil: profile.tercih_edilen_dil,
      rol: profile.rol,
    }, 
    error: null 
  };
}
