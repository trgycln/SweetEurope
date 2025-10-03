"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Partner onaylama fonksiyonu güncellendi
export async function approvePartner(application: { id: number, email: string, company_name: string, contact_person: string }) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Kullanıcıyı Supabase Auth'a davet et (bu, trigger'ı çalıştırarak profiles tablosunda boş bir satır oluşturur)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(application.email);
    if (userError) throw userError;

    // 2. Trigger tarafından oluşturulan 'profiles' satırını şirket bilgileriyle güncelle
    if (userData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          company_name: application.company_name,
          contact_person: application.contact_person
        })
        .eq('id', userData.user.id);

      if (profileError) {
        console.error("Profil güncellenirken hata oluştu:", profileError);
        // Hata olsa bile devam edebiliriz, ama loglamak önemli
      }
    }

    // 3. Başvurunun durumunu 'approved' olarak güncelle
    const { error: updateError } = await supabaseAdmin
      .from('partner_applications')
      .update({ status: 'approved' })
      .eq('id', application.id);
    if (updateError) throw updateError;
    
    revalidatePath('/admin/applications');
    return { success: true, message: 'Partner başarıyla onaylandı ve davet edildi.' };

  } catch (error: any) {
    console.error('Partner onaylama hatası:', error);
    return { success: false, message: error.message };
  }
}

export async function rejectPartner(applicationId: number) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin
    .from('partner_applications')
    .update({ status: 'rejected' })
    .eq('id', applicationId);

  if (error) {
    console.error('Başvuru reddedilirken hata:', error);
    return { success: false, message: 'Hata oluştu.' };
  }
  revalidatePath('/admin/applications');
  return { success: true, message: 'Başvuru reddedildi.' };
}