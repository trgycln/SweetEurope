// src/app/[locale]/portal/dashboard/page.tsx (Vollständig mit Widget)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FiBox, FiClock, FiShoppingCart } from 'react-icons/fi';
import { DashboardKpiCard } from '@/components/portal/dashboard/DashboardKpiCard';
import { RecentOrders } from '@/components/portal/dashboard/RecentOrders';
import { Announcements } from '@/components/portal/dashboard/Announcements';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i1n-config';
import { HizliSiparisClient } from '@/components/portal/dashboard/HizliSiparisClient';
// NEU: Widget importieren
import { MarketingMaterialsWidget } from '@/components/portal/dashboard/MarketingMaterialsWidget';

type PageProps = {
    params: { locale: Locale };
};

export default async function PartnerDashboardPage(props: PageProps) {
    const { params } = props;
    const { locale } = params;

    const dictionary = await getDictionary(locale);
    const content = dictionary.portal.dashboard;
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

    // Daten parallel abrufen
    const [
        totalOrderData,
        openOrderData,
        pendingBalanceData,
        hizliSiparisData
    ] = await Promise.all([
        supabase.from('siparisler').select('*', { count: 'exact', head: true }).eq('firma_id', firmaId),
        supabase.from('siparisler').select('*', { count: 'exact', head: true }).eq('firma_id', firmaId).in('siparis_durumu', ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı']),
        supabase.rpc('get_pending_balance_for_firma', { p_firma_id: firmaId }),
        supabase.rpc('get_hizli_siparis_urunleri', { p_firma_id: firmaId })
    ]);

    // KPI-Werte extrahieren
    const totalOrderCount = totalOrderData.count;
    const openOrderCount = openOrderData.count;

    if (pendingBalanceData.error) {
        console.error("Bekleyen bakiye çekilirken hata:", pendingBalanceData.error);
    }
    const pendingBalance = pendingBalanceData.data ?? 0.00;

    // Hızlı Sipariş Produkte vorbereiten
    const hizliSiparisUrunler = (hizliSiparisData.data || []).map((urun: any) => {
        const fiyat = profile.rol === 'Alt Bayi'
            ? urun.satis_fiyati_alt_bayi
            : urun.satis_fiyati_musteri;
        return { ...urun, id: urun.id || urun.urun_id, fiyat: fiyat || 0 };
    });

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.welcome}</h1>
                <p className="text-text-main/80 mt-1">{content.subtitle}</p>
            </header>

            {/* KPI Karten */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <DashboardKpiCard title={content.totalOrders} value={totalOrderCount ?? 0} icon={FiShoppingCart} color="blue" />
                <DashboardKpiCard title={content.openOrders} value={openOrderCount ?? 0} icon={FiClock} color="orange" />
                <DashboardKpiCard title={content.pendingBalance} value={`€${Number(pendingBalance).toFixed(2)}`} icon={FiBox} color="red" />
            </div>

            {/* Hauptinhalt Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Linke Spalte (breiter) */}
                <div className="lg:col-span-2 space-y-8">
                    <HizliSiparisClient urunler={hizliSiparisUrunler} locale={locale} dictionary={dictionary} />
                    <RecentOrders firmaId={firmaId} locale={locale} />
                </div>

                {/* Rechte Spalte */}
                <div className="space-y-8">
                    <Announcements locale={locale} />
                    {/* --- WIDGET HIER EINGEFÜGT --- */}
                    <MarketingMaterialsWidget locale={locale} />
                    {/* --------------------------- */}
                </div>
            </div>
        </div>
    );
}