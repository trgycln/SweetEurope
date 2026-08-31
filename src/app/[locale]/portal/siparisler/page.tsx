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
    const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined;
    const searchQuery = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q.trim() : undefined;
    const period = typeof resolvedSearchParams.period === 'string' ? resolvedSearchParams.period : undefined;
    const tab = typeof resolvedSearchParams.tab === 'string' ? resolvedSearchParams.tab : 'kendi';

    // ── 1. Tarih / Dönem Filtresi ──────────────────────────────
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    const now = new Date();

    if (period === 'this_month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFrom = start.toISOString().split('T')[0];
    } else if (period === 'last_month') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        dateFrom = start.toISOString().split('T')[0];
        dateTo = end.toISOString().split('T')[0];
    } else if (period === 'last_3_months') {
        const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        dateFrom = start.toISOString().split('T')[0];
    } else if (period === 'this_year') {
        const start = new Date(now.getFullYear(), 0, 1);
        dateFrom = start.toISOString().split('T')[0];
    }

    // ── 2. Akıllı Arama (Ürün Adı, Stok Kodu, Sipariş No, Tarih, Adres) ──
    let matchingOrderIds: string[] | null = null;
    if (searchQuery) {
        const cleanQuery = searchQuery.replace(/^#/, '').toLowerCase();

        // A) Ürün adı veya stok kodundan siparişleri bul
        const { data: matchedUrunler } = await supabase
            .from('urunler')
            .select('id')
            .or(`ad->>tr.ilike.%${cleanQuery}%,ad->>de.ilike.%${cleanQuery}%,ad->>en.ilike.%${cleanQuery}%,stok_kodu.ilike.%${cleanQuery}%`);
        
        let productOrderIds: string[] = [];
        if (matchedUrunler && matchedUrunler.length > 0) {
            const urunIds = matchedUrunler.map(u => u.id);
            const { data: matchedDetails } = await supabase
                .from('siparis_detay')
                .select('siparis_id')
                .in('urun_id', urunIds);
            
            if (matchedDetails) {
                productOrderIds = matchedDetails.map(d => d.siparis_id).filter(Boolean);
            }
        }

        // B) Sipariş ID, Tarih ve Teslimat Adresinden eşleşenleri bul
        const { data: firmaOrders } = await supabase
            .from('siparisler')
            .select('id, siparis_tarihi, teslimat_adresi');

        const directOrderIds = (firmaOrders || []).filter(o => {
            const idMatch = o.id.toLowerCase().includes(cleanQuery);
            const dateMatch = o.siparis_tarihi && o.siparis_tarihi.includes(cleanQuery);
            const addrMatch = o.teslimat_adresi && o.teslimat_adresi.toLowerCase().includes(cleanQuery);
            return idMatch || dateMatch || addrMatch;
        }).map(o => o.id);

        matchingOrderIds = Array.from(new Set([...productOrderIds, ...directOrderIds]));
    }

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

    if (status === 'hepsi') {
        // Tümü
    } else if (status) {
        kendiQuery = kendiQuery.eq('siparis_durumu', status);
    } else {
        kendiQuery = kendiQuery.neq('siparis_durumu', 'Ön Sipariş');
    }
    if (dateFrom) kendiQuery = kendiQuery.gte('siparis_tarihi', dateFrom);
    if (dateTo) kendiQuery = kendiQuery.lte('siparis_tarihi', dateTo);

    if (matchingOrderIds !== null) {
        if (matchingOrderIds.length === 0) {
            kendiQuery = kendiQuery.in('id', ['00000000-0000-0000-0000-000000000000']);
        } else {
            kendiQuery = kendiQuery.in('id', matchingOrderIds);
        }
    }

    kendiQuery = kendiQuery.order('siparis_tarihi', { ascending: false }).range(from, to);

    const kendiRes = await kendiQuery;
    siparisler = kendiRes.data || [];
    count = kendiRes.count || 0;

    // ── İstatistikler (Hızlı Özet Verisi) ─────────────────────
    const { data: allKendiOrders } = await supabase
        .from('siparisler')
        .select('id, siparis_durumu, toplam_tutar_net, siparis_tarihi')
        .eq('firma_id', firmaId);

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

            if (status === 'hepsi') {
                // Tümü
            } else if (status) {
                musteriQuery = musteriQuery.eq('siparis_durumu', status);
            } else {
                musteriQuery = musteriQuery.neq('siparis_durumu', 'Ön Sipariş');
            }
            if (dateFrom) musteriQuery = musteriQuery.gte('siparis_tarihi', dateFrom);
            if (dateTo) musteriQuery = musteriQuery.lte('siparis_tarihi', dateTo);

            if (matchingOrderIds !== null) {
                if (matchingOrderIds.length === 0) {
                    musteriQuery = musteriQuery.in('id', ['00000000-0000-0000-0000-000000000000']);
                } else {
                    musteriQuery = musteriQuery.in('id', matchingOrderIds);
                }
            }

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
