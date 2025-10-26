import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardKpiCard } from '@/components/portal/dashboard/DashboardKpiCard';
import { RecentOrders } from '@/components/portal/dashboard/RecentOrders';
import { Announcements } from '@/components/portal/dashboard/Announcements';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { HizliSiparisClient } from '@/components/portal/dashboard/HizliSiparisClient';
import { MarketingMaterialsWidget } from '@/components/portal/dashboard/MarketingMaterialsWidget';
import { QuickActionsCard } from '@/components/portal/dashboard/QuickActionsCard'; // Behalten wir für andere Aktionen

type PageProps = {
    params: { locale: Locale };
};

export default async function PartnerDashboardPage(props: PageProps) {
    const { params } = props;
    const { locale } = params;

    const dictionary = await getDictionary(locale);
    // Sicherer Zugriff auf das Dictionary mit Fallbacks
    const content = (dictionary as any).portal?.dashboard || {
        welcome: "Willkommen",
        subtitle: "Übersicht Ihrer Aktivitäten.",
        openOrders: "Offene Bestellungen",
        myFavorites: "Meine Favoriten", // Fallback
        openSampleRequests: "Offene Musteranfragen", // Fallback
        viewFavorites: "Favoriten ansehen", // Fallback
        viewRequests: "Anfragen ansehen", // Fallback
        viewOpenOrders: "Offene Bestellungen anzeigen", // Fallback
    };

    const supabase = createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id, rol')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.firma_id) return redirect(`/${locale}/login?error=unauthorized`);

    const firmaId = profile.firma_id;
    const userId = user.id; // Benutzer-ID für Favoriten

    // Daten parallel abrufen - MIT Favoriten und Musteranfragen
    const [
        openOrderData,
        hizliSiparisData,
        favoritesData, // NEU
        openRequestsData // NEU
    ] = await Promise.all([
        // Offene Bestellungen
        supabase.from('siparisler')
            .select('*', { count: 'exact', head: true })
            .eq('firma_id', firmaId)
            .in('siparis_durumu', ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing']),
        // Schnellbestellung Produkte
        supabase.rpc('get_hizli_siparis_urunleri', { p_firma_id: firmaId }),
        // Favoriten zählen (filtert nach user_id)
        supabase.from('favori_urunler')
            .select('*', { count: 'exact', head: true })
            .eq('kullanici_id', userId),
        // Offene Musteranfragen zählen (filtert nach firma_id und Status)
        // KORREKTUR: Verwenden Sie die tatsächlichen Statuswerte aus Ihrer DB
        supabase.from('numune_talepleri')
            .select('*', { count: 'exact', head: true })
            .eq('firma_id', firmaId)
            .in('durum', ['Yeni Talep', 'Onaylandı', 'Hazırlanıyor']) // Passen Sie diese ggf. an!
    ]);

    // Ergebnisse extrahieren
    const openOrderCount = openOrderData.count ?? 0;
    const favoritesCount = favoritesData.count ?? 0;
    const openRequestsCount = openRequestsData.count ?? 0;

    // Fehler loggen, falls vorhanden
    if (favoritesData.error) console.error("Fehler beim Zählen der Favoriten:", favoritesData.error);
    if (openRequestsData.error) console.error("Fehler beim Zählen der Musteranfragen:", openRequestsData.error);

    // Schnellbestellung Produkte (unverändert)
    const hizliSiparisUrunler = (hizliSiparisData.data || []).map((urun: any) => {
        const preis = profile.rol === 'Alt Bayi'
            ? urun.satis_fiyati_alt_bayi
            : urun.satis_fiyati_musteri;
        // Stellen Sie sicher, dass id vorhanden ist (entweder als id oder urun_id vom RPC)
        return { ...urun, id: urun.id || urun.urun_id, partnerPreis: preis || 0 };
    });

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.welcome}</h1>
                <p className="text-text-main/80 mt-1">{content.subtitle}</p>
            </header>

            {/* --- NEUE KPI Karten --- */}
            {/* Das Grid hat jetzt 3 Elemente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Offene Bestellungen (Info + Link) */}
                <DashboardKpiCard
                    title={content.openOrders}
                    value={openOrderCount}
                    icon="truck" // Icon-Name als String
                    color="orange"
                    href={`/${locale}/portal/siparisler?filter=offen`} // Link zur Bestellliste mit Filter
                    linkText={content.viewOpenOrders} // Text für den Link
                />
                {/* 2. Meine Favoriten (Info + Link) */}
                <DashboardKpiCard
                    title={content.myFavorites}
                    value={favoritesCount}
                    icon="heart" // Icon-Name als String
                    color="red"
                    href={`/${locale}/portal/katalog?favoriten=true`} // Link zum Katalog mit Filter
                    linkText={content.viewFavorites} // Link-Text aus Dictionary
                />
                {/* 3. Offene Musteranfragen (Info + Link) */}
                <DashboardKpiCard
                    title={content.openSampleRequests}
                    value={openRequestsCount}
                    icon="beaker" // Icon-Name als String (oder ein passenderes)
                    color="blue"
                    href={`/${locale}/portal/taleplerim`} // Link zur Anfragen-Seite
                    linkText={content.viewRequests} // Link-Text aus Dictionary
                />
            </div>
            {/* --- Ende KPI Karten --- */}

            {/* Hauptinhalt Grid (unverändert) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <HizliSiparisClient urunler={hizliSiparisUrunler} locale={locale} dictionary={dictionary} />
                    <RecentOrders firmaId={firmaId} locale={locale} />
                </div>
                <div className="space-y-8">
                    <QuickActionsCard locale={locale} dictionary={dictionary} />
                    <Announcements locale={locale} />
                    <MarketingMaterialsWidget locale={locale} />
                </div>
            </div>
        </div>
    );
}

