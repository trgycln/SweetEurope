import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { Locale } from '@/i18n-config';
import FavorilerClient from './FavorilerClient';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import { getDictionary } from '@/dictionaries';
import { resolvePartnerPreis } from '@/lib/pricing';
import { Enums } from '@/lib/supabase/database.types';
import { ProduktMitPreis } from '../katalog/types';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
}

export default async function FavorilerPage({ params }: PageProps) {
    noStore();
    const { locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const [dictionary, userRes] = await Promise.all([
        getDictionary(locale),
        getGlobalCachedUser()
    ]);

    const { user } = userRes.data;
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (!profile?.firma_id) return redirect(`/${locale}/portal/dashboard`);

    // Favoriler + ürün bilgileri (tüm alanlar)
    const { data: favoriler } = await (supabase as any)
        .from('favori_urunler')
        .select(`
            urun_id, created_at,
            urunler(
                *,
                kategoriler(ad)
            )
        `)
        .eq('kullanici_id', user.id)
        .order('created_at', { ascending: false });

    // Sadece aktif ürünler
    const rawFavoriUrunler = (favoriler ?? [])
        .filter((f: any) => f.urunler && f.urunler.aktif !== false)
        .map((f: any) => ({
            ...f.urunler,
            favori_eklenme_tarihi: f.created_at,
        }));

    // Partner Preis Çözümleme
    const aktifFavoriler: ProduktMitPreis[] = await Promise.all(
        rawFavoriUrunler.map(async (produkt: any) => {
            try {
                const partnerPreis = await resolvePartnerPreis({
                    supabase,
                    urun: produkt,
                    userRole: profile.rol as Enums<'user_role'>,
                    firmaId: (profile.firma_id as string) || '',
                    qty: 1,
                });
                return { ...produkt, partnerPreis };
            } catch {
                return { ...produkt, partnerPreis: null };
            }
        })
    );

    return (
        <FavorilerClient
            favoriler={aktifFavoriler}
            locale={locale}
            dictionary={dictionary}
            userRole={profile.rol}
            firmaId={profile.firma_id}
        />
    );
}
