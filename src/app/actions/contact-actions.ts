'use server';

import { sendAdminEmail, sendCustomerEmail } from '@/lib/email';

export async function submitContactForm(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const name    = (formData.get('name')    || '').toString().trim();
  const email   = (formData.get('email')   || '').toString().trim();
  const message = (formData.get('message') || '').toString().trim();

  if (!name || !email || !message) {
    return { success: false, error: 'Bitte alle Felder ausfüllen.' };
  }

  // ── Veritabanına kaydetme (Tam Mesaj) ───────────────────────────────────────
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { error: dbError } = await supabase
      .from('iletisim_mesajlari')
      .insert({
        ad_soyad: name,
        email: email,
        mesaj: message,
      });

    if (dbError) {
      console.warn('[contact-actions] Veritabanı kayıt hatası:', dbError);
    }

    // ── Admin in-app bildirimi (Kısaltılmış Mesaj) ──────────────────────────────
    const { sendNotification } = await import('@/lib/notificationUtils');
    await sendNotification({
      aliciRol: ['Yönetici', 'Ekip Üyesi'] as any,
      icerik: `💬 ${name} (${email}): "${message.length > 100 ? message.slice(0, 100) + '...' : message}"`,
      link: '/admin/crm/mesajlar',
      preferenceKey: 'new_messages' as any,
      supabaseClient: supabase as any,
    });
  } catch (notifErr) {
    console.warn('[contact-actions] Kayıt/Bildirim hatası:', notifErr);
  }

  // ── Admin e-posta bildirimi ───────────────────────────────────────────────
  try {
    await sendAdminEmail({
      subject: `💬 İletişim Formu: ${name}`,
      replyTo: email,
      html: `
<!DOCTYPE html>
<html lang="tr">
<body style="font-family:sans-serif;background:#f9f9f9;padding:24px;color:#1a1a1a">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;padding:32px;border:1px solid #e5e7eb">
    <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:20px">💬 İletişim Formu Mesajı</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;font-weight:bold;width:80px">Ad:</td><td>${name}</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold">E-posta:</td><td><a href="mailto:${email}">${email}</a></td></tr>
      <tr><td style="padding:6px 0;font-weight:bold;vertical-align:top">Mesaj:</td><td>${message.replace(/\n/g, '<br>')}</td></tr>
    </table>
    <p style="margin-top:20px;font-size:12px;color:#6b7280">
      Bu e-posta ElysonSweets iletişim formundan otomatik gönderilmiştir.<br>
      Yanıtlamak için <a href="mailto:${email}">${email}</a> adresine cevap verin.
    </p>
  </div>
</body>
</html>`,
    });
  } catch (emailErr) {
    console.warn('[contact-actions] E-posta gönderilemedi:', emailErr);
  }

  // ── Müşteriye otomatik yanıt e-postası ───────────────────────────────────
  try {
    await sendCustomerEmail({
      to: email,
      subject: 'Ihre Nachricht an ElysonSweets',
      html: `
<!DOCTYPE html>
<html lang="de">
<body style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px; color: #1a1a1a; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
    <!-- Header with Logo -->
    <div style="background-color: #1a1a1a; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 2px;">ELYSON SWEETS</h1>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="margin: 0 0 20px; color: #1a1a1a; font-size: 22px;">Guten Tag ${name},</h2>
      
      <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 20px;">
        Vielen Dank für Ihre Nachricht an ElysonSweets! Wir haben Ihr Anliegen erfolgreich erhalten.
      </p>
      
      <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 30px;">
        Unser Team wird sich schnellstmöglich um Ihr Anliegen kümmern und sich bei Ihnen melden. In der Regel beantworten wir Anfragen innerhalb von 24-48 Stunden.
      </p>
      
      <div style="background-color: #fcfcfd; border: 1px solid #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="margin: 0 0 10px; font-size: 14px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Ihre übermittelte Nachricht:</h3>
        <p style="margin: 0; font-size: 14px; color: #374151; white-space: pre-wrap;">${message}</p>
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
    console.warn('[contact-actions] Müşteri onay e-postası gönderilemedi:', customerEmailErr);
  }

  return { success: true };
}
