'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    FiArrowLeft, FiUser, FiTruck, FiRefreshCw, FiXCircle,
    FiPackage, FiImage, FiAlertTriangle,
    FiClock, FiCheck, FiCalendar, FiMapPin, FiLoader
} from 'react-icons/fi';
import { toast } from 'sonner';
import { siparisDurumGuncelleAction } from '@/app/actions/siparis-actions';
import Link from 'next/link';
import Image from 'next/image';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { getLocalizedName, formatCurrency, formatDate } from '@/lib/utils';
import { IptalTalebiModal } from './IptalTalebiModal';

export type SiparisDetay = {
    id: string;
    siparis_tarihi: string;
    toplam_tutar_net: number;
    toplam_tutar_brut: number;
    kdv_orani: number;
    siparis_durumu: string;
    teslimat_adresi: string | null;
    firmalar: { unvan: string; adres: string | null } | null;
    siparis_detay: {
        id: string;
        urun_id: string;
        miktar: number;
        birim_fiyat: number;
        toplam_fiyat: number;
        urunler: {
            ad: any;
            stok_kodu: string | null;
            ana_resim_url: string | null;
        } | null;
    }[];
};

interface Props {
    siparis: SiparisDetay;
    dictionary: Dictionary;
    locale: Locale;
    userRole?: string;
    bayiSiparisi?: boolean; // Alt bayinin müşteri siparişi mi?
}

const STATUS_CONFIG: Record<string, {
    label: { de: string; tr: string };
    bg: string; text: string; border: string;
    icon: React.ReactNode;
    step: number;
}> = {
    'Beklemede':          { label: { de: 'Ausstehend',     tr: 'Beklemede'     }, bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  icon: <FiClock size={14} />,         step: 1 },
    'Hazırlanıyor':       { label: { de: 'In Bearbeitung', tr: 'Hazırlanıyor'  }, bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   icon: <FiPackage size={14} />,       step: 2 },
    'processing':         { label: { de: 'In Bearbeitung', tr: 'İşleniyor'     }, bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   icon: <FiPackage size={14} />,       step: 2 },
    'Yola Çıktı':         { label: { de: 'Unterwegs',      tr: 'Yola Çıktı'    }, bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200', icon: <FiTruck size={14} />,         step: 3 },
    'shipped':            { label: { de: 'Unterwegs',      tr: 'Yola Çıktı'    }, bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200', icon: <FiTruck size={14} />,         step: 3 },
    'Teslim Edildi':      { label: { de: 'Geliefert',      tr: 'Teslim Edildi' }, bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  icon: <FiCheck size={14} />,         step: 4 },
    'delivered':          { label: { de: 'Geliefert',      tr: 'Teslim Edildi' }, bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200',  icon: <FiCheck size={14} />,         step: 4 },
    'iptal_talep_edildi': { label: { de: 'Storno beantr.', tr: 'İptal Talep'   }, bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-200', icon: <FiAlertTriangle size={14} />, step: 0 },
    'İptal Edildi':       { label: { de: 'Storniert',      tr: 'İptal Edildi'  }, bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',    icon: <FiXCircle size={14} />,       step: 0 },
    'cancelled':          { label: { de: 'Storniert',      tr: 'İptal Edildi'  }, bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',    icon: <FiXCircle size={14} />,       step: 0 },
};

const STEPS = [
    { key: 'Beklemede',     de: 'Ausstehend',     tr: 'Beklemede',     icon: <FiClock size={16} />   },
    { key: 'Hazırlanıyor',  de: 'In Bearbeitung', tr: 'Hazırlanıyor',  icon: <FiPackage size={16} /> },
    { key: 'Yola Çıktı',    de: 'Unterwegs',      tr: 'Yola Çıktı',    icon: <FiTruck size={16} />   },
    { key: 'Teslim Edildi', de: 'Geliefert',      tr: 'Teslim Edildi', icon: <FiCheck size={16} />   },
];

export function SiparisDetayClient({ siparis, locale, userRole, bayiSiparisi }: Props) {
    const router = useRouter();
    const [iptalModalAcik, setIptalModalAcik] = useState(false);
    const [iptalEdildi, setIptalEdildi] = useState(
        siparis.siparis_durumu === 'iptal_talep_edildi'
    );
    const [durumGuncelleniyor, setDurumGuncelleniyor] = useState(false);
    const [mevcutDurum, setMevcutDurum] = useState(siparis.siparis_durumu);

    const handleDurumGuncelle = async (yeniDurum: string) => {
        setDurumGuncelleniyor(true);
        try {
            const result = await siparisDurumGuncelleAction(
                siparis.id,
                yeniDurum as any
            );
            if (result.success) {
                setMevcutDurum(yeniDurum);
                toast.success(
                    locale === 'de'
                        ? `Status auf "${yeniDurum}" aktualisiert`
                        : `Durum "${yeniDurum}" olarak güncellendi`
                );
            } else {
                toast.error(result.error || 'Hata');
            }
        } finally {
            setDurumGuncelleniyor(false);
        }
    };

    const DURUM_AKISI: Record<string, {
        next: string;
        label: { de: string; tr: string };
        color: string;
    }> = {
        'Beklemede':    { next: 'Hazırlanıyor',  label: { de: 'In Bearbeitung',           tr: 'Hazırlamaya Başla'              }, color: 'bg-blue-600 hover:bg-blue-700'     },
        'processing':   { next: 'Hazırlanıyor',  label: { de: 'In Bearbeitung',           tr: 'Hazırlamaya Başla'              }, color: 'bg-blue-600 hover:bg-blue-700'     },
        'Hazırlanıyor': { next: 'Yola Çıktı',    label: { de: 'Als versandt markieren',   tr: 'Yola Çıktı Olarak İşaretle'    }, color: 'bg-violet-600 hover:bg-violet-700' },
        'Yola Çıktı':   { next: 'Teslim Edildi', label: { de: 'Als zugestellt markieren', tr: 'Teslim Edildi Olarak İşaretle' }, color: 'bg-green-600 hover:bg-green-700'   },
    };

    const sonrakiAdim = DURUM_AKISI[mevcutDurum];

    const cfg = STATUS_CONFIG[mevcutDurum];
    const currentStep = cfg?.step ?? 0;
    const isIptal = currentStep === 0;
    const isCancellable = siparis.siparis_durumu === 'Beklemede' || siparis.siparis_durumu === 'processing';

    const handleReorder = () => {
        const queryParams = new URLSearchParams();
        siparis.siparis_detay.forEach(item => {
            queryParams.append(`urun_${item.urun_id}`, item.miktar.toString());
        });
        router.push(`/${locale}/portal/siparisler/yeni?${queryParams.toString()}`);
    };

    const fmt = (v: number) => formatCurrency(v, locale);

    return (
        <div className="space-y-6 pb-10">
            {/* Geri + Başlık */}
            <div>
                <Link
                    href={`/${locale}/portal/siparisler`}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent mb-4 transition-colors"
                >
                    <FiArrowLeft size={14} />
                    {locale === 'de' ? 'Zurück zu Bestellungen' : 'Siparişlere Dön'}
                </Link>

                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold text-gray-800">
                                #{siparis.id.slice(0, 8).toUpperCase()}
                            </h1>
                            {cfg && (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                    {cfg.icon}
                                    {locale === 'de' ? cfg.label.de : cfg.label.tr}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                            <FiCalendar size={12} />
                            {formatDate(siparis.siparis_tarihi, locale)}
                        </p>
                    </div>

                    {/* Aksiyonlar */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {/* Lieferschein / İrsaliye Yazdır Butonu */}
                        <Link
                            href={`/${locale}/print/lieferschein/${siparis.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 hover:text-accent transition-colors shadow-sm"
                            title={locale === 'de' ? 'Lieferschein drucken' : 'İrsaliye / Teslimat Fişi Yazdır'}
                        >
                            <FiTruck size={14} />
                            <span>Lieferschein</span>
                        </Link>

                        <button
                            onClick={handleReorder}
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <FiRefreshCw size={14} />
                            {locale === 'de' ? 'Erneut bestellen' : 'Tekrar Sipariş'}
                        </button>

                        {/* Durum güncelleme — yalnızca alt bayinin müşteri siparişlerinde */}
                        {bayiSiparisi && sonrakiAdim && mevcutDurum !== 'Teslim Edildi' && (
                            <button
                                onClick={() => handleDurumGuncelle(sonrakiAdim.next)}
                                disabled={durumGuncelleniyor}
                                className={`flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-sm font-semibold transition-colors ${sonrakiAdim.color} disabled:opacity-50`}
                            >
                                {durumGuncelleniyor ? (
                                    <FiLoader className="animate-spin" size={14} />
                                ) : (
                                    <FiCheck size={14} />
                                )}
                                {locale === 'de' ? sonrakiAdim.label.de : sonrakiAdim.label.tr}
                            </button>
                        )}

                        {!iptalEdildi && !isIptal && isCancellable && (
                            <button
                                onClick={() => setIptalModalAcik(true)}
                                className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                            >
                                <FiXCircle size={14} />
                                {locale === 'de' ? 'Stornierung anfragen' : 'İptal Talebi'}
                            </button>
                        )}

                        {(iptalEdildi || siparis.siparis_durumu === 'iptal_talep_edildi') && (
                            <span className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm font-semibold">
                                <FiAlertTriangle size={14} />
                                {locale === 'de' ? 'Stornierung beantragt' : 'İptal Talep Edildi'}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Durum adımları */}
            {!isIptal && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between relative">
                        {/* Progress line background */}
                        <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-100 mx-8 z-0" />
                        {/* Progress line fill */}
                        <div
                            className="absolute left-8 top-5 h-0.5 bg-accent z-0 transition-all duration-500"
                            style={{ width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - 4rem)` }}
                        />

                        {STEPS.map((step, i) => {
                            const stepNum = i + 1;
                            const isDone = currentStep > stepNum;
                            const isCurrent = currentStep === stepNum;
                            return (
                                <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                        isDone
                                            ? 'bg-accent border-accent text-white'
                                            : isCurrent
                                                ? 'bg-white border-accent text-accent'
                                                : 'bg-white border-gray-200 text-gray-300'
                                    }`}>
                                        {isDone ? <FiCheck size={16} /> : step.icon}
                                    </div>
                                    <span className={`text-[10px] font-semibold text-center leading-tight ${
                                        isDone || isCurrent ? 'text-gray-700' : 'text-gray-300'
                                    }`}>
                                        {locale === 'de' ? step.de : step.tr}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Ana grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Sol: Ürünler */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                        <FiPackage size={15} className="text-accent" />
                        <h2 className="font-bold text-gray-800 text-sm">
                            {locale === 'de' ? 'Bestellte Artikel' : 'Sipariş Ürünleri'}
                        </h2>
                        <span className="ml-auto text-xs text-gray-400">
                            {siparis.siparis_detay.length} {locale === 'de' ? 'Artikel' : 'ürün'}
                        </span>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {siparis.siparis_detay.map(item => {
                            const urunAd = getLocalizedName(item.urunler?.ad, locale);
                            return (
                                <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                                    {/* Görsel */}
                                    <div className="relative w-14 h-14 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                                        {item.urunler?.ana_resim_url ? (
                                            <Image
                                                src={item.urunler.ana_resim_url}
                                                alt={urunAd}
                                                fill sizes="56px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <FiImage size={20} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Bilgi */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-gray-800 line-clamp-2 leading-tight">
                                            {urunAd}
                                        </p>
                                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                                            {item.urunler?.stok_kodu}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            {item.miktar} {locale === 'de' ? 'Stk.' : 'adet'} × {fmt(item.birim_fiyat)}
                                        </p>
                                    </div>

                                    {/* Fiyat */}
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-gray-800 text-sm">
                                            {fmt(item.toplam_fiyat)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Fiyat özeti */}
                    <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>{locale === 'de' ? 'Zwischensumme (Netto)' : 'Ara Toplam (Net)'}</span>
                            <span className="font-semibold">{fmt(siparis.toplam_tutar_net)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>
                                {locale === 'de' ? 'MwSt.' : 'KDV'} ({siparis.kdv_orani}%)
                            </span>
                            <span className="font-semibold">
                                {fmt(siparis.toplam_tutar_brut - siparis.toplam_tutar_net)}
                            </span>
                        </div>
                        <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-200">
                            <span>{locale === 'de' ? 'Gesamtbetrag' : 'Genel Toplam'}</span>
                            <span className="text-accent text-lg">{fmt(siparis.toplam_tutar_brut)}</span>
                        </div>
                    </div>
                </div>

                {/* Sağ: Bilgiler */}
                <div className="space-y-4">
                    {/* Müşteri bilgisi */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <FiUser size={12} />
                            {locale === 'de' ? 'Kundeninformation' : 'Müşteri Bilgisi'}
                        </h3>
                        <p className="font-bold text-gray-800">{siparis.firmalar?.unvan}</p>
                    </div>

                    {/* Teslimat adresi */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <FiMapPin size={12} />
                            {locale === 'de' ? 'Lieferadresse' : 'Teslimat Adresi'}
                        </h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                            {siparis.teslimat_adresi || siparis.firmalar?.adres || '—'}
                        </p>
                    </div>

                    {/* Sipariş özeti */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                            {locale === 'de' ? 'Bestellübersicht' : 'Sipariş Özeti'}
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">
                                    {locale === 'de' ? 'Bestellnummer' : 'Sipariş No'}
                                </span>
                                <span className="font-mono font-bold text-gray-700 text-xs">
                                    #{siparis.id.slice(0, 8).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">
                                    {locale === 'de' ? 'Datum' : 'Tarih'}
                                </span>
                                <span className="font-semibold text-gray-700 text-xs">
                                    {formatDate(siparis.siparis_tarihi, locale)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">
                                    {locale === 'de' ? 'Artikel' : 'Ürün Sayısı'}
                                </span>
                                <span className="font-semibold text-gray-700">
                                    {siparis.siparis_detay.length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">
                                    {locale === 'de' ? 'Gesamtmenge' : 'Toplam Adet'}
                                </span>
                                <span className="font-semibold text-gray-700">
                                    {siparis.siparis_detay.reduce((acc, i) => acc + i.miktar, 0)}
                                </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-gray-100">
                                <span className="text-gray-500">
                                    {locale === 'de' ? 'Status' : 'Durum'}
                                </span>
                                {cfg && (
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                                        {locale === 'de' ? cfg.label.de : cfg.label.tr}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* İptal Modal */}
            {iptalModalAcik && (
                <IptalTalebiModal
                    siparisId={siparis.id}
                    siparisNo={siparis.id}
                    firmaId={siparis.firmalar?.unvan || ''}
                    locale={locale}
                    onClose={() => setIptalModalAcik(false)}
                    onSuccess={() => {
                        setIptalEdildi(true);
                        setIptalModalAcik(false);
                    }}
                />
            )}
        </div>
    );
}
