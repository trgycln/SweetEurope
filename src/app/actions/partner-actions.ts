'use server';

import { createClient } from '@supabase/supabase-js';
import { Enums, TablesInsert } from '@/lib/supabase/database.types';
import { revalidatePath } from 'next/cache';
import { sendAdminEmail } from '@/lib/email';

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

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function submitPartnerApplication(formData: FormData): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const supabase = serviceClient();

    const unvan         = (formData.get('unvan')          || '').toString().trim();
    const contact_person= (formData.get('contact_person') || '').toString().trim();
    const email         = (formData.get('email')          || '').toString().trim();
    const telefon       = (formData.get('telefon')        || '').toString().trim();
    const adres         = (formData.get('adres')          || '').toString().trim();
    const vatId         = (formData.get('vatId')          || '').toString().trim();
    const message       = (formData.get('message')        || '').toString().trim();

    if (!unvan || !email) {
      return { success: false, error: 'Zorunlu alanlar eksik.' };
    }

    const insertData: TablesInsert<'firmalar'> = {
      unvan,
      email,
      telefon:              telefon  || null,
      adres:                adres    || null,
      vergi_no:             vatId    || null,
      status:               'ADAY' as Enums<'firma_status'>,
      kaynak:               'Web',
      goruldu:              false,
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

    // ── Admin in-app bildirimi ──────────────────────────────────────────────
    try {
      const { sendNotification } = await import('@/lib/notificationUtils');
      await sendNotification({
        aliciRol: ['Yönetici', 'Ekip Üyesi'] as any,
        icerik: `🆕 Yeni web başvurusu: ${firma.unvan}`,
        link: `/admin/crm/firmalar/${firma.id}`,
        preferenceKey: 'new_partner_applications',
        supabaseClient: supabase as any,
      });
    } catch (notifErr) {
      console.warn('[partner-actions] In-app bildirim gönderilemedi:', notifErr);
    }

    // ── Admin e-posta bildirimi ─────────────────────────────────────────────
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.elysonsweets.de';
      await sendAdminEmail({
        subject: `🆕 Yeni B2B Başvurusu: ${unvan}`,
        replyTo: email,
        html: `
<!DOCTYPE html>
<html lang="tr">
<body style="font-family:sans-serif;background:#f9f9f9;padding:24px;color:#1a1a1a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;padding:32px;border:1px solid #e5e7eb">
    <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:20px">🆕 Yeni Web Başvurusu</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;font-weight:bold;width:130px">Firma:</td><td>${unvan}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Yetkili Kişi:</td><td>${contact_person || '—'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">E-posta:</td><td><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Telefon:</td><td>${telefon || '—'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Adres:</td><td>${adres || '—'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Vergi No:</td><td>${vatId || '—'}</td></tr>
      ${message ? `<tr><td style="padding:6px 0;font-weight:bold;vertical-align:top">Mesaj:</td><td>${message.replace(/\n/g, '<br>')}</td></tr>` : ''}
    </table>
    <div style="margin-top:24px">
      <a href="${appUrl}/tr/admin/crm/firmalar/${firma.id}"
         style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
        Admin panelde görüntüle →
      </a>
    </div>
    <p style="margin-top:20px;font-size:12px;color:#6b7280">
      Bu e-posta ElysonSweets web sitesindeki B2B başvuru formu aracılığıyla otomatik gönderilmiştir.
    </p>
  </div>
</body>
</html>`,
      });
    } catch (emailErr) {
      console.warn('[partner-actions] E-posta gönderilemedi:', emailErr);
    }

    // Sayfaları yenile
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
  if (res.success) {
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
    redirect(`/${locale}/register?error=${encodeURIComponent(res.error || 'unknown')}`);
  }
}
