'use server';

import { createClient } from '@supabase/supabase-js';
import { Enums, TablesInsert } from '@/lib/supabase/database.types';
import { revalidatePath } from 'next/cache';

export type PartnerApplicationPayload = {
  unvan: string;
  contact_person?: string | null;
  email: string;
  telefon?: string | null;
  adres?: string | null;
  vatId?: string | null;
  message?: string | null;
  locale?: string;
};

export async function submitPartnerApplication(formData: FormData): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Use service role to bypass RLS for public form submissions
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

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
      status: 'ADAY' as Enums<'firma_status'>,
      kaynak: 'Web',
      goruldu: false,
      referans_olarak_goster: false,
    } as any;

    const { data: firma, error } = await supabase
      .from('firmalar')
      .insert(insertData)
      .select('id, unvan')
      .single();

    if (error || !firma) {
      console.error('Partner başvurusu ekleme hatası:', error);
      return { success: false, error: error?.message || 'Başvurunuz kaydedilemedi.' };
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
    // Hata durumunda da redirect yap ama error parametresiyle
    redirect(`/${locale}/register?error=${encodeURIComponent(res.error || 'unknown')}`);
  }
}
