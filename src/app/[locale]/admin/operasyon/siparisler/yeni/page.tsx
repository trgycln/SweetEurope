// src/app/[locale]/admin/operasyon/siparisler/yeni/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SiparisOlusturmaClient as YeniSiparisFormu, ProductOption } from "@/components/siparis-olusturma-client";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft, FiSlash } from "react-icons/fi";
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { Tables, Enums } from "@/lib/supabase/database.types";
import { unstable_noStore as noStore } from 'next/cache';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

// Tipler
type FirmaWithFinanz = Tables<'firmalar'> & { firmalar_finansal: Tables<'firmalar_finansal'> | null };
type FirmaOption = Pick<Tables<'firmalar'>, 'id' | 'unvan'>;
type UserProfile = Pick<Tables<'profiller'>, 'id' | 'rol'> | null;
type UserRole = Enums<'user_role'> | null;

// Sayfa Props Tipi
interface YeniSiparisPageProps {
    params: Promise<{
        locale: Locale;
    }>;
    searchParams: Promise<{
        firmaId?: string;
    }>;
}

export default async function YeniSiparisPage({ params, searchParams }: YeniSiparisPageProps) {
    noStore();

    const resolvedParams = await params;
    const locale = resolvedParams.locale;
    const resolvedSearchParams = await searchParams;
    const firmaId = resolvedSearchParams?.firmaId;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Kullanıcı Doğrulama
    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        const redirectUrl = `/admin/operasyon/siparisler/yeni${firmaId ? `?firmaId=${firmaId}` : ''}`;
        return redirect(`/${locale}/login?next=${encodeURIComponent(redirectUrl)}`);
    }

    // Paralel Veri Çekme İşlemleri
    const firmaPromise = firmaId
        ? supabase.from('firmalar').select('*, firmalar_finansal(*)').eq('id', firmaId).single()
        : supabase.from('firmalar').select('id, unvan').not('status', 'eq', 'Pasif').order('unvan');

    const urunlerPromise = supabase.from('urunler')
        .select(`
            id, ad, stok_kodu, ana_resim_url,
            satis_fiyati_musteri, satis_fiyati_toptanci,
            satis_fiyati_alt_bayi, satis_fiyati_palet, stok_miktari,
            koli_ici_adet, palet_ici_adet
        `)
        .eq('aktif', true)
        .order(`ad->>${locale}`, { ascending: true, nullsFirst: false });

    const profilPromise = supabase.from('profiller').select('id, rol').eq('id', user.id).single();

    const [firmaRes, urunlerRes, profilRes] = await Promise.all([firmaPromise, urunlerPromise, profilPromise]);

    const firmaResult = firmaRes as { data: FirmaWithFinanz | FirmaOption[] | null, error: any };
    const urunlerResult = urunlerRes as { data: ProductOption[] | null, error: any };
    const profilResult = profilRes as { data: UserProfile, error: any };

    const firmaError = firmaResult.error;
    const urunlerError = urunlerResult.error;
    const profilError = profilResult.error;

    let hasError = false;
    if (firmaError) { console.error("❌ Firma yüklenirken hata:", firmaError); hasError = true; }
    if (urunlerError) { console.error("❌ Ürünler yüklenirken hata:", urunlerError); hasError = true; }
    if (profilError) { console.error("❌ Profil yüklenirken hata:", profilError); hasError = true; }

    if (hasError) {
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Gerekli veriler yüklenirken hata oluştu. Lütfen sunucu loglarını kontrol edin.</div>;
    }

    if (firmaId && !firmaResult.data) {
        console.error(`Firma ID ${firmaId} ile bulunamadı.`);
        notFound();
    }
    if (!profilResult.data) {
         console.error(`Profil kullanıcı ${user.id} için bulunamadı.`);
         return redirect(`/${locale}/login?error=profile_not_found`);
    }

    let firma: FirmaWithFinanz | null = null;
    let firmenListe: FirmaOption[] | null = null;
    if (firmaId && firmaResult.data) {
        firma = firmaResult.data as FirmaWithFinanz;
    } else if (!firmaId && firmaResult.data) {
        firmenListe = firmaResult.data as FirmaOption[];
    }
    const urunler = urunlerResult.data || [];
    const userRole = profilResult.data.rol as UserRole;

    const firmaSorumlusuId = firma?.sorumlu_personel_id;
    if (firmaId && userRole !== 'Yönetici' && user.id !== firmaSorumlusuId) {
        return (
            <div className="p-8 text-center">
                <FiSlash className="mx-auto text-5xl text-red-500 mb-4" />
                <h1 className="font-serif text-2xl text-red-600">Yetkisiz Erişim</h1>
                <p className="text-gray-600 mt-2">Sadece size atanmış müşteriler için sipariş oluşturabilirsiniz.</p>
            </div>
        );
    }
    if (!firmaId && userRole !== 'Yönetici') {
        return (
            <div className="p-8 text-center">
                <FiSlash className="mx-auto text-5xl text-red-500 mb-4" />
                <h1 className="font-serif text-2xl text-red-600">Yetkisiz Erişim</h1>
                <p className="text-gray-600 mt-2">Lütfen önce CRM listesinden bir müşteri seçin.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <Link
                    href={firmaId ? `/${locale}/admin/crm/firmalar/${firmaId}/siparisler` : `/${locale}/admin/operasyon/siparisler`}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors"
                >
                    <FiArrowLeft />
                    {firmaId ? 'Firmanın Sipariş Listesine Geri Dön' : 'Sipariş Yönetimine Geri Dön'}
                </Link>
                <h1 className="font-serif text-4xl font-bold text-primary mt-2">Yeni Sipariş Oluştur</h1>
                {firma && (
                    <p className="text-gray-600 mt-1"><span className="font-bold text-accent">{firma.unvan}</span> için yeni bir sipariş oluşturuluyor.</p>
                )}
                 {!firmaId && (
                     <p className="text-gray-600 mt-1">Bir firma seçin ve ürünleri ekleyin.</p>
                 )}
            </div>

            <YeniSiparisFormu
                firma={firma}
                firmenListe={firmenListe}
                varsayilanTeslimatAdresi={firma?.adres || ''}
                urunler={urunler}
                userRole={userRole}
                locale={locale}
            />
        </div>
    );
}