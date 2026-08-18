import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiArrowLeft, FiUser, FiTruck, FiPackage,
    FiMapPin, FiCalendar, FiClock, FiAlertTriangle,
    FiCheck, FiImage, FiPrinter,
} from 'react-icons/fi';
import DurumGuncellePaneli from './DurumGuncellePaneli';
import { assignSiparisPersonelAction } from '../actions';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { Tables, Database, Enums } from '@/lib/supabase/database.types';
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
    searchParams?: Promise<{ from?: string }>;
}

export default async function OperasyonSiparisDetayPage({ params, searchParams }: PageProps) {
    noStore();
    const { siparisId, locale } = await params;
    const fromSource = (await searchParams)?.from;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: myProfile } = await supabase
        .from('profiller')
        .select('id, rol')
        .eq('id', user.id)
        .maybeSingle();

    const isManager = ['Yönetici', 'Personel', 'Ekip Üyesi'].includes(myProfile?.rol || '');

    let personelProfiles: Array<{ id: string; tam_ad: string | null }> = [];
    if (isManager) {
        try {
            const supabaseAdmin = createSupabaseServiceClient();
            const { data } = await supabaseAdmin
                .from('profiller')
                .select('id, tam_ad')
                .in('rol', ['Personel', 'Ekip Üyesi', 'Yönetici'])
                .order('tam_ad');
            personelProfiles = (data || []) as any[];
        } catch {
            const { data } = await supabase
                .from('profiller')
                .select('id, tam_ad')
                .in('rol', ['Personel', 'Ekip Üyesi'])
                .order('tam_ad');
            personelProfiles = (data || []) as any[];
        }
    }

    const { data: siparisData, error } = await supabase
        .from('siparisler')
        .select(`
            *,
            firmalar ( id, unvan, adres, telefon, email ),
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
    const firma = siparis.firmalar;
    const urunSatirlari = siparis.siparis_detay || [];
    const firmaId = siparis.firma_id;
    const cfg = STATUS_CONFIG[siparis.siparis_durumu];
    const currentStep = cfg?.step ?? 0;
    const isIptal = currentStep === 0;

    const fmt = (v: number | null) => formatCurrency(v, locale, { maximumFractionDigits: 2 });

    const backUrl = fromSource === 'crm' && firmaId
        ? `/${locale}/admin/crm/firmalar/${firmaId}/siparisler`
        : `/${locale}/admin/operasyon/siparisler`;

    return (
        <div className="space-y-5 pb-10">
            {/* Geri */}
            <Link href={backUrl}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent transition-colors">
                <FiArrowLeft size={14} />
                {fromSource === 'crm' ? 'Firmaya Dön' : 'Siparişlere Dön'}
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-gray-800">
                            #{siparis.id.slice(0, 8).toUpperCase()}
                        </h1>
                        <Link
                            href={`/${locale}/print/lieferschein/${siparis.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 hover:text-accent transition-colors shadow-sm"
                            title="Teslimat Fişi Yazdır"
                        >
                            <FiPrinter size={16} />
                            <span className="hidden sm:inline">Lieferschein</span>
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
                    <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
                        <FiCalendar size={12} />
                        {formatLocaleDate(siparis.siparis_tarihi, locale, {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                        })}
                        {siparis.kaynak && (
                            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full">
                                {siparis.kaynak}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            {!isIptal && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between relative">
                        <div className="absolute left-8 right-8 top-5 h-0.5 bg-gray-100 z-0" />
                        <div
                            className="absolute left-8 top-5 h-0.5 bg-accent z-0 transition-all"
                            style={{ width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - 4rem)` }}
                        />
                        {STEPS.map((step, i) => {
                            const stepNum = i + 1;
                            const isDone = currentStep > stepNum;
                            const isCurrent = currentStep === stepNum;
                            return (
                                <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                                        isDone ? 'bg-accent border-accent text-white'
                                            : isCurrent ? 'bg-white border-accent text-accent'
                                            : 'bg-white border-gray-200 text-gray-300'
                                    }`}>
                                        {isDone ? <FiCheck size={16} /> : step.icon}
                                    </div>
                                    <span className={`text-[10px] font-semibold text-center ${
                                        isDone || isCurrent ? 'text-gray-700' : 'text-gray-300'
                                    }`}>
                                        {step.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* İptal talebi uyarısı */}
            {siparis.siparis_durumu === 'iptal_talep_edildi' && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                    <FiAlertTriangle size={18} className="text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-orange-900">İptal Talebi Alındı</p>
                        <p className="text-xs text-orange-700 mt-0.5">
                            Müşteri bu sipariş için iptal talebinde bulundu.
                            Siparişi iptal edebilir veya devam ettirebilirsiniz.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Sol: Ürünler */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Ürün listesi */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                                <FiPackage size={14} className="text-accent" />
                                Sipariş Ürünleri
                            </h2>
                            <span className="text-xs text-gray-400">
                                {urunSatirlari.length} ürün
                            </span>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {urunSatirlari.length > 0 ? urunSatirlari.map((item: any) => (
                                <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                                    <div className="relative w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                                        {item.urunler?.ana_resim_url ? (
                                            <Image
                                                src={item.urunler.ana_resim_url}
                                                alt={getProductName(item.urunler?.ad, locale)}
                                                fill sizes="48px" className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <FiImage size={16} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-gray-800 truncate">
                                            {getProductName(item.urunler?.ad, locale)}
                                        </p>
                                        <p className="text-[11px] text-gray-400 font-mono">
                                            {item.urunler?.stok_kodu}
                                        </p>
                                        <p className="text-[11px] text-gray-500 mt-0.5">
                                            {item.miktar} adet × {fmt(item.birim_fiyat)}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-bold text-gray-800 text-sm">
                                            {fmt(item.toplam_fiyat)}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="px-5 py-8 text-center text-gray-400 text-sm">
                                    Ürün bilgisi bulunamadı
                                </div>
                            )}
                        </div>

                        {/* Fiyat özeti */}
                        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 space-y-2">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Ara Toplam (Net)</span>
                                <span className="font-semibold">{fmt(siparis.toplam_tutar_net)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>KDV ({siparis.kdv_orani}%)</span>
                                <span className="font-semibold">
                                    {fmt((siparis.toplam_tutar_brut ?? 0) - (siparis.toplam_tutar_net ?? 0))}
                                </span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-200">
                                <span>Genel Toplam (Brüt)</span>
                                <span className="text-accent text-lg">{fmt(siparis.toplam_tutar_brut)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Durum güncelleme */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-gray-700 mb-3">
                            Durum Güncelle
                        </h3>
                        <DurumGuncellePaneli
                            siparisId={siparis.id}
                            mevcutDurum={siparis.siparis_durumu}
                            locale={locale}
                        />
                    </div>
                </div>

                {/* Sağ: Bilgiler */}
                <div className="space-y-4">
                    {/* Müşteri */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <FiUser size={12} /> Müşteri
                        </h3>
                        {firmaId ? (
                            <Link href={`/${locale}/admin/crm/firmalar/${firmaId}`}
                                className="font-bold text-accent hover:underline block truncate text-sm">
                                {firma?.unvan || '—'}
                            </Link>
                        ) : (
                            <p className="font-bold text-gray-800 text-sm">{firma?.unvan || '—'}</p>
                        )}
                        {firma?.telefon && (
                            <p className="text-xs text-gray-500 mt-1">{firma.telefon}</p>
                        )}
                        {firma?.email && (
                            <p className="text-xs text-gray-500">{firma.email}</p>
                        )}
                        {firma?.adres && (
                            <p className="text-xs text-gray-400 mt-2 flex items-start gap-1">
                                <FiMapPin size={10} className="mt-0.5 flex-shrink-0" />
                                {firma.adres}
                            </p>
                        )}
                    </div>

                    {/* Teslimat */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                            <FiTruck size={12} /> Teslimat Adresi
                        </h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                            {siparis.teslimat_adresi || '—'}
                        </p>
                    </div>

                    {/* Özet */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                            Sipariş Özeti
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Sipariş No</span>
                                <span className="font-mono font-bold text-xs text-gray-700">
                                    #{siparis.id.slice(0, 8).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tarih</span>
                                <span className="text-xs font-semibold text-gray-700">
                                    {formatLocaleDate(siparis.siparis_tarihi, locale)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Ürün Sayısı</span>
                                <span className="font-semibold">{urunSatirlari.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Toplam Adet</span>
                                <span className="font-semibold">
                                    {urunSatirlari.reduce((acc: number, i: any) => acc + i.miktar, 0)}
                                </span>
                            </div>
                            {siparis.kaynak && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Kaynak</span>
                                    <span className="text-xs font-semibold text-gray-700">{siparis.kaynak}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Personel atama */}
                    {isManager && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                                Sorumlu Personel
                            </h3>
                            <form action={async (formData: FormData) => {
                                'use server';
                                await assignSiparisPersonelAction(formData);
                            }} className="space-y-2">
                                <input type="hidden" name="siparisId" value={siparis.id} />
                                <select
                                    name="personelId"
                                    defaultValue={siparis.atanan_kisi_id || ''}
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent/30"
                                >
                                    <option value="">Atanmamış</option>
                                    {personelProfiles.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.tam_ad || p.id}
                                        </option>
                                    ))}
                                </select>
                                <button type="submit"
                                    className="w-full py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors">
                                    Kaydet
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
