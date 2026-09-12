import { NextRequest, NextResponse } from 'next/server';
import { verifyCalendarToken } from '@/lib/calendar/token';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export const dynamic = 'force-dynamic';

function escapeICalText(str: string): string {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
}

function formatDateToICal(dateStr: string): string {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
}

function getNextDayICal(dateStr: string): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
}

export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
        return new NextResponse('Eksik takvim anahtarı (token).', { status: 401 });
    }

    const userId = verifyCalendarToken(token);
    if (!userId) {
        return new NextResponse('Geçersiz veya yetkisiz takvim anahtarı.', { status: 403 });
    }

    try {
        const supabase = createSupabaseServiceClient();

        // Kullanıcı bilgisi ve firma bilgilerini al
        const [userProfileRes, tasksRes] = await Promise.all([
            supabase.from('profiller').select('tam_ad').eq('id', userId).maybeSingle(),
            supabase
                .from('gorevler')
                .select('id, baslik, aciklama, son_tarih, oncelik, durum, tamamlandi, created_at, ilgili_firma_id, firmalar(unvan)')
                .eq('atanan_kisi_id', userId)
                .order('son_tarih', { ascending: true, nullsFirst: false }),
        ]);

        const userName = userProfileRes.data?.tam_ad || 'Kullanıcı';
        const tasks = tasksRes.data || [];
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elysonsweets.de';

        const lines: string[] = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Elyson Sweets//Gorev Takvimi//TR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:Elyson - ${escapeICalText(userName)} Görevleri`,
            'X-WR-CALDESC:Elyson Sweets sisteminde size atanan görevler ve son tarihler.',
            'X-WR-TIMEZONE:Europe/Berlin',
            'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
            'X-PUBLISHED-TTL:PT15M',
        ];

        const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        for (const task of tasks) {
            if (!task.son_tarih) continue;

            const dtStart = formatDateToICal(task.son_tarih);
            const dtEnd = getNextDayICal(task.son_tarih);
            const firmUnvan = (task as any).firmalar?.unvan;

            let summary = task.baslik;
            if (task.tamamlandi) {
                summary = `[Tamamlandı] ${summary}`;
            } else if (task.durum === 'Devam Ediyor') {
                summary = `⚡ [Devam Ediyor] ${summary}`;
            }
            if (firmUnvan) {
                summary += ` (${firmUnvan})`;
            }

            const detailLink = `${baseUrl}/tr/admin/gorevler`;

            const descParts = [
                `Durum: ${task.durum || (task.tamamlandi ? 'Tamamlandı' : 'Yapılacak')}`,
                `Öncelik: ${task.oncelik || 'Orta'}`,
            ];
            if (firmUnvan) descParts.push(`Müşteri / Firma: ${firmUnvan}`);
            if (task.aciklama) descParts.push(`\nNotlar / Açıklama:\n${task.aciklama.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')}`);
            descParts.push(`\nGörevi Aç: ${detailLink}`);

            lines.push(
                'BEGIN:VEVENT',
                `UID:task-${task.id}@elysonsweets.de`,
                `DTSTAMP:${nowIso}`,
                `DTSTART;VALUE=DATE:${dtStart}`,
                `DTEND;VALUE=DATE:${dtEnd}`,
                `SUMMARY:${escapeICalText(summary)}`,
                `DESCRIPTION:${escapeICalText(descParts.join('\n'))}`,
                `URL:${detailLink}`,
                task.tamamlandi ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
            );

            // Açık görevler için telefonda bildirim ve alarm
            if (!task.tamamlandi) {
                // 1. Alarm: 1 gün önce sabah hatırlatması
                lines.push(
                    'BEGIN:VALARM',
                    'ACTION:DISPLAY',
                    `DESCRIPTION:${escapeICalText(`Yarın teslim/bitiş: ${task.baslik}`)}`,
                    'TRIGGER:-P1D',
                    'END:VALARM'
                );

                // 2. Alarm: Görev günü sabah 09:00 hatırlatması
                lines.push(
                    'BEGIN:VALARM',
                    'ACTION:DISPLAY',
                    `DESCRIPTION:${escapeICalText(`Bugün teslim/bitiş: ${task.baslik}`)}`,
                    'TRIGGER:PT9H',
                    'END:VALARM'
                );
            }

            lines.push('END:VEVENT');
        }

        lines.push('END:VCALENDAR');

        const icsContent = lines.join('\r\n');

        return new NextResponse(icsContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `inline; filename="elyson-gorevler-${userId.slice(0, 8)}.ics"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
            },
        });
    } catch (err: any) {
        console.error('Takvim akışı oluşturulurken hata:', err);
        return new NextResponse('Takvim verisi yüklenemedi.', { status: 500 });
    }
}
