/**
 * E-posta gönderim utility — Resend kullanır.
 * RESEND_API_KEY .env.local içinde tanımlı olmalı.
 * Tanımlı değilse sessizce atlanır (build/test ortamı için güvenli).
 */

import { Resend } from 'resend';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'elysonsweets@gmail.com';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendAdminEmail({
  subject,
  html,
  replyTo,
}: {
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY tanımlı değil — e-posta gönderilmedi.');
    return;
  }

  try {
    await resend.emails.send({
      from: 'Elysonsweets GmbH <info@elysonsweets.de>',
      to: ADMIN_EMAIL,
      subject,
      html,
      replyTo: replyTo || 'elysonsweets@gmail.com',
    });
  } catch (err) {
    console.error('[email] Gönderim hatası:', err);
  }
}

export async function sendCustomerEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY tanımlı değil — müşteri e-postası gönderilmedi.');
    return;
  }

  try {
    await resend.emails.send({
      from: 'Elysonsweets GmbH <info@elysonsweets.de>',
      to,
      subject,
      html,
      replyTo: 'info@elysonsweets.de',
    });
  } catch (err) {
    console.error('[email] Müşteri e-posta gönderim hatası:', err);
  }
}

export interface PortalWelcomeEmailParams {
  to: string;
  recipientName?: string | null;
  firmName?: string | null;
  tempPassword?: string | null;
  actionLink?: string | null;
  loginUrl: string;
  locale?: string;
}

export async function sendPortalWelcomeEmail({
  to,
  recipientName,
  firmName,
  tempPassword,
  actionLink,
  loginUrl,
  locale = 'de',
}: PortalWelcomeEmailParams): Promise<void> {
  const isTurkish = locale === 'tr';
  const targetLink = actionLink || loginUrl;

  const subject = isTurkish
    ? 'Elysonsweets GmbH B2B Müşteri Portalı Giriş Bilgileriniz'
    : 'Ihr Zugang zum Elysonsweets GmbH B2B Portal ist freigeschaltet';

  const salutation = isTurkish
    ? `Merhaba ${recipientName || firmName || 'Değerli Müşterimiz'},`
    : `Sehr geehrte Damen und Herren${recipientName ? `, sehr geehrte(r) ${recipientName}` : firmName ? `, Team von ${firmName}` : ''},`;

  const html = isTurkish ? `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 15px; color: #1e293b; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 36px 30px; text-align: center; border-bottom: 3px solid #16a34a;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 2px;">ELYSONSWEETS GMBH</h1>
      <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">B2B Müşteri Portalı</p>
    </div>

    <!-- Content -->
    <div style="padding: 36px 32px;">
      <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 700;">${salutation}</h2>
      
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
        Elysonsweets GmbH B2B Müşteri Portalı hesabınız başarıyla oluşturulmuştur. Artık size özel fiyatlarla sipariş verebilir, carilerinizi ve sipariş geçmişinizi kolayca takip edebilirsiniz.
      </p>

      <!-- Credentials Card -->
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
        <h3 style="margin: 0 0 14px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #334155; font-weight: 700;">Giriş Bilgileriniz</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 150px;">Kullanıcı E-posta:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">${to}</td>
          </tr>
          ${tempPassword ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Geçici Şifre:</td>
            <td style="padding: 6px 0; color: #16a34a; font-weight: 700; font-family: monospace; font-size: 15px;">${tempPassword}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Portal Giriş Adresi:</td>
            <td style="padding: 6px 0; color: #2563eb; font-weight: 600;"><a href="${loginUrl}" style="color: #2563eb; text-decoration: underline;">${loginUrl}</a></td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${targetLink}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);">
          Portala Giriş Yap →
        </a>
      </div>

      <!-- Features list -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px;">
        <p style="font-size: 13px; font-weight: 700; color: #334155; margin: 0 0 10px;">Portal üzerinden yapabilecekleriniz:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #64748b; line-height: 1.8;">
          <li>Size tanımlı özel iskonto ve fiyat listelerini görüntüleme</li>
          <li>7/24 hızlı ve pratik online sipariş oluşturma</li>
          <li>Sevkiyat durumu, irsaliye ve fatura takibi</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #64748b; margin: 0 0 8px;">
        Sorularınız ve destek için bize <a href="mailto:info@elysonsweets.de" style="color: #0f172a; font-weight: 600; text-decoration: underline;">info@elysonsweets.de</a> adresinden ulaşabilirsiniz.
      </p>
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        © Elysonsweets GmbH • <a href="https://elysonsweets.de" style="color: #94a3b8; text-decoration: none;">elysonsweets.de</a>
      </p>
    </div>

  </div>
</body>
</html>
` : `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 15px; color: #1e293b; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 36px 30px; text-align: center; border-bottom: 3px solid #16a34a;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 2px;">ELYSONSWEETS GMBH</h1>
      <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">B2B Kundenportal</p>
    </div>

    <!-- Content -->
    <div style="padding: 36px 32px;">
      <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 700;">${salutation}</h2>
      
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
        Ihr offizieller Zugang zum <strong>Elysonsweets GmbH B2B-Kundenportal</strong> wurde erfolgreich freigeschaltet. Ab sofort können Sie Ihre exklusiven Firmenkonditionen einsehen, Rechnungen verwalten und Bestellungen rund um die Uhr direkt online aufgeben.
      </p>

      <!-- Credentials Card -->
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
        <h3 style="margin: 0 0 14px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #334155; font-weight: 700;">Ihre Zugangsdaten</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 170px;">Benutzername / E-Mail:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">${to}</td>
          </tr>
          ${tempPassword ? `
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Temporäres Passwort:</td>
            <td style="padding: 6px 0; color: #16a34a; font-weight: 700; font-family: monospace; font-size: 15px;">${tempPassword}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Portal-Login:</td>
            <td style="padding: 6px 0; color: #2563eb; font-weight: 600;"><a href="${loginUrl}" style="color: #2563eb; text-decoration: underline;">${loginUrl}</a></td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${targetLink}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);">
          ${actionLink && !tempPassword ? 'Passwort festlegen & Einloggen →' : 'Zum B2B Portal einloggen →'}
        </a>
      </div>

      <!-- Features list -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 24px;">
        <p style="font-size: 13px; font-weight: 700; color: #334155; margin: 0 0 10px;">Ihre Vorteile im B2B-Kundenportal:</p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #64748b; line-height: 1.8;">
          <li>Individuelle Staffelpreise und B2B-Konditionen</li>
          <li>Bequeme und schnelle Online-Bestellung (24/7)</li>
          <li>Echtzeit-Status, Sendungsverfolgung & digitaler Rechnungsdownload</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #64748b; margin: 0 0 8px;">
        Bei Rückfragen steht Ihnen unser Kundenservice gerne unter <a href="mailto:info@elysonsweets.de" style="color: #0f172a; font-weight: 600; text-decoration: underline;">info@elysonsweets.de</a> zur Verfügung.
      </p>
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        © Elysonsweets GmbH • <a href="https://elysonsweets.de" style="color: #94a3b8; text-decoration: none;">elysonsweets.de</a>
      </p>
    </div>

  </div>
</body>
</html>
`;

  await sendCustomerEmail({
    to,
    subject,
    html,
  });
}
