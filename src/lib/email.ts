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
      from: 'ElysonSweets <info@elysonsweets.de>',
      to: ADMIN_EMAIL,
      subject,
      html,
      replyTo: replyTo || 'elysonsweets@gmail.com',
    });
  } catch (err) {
    console.error('[email] Gönderim hatası:', err);
  }
}
