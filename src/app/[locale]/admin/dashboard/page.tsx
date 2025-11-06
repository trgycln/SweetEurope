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

// --- YENİ: Chart bileşenini ayrı dosyadan import et ---
import { FinanzChartClient } from './FinanzChartClient';
import KPIBar from './KPIBar';
// --- BİTTİ ---

export const dynamic = 'force-dynamic';

// --- Para Formatlama (Server-side) ---
const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
};

// StatCard Komponente
const StatCard = ({ title, value, icon, link, linkText, isNegative }: { title: string, value: string | number, icon: React.ReactNode, link?: string, linkText?: string, isNegative?: boolean }) => {
    const valueColorClass = isNegative ? 'text-red-600' : 'text-primary'; // Renk koşulu
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

    const now = new Date();
    const todayISO = now.toISOString();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTodayISO = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfTomorrowISO = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    // Ay başlangıcı (MTD başlangıcı)
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mtdStartStr = mtdStart.toISOString().split('T')[0];
    // Grafik için tam ay (mevcut chart bu aralığı kullanıyor)
    const fullMonthStartStr = mtdStartStr;
    const fullMonthEndStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    // MTD bitiş bugünün tarihi
    const mtdEndStr = todayISO.split('T')[0];
    // Geçen ay aynı dönem: geçen ayın ilk günü -> geçen ayın bugüne denk gelen günü
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStartStr = lastMonth.toISOString().split('T')[0];
    const lastMonthEndSameDay = new Date(now.getFullYear(), now.getMonth(), 0); // geçen ayın son günü
    const targetDay = now.getDate();
    const lastMonthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), Math.min(targetDay, lastMonthEndSameDay.getDate()));
    const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

    // Statusdefinitionen
    const OFFENE_BESTELL_STATUS: Enums<'siparis_durumu'>[] = ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing'];
    const NEUE_MUSTER_STATUS: Enums<'numune_talep_durumu'> = 'Yeni Talep';
    const NEUE_PRODUKTANFRAGE_STATUS: Enums<'urun_talep_durumu'> = 'Yeni';
    const ABGESCHLOSSENE_ANTRAG_STATUS: Enums<'firma_status'>[] = ['Anlaşma Sağlandı', 'Pasif'];

    // Parallele Datenabfragen
    const [
        ordersRes,
        stockRes,
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
        supabase.from('gorevler').select('id, baslik, son_tarih').eq('tamamlandi', false).lt('son_tarih', todayISO).order('son_tarih', { ascending: true }).limit(5),
        // KORREKTUR: 'Anlaşma Sağlandı' ve 'Pasif' hariç say
        supabase.from('firmalar').select('id', { count: 'exact' }).not('status', 'in', `(${ABGESCHLOSSENE_ANTRAG_STATUS.map(s => `'${s}'`).join(',')})`),
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
    
    const plReport = plReportRes.data;
    const mtd: ReportData | null = ((plMtdRes as any)?.data ?? null);
    const prevMtd: ReportData | null = ((plPrevMtdRes as any)?.data ?? null);
    // Almanya KDV (gıda) %7: Gösterimde nete çevirelim
    const VAT_RATE = 0.07;
    const revenueMtdGross = mtd?.totalRevenue ?? 0;
    const revenuePrevGross = prevMtd?.totalRevenue ?? 0;
    const revenueMtdNet = revenueMtdGross / (1 + VAT_RATE);
    const revenuePrevNet = revenuePrevGross / (1 + VAT_RATE);
    const grossMarginPct = mtd && (mtd.totalRevenue ?? 0) > 0 ? Math.round(((mtd.grossProfit || 0) / (mtd.totalRevenue || 1)) * 100) : null;
    const ordersToday = ordersTodayRes.count ?? 0;
    const ordersMtd = ordersMtdRes.count ?? 0;
    const aov = ordersMtd > 0 ? revenueMtdNet / ordersMtd : null;
    const overdueCount = overdueInvoicesRes?.data ? overdueInvoicesRes.data.length : 0;
    const overdueAmount = overdueInvoicesRes?.data ? overdueInvoicesRes.data.reduce((sum: number, r: any) => sum + (r.tutar || 0), 0) : 0;
    const orderBreakdown = [
        { key: 'Beklemede', count: odBeklemede.count ?? 0, color: 'text-yellow-600' },
        { key: 'Hazırlanıyor', count: odHazirlaniyor.count ?? 0, color: 'text-blue-600' },
        { key: 'Yolda', count: odYolda.count ?? 0, color: 'text-indigo-600' },
        { key: 'Teslim', count: odTeslim.count ?? 0, color: 'text-green-600' },
        { key: 'İptal', count: odIptal.count ?? 0, color: 'text-red-600' },
    ];
    const overdueTasks: OverdueTask[] = tasksRes.data || [];

    return (
        // 3 Sütunlu Düzen
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sol ve Orta Sütun (Ana İçerik) */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* BÖLÜM 1: FİNANSAL GRAFİK */}
                <FinanzChartClient plReport={plReport} dictionary={dictionary} />
                
                {/* BÖLÜM 2: ÜST KPI ŞERİDİ (Sade KPI Bar) */}
                {(() => {
                    const deltaPct = revenuePrevNet > 0 ? Math.round(((revenueMtdNet - revenuePrevNet)/revenuePrevNet)*100) : null;
                    const items = [
                        { label: (operationalContent as any).kpiRevenueMtd || 'Bu Ay Ciro (Net)', value: formatCurrency(revenueMtdNet), hint: deltaPct !== null ? `${deltaPct > 0 ? '+' : ''}${deltaPct}% vs geçen ay` : undefined, href: `/${locale}/admin/operasyon/siparisler?date_from=${mtdStartStr}&date_to=${mtdEndStr}`, tone: 'accent' as 'accent' },
                        { label: (operationalContent as any).kpiGrossMargin || 'Brüt Marj', value: grossMarginPct !== null ? `${grossMarginPct}%` : 'N/A', tone: 'positive' as 'positive' },
                        { label: (operationalContent as any).kpiAov || 'AOV', value: aov !== null ? formatCurrency(aov) : 'N/A', href: `/${locale}/admin/operasyon/siparisler?date_from=${mtdStartStr}&date_to=${mtdEndStr}` },
                        { label: (operationalContent as any).kpiOrdersToday || 'Bugün Sipariş', value: String(ordersToday), href: `/${locale}/admin/operasyon/siparisler?date_from=${mtdStartStr}&date_to=${mtdEndStr}` },
                        { label: (operationalContent as any).kpiOverdueInvoices || 'Overdue Fatura', value: `${overdueCount} • ${formatCurrency(overdueAmount)}`, href: `/${locale}/admin/idari/finans/raporlama?tab=invoices&filter=overdue`, tone: (overdueCount>0 ? 'negative' : 'default') as 'negative' | 'default' },
                    ];
                    return <KPIBar items={items} />;
                })()}

                {/* BÖLÜM 3: OPERASYONEL GÖSTERGELER (mevcut 4 Kart) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <StatCard
                          title={operationalContent.cardNewApplications || "Neue Anträge"}
                          value={applicationsRes.count ?? 0}
                          icon={<FiUserPlus size={28} className="text-indigo-500"/>}
                          link={`/${locale}/admin/crm/firmalar?status_not_in=${encodeURIComponent(ABGESCHLOSSENE_ANTRAG_STATUS.join(','))}`}
                          linkText={operationalContent.viewApplications || "Anträge prüfen"}
                      />
                      <StatCard
                          title={operationalContent.cardActiveOrders || "Aktive Bestellungen"}
                          value={ordersRes.count ?? 0}
                          icon={<FiPackage size={28} className="text-yellow-500"/>}
                          link={`/${locale}/admin/operasyon/siparisler?filter=offen`}
                          linkText={operationalContent.viewActiveOrders || "Aktif Siparişleri Görüntüle"}
                      />
                      <StatCard
                          title={operationalContent.cardOpenSampleRequests || "Neue Musteranfragen"}
                          value={sampleRequestsRes.count ?? 0}
                          icon={<FiGift size={28} className="text-purple-500"/>}
                          link={`/${locale}/admin/operasyon/numune-talepleri?durum=${encodeURIComponent(NEUE_MUSTER_STATUS)}`}
                          linkText={operationalContent.viewSampleRequests || "Neue Muster prüfen"}
                      />
                      {productRequestsRes && !productRequestsRes.error?.message?.includes('relation "public.yeni_urun_talepleri" does not exist') && (
                           <StatCard
                                title={operationalContent.cardNewProductRequests || "Neue Produktanfragen"}
                                value={productRequestsRes.count ?? 0}
                                icon={<FiBox size={28} className="text-teal-500"/>}
                                 link={`/${locale}/admin/urun-yonetimi/urun-talepleri?status=${encodeURIComponent(NEUE_PRODUKTANFRAGE_STATUS)}`}
                                linkText={operationalContent.viewProductRequests || "Neue Anfragen prüfen"}
                            />
                      )}
                </div>

                {/* BÖLÜM 4: SİPARİŞ DURUMU DAĞILIMI (son 30 gün) */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="font-serif text-2xl font-bold text-primary mb-4">{(operationalContent as any).orderBreakdownTitle || 'Sipariş Durumu Dağılımı (30 gün)'}</h2>
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {/* Basit legend ve yüzdeler */}
                        <div className="flex-1">
                            <div className="space-y-2">
                                {orderBreakdown.map((b) => (
                                    <div key={b.key} className="flex items-center gap-3">
                                        <span className={`inline-block w-3 h-3 rounded-full ${b.color.replace('text','bg')}`}></span>
                                        <span className="text-sm font-medium text-text-main/80 w-32">{b.key}</span>
                                        <div className="flex-1 h-2 bg-gray-100 rounded">
                                            <div className={`${b.color.replace('text','bg')} h-2 rounded`} style={{ width: `${(b.count || 0) / Math.max(1, orderBreakdown.reduce((s,c)=>s+c.count,0)) * 100}%` }} />
                                        </div>
                                        <span className="text-sm font-semibold text-primary w-12 text-right">{b.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* BÖLÜM 5: AJANDA (GÖREV LİNKİ DÜZELTİLDİ) */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                          <h2 className="font-serif text-2xl font-bold text-primary">{pageContent.agendaTitle || "Agenda & Dringende Aufgaben"}</h2>
                          <Link href={`/${locale}/admin/gorevler`} className="text-accent text-sm font-semibold hover:underline flex-shrink-0">{operationalContent.viewAllTasks || "Tüm Görevleri Görüntüle"} &rarr;</Link>
                      </div>
                      {overdueTasks.length > 0 ? (
                          <div className="space-y-3 divide-y divide-gray-100">
                              {overdueTasks.map(task => (
                                  <div key={task.id} className="pt-3 first:pt-0">
                                      {/* --- DEĞİŞİKLİK BURADA --- */}
                                      {/* Link artık task.id'ye değil, ana görevler sayfasına yönleniyor */}
                                      <Link href={`/${locale}/admin/gorevler`} className="block group">
                                          <p className="font-semibold text-primary group-hover:text-accent transition-colors truncate">{task.baslik}</p>
                                          <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-0.5">
                                              <FiClock size={12}/>
                                              {operationalContent.dueDate || "Termin:"} {formatDate(task.son_tarih, locale)}
                                          </p>
                                      </Link>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-center text-gray-500 py-6">{operationalContent.noOverdueTasks || "Şu anda gecikmiş görev yok."}</p>
                      )}
                    </div>
            </div>
            
            {/* Sağ Sütun (Hızlı Eylemler ve Uyarılar) */}
            <div className="lg:col-span-1 space-y-6">
                
                {/* BÖLÜM 1: HIZLI EYLEMLER */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                         <h2 className="font-serif text-2xl font-bold text-primary mb-4">{pageContent.quickActionsTitle || "Hızlı İşlemler"}</h2>
                         <div className="grid grid-cols-3 gap-3">
                             <QuickActionButton label={pageContent.actionNewCompany || "Yeni Firma"} icon={<FiUsers size={20}/>} href={`/${locale}/admin/crm/firmalar/yeni`} />
                             <QuickActionButton label={operationalContent.actionNewProduct || "Yeni Ürün"} icon={<FiArchive size={20}/>} href={`/${locale}/admin/urun-yonetimi/urunler/yeni`} />
                             <QuickActionButton label={pageContent.actionNewOrder || "Yeni Sipariş"} icon={<FiPackage size={20}/>} href={`/${locale}/admin/operasyon/siparisler/yeni`} />
                             <QuickActionButton label={operationalContent.actionNewTask || "Yeni Görev"} icon={<FiClipboard size={20}/>} href={`/${locale}/admin/gorevler/ekle`} />
                             <QuickActionButton label={pageContent.actionNewExpense || "Yeni Gider"} icon={<FiBriefcase size={20}/>} href={`/${locale}/admin/idari/finans/giderler`} />
                         </div>
                   </div>

                {/* BÖLÜM 2: UYARILAR (Kritik Stok) */}
                <StatCard
                      title={operationalContent.cardCriticalStock || "Kritischer Lagerbestand"}
                      value={stockRes.data ?? 0}
                      icon={<FiAlertTriangle size={28} className="text-red-500"/>}
                      link={`/${locale}/admin/urun-yonetimi/urunler?filter=kritisch`}
                      linkText={operationalContent.viewCriticalStockLink || "Kritik Stokları Görüntüle"}
                   />
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
        return <div>{content.errorLoadingTeamDashboard || "Fehler beim Laden."}</div>
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
                      title={content.cardOpenTasks || "Offene Aufgaben"}
                      value={isNaN(safeOpenTasksCount) ? 0 : safeOpenTasksCount}
                      icon={<FiClipboard size={28} className="text-blue-500"/>}
                      link={`/${locale}/admin/gorevler`}
                      linkText={content.linkMyTasks || "Meine Aufgaben"}
                  />
                  <StatCard
                      title={content.cardNewOrdersFromClients || "Neue Bestellungen (Kunden)"}
                      value={isNaN(safeNewOrdersCount) ? 0 : safeNewOrdersCount}
                      icon={<FiPackage size={28} className="text-green-500"/>}
                      link={`/${locale}/admin/operasyon/siparisler`}
                      linkText={content.viewOrdersText || "Siparişleri Görüntüle"}
                  />
            </div>
             <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                  <h2 className="font-serif text-2xl font-bold text-primary mb-4">{content.quickAccessTitle || "Schnellzugriff"}</h2>
                  <div className="flex gap-4">
                      <Link href={`/${locale}/admin/crm/firmalar`} className="font-bold text-accent hover:underline">{content.linkMyClients || "Meine Kunden"}</Link>
                      <Link href={`/${locale}/admin/gorevler`} className="font-bold text-accent hover:underline">{content.linkMyTasks || "Meine Aufgaben"}</Link>
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
        return <div>Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.</div>;
    }

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (!profile) {
        console.error("Profil nicht gefunden für Benutzer:", user.id);
        return <div>Kullanıcı profili bulunamadı. Lütfen tekrar giriş yapın.</div>;
    }
    const userRole = profile.rol;

    if (userRole !== 'Yönetici' && userRole !== 'Ekip Üyesi') {
         console.warn(`Unberechtigter Zugriff auf Admin Dashboard durch Rolle: ${userRole}`);
         return <div>Yetkisiz erişim. Lütfen ana sayfaya dönün.</div>;
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
            {userRole === 'Ekip Üyesi' && <TeamMemberDashboard userId={user.id} locale={locale} dictionary={dictionary} cookieStore={cookieStore} />}
        </div>
    );
}