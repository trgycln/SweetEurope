// src/app/[locale]/admin/dashboard/page.tsx
// KORRIGIERTE VERSION (behebt cookieStore UND Zähl-Logik)

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies, ReadonlyRequestCookies } from 'next/headers'; // ReadonlyRequestCookies importieren
import { notFound, redirect } from 'next/navigation';
import {
    FiDollarSign, FiTrendingUp, FiPackage, FiAlertTriangle, FiUsers,
    FiClipboard, FiPlus, FiBriefcase, FiUserPlus, FiGift, FiBox, FiArchive, FiClock
} from 'react-icons/fi';
import Link from 'next/link';
import { Tables, Enums, Database } from '@/lib/supabase/database.types'; // Database importieren
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { formatDate } from '@/lib/utils'; // utils importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// StatCard Komponente (unverändert)
const StatCard = ({ title, value, icon, link, linkText }: { title: string, value: string | number, icon: React.ReactNode, link?: string, linkText?: string }) => {
    const content = (
        <>
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex-grow min-w-0">
                <p className="text-sm font-medium text-text-main/70 truncate">{title}</p>
                <p className="text-3xl font-bold text-primary mt-1 truncate">{value}</p>
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

// Schnellaktions-Button (unverändert)
const QuickActionButton = ({ label, icon, href }: { label: string, icon: React.ReactNode, href: string }) => (
     <Link href={href} className="bg-accent text-white p-3 rounded-lg flex flex-col items-center justify-center text-center font-bold text-xs hover:bg-opacity-85 transition-opacity aspect-square">
         {icon}
         <span className="mt-1.5">{label}</span>
     </Link>
);

// Typ für eine Aufgabe (unverändert)
type OverdueTask = Pick<Tables<'gorevler'>, 'id' | 'baslik' | 'son_tarih'>;

// Props-Typ für die Unter-Dashboards
interface DashboardProps {
    locale: Locale;
    dictionary: any;
    cookieStore: ReadonlyRequestCookies; // cookieStore als Prop
}

// Manager Dashboard Komponente (KORRIGIERT)
async function ManagerDashboard({ locale, dictionary, cookieStore }: DashboardProps) { // cookieStore empfangen
    
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const content = dictionary.adminDashboard || {};
    const now = new Date();
    const todayISO = now.toISOString();

    // Statusdefinitionen für Zählungen und Filter
    const OFFENE_BESTELL_STATUS: Enums<'siparis_durumu'>[] = ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing'];
    const NEUE_MUSTER_STATUS: Enums<'numune_talep_durumu'> = 'Yeni Talep';
    const NEUE_PRODUKTANFRAGE_STATUS: Enums<'urun_talep_durumu'> = 'Yeni';
    
    // --- KORREKTUR (LOGIK): Abgeschlossene Status definieren ---
    const ABGESCHLOSSENE_ANTRAG_STATUS: Enums<'firma_status'>[] = ['Anlaşma Sağlandı', 'Pasif'];
    // --- ENDE KORREKTUR ---

    // Parallele Datenabfragen
    const [
        ordersRes,
        stockRes,
        tasksRes,
        applicationsRes,
        sampleRequestsRes,
        productRequestsRes
    ] = await Promise.all([
        supabase.from('siparisler').select('id', { count: 'exact' }).in('siparis_durumu', OFFENE_BESTELL_STATUS),
        supabase.rpc('get_kritik_stok_count'),
        supabase.from('gorevler').select('id, baslik, son_tarih').eq('tamamlandi', false).lt('son_tarih', todayISO).order('son_tarih', { ascending: true }).limit(5),
        
        // --- KORREKTUR (LOGIK): Zählung schließt jetzt 'Anlaşma Sağlandı' und 'Pasif' aus ---
        // Stellt sicher, dass die Strings korrekt in Anführungszeichen gesetzt werden
        supabase.from('firmalar').select('id', { count: 'exact' })
            .not('status', 'in', `(${ABGESCHLOSSENE_ANTRAG_STATUS.map(s => `'${s}'`).join(',')})`), 
        // --- ENDE KORREKTUR ---
            
        supabase.from('numune_talepleri').select('id', { count: 'exact' }).eq('durum', NEUE_MUSTER_STATUS),
        supabase.from('yeni_urun_talepleri').select('id', { count: 'exact' }).eq('status', NEUE_PRODUKTANFRAGE_STATUS)
             .then(res => res, err => ({ data: null, count: null, error: err })) // Fehler abfangen
    ]);

    // Fehler loggen
    if (ordersRes.error) console.error("Active Orders Error:", ordersRes.error);
    if (stockRes.error) console.error("Critical Stock Error:", stockRes.error);
    if (tasksRes.error) console.error("Overdue Tasks Error:", tasksRes.error);
    if (applicationsRes.error) console.error("New Applications Error:", applicationsRes.error); // Dieser Fehler könnte jetzt auftreten, falls die SQL-Syntax immer noch fehlschlägt
    if (sampleRequestsRes.error) console.error("Sample Requests Error:", sampleRequestsRes.error);
    if (productRequestsRes && productRequestsRes.error && !productRequestsRes.error?.message?.includes('relation "public.yeni_urun_talepleri" does not exist')) {
        console.error("Product Requests Error:", productRequestsRes.error);
    }

    const overdueTasks: OverdueTask[] = tasksRes.data || [];

    const formatCurrency = (value: number | null | undefined) => {
        if (value === null || value === undefined) return 'N/A';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
    };


    return (
        <div className="space-y-8">
            {/* KPI Karten */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 <StatCard
                     title={content.cardNewApplications || "Neue Anträge"}
                     value={applicationsRes.count ?? 0} // Sollte jetzt 6 sein (oder was auch immer 9-3 ist)
                     icon={<FiUserPlus size={28} className="text-indigo-500"/>}
                     link={`/${locale}/admin/crm/firmalar?status_not_in=${encodeURIComponent(ABGESCHLOSSENE_ANTRAG_STATUS.join(','))}`}
                     linkText={content.viewApplications || "Anträge prüfen"}
                 />
                 <StatCard
                     title={content.cardActiveOrders || "Aktive Bestellungen"}
                     value={ordersRes.count ?? 0}
                     icon={<FiPackage size={28} className="text-yellow-500"/>}
                     link={`/${locale}/admin/operasyon/siparisler?filter=offen`}
                     linkText={"Offene Bestellungen ansehen"}
                 />
                 <StatCard
                     title={content.cardOpenSampleRequests || "Neue Musteranfragen"}
                     value={sampleRequestsRes.count ?? 0}
                     icon={<FiGift size={28} className="text-purple-500"/>}
                     link={`/${locale}/admin/operasyon/numune-talepleri?durum=${encodeURIComponent(NEUE_MUSTER_STATUS)}`}
                     linkText={content.viewSampleRequests || "Neue Muster prüfen"}
                 />
                 {productRequestsRes && !productRequestsRes.error?.message?.includes('relation "public.yeni_urun_talepleri" does not exist') && (
                      <StatCard
                          title={content.cardNewProductRequests || "Neue Produktanfragen"}
                          value={productRequestsRes.count ?? 0}
                          icon={<FiBox size={28} className="text-teal-500"/>}
                           link={`/${locale}/admin/urun-yonetimi/urun-talepleri?status=${encodeURIComponent(NEUE_PRODUKTANFRAGE_STATUS)}`}
                          linkText={content.viewProductRequests || "Neue Anfragen prüfen"}
                      />
                 )}
                 <StatCard
                     title={content.cardCriticalStock || "Kritischer Lagerbestand"}
                     value={stockRes.data ?? 0}
                     icon={<FiAlertTriangle size={28} className="text-red-500"/>}
                     link={`/${locale}/admin/urun-yonetimi/urunler?filter=kritisch`}
                     linkText={"Kritische Artikel ansehen"}
                 />
            </div>

            {/* Agenda & Schnellaktionen */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                     <div className="flex justify-between items-center mb-4">
                         <h2 className="font-serif text-2xl font-bold text-primary">{content.agendaTitle || "Agenda & Dringende Aufgaben"}</h2>
                         <Link href={`/${locale}/admin/gorevler`} className="text-accent text-sm font-semibold hover:underline flex-shrink-0">{content.viewAllTasks || "Alle Aufgaben anzeigen"} &rarr;</Link>
                     </div>
                     {overdueTasks.length > 0 ? (
                         <div className="space-y-3 divide-y divide-gray-100">
                             {overdueTasks.map(task => (
                                 <div key={task.id} className="pt-3 first:pt-0">
                                     <Link href={`/${locale}/admin/gorevler/${task.id}`} className="block group">
                                         <p className="font-semibold text-primary group-hover:text-accent transition-colors truncate">{task.baslik}</p>
                                         <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-0.5">
                                             <FiClock size={12}/>
                                             {content.dueDate || "Fällig am:"} {formatDate(task.son_tarih, locale)}
                                         </p>
                                     </Link>
                                 </div>
                             ))}
                         </div>
                     ) : (
                         <p className="text-center text-gray-500 py-6">{content.noOverdueTasks || "Aktuell keine überfälligen Aufgaben."}</p>
                     )}
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                       <h2 className="font-serif text-2xl font-bold text-primary mb-4">{content.quickActionsTitle || "Schnellaktionen"}</h2>
                       <div className="grid grid-cols-3 gap-3">
                           <QuickActionButton label={content.actionNewCompany || "Neue Firma"} icon={<FiUsers size={20}/>} href={`/${locale}/admin/crm/firmalar/yeni`} />
                           <QuickActionButton label={content.actionNewProduct || "Neues Produkt"} icon={<FiArchive size={20}/>} href={`/${locale}/admin/urun-yonetimi/urunler/yeni`} />
                           <QuickActionButton label={content.actionNewOrder || "Neue Bestellung"} icon={<FiPackage size={20}/>} href={`/${locale}/admin/operasyon/siparisler/yeni`} />
                           <QuickActionButton label={"Neue Aufgabe"} icon={<FiClipboard size={20}/>} href={`/${locale}/admin/gorevler/ekle`} />
                           <QuickActionButton label={content.actionNewExpense || "Neue Ausgabe"} icon={<FiBriefcase size={20}/>} href={`/${locale}/admin/idari/finans/giderler`} />
                       </div>
                 </div>
            </div>
        </div>
    );
}

// TeamMemberDashboard (KORRIGIERT)
async function TeamMemberDashboard({ userId, locale, dictionary, cookieStore }: DashboardProps & { userId: string }) { // cookieStore empfangen

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---
    
    const content = dictionary.adminDashboard || {};

    const { data, error } = await supabase.rpc('get_dashboard_summary_for_member', { p_member_id: userId }).single();

    if (error) {
        console.error("Team member dashboard error:", error);
        return <div>{content.errorLoadingTeamDashboard || "Fehler beim Laden."}</div>
    }

    const formatValue = (value: number | null | undefined) => value ?? 0;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <StatCard
                     title={content.cardOpenTasks || "Offene Aufgaben"}
                     value={formatValue(data?.openTasksCount)}
                     icon={<FiClipboard size={28} className="text-blue-500"/>}
                     link={`/${locale}/admin/gorevler`}
                     linkText={content.linkMyTasks || "Meine Aufgaben"}
                 />
                 <StatCard
                     title={content.cardNewOrdersFromClients || "Neue Bestellungen (Kunden)"}
                     value={formatValue(data?.newOrdersCount)}
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


// Hauptkomponente (KORRIGIERT)
export default async function AdminDashboardPage({ 
    params
}: { 
    params: { locale: Locale } 
}) {
    noStore(); // Caching deaktivieren
    const locale = params.locale;
    const dictionary = await getDictionary(locale);
    const content = dictionary.adminDashboard || {};

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (!profile) {
        console.error("Profil nicht gefunden für Benutzer:", user.id);
        return redirect(`/${locale}/login?error=profile_not_found`);
    }
    const userRole = profile.rol;

    if (userRole !== 'Yönetici' && userRole !== 'Ekip Üyesi') {
         console.warn(`Unberechtigter Zugriff auf Admin Dashboard durch Rolle: ${userRole}`);
         return redirect(`/${locale}/portal/dashboard`);
    }


    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">
                    {userRole === 'Yönetici' ? content.managerTitle : content.teamMemberTitle}
                </h1>
                <p className="text-text-main/80 mt-1">
                    {userRole === 'Yönetici' ? content.managerSubtitle : content.teamMemberSubtitle}
                </p>
            </header>

            {/* --- KORREKTUR: cookieStore wird übergeben --- */}
            {userRole === 'Yönetici' && <ManagerDashboard locale={locale} dictionary={dictionary} cookieStore={cookieStore} />}
            {userRole === 'Ekip Üyesi' && <TeamMemberDashboard userId={user.id} locale={locale} dictionary={dictionary} cookieStore={cookieStore} />}
            {/* --- ENDE KORREKTUR --- */}
        </div>
    );
}