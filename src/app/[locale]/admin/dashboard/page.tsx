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
import { DistributorsList } from '@/components/admin/dashboard/DistributorsList';
// --- BİTTİ ---

export const dynamic = 'force-dynamic';

// --- Para Formatlama (Server-side) ---
const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
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
    const ABGESCHLOSSENE_ANTRAG_STATUS: Enums<'firma_status'>[] = ['Müşteri', 'Pasif'];

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
        // Müşteri ve Pasif olmayan firmaları say
        supabase.from('firmalar').select('id', { count: 'exact' }).not('status', 'in', `(${ABGESCHLOSSENE_ANTRAG_STATUS.join(',')})`),
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
    return (
        <div className="space-y-8">
            {/* EN ÜSTTE: Ciro, Kar, Zarar Tablosu und Grafik */}
            <div className="flex flex-col gap-6">
                <KPIBar items={[ 
                    { label: (operationalContent as any).kpiRevenueMtd || 'Net Ciro (Bu Ay)', value: formatCurrency(revenueMtdNet), hint: deltaPct !== null ? `${deltaPct > 0 ? '+' : ''}${deltaPct}% zum Vormonat` : undefined, tone: 'accent' },
                    { label: 'Toplam Gider', value: formatCurrency(mtd?.totalExpenses ?? 0), tone: 'default' },
                    { label: 'Net Kâr', value: formatCurrency(mtd?.netProfit ?? 0), tone: (mtd?.netProfit ?? 0) >= 0 ? 'positive' : 'negative' },
                    { label: 'Sipariş Adedi', value: String(ordersMtd), tone: 'default' },
                ]} />
                <FinanzChartClient plReport={plReport} dictionary={dictionary} />
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
                        <StatCard
                            title={operationalContent.cardOpenSampleRequests || "Open Sample Requests"}
                            value={sampleRequestsRes.count ?? 0}
                            icon={<FiGift size={28} className="text-purple-500"/>}
                            link={`/${locale}/admin/operasyon/numune-talepleri?durum=${encodeURIComponent(NEUE_MUSTER_STATUS)}`}
                            linkText={operationalContent.viewSampleRequests || "Review requests"}
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
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                        <h2 className="font-serif text-2xl font-bold text-primary mb-4">{(operationalContent as any).overdueTasksTitle || 'Overdue Tasks'}</h2>
                        {overdueTasks.length > 0 ? (
                            <div className="space-y-3 divide-y divide-gray-100">
                                {overdueTasks.map((task: any) => (
                                    <div key={task.id} className="pt-3 first:pt-0">
                                        <Link href={`/${locale}/admin/gorevler`} className="block group">
                                            <p className="font-semibold text-primary group-hover:text-accent transition-colors truncate">{task.baslik}</p>
                                            <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-0.5">
                                                <FiClock size={12}/>
                                                {operationalContent.dueDate || "Due:"} {formatDate(task.son_tarih, locale)}
                                            </p>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-6">{operationalContent.noOverdueTasks || "No overdue tasks at the moment."}</p>
                        )}
                    </div>

                    <StatCard
                        title={operationalContent.cardCriticalStock || "Critical Stock"}
                        value={stockRes.data ?? 0}
                        icon={<FiAlertTriangle size={28} className="text-red-500"/>}
                        link={`/${locale}/admin/urun-yonetimi/urunler?filter=kritisch`}
                        linkText={operationalContent.viewCriticalStockLink || "View critical stock"}
                    />
                </div>
            </div>

            {/* Distributors Section - Alt Bayiler */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">{(operationalContent as any).distributorsTitle || 'Alt Bayiler Müşteri Sayısı'}</h2>
                <DistributorsList locale={locale} dictionary={dictionary} cookieStore={cookieStore} />
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

    if (userRole !== 'Yönetici' && userRole !== 'Ekip Üyesi') {
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
            {userRole === 'Ekip Üyesi' && <TeamMemberDashboard userId={user.id} locale={locale} dictionary={dictionary} cookieStore={cookieStore} />}
        </div>
    );
}