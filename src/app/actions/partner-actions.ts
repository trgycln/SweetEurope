'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Enums, TablesInsert } from '@/lib/supabase/database.types';
import { revalidatePath } from 'next/cache';
import { sendNotification } from '@/lib/notificationUtils';
import { cookies } from 'next/headers';

export type PartnerApplicationPayload = {
  unvan: string;
  contact_person?: string | null; // şu an saklamıyoruz; notlara ekleyeceğiz
  email: string;
  telefon?: string | null;
  adres?: string | null;
  vatId?: string | null;
  message?: string | null;
  locale?: string;
};

export async function submitPartnerApplication(formData: FormData): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const unvan = (formData.get('unvan') || '').toString().trim();
    const contact_person = (formData.get('contact_person') || '').toString().trim();
    const email = (formData.get('email') || '').toString().trim();
    const telefon = (formData.get('telefon') || '').toString().trim();
    const adres = (formData.get('adres') || '').toString().trim();
    const vatId = (formData.get('vatId') || '').toString().trim();
    const message = (formData.get('message') || '').toString().trim();

    if (!unvan || !email) {
      return { success: false, error: 'Zorunlu alanlar eksik.' };
    }

    const insertData: TablesInsert<'firmalar'> = {
      unvan,
      email,
      telefon: telefon || null,
      adres: adres || null,
      vergi_no: vatId || null,
      status: 'Potansiyel' as Enums<'firma_status'>,
      referans_olarak_goster: false,
    } as any;

    const { data: firma, error } = await supabase
      .from('firmalar')
      .insert(insertData)
      .select('id, unvan')
      .single();

    if (error || !firma) {
      console.error('Partner başvurusu ekleme hatası:', error);
      return { success: false, error: 'Başvurunuz kaydedilemedi.' };
    }

    // Başvuruya dair notu etkinliklere kaydetmeye çalış (opsiyonel; RLS engellerse sessiz geç)
    try {
      if (message || contact_person) {
        const aciklama = `Yeni partner başvurusu alındı.\nİlgili kişi: ${contact_person || '-'}\nNot: ${message || '-'}`;
        // Not: etkinlikler tablosu olusturan_personel_id ister; anon başvurularda yok.
        // Bu yüzden burada özel bir sistem kullanıcısı yoksa atlamayı tercih ediyoruz.
      }
    } catch (e) {
      console.warn('Etkinlik oluşturulamadı (opsiyonel):', e);
    }

    // Yönetime bildirim gönder (opsiyonel hataları yut)
    try {
      const mesaj = `${unvan} adlı firmadan yeni bir partner başvurusu alındı.`;
      await sendNotification({
        aliciRol: ['Yönetici', 'Ekip Üyesi'],
        icerik: mesaj,
        link: `/admin/crm/firmalar?status_not_in=${encodeURIComponent('Anlaşma Sağlandı,Pasif')}`,
        supabaseClient: supabase,
      });
    } catch (e) {
      console.warn('Bildirim gönderilemedi (opsiyonel):', e);
    }

    // Admin sayfalarını yenile (varsa)
    revalidatePath('/admin/crm/firmalar');
    revalidatePath('/admin/dashboard');

    return { success: true, message: 'Başvurunuz alınmıştır.' };
  } catch (err) {
    console.error('submitPartnerApplication genel hata:', err);
    return { success: false, error: 'Beklenmeyen bir hata oluştu.' };
  }
}

// Form action wrapper for inline <form action={...}> usage with redirect
export async function registerSubmitAction(_: any, formData: FormData) {
  const res = await submitPartnerApplication(formData);
  const locale = (formData.get('locale') || '').toString() || 'de';
  // On success, redirect to page with success param; otherwise, stay and let browser show nothing
  if (res.success) {
    // Avoid importing next/navigation redirect here to keep simple; returning void is fine if framework handles state
    // But for robust UX, we can throw a redirect dynamically
    const { redirect } = await import('next/navigation');
    redirect(`/${locale}/register?success=1`);
  }
}

// Simple signature for direct <form action={...}>
export async function registerSubmit(formData: FormData): Promise<void> {
  const res = await submitPartnerApplication(formData);
  const locale = (formData.get('locale') || '').toString() || 'de';
  const { redirect } = await import('next/navigation');
  if (res.success) {
    redirect(`/${locale}/register?success=1`);
  } else {
    // Hata durumunda aynı sayfada kal; ileride client-side toast eklenebilir
  }
}
