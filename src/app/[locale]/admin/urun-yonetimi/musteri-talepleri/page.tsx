import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { FiClock, FiCheckCircle, FiPackage, FiMessageSquare } from 'react-icons/fi';
import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';
import TalepDurumSelect from './TalepDurumSelect';

export const dynamic = 'force-dynamic';

interface MusteriTalepleriPageProps {
    params: Promise<{ locale: Locale }>;
}

export default async function MusteriTalepleriPage({ params }: MusteriTalepleriPageProps) {
    noStore();
    const { locale } = await params;
    
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: talepler, error } = await (supabase as any)
        .from('urun_talepleri')
        .select(`
            *,
            firma:firmalar(unvan),
            kullanici:profiller(ad_soyad),
            urun:urunler(ad, stok_kodu)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Talep getirme hatası:", error);
    }

    const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString(locale, { 
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const getLocalizedName = (adObj: any, locale: Locale, fallback = 'Unbenannt') => {
        if (!adObj) return fallback;
        if (typeof adObj === 'string') return adObj;
        return adObj[locale] || adObj['de'] || Object.values(adObj)[0] as string || fallback;
    };

    return (
        <main className="space-y-8 p-6">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">
                    {locale === 'de' ? 'Kundenanfragen (Nachbestellungen)' : 'Müşteri Talepleri (Ön Siparişler)'}
                </h1>
                <p className="text-gray-500 mt-1">
                    {locale === 'de' ? 'Kundenanfragen für nicht vorrätige Produkte.' : 'Stokta olmayan ürünler için müşterilerden gelen talepler.'}
                </p>
            </header>

            {!talepler || talepler.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-200 rounded-lg bg-white shadow-sm">
                    <FiMessageSquare className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {locale === 'de' ? 'Keine Anfragen gefunden.' : 'Henüz bir talep bulunmuyor.'}
                    </h2>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Tarih', 'Firma', 'Ürün', 'Miktar', 'Durum', 'Notlar'].map(header => (
                                    <th key={header} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {talepler.map((talep: any) => {
                                const urunAd = getLocalizedName(talep.urun?.ad, locale);
                                
                                return (
                                    <tr key={talep.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(talep.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-semibold text-primary">
                                                {talep.firma?.unvan || 'Bilinmiyor'}
                                            </div>
                                            <div className="text-xs text-gray-500">{talep.kullanici?.ad_soyad}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900">{urunAd}</div>
                                            <div className="text-xs text-gray-500 font-mono">{talep.urun?.stok_kodu}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold bg-gray-100 inline-block px-2 py-1 rounded">
                                                {talep.miktar} {talep.birim}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <TalepDurumSelect talepId={talep.id} initialDurum={talep.durum} />
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={talep.notlar}>
                                            {talep.notlar || '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}
