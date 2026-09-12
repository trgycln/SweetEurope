import crypto from 'crypto';

const CALENDAR_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXTAUTH_SECRET || 'elyson-sweets-calendar-secure-salt-2026';

/**
 * Kullanıcıya özel kriptografik olarak imzalanmış takvim token'ı üretir.
 * Veritabanında ek kolon gerekmeden güvenli ve sahtelenemez (tamper-proof) kimlik doğrulaması sağlar.
 */
export function generateCalendarToken(userId: string): string {
    const signature = crypto
        .createHmac('sha256', CALENDAR_SECRET)
        .update(`cal_user:${userId}`)
        .digest('hex')
        .slice(0, 32);
    return `${userId}.${signature}`;
}

/**
 * Gelen takvim token'ını doğrular. Geçerliyse userId'yi döner, geçersizse null döner.
 */
export function verifyCalendarToken(token: string | null | undefined): string | null {
    if (!token || !token.includes('.')) return null;
    const [userId, signature] = token.split('.');
    if (!userId || !signature || signature.length !== 32) return null;

    const expected = crypto
        .createHmac('sha256', CALENDAR_SECRET)
        .update(`cal_user:${userId}`)
        .digest('hex')
        .slice(0, 32);

    try {
        const isMatch = crypto.timingSafeEqual(
            Buffer.from(signature, 'utf8'),
            Buffer.from(expected, 'utf8')
        );
        return isMatch ? userId : null;
    } catch {
        return null;
    }
}
