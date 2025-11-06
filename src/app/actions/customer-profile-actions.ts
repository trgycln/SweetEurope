'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

interface CustomerProfileData {
  ad: string;
  aciklama?: string | null;
  genelIndirimYuzdesi: number;
  siraNo: number;
  locale: string;
}

interface CustomerProfileUpdate extends Partial<CustomerProfileData> {
  aktif?: boolean;
}

export async function createCustomerProfileAction(data: CustomerProfileData) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${data.locale}/login`);

  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (profil?.rol !== 'Yönetici') {
    return { success: false, message: 'Yetkisiz erişim' };
  }

  try {
    const { error } = await (supabase as any)
      .from('musteri_profilleri')
      .insert({
        ad: data.ad,
        aciklama: data.aciklama,
        genel_indirim_yuzdesi: data.genelIndirimYuzdesi,
        sira_no: data.siraNo,
        aktif: true
      });

    if (error) throw error;

    return { success: true, message: 'Müşteri profili başarıyla eklendi' };
  } catch (error: any) {
    console.error('Müşteri profili ekleme hatası:', error);
    
    if (error.code === '23505') {
      return { success: false, message: 'Bu profil adı zaten kullanılıyor' };
    }
    
    return { success: false, message: 'Müşteri profili eklenirken hata oluştu' };
  } finally {
    redirect(`/${data.locale}/admin/crm/musteri-profilleri`);
  }
}

export async function updateCustomerProfileAction(profilId: string, updates: CustomerProfileUpdate, locale: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);

  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (profil?.rol !== 'Yönetici') {
    return { success: false, message: 'Yetkisiz erişim' };
  }

  try {
    const updateData: any = {};
    
    if (updates.ad !== undefined) updateData.ad = updates.ad;
    if (updates.aciklama !== undefined) updateData.aciklama = updates.aciklama;
    if (updates.genelIndirimYuzdesi !== undefined) updateData.genel_indirim_yuzdesi = updates.genelIndirimYuzdesi;
    if (updates.siraNo !== undefined) updateData.sira_no = updates.siraNo;
    if (updates.aktif !== undefined) updateData.aktif = updates.aktif;

    const { error } = await (supabase as any)
      .from('musteri_profilleri')
      .update(updateData)
      .eq('id', profilId);

    if (error) throw error;

    return { success: true, message: 'Müşteri profili başarıyla güncellendi' };
  } catch (error: any) {
    console.error('Müşteri profili güncelleme hatası:', error);
    
    if (error.code === '23505') {
      return { success: false, message: 'Bu profil adı zaten kullanılıyor' };
    }
    
    return { success: false, message: 'Müşteri profili güncellenirken hata oluştu' };
  } finally {
    redirect(`/${locale}/admin/crm/musteri-profilleri`);
  }
}

export async function deleteCustomerProfileAction(profilId: string, locale: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);

  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (profil?.rol !== 'Yönetici') {
    return { success: false, message: 'Yetkisiz erişim' };
  }

  try {
    // Önce kullanımda olup olmadığını kontrol et
    const { data: kullananFirmalar } = await (supabase as any)
      .from('firmalar')
      .select('id')
      .eq('musteri_profil_id', profilId)
      .limit(1);

    if (kullananFirmalar && kullananFirmalar.length > 0) {
      return { success: false, message: 'Bu profil başka firmalar tarafından kullanılıyor, silinemez' };
    }

    // Profili sil
    const { error } = await (supabase as any)
      .from('musteri_profilleri')
      .delete()
      .eq('id', profilId);

    if (error) throw error;

    return { success: true, message: 'Müşteri profili başarıyla silindi' };
  } catch (error: any) {
    console.error('Müşteri profili silme hatası:', error);
    return { success: false, message: 'Müşteri profili silinirken hata oluştu' };
  } finally {
    redirect(`/${locale}/admin/crm/musteri-profilleri`);
  }
}

export async function assignCustomerProfileAction(firmaId: string, profilId: string | null, locale: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);

  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (profil?.rol !== 'Yönetici') {
    return { success: false, message: 'Yetkisiz erişim' };
  }

  try {
    const { error } = await (supabase as any)
      .from('firmalar')
      .update({ musteri_profil_id: profilId })
      .eq('id', firmaId);

    if (error) throw error;

    const message = profilId 
      ? 'Müşteri profili başarıyla atandı' 
      : 'Müşteri profili kaldırıldı';

    return { success: true, message };
  } catch (error: any) {
    console.error('Profil atama hatası:', error);
    return { success: false, message: 'Profil atanırken hata oluştu' };
  } finally {
    redirect(`/${locale}/admin/crm/profil-atamalari`);
  }
}