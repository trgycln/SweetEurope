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

    // Kullanıcı profilini al (rol & bağlı firma)
    const { data: userProfile } = await supabase
        .from('profiller')
        .select('firma_id, rol')
        .eq('id', user.id)
        .maybeSingle();

    // Sipariş ve Alıcı Firma Bilgilerini Çek
    const { data: siparisData, error } = await supabase
        .from('siparisler')
        .select(`
            *,
            firmalar ( id, unvan, adres, sehir, ilce, posta_kodu, telefon, email, ust_bayi_firma_id, parent_firma_id, ticari_tip ),
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
    const aliciFirma = siparis.firmalar;
    const urunSatirlari = siparis.siparis_detay || [];

    // ── GÖNDERİCİ (ABSENDER / LIEFERANT) TESPİTİ ──
    // Sipariş bir alt bayinin müşterisine mi ait?
    const ustBayiId = aliciFirma?.ust_bayi_firma_id || aliciFirma?.parent_firma_id || (userProfile?.rol === 'Alt Bayi' && userProfile.firma_id !== aliciFirma?.id ? userProfile.firma_id : null);

    let gondericiFirma: any = null;

    if (ustBayiId) {
        const { data: bayiData } = await supabase
            .from('firmalar')
            .select('id, unvan, adres, sehir, ilce, posta_kodu, telefon, email, vergi_no')
            .eq('id', ustBayiId)
            .maybeSingle();
        gondericiFirma = bayiData || null;
    }

    // Varsayılan Merkez Bilgileri
    const merkezBilgileri = {
        unvan: 'Elysonsweets GmbH',
        altBaslik: 'Süßwaren & Dessert Großhandel',
        adres: 'Wilhelm-Ruppert-Straße 38 / F8',
        posta_kodu: '51147',
        sehir: 'Köln',
        ulke: 'Deutschland',
        email: 'info@elysonsweets.de | elysonsweets@gmail.com',
        telefon: '+49 176 12345678',
        isBayi: false
    };

    const gonderici = gondericiFirma ? {
        unvan: gondericiFirma.unvan,
        altBaslik: 'Autorisierter Vertriebspartner / Yetkili Satış Bayisi',
        adres: gondericiFirma.adres || '',
        posta_kodu: gondericiFirma.posta_kodu || '',
        sehir: [gondericiFirma.ilce, gondericiFirma.sehir].filter(Boolean).join(', ') || 'Deutschland',
        ulke: 'Deutschland',
        email: gondericiFirma.email || '',
        telefon: gondericiFirma.telefon || '',
        isBayi: true
    } : merkezBilgileri;

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

                {/* ── ÜST BAŞLIK (LIEFERSCHEIN + LOGO + GÖNDERİCİ BİLGİLERİ) ── */}
                <div className="flex justify-between items-start mb-6 border-b border-gray-300 pb-4 gap-4">
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-gray-900 tracking-wider mb-1">LIEFERSCHEIN</h1>
                        <p className="text-sm text-gray-600 font-mono">Lieferschein-Nr: #{siparis.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-gray-600">
                            Datum: {formatLocaleDate(siparis.siparis_tarihi, 'de', {
                                day: '2-digit', month: '2-digit', year: 'numeric'
                            })}
                        </p>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="SweetHeaven Logo" className="h-24 object-contain print:grayscale" />
                        {gonderici.isBayi && (
                            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mt-1">
                                Partner Distribution
                            </span>
                        )}
                    </div>

                    {/* Gönderici (Absender) Bilgileri */}
                    <div className="flex-1 text-right text-xs">
                        <h2 className="font-bold text-base text-gray-900">{gonderici.unvan}</h2>
                        {gonderici.altBaslik && (
                            <p className="text-[10px] font-semibold text-gray-500">{gonderici.altBaslik}</p>
                        )}
                        <p className="text-gray-600 mt-1 leading-relaxed">
                            {gonderici.adres && <>{gonderici.adres}<br /></>}
                            {[gonderici.posta_kodu, gonderici.sehir].filter(Boolean).join(' ')}<br />
                            {gonderici.telefon && <>Tel: {gonderici.telefon}<br /></>}
                            {gonderici.email && <>{gonderici.email}</>}
                        </p>
                    </div>
                </div>

                {/* ── ALICI (EMPFÄNGER) & TESLİMAT ADRESİ (LIEFERADRESSE) ── */}
                <div className="grid grid-cols-2 gap-8 mb-6 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 border-b border-gray-200 pb-1">
                            Empfänger (Müşteri / Alıcı)
                        </h3>
                        <p className="font-bold text-sm text-gray-900">{aliciFirma?.unvan || '—'}</p>
                        {aliciFirma?.telefon && <p className="text-xs text-gray-600 mt-0.5">Tel: {aliciFirma.telefon}</p>}
                        {aliciFirma?.email && <p className="text-xs text-gray-600">E-Mail: {aliciFirma.email}</p>}
                    </div>
                    
                    <div>
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 border-b border-gray-200 pb-1">
                            Lieferadresse (Teslimat Adresi)
                        </h3>
                        <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                            {siparis.teslimat_adresi || [aliciFirma?.adres, aliciFirma?.posta_kodu, aliciFirma?.sehir].filter(Boolean).join(', ') || '—'}
                        </p>
                    </div>
                </div>

                {/* ── ÜRÜN KALEMLERİ TABLOSU ── */}
                <div className="mb-8">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="py-2.5 px-3 font-bold text-gray-800 border-b border-gray-300 w-16 text-center">Pos.</th>
                                <th className="py-2.5 px-3 font-bold text-gray-800 border-b border-gray-300 w-28">Art-Nr.</th>
                                <th className="py-2.5 px-3 font-bold text-gray-800 border-b border-gray-300">Artikelbeschreibung</th>
                                <th className="py-2.5 px-3 font-bold text-gray-800 border-b border-gray-300 w-24 text-right">Menge (Koli)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {urunSatirlari.map((item: any, index: number) => (
                                <tr key={item.id} className="border-b border-gray-200 print:break-inside-avoid hover:bg-gray-50">
                                    <td className="py-2.5 px-3 text-center text-gray-600 font-medium">{index + 1}</td>
                                    <td className="py-2.5 px-3 font-mono text-xs text-gray-600">{item.urunler?.stok_kodu || '-'}</td>
                                    <td className="py-2.5 px-3 font-semibold text-gray-900">
                                        {getProductName(item.urunler?.ad, 'de')}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-bold text-gray-900 text-sm">
                                        {item.miktar}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                                <td colSpan={3} className="py-2.5 px-3 text-right text-gray-700">Gesamtmenge (Toplam Koli):</td>
                                <td className="py-2.5 px-3 text-right text-gray-900 text-base">
                                    {urunSatirlari.reduce((sum: number, i: any) => sum + (Number(i.miktar) || 0), 0)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* ── İMZA VE TESLİMAT ALANI ── */}
                <div className="grid grid-cols-2 gap-12 mt-12 print:break-inside-avoid">
                    <div>
                        <div className="border-t-2 border-gray-400 pt-2 text-center">
                            <p className="font-bold text-sm text-gray-800">Übergeben durch (Teslim Eden / Bayi Sürücüsü)</p>
                            <p className="text-xs text-gray-500">{gonderici.unvan}</p>
                            <div className="h-12 mt-1"></div>
                            <p className="text-[10px] text-gray-400">(Datum / Unterschrift)</p>
                        </div>
                    </div>
                    <div>
                        <div className="border-t-2 border-gray-400 pt-2 text-center">
                            <p className="font-bold text-sm text-gray-800">Empfangen von (Teslim Alan / Müşteri)</p>
                            <p className="text-xs text-gray-500">{aliciFirma?.unvan || 'Kunde'}</p>
                            <div className="h-12 mt-1"></div>
                            <p className="text-[10px] text-gray-400">(Datum / Unterschrift)</p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
                    Bitte prüfen Sie die Lieferung sofort auf Vollständigkeit und Unversehrtheit. Vielen Dank für Ihren Auftrag!
                </div>
            </div>
        </div>
    );
}
