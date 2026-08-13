import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import { formatLocaleDate } from '@/lib/portalLabels';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

const getProductName = (ad: any, locale: string): string => {
    if (!ad || typeof ad !== 'object') return 'Ürün';
    return ad[locale] || ad['de'] || ad['tr'] || Object.values(ad)[0] as string || 'Ürün';
};

interface PageProps {
    params: Promise<{ locale: string; siparisId: string }>;
}

export default async function LieferscheinPage({ params }: PageProps) {
    const { siparisId, locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: siparisData, error } = await supabase
        .from('siparisler')
        .select(`
            *,
            firmalar ( id, unvan, adres, telefon, email ),
            siparis_detay (
                id, urun_id, miktar, birim_fiyat, toplam_fiyat,
                urunler ( id, ad, stok_kodu )
            )
        `)
        .eq('id', siparisId)
        .maybeSingle();

    if (error || !siparisData) {
        return notFound();
    }

    const siparis = siparisData as any;
    const firma = siparis.firmalar;
    const urunSatirlari = siparis.siparis_detay || [];

    return (
        <div className="bg-white min-h-screen text-black relative !bg-white">
            <style dangerouslySetInnerHTML={{__html: `
                body, html { background-color: white !important; background-image: none !important; }
                @media print {
                    body, html { background-color: white !important; background-image: none !important; }
                    @page { margin: 15mm; }
                }
            `}} />
            <script dangerouslySetInnerHTML={{ __html: 'window.onload = function() { window.print(); }' }} />

            {/* Watermark */}
            <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" className="w-[600px] grayscale" />
            </div>
            
            <div className="max-w-4xl mx-auto p-8 print:p-0 print:max-w-none relative z-10">
                <div className="mb-8 print:hidden flex justify-end">
                    <PrintButton />
                </div>

                <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-gray-900 tracking-wider mb-1">LIEFERSCHEIN</h1>
                        <p className="text-sm text-gray-600 font-mono">Nr: #{siparis.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-gray-600">Datum: {formatLocaleDate(siparis.siparis_tarihi, 'de', {
                            day: '2-digit', month: '2-digit', year: 'numeric'
                        })}</p>
                    </div>

                    <div className="flex-1 flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="Elysonsweets GmbH" className="h-32 object-contain print:grayscale" />
                    </div>

                    <div className="flex-1 text-right text-xs">
                        <h2 className="font-bold text-base text-gray-800">Elysonsweets GmbH</h2>
                        <p className="text-gray-600 mt-1">
                            Wilhelm-Ruppert-Straße 38 / F8<br />
                            51147 Köln, Deutschland<br />
                            info@elysonsweets.de | elysonsweets@gmail.com
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-6">
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 border-b border-gray-200 pb-1">
                            Empfänger
                        </h3>
                        <p className="font-bold text-sm text-gray-800">{firma?.unvan || '—'}</p>
                        {firma?.telefon && <p className="text-xs text-gray-600 mt-0.5">Tel: {firma.telefon}</p>}
                        {firma?.email && <p className="text-xs text-gray-600">E-Mail: {firma.email}</p>}
                    </div>
                    
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 border-b border-gray-200 pb-1">
                            Lieferadresse
                        </h3>
                        <p className="text-xs text-gray-800 whitespace-pre-wrap leading-tight">
                            {siparis.teslimat_adresi || firma?.adres || '—'}
                        </p>
                    </div>
                </div>

                <div className="mb-8">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="py-2 px-3 font-bold text-gray-800 border-b border-gray-300 w-16 text-center">Pos.</th>
                                <th className="py-2 px-3 font-bold text-gray-800 border-b border-gray-300 w-28">Art-Nr.</th>
                                <th className="py-2 px-3 font-bold text-gray-800 border-b border-gray-300">Artikelbeschreibung</th>
                                <th className="py-2 px-3 font-bold text-gray-800 border-b border-gray-300 w-24 text-right">Menge</th>
                            </tr>
                        </thead>
                        <tbody>
                            {urunSatirlari.map((item: any, index: number) => (
                                <tr key={item.id} className="border-b border-gray-200 print:break-inside-avoid">
                                    <td className="py-2 px-3 text-center text-gray-600">{index + 1}</td>
                                    <td className="py-2 px-3 font-mono text-xs text-gray-600">{item.urunler?.stok_kodu || '-'}</td>
                                    <td className="py-2 px-3 font-semibold text-gray-800">
                                        {getProductName(item.urunler?.ad, 'de')}
                                    </td>
                                    <td className="py-2 px-3 text-right font-bold text-gray-900">
                                        {item.miktar}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-12 mt-12 print:break-inside-avoid">
                    <div>
                        <div className="border-t-2 border-gray-400 pt-2 text-center">
                            <p className="font-bold text-sm text-gray-800">Übergeben durch</p>
                            <p className="text-xs text-gray-500">Name / Fahrer</p>
                            <div className="h-12 mt-1"></div>
                            <p className="text-[10px] text-gray-400">(Datum / Unterschrift)</p>
                        </div>
                    </div>
                    <div>
                        <div className="border-t-2 border-gray-400 pt-2 text-center">
                            <p className="font-bold text-sm text-gray-800">Empfangen von</p>
                            <p className="text-xs text-gray-500">{firma?.unvan || 'Kunde'}</p>
                            <div className="h-12 mt-1"></div>
                            <p className="text-[10px] text-gray-400">(Datum / Unterschrift)</p>
                        </div>
                    </div>
                </div>

                <div className="mt-16 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
                    Bitte prüfen Sie die Lieferung sofort auf Vollständigkeit und Unversehrtheit.
                </div>
            </div>
        </div>
    );
}
