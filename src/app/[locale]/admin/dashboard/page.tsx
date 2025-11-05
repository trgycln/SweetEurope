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
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

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
        plReportRes
    ] = await Promise.all([
        supabase.from('siparisler').select('id', { count: 'exact' }).in('siparis_durumu', OFFENE_BESTELL_STATUS),
        supabase.rpc('get_kritik_stok_count'),
        supabase.from('gorevler').select('id, baslik, son_tarih').eq('tamamlandi', false).lt('son_tarih', todayISO).order('son_tarih', { ascending: true }).limit(5),
        // KORREKTUR: 'Anlaşma Sağlandı' ve 'Pasif' hariç say
        supabase.from('firmalar').select('id', { count: 'exact' }).not('status', 'in', `(${ABGESCHLOSSENE_ANTRAG_STATUS.map(s => `'${s}'`).join(',')})`),
        supabase.from('numune_talepleri').select('id', { count: 'exact' }).eq('durum', NEUE_MUSTER_STATUS),
        supabase.from('yeni_urun_talepleri').select('id', { count: 'exact' }).eq('status', NEUE_PRODUKTANFRAGE_STATUS).then(res => res, err => ({ data: null, count: null, error: err })),
        supabase.rpc('get_pl_report', { start_date: startDate, end_date: endDate }).returns<ReportData>().single()
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
    const overdueTasks: OverdueTask[] = tasksRes.data || [];

    return (
        // 3 Sütunlu Düzen
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sol ve Orta Sütun (Ana İçerik) */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* BÖLÜM 1: FİNANSAL GRAFİK */}
                <FinanzChartClient plReport={plReport} dictionary={dictionary} />
                
                {/* BÖLÜM 2: OPERASYONEL GÖSTERGELER (4 Kart) */}
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
                          linkText={"Offene Bestellungen ansehen"}
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
                
                {/* BÖLÜM 3: AJANDA (GÖREV LİNKİ DÜZELTİLDİ) */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-4">
                          <h2 className="font-serif text-2xl font-bold text-primary">{pageContent.agendaTitle || "Agenda & Dringende Aufgaben"}</h2>
                          <Link href={`/${locale}/admin/gorevler`} className="text-accent text-sm font-semibold hover:underline flex-shrink-0">{operationalContent.viewAllTasks || "Alle Aufgaben anzeigen"} &rarr;</Link>
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
                                              {operationalContent.dueDate || "Fällig am:"} {formatDate(task.son_tarih, locale)}
                                          </p>
                                      </Link>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-center text-gray-500 py-6">{operationalContent.noOverdueTasks || "Aktuell keine überfälligen Aufgaben."}</p>
                      )}
                    </div>
            </div>
            
            {/* Sağ Sütun (Hızlı Eylemler ve Uyarılar) */}
            <div className="lg:col-span-1 space-y-6">
                
                {/* BÖLÜM 1: HIZLI EYLEMLER */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                         <h2 className="font-serif text-2xl font-bold text-primary mb-4">{pageContent.quickActionsTitle || "Schnellaktionen"}</h2>
                         <div className="grid grid-cols-3 gap-3">
                             <QuickActionButton label={pageContent.actionNewCompany || "Neue Firma"} icon={<FiUsers size={20}/>} href={`/${locale}/admin/crm/firmalar/yeni`} />
                             <QuickActionButton label={operationalContent.actionNewProduct || "Neues Produkt"} icon={<FiArchive size={20}/>} href={`/${locale}/admin/urun-yonetimi/urunler/yeni`} />
                             <QuickActionButton label={pageContent.actionNewOrder || "Neue Bestellung"} icon={<FiPackage size={20}/>} href={`/${locale}/admin/operasyon/siparisler/yeni`} />
                             <QuickActionButton label={"Neue Aufgabe"} icon={<FiClipboard size={20}/>} href={`/${locale}/admin/gorevler/ekle`} />
                             <QuickActionButton label={pageContent.actionNewExpense || "Neue Ausgabe"} icon={<FiBriefcase size={20}/>} href={`/${locale}/admin/idari/finans/giderler`} />
                         </div>
                   </div>

                {/* BÖLÜM 2: UYARILAR (Kritik Stok) */}
                <StatCard
                      title={operationalContent.cardCriticalStock || "Kritischer Lagerbestand"}
                      value={stockRes.data ?? 0}
                      icon={<FiAlertTriangle size={28} className="text-red-500"/>}
                      link={`/${locale}/admin/urun-yonetimi/urunler?filter=kritisch`}
                      linkText={"Kritische Artikel ansehen"}
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
                      linkText={"Bestellungen anzeigen"}
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
    const locale = params.locale;
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