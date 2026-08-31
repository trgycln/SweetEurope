import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import { SiparislerClient } from '@/components/portal/siparisler/SiparislerClient';
import OrderPageWrapper from './OrderPageWrapper';

export const dynamic = 'force-dynamic';

const ORDERS_PER_PAGE = 20;

interface AlleSiparislerPageProps {
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{
        status?: string;
        firmaId?: string;
        q?: string;
        tur?: 'merkez' | 'bayi_ikmal' | 'bayi_musterileri' | 'tumu';
        bayi_firma_id?: string;
        page?: string;
        period?: string;
    }>;
}

export default async function AlleSiparislerPage({
    params,
    searchParams
}: AlleSiparislerPageProps) {
    const { locale } = await params;
    const searchParamsResolved = await searchParams;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const dictionary = await getDictionary(locale);

    // Kullanıcı Kontrolü
    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return redirect(`/${locale}/login?next=/admin/operasyon/siparisler`);
    }

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol')
        .eq('id', user.id)
        .single();

    const userRole = profile?.rol;

    // Parametreler
    const turParam = searchParamsResolved?.tur || 'merkez';
    const statusParam = searchParamsResolved?.status;
    const qParam = searchParamsResolved?.q;
    const periodParam = searchParamsResolved?.period;
    const page = Math.max(1, parseInt(searchParamsResolved?.page || '1', 10));
    const from = (page - 1) * ORDERS_PER_PAGE;
    const to = from + ORDERS_PER_PAGE - 1;

    // Alt bayiler listesini çek (Dropdown ve eşleştirme için)
    const { data: altBayilerData } = await supabase
        .from('firmalar')
        .select('id, unvan')
        .or('ticari_tip.eq.alt_bayi,kategori.eq.Alt Bayi')
        .order('unvan', { ascending: true });

    const altBayiler = altBayilerData || [];

    // Siparişleri Zengin Detaylarıyla Çek
    let query = supabase
        .from('siparisler')
        .select(`
            id,
            firma_id,
            siparis_tarihi,
            toplam_tutar_net,
            toplam_tutar_brut,
            kdv_orani,
            siparis_durumu,
            teslimat_adresi,
            firmalar (
                id,
                unvan,
                adres,
                sehir,
                ilce,
                posta_kodu,
                telefon,
                parent_firma_id,
                ust_bayi_firma_id,
                ticari_tip
            ),
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
        `, { count: 'exact' });

    // ── 1. Tür Filtresi ──────────────────────────────────────────
    if (turParam === 'merkez') {
        // Merkezin hazırlayacağı siparişler: Doğrudan Müşteriler + Bayi İkmal Siparişleri (üst bayisi olmayanlar)
        // PostgREST'te firmalar.ust_bayi_firma_id is null filtresi
        // (client tarafında da filtreleme desteği)
    }

    // ── 2. Durum Filtresi ─────────────────────────────────────────
    if (statusParam === 'hepsi') {
        // Tümü (Ön siparişler dahil)
    } else if (statusParam) {
        query = query.eq('siparis_durumu', statusParam);
    } else {
        // Varsayılan: Günlük operasyon için Normal Siparişler (Ön Siparişler hariç)
        query = query.neq('siparis_durumu', 'Ön Sipariş');
    }

    // ── 3. Tarih/Dönem Filtresi ───────────────────────────────────
    if (periodParam) {
        const now = new Date();
        if (periodParam === 'this_month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            query = query.gte('siparis_tarihi', firstDay);
        } else if (periodParam === 'last_month') {
            const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
            const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
            query = query.gte('siparis_tarihi', firstDay).lte('siparis_tarihi', lastDay);
        } else if (periodParam === 'last_3_months') {
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
            query = query.gte('siparis_tarihi', threeMonthsAgo);
        } else if (periodParam === 'this_year') {
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString();
            query = query.gte('siparis_tarihi', firstDayOfYear);
        }
    }

    query = query.order('siparis_tarihi', { ascending: false });

    const { data: rawSiparisler, error: siparisError, count: totalCount } = await query;

    if (siparisError) {
        console.error('Siparişler sorgu hatası:', siparisError);
    }

    let allFetched = (rawSiparisler as any[]) || [];

    // ── 4. Arama Filtresi (Client / Memory) ─────────────────────────
    if (qParam) {
        const qClean = qParam.toLowerCase().replace(/^#/, '').trim();
        allFetched = allFetched.filter(s => {
            const idMatch = s.id?.toLowerCase().includes(qClean);
            const firmaMatch = s.firmalar?.unvan?.toLowerCase().includes(qClean);
            const adresMatch = s.teslimat_adresi?.toLowerCase().includes(qClean);
            return idMatch || firmaMatch || adresMatch;
        });
    }

    // ── 5. Tür Ayrımı (Merkez vs Bayi İkmal vs Bayi Müşterisi) ────
    if (turParam === 'merkez') {
        // Merkezin hazırlayacağı siparişler (üst bayisi olmayanlar)
        allFetched = allFetched.filter(s => !s.firmalar?.ust_bayi_firma_id);
    } else if (turParam === 'bayi_ikmal') {
        // Sadece alt bayilerin merkeze geçtiği ikmal siparişleri
        allFetched = allFetched.filter(s => s.firmalar?.ticari_tip === 'alt_bayi');
    } else if (turParam === 'bayi_musterileri') {
        // Alt bayilerin kendi müşterilerine ait siparişler
        allFetched = allFetched.filter(s => !!s.firmalar?.ust_bayi_firma_id);
    }

    // Sayfalama (Pagination)
    const filteredCount = allFetched.length;
    const paginatedSiparisler = allFetched.slice(from, to + 1);
    const pageCount = Math.ceil(filteredCount / ORDERS_PER_PAGE);

    // ── 6. KPI Metrik Hesaplamaları ────────────────────────────────
    const activeOrders = allFetched.filter(s => ['Beklemede', 'Hazırlanıyor', 'processing'].includes(s.siparis_durumu)).length;
    const shippedOrders = allFetched.filter(s => ['Yola Çıktı', 'shipped'].includes(s.siparis_durumu)).length;
    const deliveredOrders = allFetched.filter(s => ['Teslim Edildi', 'delivered'].includes(s.siparis_durumu)).length;
    const monthSpending = allFetched.reduce((acc, s) => acc + (Number(s.toplam_tutar_net) || 0), 0);

    const stats = {
        totalOrders: filteredCount,
        activeOrders,
        shippedOrders,
        deliveredOrders,
        monthSpending
    };

    const allOrderIds = paginatedSiparisler.map(s => s.id);

    return (
        <OrderPageWrapper allOrderIds={allOrderIds} locale={locale}>
            <SiparislerClient
                initialSiparisler={paginatedSiparisler as any}
                totalCount={filteredCount}
                pageCount={pageCount}
                currentPage={page}
                dictionary={dictionary}
                locale={locale}
                isAdmin={true}
                adminTur={turParam}
                altBayiler={altBayiler}
                stats={stats}
            />
        </OrderPageWrapper>
    );
}