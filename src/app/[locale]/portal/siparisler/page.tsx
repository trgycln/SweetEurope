import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { SiparislerClient } from '@/components/portal/siparisler/SiparislerClient';
import { Enums } from '@/lib/supabase/database.types';
import { unstable_noStore as noStore } from 'next/cache';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

const ORDERS_PER_PAGE = 12;

type PageProps = {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const dynamic = 'force-dynamic';

export default async function PartnerSiparisListPage({ params, searchParams }: PageProps) {
    noStore();
    const { locale } = await params;
    const resolvedSearchParams = await searchParams;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const dictionary = await getDictionary(locale);

    const { data: { user }, error: userError } = await getGlobalCachedUser();
    if (userError || !user) return redirect(`/${locale}/login`);

    const { data: profile, error: profileError } = await supabase
        .from('profiller')
        .select('firma_id, rol')
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.firma_id) return notFound();

    const firmaId = profile.firma_id;
    const isAltBayi = profile.rol === 'Alt Bayi';

    const page = typeof resolvedSearchParams.page === 'string' ? Number(resolvedSearchParams.page) : 1;
    const status = typeof resolvedSearchParams.status === 'string'
        ? resolvedSearchParams.status as Enums<'siparis_durumu'>
        : undefined;
    const searchQuery = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined;
    const tab = typeof resolvedSearchParams.tab === 'string' ? resolvedSearchParams.tab : 'kendi';

    const from = (page - 1) * ORDERS_PER_PAGE;
    const to = from + ORDERS_PER_PAGE - 1;

    let siparisler: any[] = [];
    let count = 0;
    let musteriSiparisler: any[] = [];
    let musteriCount = 0;

    // ── Kendi siparişleri ──────────────────────────────────────
    let kendiQuery = supabase
        .from('siparisler')
        .select(`
            id,
            siparis_tarihi,
            toplam_tutar_net,
            toplam_tutar_brut,
            kdv_orani,
            siparis_durumu,
            teslimat_adresi,
            notlar,
            siparis_detay (
                id,
                urun_id,
                miktar,
                birim_fiyat,
                toplam_fiyat,
                urunler (
                    id,
                    ad,
                    stok_kodu,
                    ana_resim_url,
                    satis_fiyati_musteri,
                    stok_miktari,
                    koli_ici_adet
                )
            )
        `, { count: 'exact' })
        .eq('firma_id', firmaId);

    if (status) kendiQuery = kendiQuery.eq('siparis_durumu', status);
    if (searchQuery) kendiQuery = (kendiQuery as any).like('id::text', `${searchQuery}%`);
    kendiQuery = kendiQuery.order('siparis_tarihi', { ascending: false }).range(from, to);

    const kendiRes = await kendiQuery;
    siparisler = kendiRes.data || [];
    count = kendiRes.count || 0;

    // ── İstatistikler (Hızlı Özet Verisi) ─────────────────────
    const { data: allKendiOrders } = await supabase
        .from('siparisler')
        .select('id, siparis_durumu, toplam_tutar_net, siparis_tarihi')
        .eq('firma_id', firmaId);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const ordersForStats = allKendiOrders || [];
    const activeOrdersCount = ordersForStats.filter(s => 
        ['Beklemede', 'Hazırlanıyor', 'processing', 'Yola Çıktı', 'shipped'].includes(s.siparis_durumu)
    ).length;
    const shippedOrdersCount = ordersForStats.filter(s => 
        ['Yola Çıktı', 'shipped'].includes(s.siparis_durumu)
    ).length;
    const deliveredOrdersCount = ordersForStats.filter(s => 
        ['Teslim Edildi', 'delivered'].includes(s.siparis_durumu)
    ).length;
    const monthSpending = ordersForStats
        .filter(s => {
            if (!s.siparis_tarihi) return false;
            const d = new Date(s.siparis_tarihi);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear && !['İptal Edildi', 'cancelled'].includes(s.siparis_durumu);
        })
        .reduce((sum, s) => sum + Number(s.toplam_tutar_net || 0), 0);

    const stats = {
        totalOrders: ordersForStats.length,
        activeOrders: activeOrdersCount,
        shippedOrders: shippedOrdersCount,
        deliveredOrders: deliveredOrdersCount,
        monthSpending,
    };

    // ── Alt bayi müşteri siparişleri ───────────────────────────
    if (isAltBayi) {
        const { data: musteriler } = await supabase
            .from('firmalar')
            .select('id')
            .eq('ust_bayi_firma_id', firmaId);

        const musteriIds = (musteriler ?? []).map((m: any) => m.id);

        if (musteriIds.length > 0) {
            let musteriQuery = supabase
                .from('siparisler')
                .select(`
                    id,
                    siparis_tarihi,
                    toplam_tutar_net,
                    toplam_tutar_brut,
                    kdv_orani,
                    siparis_durumu,
                    teslimat_adresi,
                    notlar,
                    firmalar ( unvan ),
                    siparis_detay (
                        id,
                        urun_id,
                        miktar,
                        birim_fiyat,
                        toplam_fiyat,
                        urunler (
                            id,
                            ad,
                            stok_kodu,
                            ana_resim_url,
                            satis_fiyati_musteri,
                            stok_miktari,
                            koli_ici_adet
                        )
                    )
                `, { count: 'exact' })
                .in('firma_id', musteriIds);

            if (status) musteriQuery = musteriQuery.eq('siparis_durumu', status);
            if (searchQuery) musteriQuery = (musteriQuery as any).like('id::text', `${searchQuery}%`);
            musteriQuery = musteriQuery.order('siparis_tarihi', { ascending: false }).range(from, to);

            const musteriRes = await musteriQuery;
            musteriSiparisler = musteriRes.data || [];
            musteriCount = musteriRes.count || 0;
        }
    }

    const pageCount = Math.ceil((tab === 'musteri' ? musteriCount : count) / ORDERS_PER_PAGE);

    return (
        <SiparislerClient
            initialSiparisler={tab === 'musteri' ? musteriSiparisler : siparisler}
            totalCount={tab === 'musteri' ? musteriCount : count}
            pageCount={pageCount}
            currentPage={page}
            dictionary={dictionary}
            locale={locale}
            isAltBayi={isAltBayi}
            activeTab={tab}
            kendiCount={count}
            musteriCount={musteriCount}
            stats={stats}
        />
    );
}
