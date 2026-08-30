import React from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Locale } from "@/i18n-config";
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import YeniSiparisFormu, { ProductItem, CategoryItem, PastOrder } from "@/app/[locale]/admin/crm/firmalar/[firmaId]/siparisler/yeni/YeniSiparisFormu";
import { Tables } from "@/lib/supabase/database.types";

export const dynamic = 'force-dynamic';

type PageProps = {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function PortalYeniSiparisPage({ params, searchParams }: PageProps) {
    const { locale } = await params;
    const resolvedSearchParams = await searchParams;
    const firmaIdParam = (resolvedSearchParams?.firma_id || resolvedSearchParams?.firmaId) as string | undefined;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return redirect(`/${locale}/login?next=/portal/siparisler/yeni`);
    }

    // Giriş yapan kullanıcının profilini al
    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    const bayiFirmaId = profile?.firma_id;

    // Alt bayinin bağlı müşterilerini çek (Tenant Isolation)
    const { data: firmenListeData } = await supabase
        .from('firmalar')
        .select('id, unvan')
        .or(`ust_bayi_firma_id.eq.${bayiFirmaId || '00000000-0000-0000-0000-000000000000'},sahip_id.eq.${user.id}`)
        .neq('id', bayiFirmaId || '')
        .order('unvan');

    const firmenListe = firmenListeData || [];

    let seciliFirma: { id: string; unvan: string; adres: string | null; email?: string | null; telefon?: string | null; sehir?: string | null } | null = null;
    let aktifFirmaId = firmaIdParam;

    if (firmaIdParam) {
        const { data: fData } = await (supabase as any)
            .from('firmalar')
            .select('id, unvan, adres, email, telefon, sehir, ust_bayi_firma_id, sahip_id')
            .eq('id', firmaIdParam)
            .maybeSingle();

        // Güvenlik doğrulaması: Firma alt bayiye mi ait?
        if (fData && (fData.ust_bayi_firma_id === bayiFirmaId || fData.sahip_id === user.id || fData.id === bayiFirmaId)) {
            seciliFirma = fData;
            aktifFirmaId = fData.id;
        }
    }

    // Eğer parametre yoksa ve bayi müşterileri varsa ilk müşteriyi varsayılan al
    if (!seciliFirma && firmenListe.length > 0) {
        const firstFirma = firmenListe[0];
        const { data: fData } = await (supabase as any)
            .from('firmalar')
            .select('id, unvan, adres, email, telefon, sehir')
            .eq('id', firstFirma.id)
            .maybeSingle();
        seciliFirma = fData;
        aktifFirmaId = firstFirma.id;
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

    const urunler: ProductItem[] = urunlerRes.data || [];
    const kategoriler: CategoryItem[] = (kategorilerRes.data || []) as CategoryItem[];

    // Müşteriye özel verileri çek
    let favoriUrunIdSet: string[] = [];
    let pastOrders: PastOrder[] = [];
    let sikSiparisUrunIdleri: string[] = [];
    let sonSiparisUrunIdleri: string[] = [];

    if (aktifFirmaId) {
        const { data: profiles } = await supabase
            .from('profiller')
            .select('id')
            .eq('firma_id', aktifFirmaId);

        const profileIds = profiles?.map(p => p.id) || [];
        if (profileIds.length > 0) {
            const { data: favs } = await supabase
                .from('favori_urunler')
                .select('urun_id')
                .in('kullanici_id', profileIds);
            favoriUrunIdSet = Array.from(new Set((favs || []).map(f => f.urun_id)));
        }

        const { data: orders } = await supabase
            .from('siparisler')
            .select(`
                id,
                siparis_no,
                siparis_tarihi,
                toplam_tutar_brut,
                siparis_durumu,
                siparis_detay:siparis_ogeleri(
                    id,
                    urun_id,
                    adet,
                    birim_fiyat,
                    toplam_tutar
                )
            `)
            .eq('firma_id', aktifFirmaId)
            .order('siparis_tarihi', { ascending: false })
            .limit(5);

        pastOrders = (orders || []).map((o: any) => ({
            id: o.id,
            siparis_no: o.siparis_no,
            siparis_tarihi: o.siparis_tarihi,
            toplam_tutar_brut: o.toplam_tutar_brut,
            siparis_durumu: o.siparis_durumu,
            siparis_detay: o.siparis_detay || []
        }));

        if (pastOrders.length > 0) {
            const allOrderDetails = pastOrders.flatMap(o => o.siparis_detay || []);
            const itemCounts = new Map<string, number>();
            allOrderDetails.forEach(d => {
                if (d?.urun_id) {
                    itemCounts.set(d.urun_id, (itemCounts.get(d.urun_id) || 0) + 1);
                }
            });
            sikSiparisUrunIdleri = Array.from(itemCounts.entries())
                .filter(([_, count]) => count >= 2)
                .map(([id]) => id);

            const lastOrder = pastOrders[0];
            sonSiparisUrunIdleri = (lastOrder.siparis_detay || [])
                .map(d => d.urun_id)
                .filter(Boolean);
        }
    }

    return (
        <div className="space-y-4">
            <YeniSiparisFormu
                firmaId={aktifFirmaId || ''}
                firma={seciliFirma}
                varsayilanTeslimatAdresi={seciliFirma?.adres || ''}
                urunler={urunler}
                kategoriler={kategoriler}
                favoriUrunIdSet={favoriUrunIdSet}
                sikSiparisUrunIdleri={sikSiparisUrunIdleri}
                sonSiparisUrunIdleri={sonSiparisUrunIdleri}
                pastOrders={pastOrders}
                firmenListe={firmenListe}
                locale={locale}
                isPortal={true}
                redirectPath={`/${locale}/portal/siparisler`}
                kaynak="Müşteri Portalı"
            />
        </div>
    );
}