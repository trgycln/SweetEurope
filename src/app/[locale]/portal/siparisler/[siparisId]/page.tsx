import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    Truck,
    ExternalLink,
    FileText,
    Download,
    CheckCircle2,
    Package,
    Calendar,
    MapPin,
    User,
    Clock,
    AlertTriangle,
    Printer,
    ArrowLeft,
    Check,
} from 'lucide-react';
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
    { key: 'Beklemede',    label: { de: 'Ausstehend', tr: 'Beklemede' },    icon: <Clock size={14} /> },
    { key: 'Hazırlanıyor', label: { de: 'In Bearbeitung', tr: 'Hazırlanıyor' }, icon: <Package size={14} /> },
    { key: 'Yola Çıktı',   label: { de: 'Unterwegs', tr: 'Yola Çıktı' },    icon: <Truck size={14} /> },
    { key: 'Teslim Edildi',label: { de: 'Zugestellt', tr: 'Teslim' },       icon: <Check size={14} /> },
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
                urunler ( id, ad, stok_kodu, ana_resim_url, koli_ici_adet )
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

    // Fatura ve Kargo URL Hesaplamaları (Null-safety kurallarına uygun)
    const invoicePdfUrl = siparis.lexware_pdf_url || (siparis.lexware_invoice_id ? `/api/invoices/${siparis.id}/pdf` : null);
    const hasInvoice = (siparis.fatura_durumu === 'kesildi' || Boolean(siparis.lexware_invoice_id)) && Boolean(invoicePdfUrl);

    const isOrderCancelled = ['İptal Edildi', 'cancelled', 'iptal_edildi'].includes(siparis.siparis_durumu) ||
                             siparis.fatura_durumu === 'iptal_edildi' ||
                             Boolean(siparis.lexware_storno_id);
    const stornoPdfUrl = siparis.lexware_storno_pdf_url || (siparis.lexware_storno_id ? `/api/invoices/${siparis.id}/storno-pdf` : null);
    const hasStorno = isOrderCancelled && Boolean(stornoPdfUrl);

    const isShippedOrDelivered = ['Yola Çıktı', 'shipped', 'Teslim Edildi', 'delivered'].includes(siparis.siparis_durumu) ||
                                Boolean(siparis.kargo_takip_no) ||
                                Boolean(siparis.kargo_takip_url);

    return (
        <div className="space-y-6 pb-10">
            {/* Geri Dönüş Butonu */}
            <Link
                href={`/${locale}/portal/siparisler`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
                <ArrowLeft size={14} />
                <span>{locale === 'de' ? 'Zurück zu Bestellungen' : 'Sipariş Yönetimine Dön'}</span>
            </Link>

            {/* Header & Başlık Çubuğu */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-black text-slate-900">
                            #{siparis.id.slice(0, 8).toUpperCase()}
                        </h1>

                        {/* Lieferschein Yazdır */}
                        <Link
                            href={`/${locale}/print/lieferschein/${siparis.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-2xs"
                            title={locale === 'de' ? 'Lieferschein drucken' : 'Teslimat İrsaliyesi (Lieferschein) Yazdır'}
                        >
                            <Printer size={14} />
                            <span>{locale === 'de' ? 'Lieferschein' : 'Lieferschein Yazdır'}</span>
                        </Link>

                        {/* Faturayı İndir (PDF) */}
                        {hasInvoice && (
                            <a
                                href={invoicePdfUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-colors shadow-2xs"
                                title={locale === 'de' ? 'Offizielle Rechnung (PDF) herunterladen' : 'Resmi Fatura (Rechnung PDF) İndir'}
                            >
                                <FileText size={14} className="text-emerald-600" />
                                <span>{locale === 'de' ? `Rechnung (${siparis.lexware_invoice_no || 'PDF'})` : `Faturayı İndir (${siparis.lexware_invoice_no || 'PDF'})`}</span>
                                <Download size={12} className="text-emerald-500 opacity-80" />
                            </a>
                        )}

                        {/* Fatura Kesildi ama Henüz URL Hazır Değilse */}
                        {siparis.fatura_durumu === 'kesildi' && !invoicePdfUrl && (
                            <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed"
                                title={locale === 'de' ? 'Rechnung wird vorbereitet...' : 'Fatura hazırlanıyor...'}
                            >
                                <FileText size={14} />
                                <span>{locale === 'de' ? 'Rechnung in Vorbereitung' : 'Fatura Hazırlanıyor'}</span>
                            </span>
                        )}

                        {/* İptal Faturasını İndir (Storno) */}
                        {hasStorno && (
                            <a
                                href={stornoPdfUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl hover:bg-rose-100 transition-colors shadow-2xs"
                                title={locale === 'de' ? 'Rechnungskorrektur (Storno PDF) herunterladen' : 'İptal Belgesi (Rechnungskorrektur PDF) İndir'}
                            >
                                <FileText size={14} className="text-rose-600" />
                                <span>{locale === 'de' ? `Storno (${siparis.lexware_storno_no || 'PDF'})` : `İptal Faturası (${siparis.lexware_storno_no || 'PDF'})`}</span>
                                <Download size={12} className="text-rose-500 opacity-80" />
                            </a>
                        )}

                        {cfg && (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {cfg.label}
                            </span>
                        )}

                        {siparis.siparis_durumu === 'iptal_talep_edildi' && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold rounded-full">
                                <AlertTriangle size={12} /> {locale === 'de' ? 'Storno beantragt' : 'İptal Talebi Var'}
                            </span>
                        )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatLocaleDate(siparis.siparis_tarihi, locale, {
                                day: '2-digit', month: 'short', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                            })}
                        </span>
                        {aliciFirma?.unvan && (
                            <>
                                <span>·</span>
                                <span className="font-bold text-slate-700">{locale === 'de' ? 'Kunde' : 'Müşteri'}: {aliciFirma.unvan}</span>
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
                                        {isDone ? <Check size={16} /> : step.icon}
                                    </div>
                                    <span className={`text-[11px] font-semibold text-center ${
                                        isDone || isCurrent ? 'text-slate-800 font-bold' : 'text-slate-400'
                                    }`}>
                                        {locale === 'de' ? step.label.de : step.label.tr}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── KARGO & SEVKİYAT TAKİP KARTI ── */}
            {isShippedOrDelivered && (
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-xs overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center flex-shrink-0 text-white shadow-inner">
                                <Truck size={24} className="text-indigo-300" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base font-bold tracking-tight text-white">
                                        {locale === 'de' ? 'Versand & Sendungsverfolgung' : 'Kargo ve Sevkiyat Takibi'}
                                    </h2>
                                    {siparis.siparis_durumu === 'Teslim Edildi' || siparis.siparis_durumu === 'delivered' ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                                            <CheckCircle2 size={12} />
                                            {locale === 'de' ? 'Zugestellt' : 'Teslim Edildi'}
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/25 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                                            <Truck size={12} />
                                            {locale === 'de' ? 'Unterwegs' : 'Yolda'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    {locale === 'de'
                                        ? 'Ihre Lieferung befindet sich auf dem Transportweg zu Ihrer Lieferadresse.'
                                        : 'Siparişiniz anlaşmalı kargo firmamız ile tarafınıza teslim edilmek üzere yola çıkmıştır.'}
                                </p>
                            </div>
                        </div>

                        {/* Kargomu Takip Et Butonu (Sadece kargo_takip_url doluysa render edilir) */}
                        {siparis.kargo_takip_url ? (
                            <a
                                href={siparis.kargo_takip_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow active:scale-95 flex-shrink-0 w-full sm:w-auto"
                            >
                                <Truck size={15} className="text-indigo-600" />
                                <span>{locale === 'de' ? 'Sendung verfolgen' : 'Kargomu Takip Et'}</span>
                                <ExternalLink size={13} className="text-slate-400" />
                            </a>
                        ) : null}
                    </div>

                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50/50">
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                {locale === 'de' ? 'Versanddienstleister' : 'Kargo Firması'}
                            </span>
                            <p className="text-sm font-black text-slate-800 mt-1 flex items-center gap-1.5">
                                <Truck size={15} className="text-indigo-600" />
                                <span>{siparis.kargo_firmasi || (locale === 'de' ? 'Standardversand' : 'Standart Sevkiyat')}</span>
                            </p>
                        </div>

                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                {locale === 'de' ? 'Sendungsnummer' : 'Takip Numarası'}
                            </span>
                            {siparis.kargo_takip_no ? (
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                                        {siparis.kargo_takip_no}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic mt-1">
                                    {locale === 'de' ? 'Wird in Kürze hinterlegt' : 'Kısa süre içinde eklenecek'}
                                </p>
                            )}
                        </div>

                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                {locale === 'de' ? 'Lieferadresse' : 'Teslimat Noktası'}
                            </span>
                            <p className="text-xs text-slate-700 font-medium mt-1 truncate">
                                {siparis.teslimat_adresi || [aliciFirma?.adres, aliciFirma?.posta_kodu, aliciFirma?.sehir].filter(Boolean).join(', ') || '—'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Ana Izgara (Sol: Ürünler | Sağ: Durum Güncelle Paneli & Müşteri & Belgeler) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                
                {/* ── SOL KOLON (2/3): Sipariş Ürünleri Dökümü ── */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
                                <Package size={14} className="text-teal-600" />
                                {locale === 'de' ? `Bestellte Artikel (${urunSatirlari.length})` : `Sipariş Edilen Ürünler (${urunSatirlari.length})`}
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
                                                <Package size={20} />
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
                                            <span>
                                                {(() => {
                                                    const m = Number(item.miktar) || 0;
                                                    const koliIci = Number(item.urunler?.koli_ici_adet) || 1;
                                                    if (koliIci > 1 && m % koliIci === 0) {
                                                        const koli = m / koliIci;
                                                        return locale === 'de' 
                                                            ? `${koli} Karton (${m} Stk.) × ${fmt(item.birim_fiyat)}` 
                                                            : `${koli} Koli (${m} Adet) × ${fmt(item.birim_fiyat)}`;
                                                    }
                                                    return locale === 'de' 
                                                        ? `${m} Stk. × ${fmt(item.birim_fiyat)}` 
                                                        : `${m} Adet × ${fmt(item.birim_fiyat)}`;
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-sm font-bold text-slate-900">
                                            {fmt(item.toplam_fiyat)}
                                        </span>
                                        <span className="block text-[10px] text-slate-400">{locale === 'de' ? 'Netto' : 'Net'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Toplam Tutar Özeti */}
                        {(() => {
                            const urunNet = Number(siparis.toplam_tutar_net) || 0;
                            const kargoNet = Number(siparis.kargo_tutari_net) || 0;
                            const kargoKdv = Number(siparis.kargo_kdv_tutari) || (kargoNet > 0 ? Number((kargoNet * 0.07).toFixed(2)) : 0);
                            const urunKdv = Number((urunNet * 0.07).toFixed(2));
                            const toplamKdv = urunKdv + kargoKdv;
                            const genelBrut = Number(siparis.toplam_tutar_brut) || (urunNet + kargoNet + toplamKdv);

                            return (
                                <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <div className="text-slate-600">
                                            {locale === 'de' ? 'Gesamt' : 'Toplam'} <strong>{urunSatirlari.reduce((sum: number, i: any) => sum + (Number(i.miktar) || 0), 0)}</strong> {locale === 'de' ? 'Stück' : 'adet ürün'}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-right">
                                            <div>
                                                <span className="text-slate-400 mr-1.5">{locale === 'de' ? 'Warenwert (Netto):' : 'Ürünler Net:'}</span>
                                                <span className="font-bold text-slate-800">{fmt(urunNet)}</span>
                                            </div>
                                            {(kargoNet > 0 || siparis.kargo_yontemi) && (
                                                <div>
                                                    <span className="text-slate-400 mr-1.5">{locale === 'de' ? `Versand (${siparis.kargo_yontemi || 'Standard'}):` : `Kargo (${siparis.kargo_yontemi || 'Teslimat'}):`}</span>
                                                    <span className="font-bold text-slate-800">{kargoNet > 0 ? fmt(kargoNet) : (locale === 'de' ? 'Kostenlos' : 'Ücretsiz')}</span>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-slate-400 mr-1.5">{locale === 'de' ? 'MwSt. (7%):' : 'KDV (%7):'}</span>
                                                <span className="font-bold text-slate-800">{fmt(toplamKdv)}</span>
                                            </div>
                                            <div className="pl-2 border-l border-slate-300">
                                                <span className="text-slate-500 mr-1.5 font-medium">{locale === 'de' ? 'Gesamt (Brutto):' : 'Toplam (Brüt):'}</span>
                                                <span className="font-black text-slate-900 text-sm">{fmt(genelBrut)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* ── SAĞ KOLON (1/3): DURUM GÜNCELLEME, BELGELER & MÜŞTERİ BİLGİSİ ── */}
                <div className="space-y-4">
                    {/* Durum Güncelleme Paneli (Yalnızca Alt Bayi Yetkisi Varsa) */}
                    {(profile.rol === 'Alt Bayi' || isAltBayiMusteriSiparisi) && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                <Truck size={14} className="text-teal-600" />
                                {locale === 'de' ? 'Statusverwaltung' : 'Sipariş Durum Yönetimi'}
                            </h3>
                            <DurumGuncellePaneli
                                siparisId={siparis.id}
                                mevcutDurum={siparis.siparis_durumu}
                                locale={locale}
                            />
                        </div>
                    )}

                    {/* Fatura ve Resmi Belgeler Kartı */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3.5">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                            <FileText size={14} className="text-indigo-600" />
                            {locale === 'de' ? 'Rechnung & Dokumente' : 'Fatura ve Belgeler'}
                        </h3>

                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">{locale === 'de' ? 'Rechnungsstatus' : 'Fatura Durumu'}:</span>
                                {hasInvoice ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 size={11} /> {locale === 'de' ? 'Erstellt' : 'Kesildi'}
                                    </span>
                                ) : hasStorno ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                        <AlertTriangle size={11} /> {locale === 'de' ? 'Storniert' : 'İptal Edildi'}
                                    </span>
                                ) : (
                                    <span className="text-slate-500 font-medium">
                                        {locale === 'de' ? 'In Vorbereitung' : 'Hazırlanıyor'}
                                    </span>
                                )}
                            </div>

                            {siparis.lexware_invoice_no && (
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">{locale === 'de' ? 'Rechnungs-Nr.' : 'Fatura No'}:</span>
                                    <span className="font-mono font-bold text-slate-800">{siparis.lexware_invoice_no}</span>
                                </div>
                            )}

                            {siparis.lexware_storno_no && (
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">{locale === 'de' ? 'Storno-Nr.' : 'İptal Belge No'}:</span>
                                    <span className="font-mono font-bold text-rose-700">{siparis.lexware_storno_no}</span>
                                </div>
                            )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                            {hasInvoice && (
                                <a
                                    href={invoicePdfUrl!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-95"
                                >
                                    <FileText size={14} />
                                    <span>{locale === 'de' ? 'Rechnung herunterladen (PDF)' : 'Faturayı İndir (PDF)'}</span>
                                    <Download size={13} className="opacity-80" />
                                </a>
                            )}

                            {hasStorno && (
                                <a
                                    href={stornoPdfUrl!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-95"
                                >
                                    <FileText size={14} />
                                    <span>{locale === 'de' ? 'Rechnungskorrektur (Storno)' : 'İptal Faturasını İndir (Storno)'}</span>
                                    <Download size={13} className="opacity-80" />
                                </a>
                            )}

                            <Link
                                href={`/${locale}/print/lieferschein/${siparis.id}`}
                                target="_blank"
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-95"
                            >
                                <Printer size={14} />
                                <span>{locale === 'de' ? 'Lieferschein drucken' : 'İrsaliye Yazdır (Lieferschein)'}</span>
                            </Link>
                        </div>
                    </div>

                    {/* Müşteri & Teslimat Bilgileri */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3.5">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                            <User size={14} className="text-blue-600" />
                            {locale === 'de' ? 'Kunden- & Lieferdaten' : 'Müşteri & Teslimat Bilgileri'}
                        </h3>
                        
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{locale === 'de' ? 'Firma' : 'Firma Ünvanı'}</span>
                            <p className="text-sm font-bold text-slate-900 mt-0.5">{aliciFirma?.unvan || '—'}</p>
                        </div>

                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{locale === 'de' ? 'Lieferadresse' : 'Teslimat Adresi'}</span>
                            <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
                                {siparis.teslimat_adresi || [aliciFirma?.adres, aliciFirma?.posta_kodu, aliciFirma?.sehir].filter(Boolean).join(', ') || '—'}
                            </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                            {aliciFirma?.telefon && (
                                <p className="text-slate-600">
                                    <strong className="text-slate-800">{locale === 'de' ? 'Tel:' : 'Tel:'}</strong> {aliciFirma.telefon}
                                </p>
                            )}
                            {aliciFirma?.email && (
                                <p className="text-slate-600">
                                    <strong className="text-slate-800">{locale === 'de' ? 'E-Mail:' : 'E-Posta:'}</strong> {aliciFirma.email}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
