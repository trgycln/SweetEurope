// src/app/[locale]/portal/dashboard/page.tsx (TEMİZLENMİŞ VE NİHAİ HALİ)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FiBox, FiClock, FiShoppingCart } from 'react-icons/fi';
import { DashboardKpiCard } from '@/components/portal/dashboard/DashboardKpiCard';
import { RecentOrders } from '@/components/portal/dashboard/RecentOrders';
import { Announcements } from '@/components/portal/dashboard/Announcements';
// DEĞİŞİKLİK: Eski bileşenin import'unu kaldırdık
// import { FavoriteProducts } from '@/components/portal/dashboard/FavoriteProducts'; 
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { HizliSiparisClient } from '@/components/portal/dashboard/HizliSiparisClient';

export default async function PartnerDashboardPage({ params: { locale } }: { params: { locale: Locale } }) {
    const dictionary = await getDictionary(locale);
    const content = dictionary.portal.dashboard;
    const supabase = createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');
    
    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id, rol')
        .eq('id', user.id)
        .single();
        
    if (!profile || !profile.firma_id) return redirect('/login?error=unauthorized');
    
    const firmaId = profile.firma_id;

    // Promise.all içinden eski fonksiyona ait çağrıyı da (varsa) kaldırıyoruz.
    // Mevcut yapıda zaten yoktu, bu yüzden burası temiz.
    const [
        totalOrderData,
        openOrderData,
        pendingBalanceData,
        hizliSiparisData
    ] = await Promise.all([
        supabase.from('siparisler').select('*', { count: 'exact', head: true }).eq('firma_id', firmaId),
        supabase.from('siparisler').select('*', { count: 'exact', head: true }).eq('firma_id', firmaId).in('siparis_durumu', ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı']),
        supabase.rpc('get_pending_balance_for_firma', { p_firma_id: firmaId }),
        supabase.rpc('get_hizli_siparis_urunleri', { p_firma_id: firmaId }) // Bu bizim YENİ ve DOĞRU fonksiyonumuz
    ]);

    const totalOrderCount = totalOrderData.count;
    const openOrderCount = openOrderData.count;

    if (pendingBalanceData.error) {
        console.error("Bekleyen bakiye çekilirken hata:", pendingBalanceData.error);
    }
    const pendingBalance = pendingBalanceData.data ?? 0.00;
    
    const hizliSiparisUrunler = (hizliSiparisData.data || []).map(urun => {
        const fiyat = profile.rol === 'Alt Bayi' 
            ? urun.satis_fiyati_alt_bayi 
            : urun.satis_fiyati_musteri;
        return { ...urun, fiyat: fiyat || 0 };
    });

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.welcome}</h1>
                <p className="text-text-main/80 mt-1">{content.subtitle}</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <DashboardKpiCard title={content.totalOrders} value={totalOrderCount ?? 0} icon={FiShoppingCart} color="blue" />
                <DashboardKpiCard title={content.openOrders} value={openOrderCount ?? 0} icon={FiClock} color="orange" />
                <DashboardKpiCard title={content.pendingBalance} value={`€${Number(pendingBalance).toFixed(2)}`} icon={FiBox} color="red" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <HizliSiparisClient urunler={hizliSiparisUrunler} locale={locale} dictionary={dictionary} />
                    <RecentOrders firmaId={firmaId} locale={locale} />
                </div>
                
                <div className="space-y-8">
                    <Announcements locale={locale} />
                    {/* DEĞİŞİKLİK: Eski bileşeni buradan tamamen kaldırdık. */}
                    {/* <FavoriteProducts firmaId={firmaId} locale={locale} /> */}
                </div>
            </div>
        </div>
    );
}