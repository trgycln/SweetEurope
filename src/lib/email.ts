/**
 * E-posta gönderim utility — Resend kullanır.
 * RESEND_API_KEY .env.local içinde tanımlı olmalı.
 * Tanımlı değilse sessizce atlanır (build/test ortamı için güvenli).
 */

import { Resend } from 'resend';

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'elysonsweets@gmail.com';
const LIVE_BASE_URL = 'https://elysonsweets.de';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function sanitizeDomainUrl(url: string | null | undefined, fallback: string): string {
  if (!url) return fallback;
  return url
    .replace(/https?:\/\/localhost:\d+/gi, LIVE_BASE_URL)
    .replace(/https?:\/\/127\.0\.0\.1:\d+/gi, LIVE_BASE_URL)
    .replace(/https?:\/\/localhost/gi, LIVE_BASE_URL);
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
    const { data, error } = await resend.emails.send({
      from: 'Elysonsweets GmbH <info@elysonsweets.de>',
      to: ADMIN_EMAIL,
      subject,
      html,
      replyTo: replyTo || 'elysonsweets@gmail.com',
    });
    if (error) {
      console.error('[email] Admin e-posta Resend hatası:', error);
      throw new Error(error.message);
    } else {
      console.log('[email] Admin e-postası başarıyla Resend kuyruğuna iletildi:', data?.id);
    }
  } catch (err) {
    console.error('[email] Gönderim hatası:', err);
    throw err;
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
    const { data, error } = await resend.emails.send({
      from: 'Elysonsweets GmbH <info@elysonsweets.de>',
      to,
      subject,
      html,
      replyTo: 'info@elysonsweets.de',
    });
    if (error) {
      console.error('[email] Müşteri e-posta Resend hatası:', error);
      throw new Error(error.message);
    } else {
      console.log('[email] Müşteri onay e-postası iletildi:', data?.id);
    }
  } catch (err) {
    console.error('[email] Müşteri e-posta gönderim hatası:', err);
    throw err;
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
  const defaultLogin = `${LIVE_BASE_URL}/${isTurkish ? 'tr' : 'de'}/login`;
  const cleanLoginUrl = sanitizeDomainUrl(loginUrl, defaultLogin);
  const cleanActionLink = actionLink ? sanitizeDomainUrl(actionLink, cleanLoginUrl) : null;
  const targetLink = tempPassword ? cleanLoginUrl : (cleanActionLink || cleanLoginUrl);

  const subject = isTurkish
    ? 'Elysonsweets GmbH B2B Müşteri Portalı Giriş Bilgileriniz'
    : 'Ihr Zugang zum Elysonsweets GmbH B2B Portal ist freigeschaltet';

  let salutation = 'Sehr geehrte Damen und Herren,';
  if (isTurkish) {
    salutation = `Merhaba ${recipientName || firmName || 'Değerli Müşterimiz'},`;
  } else if (recipientName) {
    salutation = `Sehr geehrte(r) ${recipientName},`;
  } else if (firmName) {
    salutation = `Sehr geehrtes Team von ${firmName},`;
  }

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
            <td style="padding: 6px 0; color: #2563eb; font-weight: 600;"><a href="${cleanLoginUrl}" style="color: #2563eb; text-decoration: underline;">${cleanLoginUrl}</a></td>
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
            <td style="padding: 6px 0; color: #2563eb; font-weight: 600;"><a href="${cleanLoginUrl}" style="color: #2563eb; text-decoration: underline;">${cleanLoginUrl}</a></td>
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

// ─────────────────────────────────────────────────────────────────────────────
// SİPARİŞ ONAY E-POSTASI
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderConfirmationEmailParams {
  to: string;
  recipientName?: string | null;
  firmName?: string | null;
  orderId: string;
  orderType: 'normal' | 'on_siparis';
  items: Array<{
    ad: string;
    miktar: number;
    birimFiyat: number;
    toplamFiyat: number;
  }>;
  toplamNet: number;
  kargoTutariBrut?: number;
  toplamBrut: number;
  teslimatAdresi?: string | null;
  locale?: string;
  portalOrderUrl: string;
  paymentMethod?: string | null;
}

export async function sendOrderConfirmationEmail({
  to,
  recipientName,
  firmName,
  orderId,
  orderType,
  items,
  toplamNet,
  kargoTutariBrut,
  toplamBrut,
  teslimatAdresi,
  locale = 'de',
  portalOrderUrl,
  paymentMethod,
}: OrderConfirmationEmailParams): Promise<void> {
  const isPreOrder = orderType === 'on_siparis';
  const cleanPortalUrl = sanitizeDomainUrl(portalOrderUrl, `${LIVE_BASE_URL}/${locale}/portal/siparisler`);

  const subject = isPreOrder
    ? `Ihre Vorbestellung wurde aufgenommen – #${orderId.substring(0, 8).toUpperCase()}`
    : `Ihre Bestellung ist eingegangen – #${orderId.substring(0, 8).toUpperCase()}`;

  const greet = recipientName
    ? `Sehr geehrte(r) ${recipientName},`
    : firmName
      ? `Sehr geehrtes Team von ${firmName},`
      : 'Sehr geehrte Damen und Herren,';

  const headerColor = isPreOrder ? '#d97706' : '#16a34a';
  const headerLabel = isPreOrder ? 'VORBESTELLUNG' : 'BESTELLBESTÄTIGUNG';

  const intro = isPreOrder
    ? 'Ihre Vorbestellung wurde erfolgreich aufgenommen. Sobald die Ware verfügbar ist, werden wir Sie kontaktieren.'
    : paymentMethod === 'stripe'
      ? 'Vielen Dank! Ihre Zahlung ist bei uns eingegangen und Ihre Bestellung wird schnellstmöglich bearbeitet und versandt. Die Rechnung erhalten Sie separat per E-Mail im Zusammenhang mit dem Versand.'
      : 'Ihre Bestellung ist bei uns eingegangen und wird schnellstmöglich bearbeitet und versandt.';

  const itemRowsHtml = items.map(item => `
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; background-color: #ffffff;">
      <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px; line-height: 1.4; word-break: break-word;">
        ${item.ad}
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="color: #64748b; padding: 0;">${item.miktar} x €${item.birimFiyat.toFixed(2).replace('.', ',')}</td>
          <td style="text-align: right; font-weight: 700; color: #0f172a; padding: 0;">€${item.toplamFiyat.toFixed(2).replace('.', ',')}</td>
        </tr>
      </table>
    </div>
  `).join('');

  // EPC (GiroCode) QR Code Generation
  const epcQrData = `BCD\n001\n1\nSCT\nQNTODEB2XXX\nElysonsweets GmbH\nDE44100101233494571222\nEUR${toplamBrut.toFixed(2)}\n\n\n#${orderId.substring(0, 8).toUpperCase()}`;
  const epcQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(epcQrData)}`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 15px; color: #1e293b; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.07); border: 1px solid #e2e8f0;">

    <!-- Header -->
    <div style="background-color: #0f172a; padding: 32px 30px; text-align: center; border-bottom: 3px solid ${headerColor};">
      <h1 style="color: #ffffff; margin: 0 0 6px; font-size: 24px; font-weight: 800; letter-spacing: 2px;">ELYSONSWEETS GMBH</h1>
      <p style="color: ${headerColor}; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">${headerLabel}</p>
    </div>

    <!-- Content -->
    <div style="padding: 36px 32px;">
      <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px; font-weight: 700;">${greet}</h2>
      <p style="font-size: 14px; line-height: 1.7; color: #475569; margin: 0 0 28px;">${intro}</p>

      <!-- Order ID Badge -->
      <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; display: flex; align-items: center;">
        <div>
          <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #16a34a; font-weight: 700;">Bestellnummer</p>
          <p style="margin: 4px 0 0; font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace;">#${orderId.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <!-- Items List -->
      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">
          Bestelldetails
        </h3>
        ${itemRowsHtml}
      </div>

      <!-- Totals -->
      <div style="border-top: 2px solid #e2e8f0; padding-top: 16px; margin-bottom: 28px;">
        <table style="width: 100%; font-size: 13px;">
          <tr>
            <td style="padding: 4px 8px; color: #64748b;">Zwischensumme (Netto)</td>
            <td style="padding: 4px 8px; text-align: right; color: #1e293b; font-weight: 600;">€${toplamNet.toFixed(2).replace('.', ',')}</td>
          </tr>
          ${kargoTutariBrut && kargoTutariBrut > 0 ? `
          <tr>
            <td style="padding: 4px 8px; color: #64748b;">Versand (inkl. MwSt.)</td>
            <td style="padding: 4px 8px; text-align: right; color: #1e293b; font-weight: 600;">€${kargoTutariBrut.toFixed(2).replace('.', ',')}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 8px 4px; color: #0f172a; font-size: 15px; font-weight: 800;">Gesamtbetrag (Brutto)</td>
            <td style="padding: 8px 8px 4px; text-align: right; color: #16a34a; font-size: 16px; font-weight: 800;">€${toplamBrut.toFixed(2).replace('.', ',')}</td>
          </tr>
        </table>
      </div>

      ${teslimatAdresi ? `
      <!-- Delivery Address -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px;">
        <p style="margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">Lieferadresse</p>
        <p style="margin: 0; font-size: 13px; color: #1e293b; white-space: pre-line;">${teslimatAdresi}</p>
      </div>
      ` : ''}

      ${paymentMethod !== 'stripe' && !isPreOrder ? `
      <!-- Payment Info -->
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #1e3a8a; font-weight: 700;">Zahlungsinformationen</p>
        <p style="margin: 0 0 12px; font-size: 13px; color: #1e40af; line-height: 1.6;">
          Bitte überweisen Sie den Rechnungsbetrag auf das folgende Bankkonto, damit wir Ihre Bestellung bearbeiten können. Bitte geben Sie als Verwendungszweck unbedingt die <strong>Bestellnummer</strong> an.
        </p>
        <div style="background-color: #ffffff; border: 1px dashed #93c5fd; border-radius: 6px; padding: 16px;">
          
          <div style="text-align: center; margin-bottom: 20px;">
            <p style="font-size: 12px; color: #64748b; margin: 0 0 8px;">Scannen Sie diesen QR-Code mit Ihrer Banking-App für eine einfache Überweisung:</p>
            <img src="${epcQrUrl}" alt="GiroCode für Überweisung" style="width: 150px; height: 150px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; background-color: white;" />
          </div>

          <div style="margin-bottom: 10px;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Bank</div>
            <div style="font-size: 14px; color: #0f172a; font-weight: 700; margin-top: 2px;">Qonto</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Empfänger</div>
            <div style="font-size: 14px; color: #0f172a; font-weight: 700; margin-top: 2px;">Elysonsweets GmbH</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">IBAN</div>
            <div style="font-size: 14px; color: #0f172a; font-weight: 700; font-family: monospace; letter-spacing: 0.5px; word-break: break-all; margin-top: 2px;">DE44100101233494571222</div>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">BIC</div>
            <div style="font-size: 14px; color: #0f172a; font-weight: 700; font-family: monospace; letter-spacing: 0.5px; margin-top: 2px;">QNTODEB2XXX</div>
          </div>
          <div>
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Verwendungszweck</div>
            <div style="font-size: 16px; color: #16a34a; font-weight: 800; font-family: monospace; margin-top: 2px;">#${orderId.substring(0, 8).toUpperCase()}</div>
          </div>
        </div>
      </div>
      ` : ''}

      ${isPreOrder ? `
      <!-- Pre-order Info -->
      <div style="background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px;">
        <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
          ⏳ Dies ist eine Vorbestellung. Wir werden Sie kontaktieren, sobald die Ware eingetroffen ist, um den Versand zu planen. Eine Zahlung wird in diesem Schritt noch nicht fällig.
        </p>
      </div>
      ` : ''}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${cleanPortalUrl}" style="display: inline-block; background-color: ${headerColor}; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none;">
          Bestelldetails anzeigen →
        </a>
      </div>

      <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
        Bei Fragen wenden Sie sich bitte an <a href="mailto:info@elysonsweets.de" style="color: #16a34a; text-decoration: none;">info@elysonsweets.de</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 22px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0 0 4px; font-weight: 600;">Elysonsweets GmbH</p>
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        © Elysonsweets GmbH • <a href="https://elysonsweets.de" style="color: #94a3b8; text-decoration: none;">elysonsweets.de</a>
      </p>
    </div>

  </div>
</body>
</html>`;

  await sendCustomerEmail({ to, subject, html });
}

/**
 * Müşteriye resmi Lexware faturasını PDF eki ile birlikte Almanca gönderir.
 * Admin panelinden manuel tetiklenir (ürün kontrolü ve sevkiyat sonrası).
 */
export async function sendInvoiceEmail({
  to,
  orderNo,
  invoiceNo,
  pdfBuffer,
  pdfFilename,
}: {
  to: string;
  orderNo: string;
  invoiceNo: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY tanımlı değil — fatura e-postası gönderilmedi.');
    return;
  }

  const subject = `Ihre Rechnung ${invoiceNo} zu Bestellung #${orderNo} – Elysonsweets GmbH`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 15px; color: #1e293b; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.07); border: 1px solid #e2e8f0;">

    <!-- Header -->
    <div style="background-color: #0f172a; padding: 32px 30px; text-align: center; border-bottom: 3px solid #3b82f6;">
      <h1 style="color: #ffffff; margin: 0 0 6px; font-size: 24px; font-weight: 800; letter-spacing: 2px;">ELYSONSWEETS GMBH</h1>
      <p style="color: #3b82f6; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">RECHNUNG</p>
    </div>

    <!-- Content -->
    <div style="padding: 36px 32px;">
      <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px; font-weight: 700;">Sehr geehrte Damen und Herren,</h2>
      
      <p style="font-size: 14px; line-height: 1.7; color: #475569; margin: 0 0 28px;">
        vielen Dank für Ihre Bestellung!
        Im Anhang dieser E-Mail finden Sie Ihre offizielle Rechnung als PDF-Datei.
      </p>

      <!-- Invoice Info Badge -->
      <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 20px; margin-bottom: 28px; display: flex; align-items: center;">
        <div style="flex: 1;">
          <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; font-weight: 700;">Rechnungsnummer</p>
          <p style="margin: 4px 0 0; font-size: 18px; font-weight: 800; color: #0f172a; font-family: monospace;">${invoiceNo}</p>
        </div>
        <div style="flex: 1; text-align: right; border-left: 1px dashed #93c5fd; padding-left: 16px;">
          <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700;">Bestellnummer</p>
          <p style="margin: 4px 0 0; font-size: 15px; font-weight: 700; color: #475569; font-family: monospace;">#${orderNo}</p>
        </div>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${LIVE_BASE_URL}/de/portal/siparisler" style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none;">
          Bestellung im Portal ansehen →
        </a>
      </div>

      <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0;">
        Die Originalrechnung finden Sie als PDF-Anhang in dieser E-Mail.<br>
        Bei Fragen wenden Sie sich bitte an <a href="mailto:info@elysonsweets.de" style="color: #3b82f6; text-decoration: none;">info@elysonsweets.de</a>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 22px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #94a3b8; margin: 0 0 4px; font-weight: 600;">Elysonsweets GmbH</p>
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        © Elysonsweets GmbH • <a href="https://elysonsweets.de" style="color: #94a3b8; text-decoration: none;">elysonsweets.de</a>
      </p>
    </div>

  </div>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Elysonsweets GmbH <info@elysonsweets.de>',
      to,
      subject,
      html,
      replyTo: 'info@elysonsweets.de',
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
        },
      ],
    });
    if (error) {
      console.error('[email] Fatura e-postası Resend hatası:', error);
      throw new Error(error.message);
    } else {
      console.log('[email] Fatura e-postası iletildi:', data?.id);
    }
  } catch (err) {
    console.error('[email] Fatura e-postası gönderim hatası:', err);
    throw err;
  }
}

/**
 * Müşteriye storno/iptal faturasını (Rechnungskorrektur) PDF eki ile birlikte Almanca gönderir.
 * Sipariş iptal edildiğinde tetiklenir.
 */
export async function sendStornoEmail({
  to,
  orderNo,
  creditNoteNo,
  pdfBuffer,
  pdfFilename,
}: {
  to: string;
  orderNo: string;
  creditNoteNo: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY tanımlı değil — storno e-postası gönderilmedi.');
    return;
  }

  const subject = `Stornierung Ihrer Bestellung #${orderNo} – Elysonsweets GmbH`;

  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 15px; color: #1e293b; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">

    <!-- Header -->
    <div style="background-color: #0f172a; padding: 36px 30px; text-align: center; border-bottom: 3px solid #e11d48;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 2px;">ELYSONSWEETS GMBH</h1>
      <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Rechnungskorrektur / Storno</p>
    </div>

    <!-- Content -->
    <div style="padding: 36px 32px;">
      <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 700;">Sehr geehrte Damen und Herren,</h2>

      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
        Ihre Bestellung <strong>#${orderNo}</strong> wurde storniert.<br>
        Im Anhang finden Sie das offizielle <strong>Rechnungskorrektur-Dokument</strong> (Storno) als PDF-Datei.
      </p>

      <!-- Storno Info Card -->
      <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
        <h3 style="margin: 0 0 14px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #9f1239; font-weight: 700;">Storno-Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 200px;">Rechnungskorrektur-Nr.:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">${creditNoteNo}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Stornierte Bestellnummer:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">#${orderNo}</td>
          </tr>
        </table>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 16px;">
        <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0;">
          Das Rechnungskorrektur-Dokument ist als PDF-Anhang beigefügt.<br>
          Bei Fragen stehen wir Ihnen unter <a href="mailto:info@elysonsweets.de" style="color: #0f172a; font-weight: 600; text-decoration: underline;">info@elysonsweets.de</a> gerne zur Verfügung.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        © Elysonsweets GmbH • <a href="https://elysonsweets.de" style="color: #94a3b8; text-decoration: none;">elysonsweets.de</a>
      </p>
    </div>

  </div>
</body>
</html>
`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Elysonsweets GmbH <info@elysonsweets.de>',
      to,
      subject,
      html,
      replyTo: 'info@elysonsweets.de',
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
        },
      ],
    });
    if (error) {
      console.error('[email] Storno e-postası Resend hatası:', error);
      throw new Error(error.message);
    } else {
      console.log('[email] Storno e-postası iletildi:', data?.id);
    }
  } catch (err) {
    console.error('[email] Storno e-postası gönderim hatası:', err);
    throw err;
  }
}

/**
 * Müşteriye "Siparişiniz Yola Çıktı" bildirim e-postasını Almanca gönderir.
 * trackingUrl varsa "Sendung verfolgen" butonu gösterilir.
 * Kargo firması "Eigenversand" ise takip bilgileri olmayabilir.
 * GRACEFUL: Bu fonksiyon hata fırlatırsa çağıran action log basar ama durmaz.
 */
export async function sendShippingEmail({
  to,
  orderNo,
  courier,
  trackingNo,
  trackingUrl,
}: {
  to: string;
  orderNo: string;
  courier: string;
  trackingNo?: string | null;
  trackingUrl?: string | null;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY tanımlı değil — kargo e-postası gönderilmedi.');
    return;
  }

  const subject = `Ihre Bestellung #${orderNo} wurde versandt – Elysonsweets GmbH`;

  const trackingSection = trackingNo
    ? `
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
          <h3 style="margin: 0 0 14px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #166534; font-weight: 700;">Versanddetails</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 160px;">Bestellnummer:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">#${orderNo}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Versanddienstleister:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${courier}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Sendungsnummer:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">${trackingNo}</td>
            </tr>
          </table>
          ${trackingUrl ? `
          <div style="margin-top: 20px;">
            <a href="${trackingUrl}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);">
              Sendung verfolgen →
            </a>
          </div>` : ''}
        </div>
    `
    : `
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 160px;">Bestellnummer:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700; font-family: monospace;">#${orderNo}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Versandart:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${courier}</td>
            </tr>
          </table>
        </div>
    `;

  const html = `
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
      <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Ihre Bestellung ist unterwegs 🚚</p>
    </div>

    <!-- Content -->
    <div style="padding: 36px 32px;">
      <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 20px; font-weight: 700;">Sehr geehrte Damen und Herren,</h2>

      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 24px;">
        wir freuen uns, Ihnen mitteilen zu können, dass Ihre Bestellung <strong>#${orderNo}</strong> soeben versandt wurde!<br>
        Ihr Paket ist auf dem Weg zu Ihnen.
      </p>

      ${trackingSection}

      <!-- Portal Link -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${LIVE_BASE_URL}/de/portal/siparisler" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; text-decoration: none;">
          Bestellung im Portal ansehen →
        </a>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 16px;">
        <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0;">
          Bei Fragen stehen wir Ihnen unter <a href="mailto:info@elysonsweets.de" style="color: #0f172a; font-weight: 600; text-decoration: underline;">info@elysonsweets.de</a> zur Verfügung.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f1f5f9; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0;">
        © Elysonsweets GmbH • <a href="https://elysonsweets.de" style="color: #94a3b8; text-decoration: none;">elysonsweets.de</a>
      </p>
    </div>

  </div>
</body>
</html>
`;

  try {
    const { data, error } = await resend.emails.send({
      from: 'Elysonsweets GmbH <info@elysonsweets.de>',
      to,
      subject,
      html,
      replyTo: 'info@elysonsweets.de',
    });
    if (error) {
      console.error('[email] Kargo e-postası Resend hatası:', error);
      throw new Error(error.message);
    } else {
      console.log('[email] Kargo e-postası iletildi:', data?.id);
    }
  } catch (err) {
    console.error('[email] Kargo e-postası gönderim hatası:', err);
    throw err;
  }
}

