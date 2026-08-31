// src/app/[locale]/admin/gorevler/page.tsx

import React, { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { unstable_noStore as noStore } from 'next/cache';
import GorevlerClient, { GorevRow, ProfilOption, FirmaOption } from '@/components/gorevler/GorevlerClient';

export const dynamic = 'force-dynamic';

type GorevOncelik = 'Düşük' | 'Orta' | 'Yüksek';

interface GorevlerListPageProps {
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{
        durum?: string;
        atanan?: string;
        oncelik?: string;
    }>;
}

export default async function GorevlerListPage({ params, searchParams }: GorevlerListPageProps) {
    noStore();

    const { locale } = await params;
    const sp = searchParams ? await searchParams : {};

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // ── Ana görev sorgusu ────────────────────────────────────────────────────
    const currentDurum = sp.durum ?? 'acik';
    let query = supabase.from('gorevler').select('*');

    if (currentDurum === 'acik')       query = query.eq('tamamlandi', false);
    if (currentDurum === 'tamamlandi') query = query.eq('tamamlandi', true);
    if (sp.atanan)                     query = query.eq('atanan_kisi_id', sp.atanan);
    if (sp.oncelik)                    query = query.eq('oncelik', sp.oncelik as GorevOncelik);

    const { data: gorevlerData, error: gorevlerError } = await query
        .order('tamamlandi', { ascending: true })
        .order('son_tarih', { ascending: true, nullsFirst: false });

    // ── Yardımcı veriler ─────────────────────────────────────────────────────
    const [firmalarRes, profillerRes] = await Promise.all([
        supabase.from('firmalar').select('id, unvan').order('unvan', { ascending: true }),
        supabase.from('profiller').select('id, tam_ad, rol').order('tam_ad', { ascending: true }),
    ]);

    const firmalar: FirmaOption[] = firmalarRes.data || [];
    const profiller: ProfilOption[] = (profillerRes.data || []).filter(p =>
        !!p.tam_ad &&
        !(p.tam_ad || '').startsWith('[Silindi]') &&
        p.rol !== 'Müşteri' &&
        p.rol !== 'Alt Bayi'
    );

    if (gorevlerError) {
        console.error('Görevler yüklenirken hata:', gorevlerError);
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl border border-red-200">
                Görevler yüklenirken bir sorun oluştu.
            </div>
        );
    }

    // ── Map'ler ──────────────────────────────────────────────────────────────
    const firmaMap  = new Map(firmalar.map(f => [f.id, f.unvan]));
    const profilMap = new Map(profiller.map(p => [p.id, p.tam_ad]));

    const gorevListe: GorevRow[] = (gorevlerData || []).map((gorev: any) => ({
        ...gorev,
        durum: gorev.durum || (gorev.tamamlandi ? 'Tamamlandı' : 'Yapılacak'),
        ilgili_firma: gorev.ilgili_firma_id && firmaMap.has(gorev.ilgili_firma_id)
            ? { unvan: firmaMap.get(gorev.ilgili_firma_id)! }
            : null,
        atanan_kisi: gorev.atanan_kisi_id
            ? { tam_ad: profilMap.get(gorev.atanan_kisi_id) || null }
            : null,
    }));

    return (
        <main className="space-y-6 pb-12">
            <Suspense fallback={
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-44 bg-slate-200 rounded-3xl" />
                    ))}
                </div>
            }>
                <GorevlerClient
                    gorevler={gorevListe}
                    profiller={profiller}
                    firmalar={firmalar}
                    locale={locale}
                    isPortal={false}
                    baseFirmaPath={`/${locale}/admin/crm/firmalar`}
                    baseTaskDetailPath={`/${locale}/admin/gorevler`}
                />
            </Suspense>
        </main>
    );
}
