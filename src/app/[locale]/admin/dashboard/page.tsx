// src/app/[locale]/admin/dashboard/page.tsx
// GÜNCELLENMİŞ (Client Component dışa aktarıldı, cookieStore düzeltildi, Düzen güncellendi, Ajanda Linki Düzeltildi)

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import {
    FiDollarSign, FiTrendingUp, FiTrendingDown, FiPackage, FiAlertTriangle, FiUsers,
    FiClipboard, FiPlus, FiBriefcase, FiUserPlus, FiGift, FiBox, FiArchive, FiClock
} from 'react-icons/fi';
import Link from 'next/link';
import { Tables, Enums, Database } from '@/lib/supabase/database.types';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { unstable_noStore as noStore } from 'next/cache';

import KPIBar from './KPIBar';
import { DistributorsList } from '@/components/admin/dashboard/DistributorsList';
import { CustomerOverview } from '@/components/admin/dashboard/CustomerOverview';

export const dynamic = 'force-dynamic';

// --- Para Formatlama (Server-side) ---
const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// StatCard Komponente
const StatCard = ({ title, value, icon, link, linkText, isNegative }: { title: string, value: string | number, icon: React.ReactNode, link?: string, linkText?: string, isNegative?: boolean }) => {
    const valueColorClass = isNegative ? 'text-red-600' : 'text-primary';
    const content = (
        <>
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex-grow min-w-0">
                <p className="text-sm font-medium text-text-main/70 truncate">{title}</p>
                <p className={`text-3xl font-bold ${valueColorClass} mt-1 truncate`}>{value}</p>
                {link && linkText && (
                    <p className="text-xs text-accent font-semibold mt-2 hover:underline">{linkText} &rarr;</p>
                )}
            </div>
        </>
    );
    if (link) {
        return <Link href={link} className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 flex items-center gap-4 hover:bg-gray-50/50 hover:shadow-md transition-all duration-200">{content}</Link>;
    }
    return <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 flex items-center gap-4">{content}</div>;
};

const HealthSignalCard = ({ title, value, hint, status, href }: { title: string; value: string; hint: string; status: 'green' | 'yellow' | 'red'; href?: string }) => {
    const styles = {
        green: {
            wrapper: 'border-emerald-200 bg-emerald-50',
            dot: 'bg-emerald-500',
            badge: 'bg-emerald-100 text-emerald-700',
            label: 'Kontrol altında'
        },
        yellow: {
            wrapper: 'border-amber-200 bg-amber-50',
            dot: 'bg-amber-500',
            badge: 'bg-amber-100 text-amber-700',
            label: 'Takip edilmeli'
        },
        red: {
            wrapper: 'border-rose-200 bg-rose-50',
            dot: 'bg-rose-500',
            badge: 'bg-rose-100 text-rose-700',
            label: 'Acil aksiyon'
        }
    }[status];

    const content = (
        <div className={`rounded-2xl border p-4 ${styles.wrapper}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${styles.dot}`} />
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles.badge}`}>{styles.label}</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-600">{hint}</p>
        </div>
    );

    return href ? <Link href={href} className="block">{content}</Link> : content;
};

// Schnellaktions-Button
const QuickActionButton = ({ label, icon, href }: { label: string, icon: React.ReactNode, href: string }) => (
     <Link href={href} className="bg-accent text-white p-3 rounded-lg flex flex-col items-center justify-center text-center font-bold text-xs hover:bg-opacity-85 transition-opacity aspect-square">
         {icon}
         <span className="mt-1.5">{label}</span>
     </Link>
);

// Typ für eine Aufgabe
type OverdueTask = Pick<Tables<'gorevler'>, 'id' | 'baslik' | 'son_tarih'>;

// Relax type where needed to avoid missing type exports in next/headers version
type ReadonlyRequestCookiesLike = any;

// Props-Typ für die Unter-Dashboards
interface DashboardProps {
    locale: Locale;
    dictionary: any;
    cookieStore: ReadonlyRequestCookiesLike;
}

// Raporlama (P&L) fonksiyonundan dönecek veri tipi
type ReportData = {
    totalGrossRevenue: number;
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    expenseBreakdown: any[];
};

// Manager Dashboard Komponente (YENİ DÜZEN)
async function ManagerDashboard({ locale, dictionary, cookieStore }: DashboardProps) {

    const supabase = await createSupabaseServerClient(cookieStore);

    // Sözlük içeriklerini güvenle al
    const pageContent = (dictionary.adminDashboard && dictionary.adminDashboard.dashboardPage) ? dictionary.adminDashboard.dashboardPage : {};
    const operationalContent = dictionary.adminDashboard || {};
    const pnlContent = dictionary.pnlReportPage || {};

    // ── Mevcut kullanıcı ve rol tespiti ─────────────────────────────────────
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const isAdmin = await (async () => {
        if (!currentUser) return false;
        const { data: profil } = await supabase
            .from('profiller')
            .select('rol')
            .eq('id', currentUser.id)
            .maybeSingle();
        return profil?.rol === 'Yönetici';
    })();

    const now = new Date();
    const todayISO = now.toISOString();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTodayISO = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfTomorrowISO = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    // Ay başlangıcı (MTD başlangıcı)
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mtdStartStr = toLocalDateString(mtdStart);
    // Grafik için tam ay (mevcut chart bu aralığı kullanıyor)
    const fullMonthStartStr = mtdStartStr;
    const fullMonthEndStr = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    // MTD bitiş bugünün tarihi
    const mtdEndStr = toLocalDateString(now);
    // Geçen ay aynı dönem: geçen ayın ilk günü -> geçen ayın bugüne denk gelen günü
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStartStr = toLocalDateString(lastMonth);
    const lastMonthEndSameDay = new Date(now.getFullYear(), now.getMonth(), 0); // geçen ayın son günü
    const targetDay = now.getDate();
    const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), Math.min(targetDay, lastMonthEndSameDay.getDate()));
    const lastMonthEndStr = toLocalDateString(lastMonthEnd);

    // Statusdefinitionen
    const OFFENE_BESTELL_STATUS: Enums<'siparis_durumu'>[] = ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing'];
    const NEUE_MUSTER_STATUS: Enums<'numune_talep_durumu'> = 'Yeni Talep';
    const NEUE_PRODUKTANFRAGE_STATUS: Enums<'urun_talep_durumu'> = 'Yeni';
    const ABGESCHLOSSENE_ANTRAG_STATUS: Enums<'firma_status'>[] = ['MÜŞTERİ', 'REDDEDİLDİ'];
    const NEW_APPLICATION_STATUS: Enums<'firma_status'>[] = ['ADAY', 'TEMAS EDİLDİ', 'NUMUNE VERİLDİ'];

    // Parallele Datenabfragen
    const applicationsResPromise = (async () => {
        let res = await supabase
            .from('firmalar')
            .select('id', { count: 'exact' })
            .or('ticari_tip.eq.musteri,ticari_tip.is.null')
            .in('status', NEW_APPLICATION_STATUS)
            .eq('goruldu', false)
            .ilike('kaynak', '%web%');

        if (res.error && res.error.message?.includes('goruldu')) {
            // Fallback: goruldu kolonu yoksa sadece statüye göre say
            res = await supabase
                .from('firmalar')
                .select('id', { count: 'exact' })
                .or('ticari_tip.eq.musteri,ticari_tip.is.null')
                .in('status', NEW_APPLICATION_STATUS)
                .ilike('kaynak', '%web%');
        }
        return res;
    })();

    const [
        ordersRes,
        stockRes,
        profitabilityAlertsRes,
        recentBatchHistoryRes,
        tasksRes,
        applicationsRes,
        sampleRequestsRes,
        productRequestsRes,
        plReportRes,
        // Faz 1 KPI ek sorgular
        plMtdRes,
        plPrevMtdRes,
        ordersTodayRes,
        ordersMtdRes,
        overdueInvoicesRes,
        // Sipariş durum dağılımı: son 30 gün için seçili statusler
        odBeklemede,
        odHazirlaniyor,
        odYolda,
        odTeslim,
        odIptal
    ] = await Promise.all([
        supabase.from('siparisler').select('id', { count: 'exact' }).in('siparis_durumu', OFFENE_BESTELL_STATUS),
        supabase.rpc('get_kritik_stok_count'),
        supabase.from('urunler').select('id', { count: 'exact' }).eq('karlilik_alarm_aktif', true),
        (supabase as any).from('ithalat_partileri').select('id, referans_kodu, varis_tarihi, durum, created_at').order('created_at', { ascending: false }).limit(5),
        (() => {
            // Yönetici: tüm gecikmiş görevler; diğerleri: sadece kendine atanan
            let q = supabase
                .from('gorevler')
                .select('id, baslik, son_tarih, aciklama, atanan_kisi_id, oncelik')
                .eq('tamamlandi', false)
                .lt('son_tarih', todayISO)
                .order('son_tarih', { ascending: true })
                .limit(8);
            if (!isAdmin && currentUser?.id) {
                q = q.eq('atanan_kisi_id', currentUser.id);
            }
            return q;
        })(),
                // FIXED: Sadece görülmemiş başvuruları say
                applicationsResPromise,
        supabase.from('numune_talepleri').select('id', { count: 'exact' }).eq('durum', NEUE_MUSTER_STATUS),
        supabase.from('yeni_urun_talepleri').select('id', { count: 'exact' }).eq('status', NEUE_PRODUKTANFRAGE_STATUS).then(res => res, err => ({ data: null, count: null, error: err })),
        // Grafik için tam ay P&L
        supabase.rpc('get_pl_report', { start_date: fullMonthStartStr, end_date: fullMonthEndStr }).returns<ReportData>().single(),
        // KPI'lar için MTD ve geçen ay aynı dönem
        supabase.rpc('get_pl_report', { start_date: mtdStartStr, end_date: mtdEndStr }).returns<ReportData>().single(),
        supabase.rpc('get_pl_report', { start_date: lastMonthStartStr, end_date: lastMonthEndStr }).returns<ReportData>().single(),
        // Bugünkü sipariş adedi
        supabase.from('siparisler').select('id', { count: 'exact' }).gte('created_at', startOfTodayISO).lt('created_at', startOfTomorrowISO),
        // MTD sipariş sayısı (AOV için)
        supabase.from('siparisler').select('id', { count: 'exact' }).gte('created_at', new Date(mtdStartStr).toISOString()).lt('created_at', new Date(new Date(mtdEndStr).getTime()+24*60*60*1000).toISOString()),
        // Overdue faturalar: durum 'overdue' olanların tutarlarını çek
        supabase.from('faturalar').select('tutar').eq('odeme_durumu', 'overdue'),
        // Sipariş dağılımı (son 30 gün)
        supabase.from('siparisler').select('id', { count: 'exact' }).eq('siparis_durumu', 'Beklemede').gte('created_at', new Date(now.getTime()-30*24*60*60*1000).toISOString()),
        supabase.from('siparisler').select('id', { count: 'exact' }).eq('siparis_durumu', 'Hazırlanıyor').gte('created_at', new Date(now.getTime()-30*24*60*60*1000).toISOString()),
        supabase.from('siparisler').select('id', { count: 'exact' }).in('siparis_durumu', ['Yola Çıktı','shipped']).gte('created_at', new Date(now.getTime()-30*24*60*60*1000).toISOString()),
        supabase.from('siparisler').select('id', { count: 'exact' }).in('siparis_durumu', ['Teslim Edildi','delivered']).gte('created_at', new Date(now.getTime()-30*24*60*60*1000).toISOString()),
        supabase.from('siparisler').select('id', { count: 'exact' }).in('siparis_durumu', ['İptal Edildi','cancelled']).gte('created_at', new Date(now.getTime()-30*24*60*60*1000).toISOString()),
    ]);

    // Hata loglama
        if (ordersRes.error && Object.keys(ordersRes.error).length > 0) {
            console.error("Active Orders Error:", ordersRes.error);
        }
        if (stockRes.error && Object.keys(stockRes.error).length > 0) {
            console.error("Critical Stock Error:", stockRes.error);
        }
        if (profitabilityAlertsRes.error && Object.keys(profitabilityAlertsRes.error).length > 0 && !(profitabilityAlertsRes.error.message || '').includes('karlilik_alarm_aktif')) {
            console.error("Profitability Alerts Error:", profitabilityAlertsRes.error);
        }
        if (recentBatchHistoryRes.error && Object.keys(recentBatchHistoryRes.error).length > 0 && !(recentBatchHistoryRes.error.message || '').includes('ithalat_partileri')) {
            console.error("Recent Batch History Error:", recentBatchHistoryRes.error);
        }
        if (tasksRes.error && Object.keys(tasksRes.error).length > 0) {
            console.error("Overdue Tasks Error:", tasksRes.error);
        }
        if (applicationsRes.error && Object.keys(applicationsRes.error).length > 0) {
            console.error("New Applications Error:", applicationsRes.error);
        }
        if (sampleRequestsRes.error && Object.keys(sampleRequestsRes.error).length > 0) {
            console.error("Sample Requests Error:", sampleRequestsRes.error);
        }
        if (plReportRes.error && Object.keys(plReportRes.error).length > 0) {
            console.error("P&L Report Error (Dashboard):", plReportRes.error);
        }
    if (productRequestsRes && productRequestsRes.error && !productRequestsRes.error?.message?.includes('relation "public.yeni_urun_talepleri" does not exist')) {
        console.error("Product Requests Error:", productRequestsRes.error);
    }
    
    // Variablen-Definitionen direkt vor return
    const plReport = plReportRes.data;
    const mtd: ReportData | null = ((plMtdRes as any)?.data ?? null);
    const prevMtd: ReportData | null = ((plPrevMtdRes as any)?.data ?? null);
    const VAT_RATE = 0.07;
    const revenueMtdNet = mtd?.totalRevenue ?? 0;
    const prevRevenueMtdNet = prevMtd?.totalRevenue ?? 0;
    const deltaPct = prevRevenueMtdNet !== 0 ? Math.round(((revenueMtdNet - prevRevenueMtdNet) / prevRevenueMtdNet) * 100) : null;
    const ordersMtd = ordersMtdRes?.count ?? 0;
    const overdueTasks = Array.isArray(tasksRes.data) ? tasksRes.data.filter((t: any) => t.son_tarih && new Date(t.son_tarih) < new Date() && !t.tamamlandi) : [];
    const profitabilityAlertCount = profitabilityAlertsRes.count ?? 0;
    const criticalStockCount = Number(stockRes.data ?? 0);

    let alertProductsPreview: Array<any> = [];
    if (!profitabilityAlertsRes.error && (profitabilityAlertsRes.count ?? 0) > 0) {
        const alertProductsRes = await (supabase as any)
            .from('urunler')
            .select('id, ad, stok_kodu, son_maliyet_sapma_yuzde, standart_inis_maliyeti_net, son_gercek_inis_maliyeti_net')
            .eq('karlilik_alarm_aktif', true)
            .order('son_maliyet_sapma_yuzde', { ascending: false })
            .limit(6);

        if (!alertProductsRes.error) {
            alertProductsPreview = alertProductsRes.data || [];
        } else if (!(alertProductsRes.error.message || '').includes('karlilik_alarm_aktif')) {
            console.error('Alert Products Preview Error:', alertProductsRes.error);
        }
    }

    let recentBatchesWithSummary: Array<any> = Array.isArray(recentBatchHistoryRes.data) ? [...recentBatchHistoryRes.data] : [];
    if (!recentBatchHistoryRes.error && recentBatchesWithSummary.length > 0) {
        const batchItemRes = await (supabase as any)
            .from('ithalat_parti_kalemleri')
            .select('parti_id, miktar_adet, maliyet_sapma_yuzde')
            .in('parti_id', recentBatchesWithSummary.map((batch: any) => batch.id));

        if (!batchItemRes.error && batchItemRes.data) {
            const batchSummary = (batchItemRes.data as Array<any>).reduce((acc, item) => {
                const key = item.parti_id;
                if (!acc[key]) acc[key] = { itemCount: 0, totalQuantity: 0, alertLineCount: 0, absVarianceTotal: 0, maxAbsVariance: 0 };
                const absVariance = Math.abs(Number(item.maliyet_sapma_yuzde || 0));
                acc[key].itemCount += 1;
                acc[key].totalQuantity += Number(item.miktar_adet || 0);
                acc[key].absVarianceTotal += absVariance;
                acc[key].maxAbsVariance = Math.max(acc[key].maxAbsVariance, absVariance);
                if (absVariance >= 5) {
                    acc[key].alertLineCount += 1;
                }
                return acc;
            }, {} as Record<string, { itemCount: number; totalQuantity: number; alertLineCount: number; absVarianceTotal: number; maxAbsVariance: number }>);

            recentBatchesWithSummary = recentBatchesWithSummary.map((batch: any) => ({
                ...batch,
                itemCount: batchSummary[batch.id]?.itemCount || 0,
                totalQuantity: batchSummary[batch.id]?.totalQuantity || 0,
                alertLineCount: batchSummary[batch.id]?.alertLineCount || 0,
                averageAbsVariance: batchSummary[batch.id]?.itemCount ? (batchSummary[batch.id].absVarianceTotal / batchSummary[batch.id].itemCount) : 0,
                maxAbsVariance: batchSummary[batch.id]?.maxAbsVariance || 0,
            }));
        } else if (batchItemRes.error && !(batchItemRes.error.message || '').includes('ithalat_parti_kalemleri')) {
            console.error('Batch Item Summary Error:', batchItemRes.error);
        }
    }

    const recentBatchAlertLines = recentBatchesWithSummary.reduce((sum: number, batch: any) => sum + Number(batch.alertLineCount || 0), 0);
    const latestBatch = recentBatchesWithSummary[0] || null;
    const latestBatchDate = latestBatch?.varis_tarihi || latestBatch?.created_at || null;
    const latestBatchAvgVariance = Number(latestBatch?.averageAbsVariance || 0);
    const latestBatchMaxVariance = Number(latestBatch?.maxAbsVariance || 0);
    const daysSinceLastBatch = latestBatchDate
        ? Math.max(0, Math.floor((Date.now() - new Date(latestBatchDate).getTime()) / (1000 * 60 * 60 * 24)))
        : null;

    const alertStatus: 'green' | 'yellow' | 'red' = profitabilityAlertCount === 0 ? 'green' : profitabilityAlertCount <= 3 ? 'yellow' : 'red';
    const batchStatus: 'green' | 'yellow' | 'red' = recentBatchAlertLines === 0 ? 'green' : recentBatchAlertLines <= 3 ? 'yellow' : 'red';
    const freshnessStatus: 'green' | 'yellow' | 'red' = daysSinceLastBatch === null ? 'yellow' : daysSinceLastBatch <= 7 ? 'green' : daysSinceLastBatch <= 21 ? 'yellow' : 'red';
    const stockStatus: 'green' | 'yellow' | 'red' = criticalStockCount === 0 ? 'green' : criticalStockCount <= 5 ? 'yellow' : 'red';

    return (
        <div className="space-y-8">
            {/* EN ÜSTTE: Ciro, Kar, Zarar KPI Bar */}
            <KPIBar items={[ 
                { label: (operationalContent as any).kpiRevenueMtd || 'Net Ciro (Bu Ay)', value: formatCurrency(revenueMtdNet), hint: deltaPct !== null ? `${deltaPct > 0 ? '+' : ''}${deltaPct}% zum Vormonat` : undefined, tone: 'accent' },
                { label: 'Satılan Malın Maliyeti', value: formatCurrency(mtd?.totalCogs ?? 0), tone: 'default' },
                { label: 'Toplam Gider', value: formatCurrency(mtd?.totalExpenses ?? 0), tone: 'default' },
                { label: 'Net Kâr', value: formatCurrency(mtd?.netProfit ?? 0), hint: 'Formül: Net Ciro - COGS - Gider', tone: (mtd?.netProfit ?? 0) >= 0 ? 'positive' : 'negative' },
                { label: 'Sipariş Adedi', value: String(ordersMtd), tone: 'default' },
            ]} />

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="font-serif text-2xl font-bold text-primary">{(operationalContent as any).pricingHealthTitle || 'Fiyatlandırma Sağlık Özeti'}</h2>
                        <p className="text-sm text-text-main/70 mt-1">Bu bölüm, parti maliyet farklarını erken görmek için karar destek ekranıdır.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link href={`/${locale}/admin/urun-yonetimi/fiyatlandirma-hub`} className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100">Fiyatlandırma merkezi</Link>
                        <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100">Detaylı rapor</Link>
                    </div>
                </div>

                <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                    Not: Bu özet satış fiyatlarını otomatik değiştirmez. Sadece maliyet farklarını görünür yapar.
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <HealthSignalCard
                        title="Marj riski olan ürün"
                        value={`${profitabilityAlertCount} ürün`}
                        hint={profitabilityAlertCount === 0 ? 'Şu an riskli ürün görünmüyor.' : 'Bu ürünlerde maliyet farkı satış marjını baskılıyor olabilir.'}
                        status={alertStatus}
                        href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`}
                    />
                    <HealthSignalCard
                        title="Son partide maliyet farkı"
                        value={latestBatch ? `%${latestBatchAvgVariance.toFixed(1)}` : 'Kayıt yok'}
                        hint={latestBatch ? `Maks. fark %${latestBatchMaxVariance.toFixed(1)} · Alarm üreten ${recentBatchAlertLines} kalem` : 'Henüz parti kaydı bulunmuyor.'}
                        status={batchStatus}
                        href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`}
                    />
                    <HealthSignalCard
                        title="Parti verisi güncelliği"
                        value={daysSinceLastBatch === null ? 'Kayıt yok' : `${daysSinceLastBatch} gün`}
                        hint={latestBatch ? `${latestBatch.referans_kodu || 'Son parti'} baz alındı.` : 'Henüz parti kaydı bulunmuyor.'}
                        status={freshnessStatus}
                        href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`}
                    />
                    <HealthSignalCard
                        title="Kritik stokta ürün"
                        value={`${criticalStockCount} ürün`}
                        hint={criticalStockCount === 0 ? 'Kritik stok görünmüyor.' : 'Tedarik planı ve stok eşiğini gözden geçirin.'}
                        status={stockStatus}
                        href={`/${locale}/admin/urun-yonetimi/urunler?filter=kritisch`}
                    />
                </div>
            </div>

            {/* ALTTA: Operasyonel göstergeler, sipariş durumu, ajanda, schnelle Aktionen, kritischer Lagerbestand */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Linke Spalte */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <StatCard
                            title={operationalContent.cardNewApplications || "New Applications"}
                            value={applicationsRes.count ?? 0}
                            icon={<FiUserPlus size={28} className="text-indigo-500"/>}
                            link={`/${locale}/admin/crm/firmalar?status_not_in=${encodeURIComponent(ABGESCHLOSSENE_ANTRAG_STATUS.join(','))}`}
                            linkText={operationalContent.viewApplications || "Review applications"}
                        />
                        <StatCard
                            title={operationalContent.cardActiveOrders || "Active Orders"}
                            value={ordersRes.count ?? 0}
                            icon={<FiPackage size={28} className="text-yellow-500"/>}
                            link={`/${locale}/admin/operasyon/siparisler?filter=offen`}
                            linkText={operationalContent.viewActiveOrders || "View active orders"}
                        />
                        {productRequestsRes && !productRequestsRes.error?.message?.includes('relation "public.yeni_urun_talepleri" does not exist') && (
                            <StatCard
                                title={operationalContent.cardNewProductRequests || "New Product Requests"}
                                value={productRequestsRes.count ?? 0}
                                icon={<FiBox size={28} className="text-teal-500"/>}
                                link={`/${locale}/admin/urun-yonetimi/urun-talepleri?status=${encodeURIComponent(NEUE_PRODUKTANFRAGE_STATUS)}`}
                                linkText={operationalContent.viewProductRequests || "Review requests"}
                            />
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">{(operationalContent as any).orderBreakdownTitle || 'Sipariş Durumu Dağılımı (30 gün)'}</h2>
                        <div className="flex flex-col gap-6">
                            {/* Status Breakdown */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                                <div>
                                    <p className="text-xs text-gray-500">Beklemede</p>
                                    <p className="text-lg font-bold text-primary">{odBeklemede?.count ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Hazırlanıyor</p>
                                    <p className="text-lg font-bold text-primary">{odHazirlaniyor?.count ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Yolda</p>
                                    <p className="text-lg font-bold text-primary">{odYolda?.count ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Teslim</p>
                                    <p className="text-lg font-bold text-primary">{odTeslim?.count ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">İptal</p>
                                    <p className="text-lg font-bold text-primary">{odIptal?.count ?? 0}</p>
                                </div>
                            </div>
                            {/* Hinweis falls keine Daten */}
                            {(odBeklemede?.count ?? 0) + (odHazirlaniyor?.count ?? 0) + (odYolda?.count ?? 0) + (odTeslim?.count ?? 0) + (odIptal?.count ?? 0) === 0 && (
                                <p className="text-center text-gray-400 text-sm">Son 30 gün için sipariş verisi yok.</p>
                            )}
                            {/* Quick Actions modernisiert */}
                            <div className="bg-white p-4 rounded-xl shadow border border-gray-100">
                                <h2 className="font-serif text-xl font-bold text-primary mb-3">{pageContent.quickActionsTitle || "Hızlı İşlemler"}</h2>
                                <div className="flex flex-wrap gap-3 justify-start">
                                    <QuickActionButton label={pageContent.actionNewCompany || "Yeni Firma"} icon={<FiUsers size={20}/>} href={`/${locale}/admin/crm/firmalar/yeni`} />
                                    <QuickActionButton label={operationalContent.actionNewProduct || "Yeni Ürün"} icon={<FiArchive size={20}/>} href={`/${locale}/admin/urun-yonetimi/urunler/yeni`} />
                                    <QuickActionButton label={pageContent.actionNewOrder || "Yeni Sipariş"} icon={<FiPackage size={20}/>} href={`/${locale}/admin/operasyon/siparisler/yeni`} />
                                    <QuickActionButton label={operationalContent.actionNewTask || "Yeni Görev"} icon={<FiClipboard size={20}/>} href={`/${locale}/admin/gorevler/ekle`} />
                                    <QuickActionButton label={pageContent.actionNewExpense || "Yeni Gider"} icon={<FiBriefcase size={20}/>} href={`/${locale}/admin/idari/finans/giderler`} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rechte Spalte */}
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <FiClock size={18} className="text-red-500" />
                                Gecikmiş Görevler
                            </h2>
                            <Link href={`/${locale}/admin/gorevler?durum=acik`}
                                className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors">
                                Tümünü gör →
                            </Link>
                        </div>
                        {overdueTasks.length > 0 ? (
                            <div className="space-y-2">
                                {overdueTasks.map((task: any) => {
                                    const daysLate = task.son_tarih
                                        ? Math.ceil((new Date().getTime() - new Date(task.son_tarih).getTime()) / (1000*60*60*24))
                                        : 0;
                                    const prioBadge: Record<string, string> = {
                                        'Yüksek': 'bg-red-100 text-red-700',
                                        'Orta':   'bg-orange-100 text-orange-700',
                                        'Düşük':  'bg-green-100 text-green-700',
                                    };
                                    return (
                                        <Link
                                            key={task.id}
                                            href={`/${locale}/admin/gorevler`}
                                            className="flex items-start gap-3 p-3 rounded-xl border border-red-100 bg-red-50/40 hover:bg-red-50 hover:border-red-200 transition-colors group"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-red-700 transition-colors">
                                                    {task.baslik}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-red-600 font-medium">
                                                        {daysLate === 1 ? '1 gün' : `${daysLate} gün`} geçikmiş
                                                    </span>
                                                    {task.oncelik && (
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${prioBadge[task.oncelik] || 'bg-slate-100 text-slate-600'}`}>
                                                            {task.oncelik}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-xs text-red-400 flex-shrink-0 mt-0.5">
                                                {formatDate(task.son_tarih, locale)}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FiClipboard size={20} className="text-green-600" />
                                </div>
                                <p className="text-sm font-semibold text-slate-700">Harika! Gecikmiş görev yok.</p>
                                <p className="text-xs text-slate-400 mt-0.5">Tüm görevler zamanında.</p>
                            </div>
                        )}
                    </div>

                    <StatCard
                        title={operationalContent.cardCriticalStock || "Critical Stock"}
                        value={stockRes.data ?? 0}
                        icon={<FiAlertTriangle size={28} className="text-red-500"/>}
                        link={`/${locale}/admin/urun-yonetimi/urunler?filter=kritisch`}
                        linkText={operationalContent.viewCriticalStockLink || "View critical stock"}
                    />

                    <StatCard
                        title={(operationalContent as any).cardProfitabilityAlerts || "Karlılık Alarmları"}
                        value={profitabilityAlertsRes.count ?? 0}
                        icon={<FiTrendingDown size={28} className="text-rose-500"/>}
                        link={`/${locale}/admin/urun-yonetimi/karlilik-raporu`}
                        linkText={(operationalContent as any).viewProfitabilityAlerts || "Detaylı raporu aç"}
                        isNegative={(profitabilityAlertsRes.count ?? 0) > 0}
                    />

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">{(operationalContent as any).profitabilityAlertListTitle || 'Alarmdaki Ürünler'}</h2>
                        {alertProductsPreview.length > 0 ? (
                            <div className="space-y-3 divide-y divide-gray-100">
                                {alertProductsPreview.map((product: any) => {
                                    const variance = Number(product.son_maliyet_sapma_yuzde || 0);
                                    return (
                                        <div key={product.id} className="pt-3 first:pt-0">
                                            <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`} className="block group">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="font-semibold text-primary group-hover:text-accent transition-colors">{typeof product.ad === 'object' && product.ad !== null ? (product.ad[locale] || product.ad.tr || product.ad.de || Object.values(product.ad).find((v: any) => typeof v === 'string' && v.trim()) || 'Ürün') : (product.ad || 'Ürün')}</p>
                                                        <p className="text-xs text-text-main/70 mt-0.5">
                                                            {product.stok_kodu || 'Kod yok'}
                                                            {product.son_gercek_inis_maliyeti_net ? ` • Reel: ${formatCurrency(product.son_gercek_inis_maliyeti_net)}` : ''}
                                                        </p>
                                                    </div>
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${variance >= 15 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        %{Math.round(variance)}
                                                    </span>
                                                </div>
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-4">Aktif kârlılık alarmı görünmüyor.</p>
                        )}
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">{(operationalContent as any).recentBatchHistoryTitle || 'Son Tır / Parti Geçmişi'}</h2>
                        {recentBatchesWithSummary.length > 0 ? (
                            <div className="space-y-3 divide-y divide-gray-100">
                                {recentBatchesWithSummary.map((batch: any) => (
                                    <div key={batch.id} className="pt-3 first:pt-0">
                                        <Link href={`/${locale}/admin/urun-yonetimi/fiyatlandirma-hub`} className="block group">
                                            <p className="font-semibold text-primary group-hover:text-accent transition-colors">{batch.referans_kodu}</p>
                                            <p className="text-xs text-text-main/70 mt-0.5">{batch.varis_tarihi ? formatDate(batch.varis_tarihi, locale) : formatDate(batch.created_at, locale)} • {batch.durum || 'Taslak'}</p>
                                            <p className="text-xs text-text-main/60 mt-1">{batch.itemCount || 0} kalem • {Number(batch.totalQuantity || 0).toLocaleString('tr-TR')} adet</p>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-4">Henüz kayıtlı tır / parti bulunmuyor.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Customer Portfolio & Distributors - Yan Yana */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Müşteri Portföyü */}
                <CustomerOverview />

                {/* Alt Bayiler */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <h3 className="text-lg font-bold text-primary mb-4">{(operationalContent as any).distributorsTitle || 'Alt Bayiler Müşteri Sayısı'}</h3>
                    <DistributorsList locale={locale} dictionary={dictionary} cookieStore={cookieStore} />
                </div>
            </div>
        </div>
    );
}

// TeamMemberDashboard (DÜZELTİLMİŞ)
async function TeamMemberDashboard({ userId, locale, dictionary, cookieStore }: DashboardProps & { userId: string }) {
    const supabase = await createSupabaseServerClient(cookieStore);
    const content = (dictionary.adminDashboard && dictionary.adminDashboard.dashboardPage) ? dictionary.adminDashboard.dashboardPage : {};

    const { data, error } = await supabase.rpc('get_dashboard_summary_for_member', { p_member_id: userId }).single();

    if (error) {
        console.error("Team member dashboard error:", error);
    return <div>{content.errorLoadingTeamDashboard || "Failed to load."}</div>
    }

    const formatValue = (value: number | null | undefined) => value ?? 0;
    // data'nın gerçekten obje olup olmadığını kontrol et
    const safeData = (typeof data === 'object' && data !== null && !Array.isArray(data)) ? data : {};

    const safeOpenTasksCount = Number(safeData.openTasksCount);
    const safeNewOrdersCount = Number(safeData.newOrdersCount);
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <StatCard
                      title={content.cardOpenTasks || "Open Tasks"}
                      value={isNaN(safeOpenTasksCount) ? 0 : safeOpenTasksCount}
                      icon={<FiClipboard size={28} className="text-blue-500"/>}
                      link={`/${locale}/admin/gorevler`}
                      linkText={content.linkMyTasks || "My Tasks"}
                  />
                  <StatCard
                      title={content.cardNewOrdersFromClients || "New Orders (Clients)"}
                      value={isNaN(safeNewOrdersCount) ? 0 : safeNewOrdersCount}
                      icon={<FiPackage size={28} className="text-green-500"/>}
                      link={`/${locale}/admin/operasyon/siparisler`}
                      linkText={content.viewOrdersText || "View Orders"}
                  />
            </div>
             <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                  <h2 className="font-serif text-2xl font-bold text-primary mb-4">{content.quickAccessTitle || "Quick Access"}</h2>
                  <div className="flex gap-4">
                      <Link href={`/${locale}/admin/crm/firmalar`} className="font-bold text-accent hover:underline">{content.linkMyClients || "My Clients"}</Link>
                      <Link href={`/${locale}/admin/gorevler`} className="font-bold text-accent hover:underline">{content.linkMyTasks || "My Tasks"}</Link>
                  </div>
             </div>
        </div>
    );
}


// Hauptkomponente (DÜZELTİLMİŞ)
export default async function AdminDashboardPage({ 
    params
}: { 
    params: { locale: Locale } 
}) {
    noStore(); // Caching deaktivieren
    const { locale } = await params;
    const dictionary = await getDictionary(locale);
    const pageContent = (dictionary.adminDashboard && dictionary.adminDashboard.dashboardPage) ? dictionary.adminDashboard.dashboardPage : {};

    // Supabase Client korrekt initialisieren
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user || null;
    if (!user) {
    return <div>User not found. Please log in again.</div>;
    }

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (!profile) {
    console.error("Profile not found for user:", user.id);
    return <div>User profile not found. Please log in again.</div>;
    }
    const userRole = profile.rol;

    if (userRole !== 'Yönetici' && userRole !== 'Personel' && userRole !== 'Ekip Üyesi') {
         console.warn(`Unauthorized access to Admin Dashboard by role: ${userRole}`);
         return <div>Unauthorized access. Please return to the homepage.</div>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">
                    {userRole === 'Yönetici' ? pageContent.managerTitle : pageContent.teamMemberTitle}
                </h1>
                <p className="text-text-main/80 mt-1">
                    {userRole === 'Yönetici' ? pageContent.managerSubtitle : pageContent.teamMemberSubtitle}
                </p>
            </header>

            {/* cookieStore wird übergeben */}
            {userRole === 'Yönetici' && <ManagerDashboard locale={locale} dictionary={dictionary} cookieStore={cookieStore} />}
            {(userRole === 'Personel' || userRole === 'Ekip Üyesi') && <TeamMemberDashboard userId={user.id} locale={locale} dictionary={dictionary} cookieStore={cookieStore} />}
        </div>
    );
}