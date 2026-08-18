// src/app/[locale]/portal/dashboard/page.tsx
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
import BayiCockpit from '@/components/portal/dashboard/BayiCockpit';
import MusteriCockpit from '@/components/portal/dashboard/MusteriCockpit';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { Database, Tables, Enums } from '@/lib/supabase/database.types';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ locale: Locale }>;
};

export default async function PartnerDashboardPage({ params }: PageProps) {
    noStore();
    const { locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const dictionary = await getDictionary(locale);
    const content = (dictionary as any).portal?.dashboard || {};
    const orderStatusTranslations = (dictionary as any).orderStatuses || {};
    
    const miniStatsLabels = {
        activeOrders: content.miniStats?.activeOrders || 'Active Orders',
        sampleRequests: content.miniStats?.sampleRequests || 'Sample Requests',
        favorites: content.miniStats?.favorites || 'Favorites',
        customers: content.miniStats?.customers || 'My Customers',
    };
    
    const activeOrdersLabels = {
        title: content.activeOrdersList?.title || 'My Active Orders',
        orderId: content.activeOrdersList?.orderId || 'Order',
        viewDetails: content.activeOrdersList?.viewDetails || 'Details',
        reorder: content.activeOrdersList?.reorder || 'Reorder',
        noActiveOrders: content.activeOrdersList?.noActiveOrders || 'No active orders.',
        viewAll: content.activeOrdersList?.viewAll || 'View All',
    };

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id, rol')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.firma_id) {
        if (profile?.rol === 'Personel' || profile?.rol === 'Yönetici' || profile?.rol === 'Ekip Üyesi') {
            return redirect(`/${locale}/admin/dashboard`);
        }
        return redirect(`/${locale}/login?error=unauthorized`);
    }

    const firmaId = profile.firma_id;
    const userId = user.id;

    // Alt Bayi için CEO Cockpit Lite göster
    if ((profile.rol as string) === 'Alt Bayi') {
        const { data: firmaInfo } = await supabase
            .from('firmalar').select('unvan').eq('id', firmaId).single();
        return (
            <BayiCockpit
                userId={userId}
                firmaId={firmaId}
                locale={locale}
                firmaUnvan={firmaInfo?.unvan || 'Bayi'}
            />
        );
    }

    // Müşteri için profesyonel Cockpit
    if ((profile.rol as string) === 'Müşteri') {
        const { data: firmaInfo } = await supabase
            .from('firmalar').select('unvan, created_at').eq('id', firmaId).single();
        return (
            <MusteriCockpit
                userId={userId}
                firmaId={firmaId}
                locale={locale}
                firmaUnvan={firmaInfo?.unvan || 'Müşteri'}
                firmaCreatedAt={firmaInfo?.created_at || null}
            />
        );
    }

    // Diğer roller için genel dashboard
    const [
        openOrderData,
        hizliSiparisData,
        favoritesData,
        customersData
    ] = await Promise.all([
        supabase.from('siparisler')
            .select('*', { count: 'exact', head: true })
            .eq('firma_id', firmaId)
            .in('siparis_durumu', ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing']),
        supabase.rpc('get_hizli_siparis_urunleri', { p_firma_id: firmaId }),
        supabase.from('favori_urunler')
            .select('*', { count: 'exact', head: true })
            .eq('kullanici_id', userId),
        (profile?.rol as string) === 'Alt Bayi' 
            ? supabase.from('firmalar')
                .select('*', { count: 'exact', head: true })
                .eq('sahip_id', userId)
            : Promise.resolve({ count: 0, data: null, error: null })
    ]);

    const openOrderCount = openOrderData.count ?? 0;
    const favoritesCount = favoritesData.count ?? 0;
    const customersCount = customersData.count ?? 0;

    if (openOrderData.error) console.error("Fehler beim Zählen der offenen Bestellungen:", openOrderData.error);
    if (hizliSiparisData.error) console.error("Fehler beim Laden der Schnellbestellung-Produkte:", hizliSiparisData.error);
    if (favoritesData.error) console.error("Fehler beim Zählen der Favoriten:", favoritesData.error);
    if (customersData.error) console.error("Fehler beim Zählen der Müşteriler:", customersData.error);

    type HizliSiparisUrun = { id: string, urun_id?: string, ad: any, satis_fiyati_alt_bayi: number, satis_fiyati_musteri: number };
    
    const hizliSiparisUrunler = (hizliSiparisData.data as HizliSiparisUrun[] || []).map((urun) => {
        const preis = (profile.rol as string) === 'Alt Bayi'
            ? urun.satis_fiyati_alt_bayi
            : urun.satis_fiyati_musteri;
        return { ...urun, id: (urun.id || urun.urun_id || '') as string, partnerPreis: preis || 0 };
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

            <MiniStatsBar
                activeOrdersCount={openOrderCount}
                favoritesCount={favoritesCount}
                customersCount={(profile?.rol as string) === 'Alt Bayi' ? customersCount : undefined}
                locale={locale}
                labels={miniStatsLabels}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ActiveOrdersList
                        firmaId={firmaId}
                        locale={locale}
                        labels={activeOrdersLabels}
                        orderStatusTranslations={orderStatusTranslations}
                    />
                </div>

                <div className="space-y-6">
                    <QuickActionsCard locale={locale} dictionary={dictionary} />
                    <Announcements locale={locale} />
                    <MarketingMaterialsWidget locale={locale} />
                </div>
            </div>

            <div className="mt-8">
                <HizliSiparisClient 
                    urunler={hizliSiparisUrunler as any} 
                    locale={locale} 
                    dictionary={dictionary} 
                />
            </div>
        </div>
    );
}