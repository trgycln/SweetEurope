import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { Locale } from '@/i18n-config';
import { getDictionary } from '@/dictionaries';
import { MusteriSiparisClient } from './MusteriSiparisClient';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ musteriId?: string }>;
}

export default async function MusteriSiparisPage({ params, searchParams }: PageProps) {
    noStore();
    const { locale } = await params;
    const { musteriId } = await searchParams;

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

    const [musterilerRes, urunlerRes] = await Promise.all([
        supabase
            .from('firmalar')
            .select('id, unvan, adres, email, telefon, sehir')
            .eq('ust_bayi_firma_id', bayiFirmaId)
            .order('unvan'),

        supabase
            .from('urunler')
            .select(`
                id, ad, stok_kodu, ana_resim_url,
                satis_fiyati_musteri, satis_fiyati_toptanci,
                satis_fiyati_alt_bayi, stok_miktari,
                koli_ici_adet, palet_ici_adet
            `)
            .eq('aktif', true)
            .order(`ad->>${locale}`),
    ]);

    const musteriler = (musterilerRes.data ?? []) as any[];
    const urunler = (urunlerRes.data ?? []) as any[];
    const seciliMusteri = musteriId
        ? musteriler.find((m: any) => m.id === musteriId) ?? null
        : null;

    const dictionary = await getDictionary(locale);

    return (
        <MusteriSiparisClient
            musteriler={musteriler}
            urunler={urunler}
            seciliMusteri={seciliMusteri}
            bayiFirmaId={bayiFirmaId}
            locale={locale}
            dictionary={dictionary}
        />
    );
}
