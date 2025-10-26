// src/app/[locale]/portal/dashboard/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardKpiCard } from '@/components/portal/dashboard/DashboardKpiCard';
import { RecentOrders } from '@/components/portal/dashboard/RecentOrders';
import { Announcements } from '@/components/portal/dashboard/Announcements';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { HizliSiparisClient } from '@/components/portal/dashboard/HizliSiparisClient';
import { MarketingMaterialsWidget } from '@/components/portal/dashboard/MarketingMaterialsWidget';
import { QuickActionsCard } from '@/components/portal/dashboard/QuickActionsCard';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten
import { Database, Tables, Enums } from '@/lib/supabase/database.types'; // Import für Typisierung

export const dynamic = 'force-dynamic';

type PageProps = {
    params: { locale: Locale };
};

export default async function PartnerDashboardPage({ params }: PageProps) { // Korrekten Prop-Typ verwenden
    noStore(); // Caching deaktivieren
    const { locale } = params;

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const dictionary = await getDictionary(locale);
    // Sicherer Zugriff auf das Dictionary mit Fallbacks
    const content = (dictionary as any).portal?.dashboard || {
        welcome: "Willkommen",
        subtitle: "Übersicht Ihrer Aktivitäten.",
        openOrders: "Offene Bestellungen",
        myFavorites: "Meine Favoriten",
        openSampleRequests: "Offene Musteranfragen",
        viewFavorites: "Favoriten ansehen",
        viewRequests: "Anfragen ansehen",
        viewOpenOrders: "Offene Bestellungen anzeigen",
    };

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id, rol')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.firma_id) {
         // Sicherstellen, dass Admins/Team nicht hier landen (obwohl Middleware dies tun sollte)
         if (profile?.rol === 'Yönetici' || profile?.rol === 'Ekip Üyesi') {
              return redirect(`/${locale}/admin/dashboard`);
         }
        return redirect(`/${locale}/login?error=unauthorized`);
    }

    const firmaId = profile.firma_id;
    const userId = user.id; // Benutzer-ID für Favoriten

    // Status für offene Musteranfragen
    const OFFENE_MUSTER_STATUS: Enums<'numune_talep_durumu'>[] = ['Yeni Talep', 'Onaylandı', 'Hazırlanıyor'];

    // Daten parallel abrufen
    const [
        openOrderData,
        hizliSiparisData,
        favoritesData,
        openRequestsData
    ] = await Promise.all([
        // Offene Bestellungen
        supabase.from('siparisler')
            .select('*', { count: 'exact', head: true })
            .eq('firma_id', firmaId)
            .in('siparis_durumu', ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing']),
        // Schnellbestellung Produkte
        supabase.rpc('get_hizli_siparis_urunleri', { p_firma_id: firmaId }),
        // Favoriten zählen
        supabase.from('favori_urunler')
            .select('*', { count: 'exact', head: true })
            .eq('kullanici_id', userId),
        // Offene Musteranfragen zählen
        supabase.from('numune_talepleri')
            .select('*', { count: 'exact', head: true })
            .eq('firma_id', firmaId)
            .in('durum', OFFENE_MUSTER_STATUS)
    ]);

    // Ergebnisse extrahieren
    const openOrderCount = openOrderData.count ?? 0;
    const favoritesCount = favoritesData.count ?? 0;
    const openRequestsCount = openRequestsData.count ?? 0;

    // Fehler loggen, falls vorhanden
    if (openOrderData.error) console.error("Fehler beim Zählen der offenen Bestellungen:", openOrderData.error);
    if (hizliSiparisData.error) console.error("Fehler beim Laden der Schnellbestellung-Produkte:", hizliSiparisData.error);
    if (favoritesData.error) console.error("Fehler beim Zählen der Favoriten:", favoritesData.error);
    if (openRequestsData.error) console.error("Fehler beim Zählen der Musteranfragen:", openRequestsData.error);

    // Schnellbestellung Produkte verarbeiten
    // Typ-Annahme für RPC-Ergebnis
    type HizliSiparisUrun = { id: string, urun_id?: string, ad: any, satis_fiyati_alt_bayi: number, satis_fiyati_musteri: number };
    
    const hizliSiparisUrunler = (hizliSiparisData.data as HizliSiparisUrun[] || []).map((urun) => {
        const preis = profile.rol === 'Alt Bayi'
            ? urun.satis_fiyati_alt_bayi
            : urun.satis_fiyati_musteri;
        return { ...urun, id: urun.id || urun.urun_id, partnerPreis: preis || 0 }; // ID Fallback
    });

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.welcome}</h1>
                <p className="text-text-main/80 mt-1">{content.subtitle}</p>
            </header>

            {/* --- KPI Karten --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Offene Bestellungen */}
                <DashboardKpiCard
                    title={content.openOrders}
                    value={openOrderCount}
                    icon="truck"
                    color="orange"
                    href={`/${locale}/portal/siparisler?filter=offen`}
                    linkText={content.viewOpenOrders}
                />
                {/* 2. Meine Favoriten */}
                <DashboardKpiCard
                    title={content.myFavorites}
                    value={favoritesCount}
                    icon="heart"
                    color="red"
                    href={`/${locale}/portal/katalog?favoriten=true`}
                    linkText={content.viewFavorites}
                />
                {/* 3. Offene Musteranfragen */}
                <DashboardKpiCard
                    title={content.openSampleRequests}
                    value={openRequestsCount}
                    icon="beaker" // (Faustregel: FiBeaker)
                    color="blue"
                    href={`/${locale}/portal/taleplerim`}
                    linkText={content.viewRequests}
                />
            </div>
            {/* --- Ende KPI Karten --- */}

            {/* Hauptinhalt Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Schnellbestellung (Client Komponente) */}
                    <HizliSiparisClient urunler={hizliSiparisUrunler} locale={locale} dictionary={dictionary} />
                    {/* Letzte Bestellungen (Client Komponente) */}
                    <RecentOrders firmaId={firmaId} locale={locale} />
                </div>
                <div className="space-y-8">
                    {/* Schnellaktionen (Client Komponente) */}
                    <QuickActionsCard locale={locale} dictionary={dictionary} />
                    {/* Ankündigungen (Client Komponente) */}
                    <Announcements locale={locale} />
                    {/* Marketingmaterial (Client Komponente) */}
                    <MarketingMaterialsWidget locale={locale} />
                </div>
            </div>
        </div>
    );
}