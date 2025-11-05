import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { GiderSablonlariClient } from '@/components/admin/finans/GiderSablonlariClient';
import { Tables } from '@/lib/supabase/database.types';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type GiderSablonWithDetails = Tables<'gider_sablonlari'> & {
    gider_kalemleri: {
        id: string;
        ad: string | null;
        ana_kategori_id: string;
        gider_ana_kategoriler: {
            ad: string | null;
        } | null;
    } | null;
};

export type HauptKategorie = Tables<'gider_ana_kategoriler'>;
export type GiderKalemi = Tables<'gider_kalemleri'>;

export default async function GiderSablonlariPage({
    params
}: {
    params: Promise<{ locale: Locale }>;
}) {
    const resolvedParams = await params;
    const locale = resolvedParams.locale;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const dictionary = await getDictionary(locale);

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol')
        .eq('id', user.id)
        .single();

    if (profile?.rol !== 'Yönetici') {
        return redirect(`/${locale}/dashboard`);
    }

    // Şablonları getir
    const { data: sablonlar } = await supabase
        .from('gider_sablonlari')
        .select(`
            *,
            gider_kalemleri(
                id,
                ad,
                ana_kategori_id,
                gider_ana_kategoriler(ad)
            )
        `)
        .order('created_at', { ascending: false });

    // Ana kategoriler ve gider kalemleri getir
    const [hauptKategorienRes, giderKalemleriRes] = await Promise.all([
        supabase.from('gider_ana_kategoriler').select('*').order('ad'),
        supabase.from('gider_kalemleri').select('*').order('ad')
    ]);

    return (
        <GiderSablonlariClient
            initialSablonlar={sablonlar as GiderSablonWithDetails[] || []}
            hauptKategorien={hauptKategorienRes.data as HauptKategorie[] || []}
            giderKalemleri={giderKalemleriRes.data as GiderKalemi[] || []}
            dictionary={dictionary}
            locale={locale}
        />
    );
}
