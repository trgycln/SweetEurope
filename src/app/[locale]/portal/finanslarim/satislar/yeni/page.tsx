import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { MusteriSiparisClient } from '@/app/[locale]/portal/musteri-siparis/MusteriSiparisClient';
import { unstable_noStore as noStore } from 'next/cache';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

export default async function YeniSatisPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ firmaId?: string; musteriId?: string }>;
}) {
    noStore();
    const { locale } = await params;
    const { firmaId: preSelectedFirmaId, musteriId } = await searchParams;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (!profile?.firma_id || profile.rol !== 'Alt Bayi') {
        return redirect(`/${locale}/portal/dashboard`);
    }

    const bayiFirmaId = profile.firma_id;

    // Alt bayinin müşterilerini getir
    const { data: musteriler } = await supabase
        .from('firmalar')
        .select('id, unvan, adres, email, telefon, sehir')
        .eq('ust_bayi_firma_id', bayiFirmaId)
        .order('unvan');

    // Tüm aktif ürünleri getir (stok kontrolü yok)
    const { data: urunler } = await supabase
        .from('urunler')
        .select(`
            id, ad, stok_kodu, ana_resim_url,
            satis_fiyati_musteri, satis_fiyati_toptanci,
            satis_fiyati_alt_bayi, stok_miktari,
            koli_ici_adet, palet_ici_adet
        `)
        .eq('aktif', true)
        .order(`ad->>${locale}`);

    // preSelectedFirmaId veya musteriId ile müşteri seç
    const seciliMusteriId = musteriId || preSelectedFirmaId;
    const seciliMusteri = seciliMusteriId
        ? (musteriler ?? []).find((m: any) => m.id === seciliMusteriId) ?? null
        : null;

    const dictionary = await getDictionary(locale);

    return (
        <MusteriSiparisClient
            musteriler={musteriler ?? []}
            urunler={urunler ?? []}
            seciliMusteri={seciliMusteri}
            bayiFirmaId={bayiFirmaId}
            locale={locale}
            dictionary={dictionary}
        />
    );
}
