'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { sendAdminEmail, sendCustomerEmail } from '@/lib/email';

export type PartnerApplicationPayload = {
  unvan: string;
  contact_person?: string | null;
  email: string;
  telefon?: string | null;
  adres?: string | null;
  kategori?: string | null;
  sehir?: string | null;
  ustIdNr?: string | null;
  steuernummer?: string | null;
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
    const contact_person = (formData.get('contact_person') || '').toString().trim();
    const email          = (formData.get('email')          || '').toString().trim();
    const telefon        = (formData.get('telefon')        || '').toString().trim();
    const adres          = (formData.get('adres')          || '').toString().trim();
    const kategori       = (formData.get('kategori')       || '').toString().trim();
    const sehir          = (formData.get('sehir')          || '').toString().trim();
    const ustIdNr        = (formData.get('ustIdNr')        || '').toString().trim();
    const steuernummer   = (formData.get('steuernummer')   || '').toString().trim();
    const message        = (formData.get('message')        || '').toString().trim();

    if (!unvan || !email || !telefon || !contact_person || !kategori || !sehir) {
      return { success: false, error: 'Pflichtfelder fehlen.' };
    }

    const insertData = {
      unvan,
      email,
      telefon:                telefon   || null,
      adres:                  adres     || null,
      yetkili_kisi:           contact_person || null,
      kategori:               kategori  || null,
      sehir:                  sehir     || null,
      vergi_no:               steuernummer || ustIdNr || null,
      status:                 'ADAY' as any,
      kaynak:                 'Web',
      goruldu:                false,
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
        preferenceKey: 'general_announcements' as any,
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
      <tr><td style="padding:6px 0;font-weight:bold;width:140px">Firma:</td><td>${unvan}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Yetkili Kişi:</td><td>${contact_person || '—'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">E-posta:</td><td><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Telefon:</td><td>${telefon || '—'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Betriebsart:</td><td>${kategori || '—'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Stadt:</td><td>${sehir || '—'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Adresse:</td><td>${adres || '—'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">USt-IdNr.:</td><td>${ustIdNr || '—'}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">Steuernummer:</td><td>${steuernummer || '—'}</td></tr>
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

    // ── Müşteriye otomatik yanıt e-postası ───────────────────────────────────
    try {
      await sendCustomerEmail({
        to: email,
        subject: 'Ihre Partneranfrage bei ElysonSweets',
        html: `
<!DOCTYPE html>
<html lang="de">
<body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px; color: #1a1a1a; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
    <!-- Header with Logo -->
    <div style="background-color: #1a1a1a; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px;">ELYSON SWEETS</h1>
      <p style="color: #d1d5db; margin: 5px 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Premium B2B Partner</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px;">Guten Tag ${contact_person ? contact_person : unvan},</h2>
      
      <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 20px;">
        Vielen Dank für Ihr Interesse an einer Partnerschaft mit ElysonSweets! Wir haben Ihre Anfrage erfolgreich erhalten.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 30px;">
        Unser Team wird Ihre Angaben (<strong>${unvan}</strong>) umgehend prüfen. Wir melden uns in Kürze telefonisch oder per E-Mail bei Ihnen, um die Details und Konditionen einer möglichen Zusammenarbeit zu besprechen.
      </p>
      
      <div style="background-color: #fcfcfd; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 10px; font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Ihre übermittelten Daten:</h3>
        <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px; color: #374151;">
          <li style="margin-bottom: 8px;"><strong>Firma:</strong> ${unvan}</li>
          <li style="margin-bottom: 8px;"><strong>E-Mail:</strong> ${email}</li>
          ${telefon ? `<li style="margin-bottom: 8px;"><strong>Telefon:</strong> ${telefon}</li>` : ''}
          ${sehir ? `<li style="margin-bottom: 0;"><strong>Stadt:</strong> ${sehir}</li>` : ''}
        </ul>
      </div>

      <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 0;">
        Mit freundlichen Grüßen,<br>
        <strong>Ihr ElysonSweets Team</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #f3f4f6;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        ElysonSweets GmbH<br>
        <a href="https://www.elysonsweets.de" style="color: #6b7280; text-decoration: none;">www.elysonsweets.de</a> | <a href="mailto:info@elysonsweets.de" style="color: #6b7280; text-decoration: none;">info@elysonsweets.de</a>
      </p>
    </div>
  </div>
</body>
</html>
        `
      });
    } catch (customerEmailErr) {
      console.warn('[partner-actions] Müşteri onay e-postası gönderilemedi:', customerEmailErr);
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
