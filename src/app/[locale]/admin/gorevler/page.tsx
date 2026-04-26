// src/app/[locale]/admin/gorevler/page.tsx

import React, { Suspense } from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiPlus, FiClipboard } from 'react-icons/fi';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { unstable_noStore as noStore } from 'next/cache';
import GorevlerClient from './GorevlerClient';

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
    let query = supabase.from('gorevler').select('*');

    if (sp.durum === 'acik')       query = query.eq('tamamlandi', false);
    if (sp.durum === 'tamamlandi') query = query.eq('tamamlandi', true);
    if (sp.atanan)                 query = query.eq('atanan_kisi_id', sp.atanan);
    if (sp.oncelik)                query = query.eq('oncelik', sp.oncelik as GorevOncelik);

    const { data: gorevlerData, error: gorevlerError } = await query
        .order('tamamlandi', { ascending: true })
        .order('son_tarih', { ascending: true, nullsFirst: false });

    // ── Yardımcı veriler ─────────────────────────────────────────────────────
    const [firmalarRes, profillerRes] = await Promise.all([
        supabase.from('firmalar').select('id, unvan'),
        supabase.from('profiller').select('id, tam_ad, rol'),
    ]);

    const firmalar = firmalarRes.data || [];
    const profiller = (profillerRes.data || []).filter(p =>
        !!p.tam_ad &&
        !(p.tam_ad || '').startsWith('[Silindi]') &&
        p.rol !== 'Müşteri' &&
        p.rol !== 'Alt Bayi'
    );

    if (gorevlerError) {
        console.error('Görevler yüklenirken hata:', gorevlerError);
        return (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl">
                Görevler yüklenirken bir sorun oluştu.
            </div>
        );
    }

    // ── Map'ler ──────────────────────────────────────────────────────────────
    const firmaMap  = new Map(firmalar.map(f => [f.id, f.unvan]));
    const profilMap = new Map(profiller.map(p => [p.id, p.tam_ad]));

    const gorevListe = (gorevlerData || []).map(gorev => ({
        ...gorev,
        ilgili_firma: gorev.ilgili_firma_id && firmaMap.has(gorev.ilgili_firma_id)
            ? { unvan: firmaMap.get(gorev.ilgili_firma_id)! }
            : null,
        atanan_kisi: gorev.atanan_kisi_id
            ? { tam_ad: profilMap.get(gorev.atanan_kisi_id) || null }
            : null,
    }));

    const totalCount = gorevListe.length;
    const openCount  = gorevListe.filter(g => !g.tamamlandi).length;

    return (
        <main className="space-y-6 pb-10">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Görev Yönetimi</h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        {totalCount} görev · {openCount} açık · {totalCount - openCount} tamamlandı
                    </p>
                </div>
                <Link
                    href={`/${locale}/admin/gorevler/ekle`}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors min-h-[44px] shadow-sm"
                >
                    <FiPlus size={18} /> Yeni Görev
                </Link>
            </header>

            {/* Boş durum */}
            {totalCount === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                    <FiClipboard className="mx-auto text-5xl text-slate-200 mb-4" />
                    <h2 className="text-xl font-semibold text-slate-600">
                        {Object.keys(sp).length > 0 ? 'Filtreye uyan görev yok' : 'Henüz görev yok'}
                    </h2>
                    <p className="mt-1 text-slate-400 text-sm">
                        {Object.keys(sp).length > 0
                            ? 'Filtre kriterlerini değiştirmeyi deneyin.'
                            : 'İlk görevi ekleyerek başlayın.'}
                    </p>
                </div>
            ) : (
                <Suspense fallback={
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-48 bg-slate-200 rounded-xl" />
                        ))}
                    </div>
                }>
                    <GorevlerClient
                        gorevler={gorevListe as any}
                        profiller={profiller}
                        locale={locale}
                    />
                </Suspense>
            )}
        </main>
    );
}
