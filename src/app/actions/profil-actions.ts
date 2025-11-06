'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function updateUserLanguage(language: 'de' | 'tr' | 'en' | 'ar') {
  console.log('🔧 [SERVER] updateUserLanguage çağrıldı, yeni dil:', language);
  
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    
    console.log('🔐 [SERVER] Auth kontrolü yapılıyor...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [SERVER] Auth hatası:', authError);
      return { success: false, error: 'Kullanıcı bulunamadı' };
    }

    console.log('👤 [SERVER] Kullanıcı ID:', user.id);
    console.log('💾 [SERVER] Database güncelleniyor...');

    const { error } = await supabase
      .from('profiller')
      .update({ tercih_edilen_dil: language })
      .eq('id', user.id);

    if (error) {
      console.error('❌ [SERVER] Database güncelleme hatası:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ [SERVER] Database UPDATE komutu başarılı');

    // Database'e yazıldığından emin olmak için verify edelim
    console.log('🔍 [SERVER] Verify ediliyor...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiller')
      .select('tercih_edilen_dil')
      .eq('id', user.id)
      .single();

    if (verifyError) {
      console.error('❌ [SERVER] Verify hatası:', verifyError);
    } else {
      console.log('✅ [SERVER] Verify: Database\'deki değer:', verifyData.tercih_edilen_dil);
      if (verifyData.tercih_edilen_dil !== language) {
        console.error('⚠️ [SERVER] UYARI: Database değeri beklenen değerden farklı!');
        console.error('   Beklenen:', language);
        console.error('   Mevcut:', verifyData.tercih_edilen_dil);
      }
    }

    // Tüm sayfaları yeniden doğrula - cache'i tamamen temizle
    console.log('🗑️ [SERVER] Cache temizleniyor...');
    revalidatePath('/', 'layout');
    revalidatePath('/admin');
    revalidatePath('/admin/profil');
    
    console.log('✅ [SERVER] updateUserLanguage tamamlandı başarıyla');
    return { success: true };
  } catch (error) {
    console.error('💥 [SERVER] Beklenmeyen hata:', error);
    return { success: false, error: 'Beklenmeyen bir hata oluştu' };
  }
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
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return { data: null, error: 'Kullanıcı bulunamadı' };
    }

    const { data: profile, error } = await supabase
      .from('profiller')
      .select('tam_ad, tercih_edilen_dil, rol')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Profile query error:', error);
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
  } catch (e) {
    console.error('getUserProfile server action error:', e);
    return { data: null, error: 'Server action failed' };
  }
}
