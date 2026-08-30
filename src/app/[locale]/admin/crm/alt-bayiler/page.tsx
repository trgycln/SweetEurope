import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Locale } from '@/i18n-config';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import {
    FiPlus, FiSearch, FiTruck, FiUsers, FiDollarSign,
    FiPackage, FiAlertCircle, FiCheckCircle, FiPhone, FiMail,
    FiMapPin, FiTrendingUp, FiExternalLink, FiChevronRight
} from 'react-icons/fi';
import { AltBayilerClient } from './AltBayilerClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{ q?: string; city?: string; filter?: string }>;
}

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v ?? 0);

export default async function AltBayilerHubPage({ params, searchParams }: PageProps) {
    const { locale } = await params;
    const sp = searchParams ? await searchParams : {};
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // 1. Tüm Alt Bayileri Çek
    const { data: altBayilerData, error: bayiErr } = await supabase
        .from('firmalar')
        .select(`
            *,
            sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad)
        `)
        .or('ticari_tip.eq.alt_bayi,kategori.eq.Alt Bayi')
        .order('unvan', { ascending: true });

    if (bayiErr) {
        console.error('Alt Bayi yüklenirken hata:', bayiErr);
    }

    const rawBayiler = altBayilerData || [];
    const bayiIds = rawBayiler.map(b => b.id);

    // 2. Bayilere Bağlı Müşterileri Çek
    let allSubCustomers: any[] = [];
    if (bayiIds.length > 0) {
        const { data: customers } = await (supabase as any)
            .from('firmalar')
            .select('id, unvan, status, sehir, ilce, telefon, ust_bayi_firma_id, created_at')
            .in('ust_bayi_firma_id', bayiIds);
        allSubCustomers = customers || [];
    }

    const subCustomerIds = allSubCustomers.map(c => c.id);

    // 3. Müşteri Siparişlerini ve Bayi İkmal Siparişlerini Çek
    let allCustomerOrders: any[] = [];
    let allBayiIkmalOrders: any[] = [];
    if (subCustomerIds.length > 0) {
        const { data: cOrders } = await supabase
            .from('siparisler')
            .select('id, firma_id, toplam_tutar_net, toplam_tutar_brut, siparis_durumu, siparis_tarihi')
            .in('firma_id', subCustomerIds);
        allCustomerOrders = cOrders || [];
    }

    if (bayiIds.length > 0) {
        const { data: bOrders } = await supabase
            .from('siparisler')
            .select('id, firma_id, toplam_tutar_net, toplam_tutar_brut, siparis_durumu, siparis_tarihi')
            .in('firma_id', bayiIds);
        allBayiIkmalOrders = bOrders || [];
    }

    // 4. Bayi Stoklarını Çek
    let allBayiStocks: any[] = [];
    if (bayiIds.length > 0) {
        const { data: stocks } = await (supabase as any)
            .from('alt_bayi_stoklari')
            .select(`
                id, bayi_firma_id, miktar, kritik_stok_seviyesi, son_sayim_tarihi,
                urunler ( id, ad, stok_kodu )
            `)
            .in('bayi_firma_id', bayiIds);
        allBayiStocks = stocks || [];
    }

    // 5. Bayi Hesaplamaları ve Kart Verileri
    const bayiler = rawBayiler.map(bayi => {
        const musteriler = allSubCustomers.filter(c => c.ust_bayi_firma_id === bayi.id);
        const musteriIds = musteriler.map(m => m.id);
        const mSiparisler = allCustomerOrders.filter(o => musteriIds.includes(o.firma_id));
        const ikmalSiparisler = allBayiIkmalOrders.filter(o => o.firma_id === bayi.id);
        const stoklar = allBayiStocks.filter(s => s.bayi_firma_id === bayi.id);

        // Müşteri Statü Dağılımı
        const aktifMusteriSayisi = musteriler.filter(m => m.status === 'MÜŞTERİ').length;
        const adayMusteriSayisi = musteriler.filter(m => ['ADAY', 'TEMAS EDİLDİ', 'NUMUNE VERİLDİ'].includes(m.status)).length;

        // Ciro Hesaplamaları
        const gecerliMSiparisler = mSiparisler.filter(o => !['İptal Edildi', 'cancelled'].includes(o.siparis_durumu));
        const toplamMusteriCirosu = gecerliMSiparisler.reduce((sum, o) => sum + Number(o.toplam_tutar_net || 0), 0);
        
        const buAyMSiparisler = gecerliMSiparisler.filter(o => o.siparis_tarihi >= currentMonthStart);
        const buAyMusteriCirosu = buAyMSiparisler.reduce((sum, o) => sum + Number(o.toplam_tutar_net || 0), 0);

        // İkmal Hacmi (Bayinin merkezden çektiği)
        const gecerliIkmal = ikmalSiparisler.filter(o => !['İptal Edildi', 'cancelled'].includes(o.siparis_durumu));
        const toplamIkmalCirosu = gecerliIkmal.reduce((sum, o) => sum + Number(o.toplam_tutar_net || 0), 0);

        // Sipariş Durumu
        const acikSiparisSayisi = gecerliMSiparisler.filter(o => ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing'].includes(o.siparis_durumu)).length;
        const teslimSiparisSayisi = gecerliMSiparisler.filter(o => ['Teslim Edildi', 'delivered'].includes(o.siparis_durumu)).length;

        // Stok Durumu
        const kritikStoklar = stoklar.filter(s => (s.miktar || 0) <= (s.kritik_stok_seviyesi || 10));

        return {
            ...bayi,
            musteriler,
            musteriSayisi: musteriler.length,
            aktifMusteriSayisi,
            adayMusteriSayisi,
            toplamMusteriCirosu,
            buAyMusteriCirosu,
            toplamIkmalCirosu,
            toplamSiparisSayisi: gecerliMSiparisler.length,
            acikSiparisSayisi,
            teslimSiparisSayisi,
            stokKalemSayisi: stoklar.length,
            kritikStokSayisi: kritikStoklar.length,
            kritikStoklar: kritikStoklar.map(k => k.urunler?.ad?.tr || k.urunler?.ad?.de || 'Ürün'),
        };
    });

    // ── Ağ Geneli KPI Özetleri ──
    const totalBayiCount = bayiler.length;
    const totalNetworkCustomers = bayiler.reduce((sum, b) => sum + b.musteriSayisi, 0);
    const totalNetworkActiveCustomers = bayiler.reduce((sum, b) => sum + b.aktifMusteriSayisi, 0);
    const totalMonthSales = bayiler.reduce((sum, b) => sum + b.buAyMusteriCirosu, 0);
    const totalLifetimeSales = bayiler.reduce((sum, b) => sum + b.toplamMusteriCirosu, 0);
    const totalCriticalStockBayis = bayiler.filter(b => b.kritikStokSayisi > 0).length;
    const totalPendingOrders = bayiler.reduce((sum, b) => sum + b.acikSiparisSayisi, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 flex items-center gap-2.5">
                        <span>🤝</span> Alt Bayi Yönetim Konsolu
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Bölgesel ortak şirketlerinizin müşteri portföyü, satış performansı ve ikmal/stok durumları
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/${locale}/admin/crm/firmalar/yeni?ticari_tip=alt_bayi`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
                    >
                        <FiPlus size={16} /> Yeni Alt Bayi Tanımla
                    </Link>
                </div>
            </div>

            {/* ── 4 Adet Ağ Geneli KPI Özet Kartı ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Bayi Sayısı */}
                <div className="bg-white border border-purple-200/80 rounded-xl p-5 shadow-sm bg-gradient-to-br from-purple-50/50 to-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Aktif Alt Bayi Ağı</span>
                        <span className="p-2 rounded-lg bg-purple-100 text-purple-700"><FiTruck size={16} /></span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{totalBayiCount} <span className="text-sm font-normal text-slate-500">Bölge Bayisi</span></p>
                    <p className="text-xs text-purple-700 mt-1 font-medium">Bölgesel dağıtım ortaklıkları</p>
                </div>

                {/* 2. Toplam Müşteri Portföyü */}
                <div className="bg-white border border-blue-200/80 rounded-xl p-5 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Toplam Müşteri Ağı</span>
                        <span className="p-2 rounded-lg bg-blue-100 text-blue-700"><FiUsers size={16} /></span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{totalNetworkCustomers} <span className="text-sm font-normal text-slate-500">İşletme</span></p>
                    <p className="text-xs text-blue-700 mt-1 font-medium">
                        {totalNetworkActiveCustomers} Aktif Müşteri (%{totalNetworkCustomers > 0 ? Math.round((totalNetworkActiveCustomers / totalNetworkCustomers) * 100) : 0})
                    </p>
                </div>

                {/* 3. Aylık Satış Hacmi */}
                <div className="bg-white border border-emerald-200/80 rounded-xl p-5 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Bayi Ağı Satış Cirosu</span>
                        <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700"><FiDollarSign size={16} /></span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{fmt(totalMonthSales)}</p>
                    <p className="text-xs text-emerald-700 mt-1 font-medium">Bu ay bayilerin kestiği satış</p>
                </div>

                {/* 4. İkmal / Kritik Stok Uyarısı */}
                <div className={`border rounded-xl p-5 shadow-sm bg-gradient-to-br ${totalCriticalStockBayis > 0 ? 'bg-amber-50/70 border-amber-300 from-amber-50/80' : 'bg-white border-slate-200 from-slate-50/50'} to-white`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${totalCriticalStockBayis > 0 ? 'text-amber-800' : 'text-slate-600'}`}>
                            İkmal & Depo Durumu
                        </span>
                        <span className={`p-2 rounded-lg ${totalCriticalStockBayis > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                            <FiPackage size={16} />
                        </span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">
                        {totalCriticalStockBayis > 0 ? (
                            <span className="text-amber-700">{totalCriticalStockBayis} Bayide Azalan Stok</span>
                        ) : (
                            <span className="text-emerald-700">Stoklar Yeterli</span>
                        )}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        {totalPendingOrders > 0 ? `${totalPendingOrders} açık dağıtım siparişi var` : 'Tüm teslimatlar güncel'}
                    </p>
                </div>
            </div>

            {/* ── Alt Bayi Performans Tablosu ve Filtreleme ── */}
            <AltBayilerClient
                initialBayiler={bayiler}
                locale={locale}
            />
        </div>
    );
}
