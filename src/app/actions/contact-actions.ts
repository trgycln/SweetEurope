'use server';

import { sendAdminEmail } from '@/lib/email';

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
      preferenceKey: 'new_messages',
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

  return { success: true };
}
