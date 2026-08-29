import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import YeniSiparisFormu, { ProductItem, CategoryItem, PastOrder } from "./YeniSiparisFormu";
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { Tables } from "@/lib/supabase/database.types";
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

interface YeniSiparisPageProps {
    params: Promise<{
        locale: Locale;
        firmaId?: string;
    }>;
    searchParams?: Promise<{
        firmaId?: string;
    }>;
}

export default async function YeniSiparisPage({ params, searchParams }: YeniSiparisPageProps) {
    const { locale, firmaId: paramFirmaId } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const firmaId = paramFirmaId || resolvedSearchParams?.firmaId;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        const redirectUrl = `/admin/operasyon/siparisler/yeni${firmaId ? `?firmaId=${firmaId}` : ''}`;
        return redirect(`/${locale}/login?next=${encodeURIComponent(redirectUrl)}`);
    }

    let firma: { id: string; unvan: string; adres: string | null; email?: string | null; telefon?: string | null; sehir?: string | null } | null = null;
    let firmenListe: Pick<Tables<'firmalar'>, 'id' | 'unvan'>[] | null = null;

    if (firmaId) {
        const { data: fData, error: fError } = await supabase
            .from('firmalar')
            .select('id, unvan, adres, email, telefon, sehir')
            .eq('id', firmaId)
            .maybeSingle();

        if (fError || !fData) {
            notFound();
        }
        firma = fData;
    } else {
        const { data: fList } = await supabase
            .from('firmalar')
            .select('id, unvan')
            .not('status', 'eq', 'Pasif')
            .order('unvan');
        firmenListe = fList || [];
    }

    // Ürünleri ve kategorileri paralel çek
    const [urunlerRes, kategorilerRes] = await Promise.all([
        supabase
            .from('urunler')
            .select('id, ad, satis_fiyati_musteri, satis_fiyati_alt_bayi, satis_fiyati_toptanci, stok_miktari, stok_kodu, ean_gtin, ana_resim_url, kategori_id, koli_ici_adet')
            .eq('aktif', true)
            .order('ad->>tr', { ascending: true }),
        supabase
            .from('kategoriler')
            .select('id, ad, ust_kategori_id')
            .order('ad->>tr', { ascending: true })
    ]);

    if (urunlerRes.error) {
        console.error("Fehler beim Laden der Produkte:", urunlerRes.error);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Fehler beim Laden der Produkte.</div>;
    }

    const urunler: ProductItem[] = urunlerRes.data || [];
    const kategoriler: CategoryItem[] = (kategorilerRes.data || []) as CategoryItem[];

    // Müşteriye özel verileri çek (Favoriler, Son Siparişler ve Sık Sipariş Edilenler)
    let favoriUrunIdSet: string[] = [];
    let pastOrders: PastOrder[] = [];
    let sikSiparisUrunIdleri: string[] = [];
    let sonSiparisUrunIdleri: string[] = [];

    if (firmaId) {
        // 1. Müşterinin profillerine ait favorileri çek
        const { data: profiles } = await supabase
            .from('profiller')
            .select('id')
            .eq('firma_id', firmaId);

        const profileIds = profiles?.map(p => p.id) || [];
        if (profileIds.length > 0) {
            const { data: favs } = await supabase
                .from('favori_urunler')
                .select('urun_id')
                .in('kullanici_id', profileIds);
            favoriUrunIdSet = Array.from(new Set((favs || []).map(f => f.urun_id)));
        }

        // 2. Firmanın geçmiş siparişlerini ve detaylarını çek
        const { data: pastOrdersData } = await supabase
            .from('siparisler')
            .select(`
                id,
                siparis_tarihi,
                toplam_tutar_brut,
                siparis_durumu,
                siparis_detay (
                    id,
                    urun_id,
                    miktar,
                    birim_fiyat,
                    toplam_fiyat
                )
            `)
            .eq('firma_id', firmaId)
            .order('siparis_tarihi', { ascending: false })
            .limit(20);

        if (pastOrdersData && pastOrdersData.length > 0) {
            pastOrders = pastOrdersData as unknown as PastOrder[];

            // Son sipariş edilen ürünler (kronolojik sırayla tekil)
            const recentIds: string[] = [];
            const productFrequency: Record<string, number> = {};

            pastOrdersData.forEach(order => {
                const details = (order.siparis_detay || []) as any[];
                details.forEach(item => {
                    if (item.urun_id) {
                        if (!recentIds.includes(item.urun_id)) {
                            recentIds.push(item.urun_id);
                        }
                        productFrequency[item.urun_id] = (productFrequency[item.urun_id] || 0) + (item.miktar || 1);
                    }
                });
            });

            sonSiparisUrunIdleri = recentIds.slice(0, 20);

            // Sık sipariş edilenler (en çok sipariş edilen ürünler)
            sikSiparisUrunIdleri = Object.entries(productFrequency)
                .sort((a, b) => b[1] - a[1])
                .map(([id]) => id)
                .slice(0, 20);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <Link
                        href={firmaId ? `/${locale}/admin/crm/firmalar/${firmaId}/siparisler` : `/${locale}/admin/operasyon/siparisler`}
                        className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-accent transition-colors font-medium"
                    >
                        <FiArrowLeft />
                        {firmaId ? 'Zurück zur Bestellliste der Firma' : 'Zurück zur Bestellübersicht'}
                    </Link>
                    <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
                            Neue Bestellung erstellen
                        </h1>
                        {firma && (
                            <span className="text-xs text-gray-600">
                                (<span className="font-bold text-accent">{firma.unvan}</span>)
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <YeniSiparisFormu
                firmaId={firmaId || ''}
                firma={firma}
                firmenListe={firmenListe}
                varsayilanTeslimatAdresi={firma?.adres || ''}
                urunler={urunler}
                kategoriler={kategoriler}
                favoriUrunIdSet={favoriUrunIdSet}
                sikSiparisUrunIdleri={sikSiparisUrunIdleri}
                sonSiparisUrunIdleri={sonSiparisUrunIdleri}
                pastOrders={pastOrders}
                locale={locale}
            />
        </div>
    );
}