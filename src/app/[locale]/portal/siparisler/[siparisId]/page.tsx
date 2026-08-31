import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiArrowLeft, FiUser, FiTruck, FiPackage,
    FiMapPin, FiCalendar, FiClock, FiAlertTriangle,
    FiCheck, FiPrinter,
} from 'react-icons/fi';
import DurumGuncellePaneli from '@/app/[locale]/admin/operasyon/siparisler/[siparisId]/DurumGuncellePaneli';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { unstable_noStore as noStore } from 'next/cache';
import { formatCurrency, formatLocaleDate } from '@/lib/portalLabels';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

const getProductName = (ad: any, locale: string): string => {
    if (!ad || typeof ad !== 'object') return 'Ürün';
    return ad[locale] || ad['de'] || ad['tr'] || Object.values(ad)[0] as string || 'Ürün';
};

const STATUS_CONFIG: Record<string, {
    label: string; bg: string; text: string; border: string; step: number;
}> = {
    'Ön Sipariş':         { label: 'Ön Sipariş / Talep', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', step: 0.5 },
    'Beklemede':          { label: 'Beklemede',    bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  step: 1 },
    'Hazırlanıyor':       { label: 'Hazırlanıyor', bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   step: 2 },
    'processing':         { label: 'İşleniyor',    bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   step: 2 },
    'Yola Çıktı':         { label: 'Yola Çıktı',   bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200', step: 3 },
    'shipped':            { label: 'Yola Çıktı',   bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200', step: 3 },
    'Teslim Edildi':      { label: 'Teslim Edildi',bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  step: 4 },
    'delivered':          { label: 'Teslim Edildi',bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  step: 4 },
    'iptal_talep_edildi': { label: 'İptal Talep',  bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200', step: 0 },
    'İptal Edildi':       { label: 'İptal Edildi', bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',    step: 0 },
    'cancelled':          { label: 'İptal Edildi', bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',    step: 0 },
};

const STEPS = [
    { key: 'Beklemede',    label: 'Beklemede',    icon: <FiClock size={14} /> },
    { key: 'Hazırlanıyor', label: 'Hazırlanıyor', icon: <FiPackage size={14} /> },
    { key: 'Yola Çıktı',   label: 'Yola Çıktı',  icon: <FiTruck size={14} /> },
    { key: 'Teslim Edildi',label: 'Teslim',       icon: <FiCheck size={14} /> },
];

interface PageProps {
    params: Promise<{ locale: Locale; siparisId: string }>;
}

export default async function PartnerSiparisDetayPage({ params }: PageProps) {
    noStore();
    const { siparisId, locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id, rol')
        .eq('id', user.id)
        .single();

    if (!profile?.firma_id) return notFound();

    const { data: siparisData, error } = await supabase
        .from('siparisler')
        .select(`
            *,
            firmalar ( id, unvan, adres, sehir, ilce, posta_kodu, telefon, email, ust_bayi_firma_id, parent_firma_id ),
            siparis_detay (
                id, urun_id, miktar, birim_fiyat, toplam_fiyat,
                urunler ( id, ad, stok_kodu, ana_resim_url )
            )
        `)
        .eq('id', siparisId)
        .maybeSingle();

    if (error || !siparisData) {
        console.error(`Sipariş bulunamadı: ${siparisId}`, error);
        return notFound();
    }

    const siparis = siparisData as any;
    const aliciFirma = siparis.firmalar;
    const urunSatirlari = siparis.siparis_detay || [];
    const cfg = STATUS_CONFIG[siparis.siparis_durumu];
    const currentStep = cfg?.step ?? 0;
    const isIptal = currentStep === 0;

    // Yetki kontrolü: Kendi siparişi mi yoksa alt bayinin müşterisinin siparişi mi?
    const kendiSiparisi = siparis.firma_id === profile.firma_id;
    const isAltBayiMusteriSiparisi = profile.rol === 'Alt Bayi' && (
        aliciFirma?.ust_bayi_firma_id === profile.firma_id ||
        aliciFirma?.parent_firma_id === profile.firma_id
    );

    if (!kendiSiparisi && !isAltBayiMusteriSiparisi) {
        console.error(`Yetkisiz erişim: ${user.id} → ${siparisId}`);
        return notFound();
    }

    const fmt = (v: number | null) => formatCurrency(v, locale, { maximumFractionDigits: 2 });

    return (
        <div className="space-y-6 pb-10">
            {/* Geri Dönüş Butonu */}
            <Link
                href={`/${locale}/portal/siparisler`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
                <FiArrowLeft size={14} />
                <span>Sipariş Yönetimine Dön</span>
            </Link>

            {/* Header & Başlık Çubuğu */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-black text-slate-900">
                            #{siparis.id.slice(0, 8).toUpperCase()}
                        </h1>
                        <Link
                            href={`/${locale}/print/lieferschein/${siparis.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-2xs"
                            title="Teslimat İrsaliyesi (Lieferschein) Yazdır"
                        >
                            <FiPrinter size={14} />
                            <span>Lieferschein Yazdır</span>
                        </Link>
                        {cfg && (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {cfg.label}
                            </span>
                        )}
                        {siparis.siparis_durumu === 'iptal_talep_edildi' && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold rounded-full">
                                <FiAlertTriangle size={11} /> İptal Talebi Var
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <FiCalendar size={12} />
                            {formatLocaleDate(siparis.siparis_tarihi, locale, {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                        {aliciFirma?.unvan && (
                            <>
                                <span>·</span>
                                <span className="font-bold text-slate-700">Müşteri: {aliciFirma.unvan}</span>
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* Progress Bar (Aşama Takip Çizelgesi) */}
            {!isIptal && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-8 right-8 top-5 h-0.5 bg-slate-100 z-0" />
                        <div
                            className="absolute left-8 top-5 h-0.5 bg-slate-900 z-0 transition-all"
                            style={{ width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - 4rem)` }}
                        />
                        {STEPS.map((step, i) => {
                            const stepNum = i + 1;
                            const isDone = currentStep > stepNum;
                            const isCurrent = currentStep === stepNum;
                            return (
                                <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                        isDone ? 'bg-slate-900 border-slate-900 text-white'
                                            : isCurrent ? 'bg-white border-slate-900 text-slate-900 font-bold'
                                            : 'bg-white border-slate-200 text-slate-300'
                                    }`}>
                                        {isDone ? <FiCheck size={16} /> : step.icon}
                                    </div>
                                    <span className={`text-[11px] font-semibold text-center ${
                                        isDone || isCurrent ? 'text-slate-800 font-bold' : 'text-slate-400'
                                    }`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Ana Izgara (Sol: Ürünler | Sağ: Durum Güncelle Paneli & Müşteri) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                
                {/* ── SOL KOLON (2/3): Sipariş Ürünleri Dökümü ── */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                                <FiPackage size={14} className="text-teal-600" />
                                Sipariş Edilen Ürünler ({urunSatirlari.length})
                            </h2>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {urunSatirlari.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition">
                                    <div className="relative w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200">
                                        {item.urunler?.ana_resim_url ? (
                                            <Image
                                                src={item.urunler.ana_resim_url}
                                                alt={getProductName(item.urunler?.ad, locale)}
                                                fill sizes="48px" className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                <FiPackage size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 truncate">
                                            {getProductName(item.urunler?.ad, locale)}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                            {item.urunler?.stok_kodu && (
                                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                                    {item.urunler.stok_kodu}
                                                </span>
                                            )}
                                            <span>{item.miktar} Koli × {fmt(item.birim_fiyat)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-sm font-bold text-slate-900">
                                            {fmt(item.toplam_fiyat)}
                                        </span>
                                        <span className="block text-[10px] text-slate-400">Net</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Toplam Tutar Özeti */}
                        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs">
                            <div className="text-slate-600">
                                Toplam <strong>{urunSatirlari.reduce((sum: number, i: any) => sum + (Number(i.miktar) || 0), 0)}</strong> koli ürün
                            </div>
                            <div className="flex items-center gap-4 text-right">
                                <div>
                                    <span className="text-slate-400 mr-2">Net:</span>
                                    <span className="font-bold text-slate-800">{fmt(siparis.toplam_tutar_net)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 mr-2">Brüt (+%{siparis.kdv_orani || 7}):</span>
                                    <span className="font-black text-slate-900 text-sm">{fmt(siparis.toplam_tutar_brut)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── SAĞ KOLON (1/3): DURUM GÜNCELLEME PANELİ & MÜŞTERİ BİLGİSİ ── */}
                <div className="space-y-4">
                    {/* Durum Güncelleme Paneli (Merkez ile Birebir Aynı Komponent) */}
                    {(profile.rol === 'Alt Bayi' || isAltBayiMusteriSiparisi) && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                <FiTruck size={14} className="text-teal-600" />
                                Sipariş Durum Yönetimi
                            </h3>
                            <DurumGuncellePaneli
                                siparisId={siparis.id}
                                mevcutDurum={siparis.siparis_durumu}
                                locale={locale}
                            />
                        </div>
                    )}

                    {/* Müşteri & Teslimat Bilgileri */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3.5">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                            <FiUser size={14} className="text-blue-600" />
                            Müşteri & Teslimat Bilgileri
                        </h3>
                        
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Firma Ünvanı</span>
                            <p className="text-sm font-bold text-slate-900 mt-0.5">{aliciFirma?.unvan || '—'}</p>
                        </div>

                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Teslimat Adresi</span>
                            <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
                                {siparis.teslimat_adresi || [aliciFirma?.adres, aliciFirma?.posta_kodu, aliciFirma?.sehir].filter(Boolean).join(', ') || '—'}
                            </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                            {aliciFirma?.telefon && (
                                <p className="text-slate-600">
                                    <strong className="text-slate-800">Tel:</strong> {aliciFirma.telefon}
                                </p>
                            )}
                            {aliciFirma?.email && (
                                <p className="text-slate-600">
                                    <strong className="text-slate-800">E-Posta:</strong> {aliciFirma.email}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
