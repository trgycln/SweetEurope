import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';
import { unstable_noStore as noStore } from 'next/cache';
import BelgeYonetimClient from './BelgeYonetimClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
}

export default async function BelgeYonetimPage({ params }: PageProps) {
    noStore();
    const { locale } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) redirect(`/${locale}/login`);

    // Fetch belgeler (gracefully handle missing table)
    const { data: rawBelgeler, error: tableError } = await supabase
        .from('belgeler')
        .select(`
            id, ad, kategori, alt_kategori, dosya_url, dosya_boyutu, dosya_tipi,
            iliski_tipi, iliski_id, firma_id, tir_id, aciklama, etiketler,
            son_gecerlilik_tarihi, yukleyen_id, olusturma_tarihi, gizli, otomatik_eklendi, tedarikci_adi,
            firma:firmalar(unvan),
            tir:ithalat_partileri(referans_kodu)
        `)
        .order('olusturma_tarihi', { ascending: false })
        .limit(500);

    // Table not yet created — show migration instructions
    if (tableError?.message?.includes('relation "belgeler" does not exist') ||
        tableError?.code === '42P01') {
        return (
            <div className="max-w-3xl mx-auto mt-10 p-6 bg-amber-50 border border-amber-200 rounded-xl">
                <h2 className="text-xl font-bold text-amber-900 mb-2">⚙️ Veritabanı kurulumu gerekli</h2>
                <p className="text-amber-800 text-sm mb-4">
                    <strong>belgeler</strong> tablosu henüz oluşturulmamış.
                    Supabase Dashboard &gt; SQL Editor'da aşağıdaki dosyayı çalıştırın:
                </p>
                <code className="block bg-white border border-amber-200 rounded-lg p-4 text-xs font-mono text-slate-700 whitespace-pre">
                    supabase/migrations/belgeler_table.sql
                </code>
                <p className="text-amber-700 text-sm mt-3">
                    Ayrıca Supabase Storage'da <strong>belgeler</strong> adında public olmayan bir bucket oluşturun.
                </p>
            </div>
        );
    }

    if (tableError) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                Belgeler yüklenemedi: {tableError.message}
            </div>
        );
    }

    // Firm list for filter/upload dropdowns
    const { data: firmalar } = await supabase
        .from('firmalar')
        .select('id, unvan')
        .order('unvan')
        .limit(300);

    // TIR list for upload dropdown
    const { data: tirlar } = await supabase
        .from('ithalat_partileri')
        .select('id, referans_kodu')
        .order('created_at', { ascending: false })
        .limit(100);

    const belgeler = rawBelgeler ?? [];

    // Compute summary stats server-side
    const now = Date.now();
    const thirtyDaysFromNow = now + 30 * 86400000;
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    const stats = {
        toplam: belgeler.length,
        suresi_yakin: belgeler.filter(b => {
            if (!b.son_gecerlilik_tarihi) return false;
            const exp = new Date(b.son_gecerlilik_tarihi).getTime();
            return exp > now && exp < thirtyDaysFromNow;
        }).length,
        bekleyen: belgeler.filter(b => b.otomatik_eklendi && !b.dosya_url).length,
        bu_ay: belgeler.filter(b => new Date(b.olusturma_tarihi).getTime() > thisMonthStart).length,
        sozlesmeler: belgeler.filter(b => b.kategori === 'sozlesmeler').length,
    };

    // Category counts for sidebar
    const kategoriSayilari: Record<string, number> = {};
    belgeler.forEach(b => {
        kategoriSayilari[b.kategori] = (kategoriSayilari[b.kategori] || 0) + 1;
        if (b.alt_kategori) {
            kategoriSayilari[b.alt_kategori] = (kategoriSayilari[b.alt_kategori] || 0) + 1;
        }
    });

    // Expiring count per category (for sidebar warning badge)
    const kategoriSuresiBitenler: Record<string, number> = {};
    belgeler.filter(b => {
        if (!b.son_gecerlilik_tarihi) return false;
        const exp = new Date(b.son_gecerlilik_tarihi).getTime();
        return exp > now && exp < thirtyDaysFromNow;
    }).forEach(b => {
        kategoriSuresiBitenler[b.kategori] = (kategoriSuresiBitenler[b.kategori] || 0) + 1;
    });

    return (
        <BelgeYonetimClient
            belgeler={belgeler as any}
            stats={stats}
            kategoriSayilari={kategoriSayilari}
            kategoriSuresiBitenler={kategoriSuresiBitenler}
            firmalar={firmalar ?? []}
            tirlar={tirlar ?? []}
            locale={locale}
        />
    );
}
