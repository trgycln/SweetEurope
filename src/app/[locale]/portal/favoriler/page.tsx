import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { Locale } from '@/i18n-config';
import FavorilerClient from './FavorilerClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
}

export default async function FavorilerPage({ params }: PageProps) {
    noStore();
    const { locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (!profile?.firma_id) return redirect(`/${locale}/portal/dashboard`);

    // Favoriler + ürün bilgileri
    const { data: favoriler } = await (supabase as any)
        .from('favori_urunler')
        .select(`
            urun_id, created_at,
            urunler(
                id, ad, slug, ana_resim_url, stok_kodu,
                koli_ici_adet, palet_ici_adet, stok_miktari, aktif,
                satis_fiyati_musteri, satis_fiyati_toptanci, satis_fiyati_alt_bayi,
                kategori_id, kategoriler(ad)
            )
        `)
        .eq('kullanici_id', user.id)
        .order('created_at', { ascending: false });

    // Sadece aktif ürünler
    const aktifFavoriler = (favoriler ?? [])
        .filter((f: any) => f.urunler && f.urunler.aktif !== false)
        .map((f: any) => ({
            ...f.urunler,
            favori_eklenme_tarihi: f.created_at,
        }));

    return (
        <FavorilerClient
            favoriler={aktifFavoriler}
            locale={locale}
            userRole={profile.rol}
            firmaId={profile.firma_id}
        />
    );
}
