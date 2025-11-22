// src/app/[locale]/portal/dashboard/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ActiveOrdersList } from '@/components/portal/dashboard/ActiveOrdersList';
import { Announcements } from '@/components/portal/dashboard/Announcements';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { HizliSiparisClient } from '@/components/portal/dashboard/HizliSiparisClient';
import { MarketingMaterialsWidget } from '@/components/portal/dashboard/MarketingMaterialsWidget';
import { QuickActionsCard } from '@/components/portal/dashboard/QuickActionsCard';
import { MiniStatsBar } from '@/components/portal/dashboard/MiniStatsBar';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { Database, Tables, Enums } from '@/lib/supabase/database.types';

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
    const content = (dictionary as any).portal?.dashboard || {};
    const orderStatusTranslations = (dictionary as any).orderStatuses || {};
    
    // Labels for components
    const miniStatsLabels = {
        activeOrders: content.miniStats?.activeOrders || 'Active Orders',
        sampleRequests: content.miniStats?.sampleRequests || 'Sample Requests',
        favorites: content.miniStats?.favorites || 'Favorites',
    };
    
    const activeOrdersLabels = {
        title: content.activeOrdersList?.title || 'My Active Orders',
        orderId: content.activeOrdersList?.orderId || 'Order',
        viewDetails: content.activeOrdersList?.viewDetails || 'Details',
        reorder: content.activeOrdersList?.reorder || 'Reorder',
        noActiveOrders: content.activeOrdersList?.noActiveOrders || 'No active orders.',
        viewAll: content.activeOrdersList?.viewAll || 'View All',
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
        <div className="space-y-6">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">
                    {content.welcome || "Willkommen"}
                </h1>
                <p className="text-text-main/80 mt-1">
                    {content.subtitle || "Übersicht Ihrer Aktivitäten."}
                </p>
            </header>

            {/* Mini Stats Bar - Compact overview at top */}
            <MiniStatsBar
                activeOrdersCount={openOrderCount}
                sampleRequestsCount={openRequestsCount}
                favoritesCount={favoritesCount}
                locale={locale}
                labels={miniStatsLabels}
            />

            {/* Main Content Grid: Active Orders (left) + Quick Actions (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Active Orders List (Priority Focus) - Takes 2 columns */}
                <div className="lg:col-span-2">
                    <ActiveOrdersList
                        firmaId={firmaId}
                        locale={locale}
                        labels={activeOrdersLabels}
                        orderStatusTranslations={orderStatusTranslations}
                    />
                </div>

                {/* Right: Quick Actions + Announcements + Materials */}
                <div className="space-y-6">
                    <QuickActionsCard locale={locale} dictionary={dictionary} />
                    <Announcements locale={locale} />
                    <MarketingMaterialsWidget locale={locale} />
                </div>
            </div>

            {/* Bottom Section: Fast Order (Frequently Ordered Items) */}
            <div className="mt-8">
                <HizliSiparisClient 
                    urunler={hizliSiparisUrunler} 
                    locale={locale} 
                    dictionary={dictionary} 
                />
            </div>
        </div>
    );
}