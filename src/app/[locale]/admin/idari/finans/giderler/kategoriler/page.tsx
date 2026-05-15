import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import KategorilerClient from './KategorilerClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
}

export default async function KategorilerPage({ params }: PageProps) {
    noStore();
    const { locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'Yönetici') {
        return redirect(`/${locale}/admin/idari/finans/giderler`);
    }

    const [anaKatRes, kalemRes, kullanimRes] = await Promise.all([
        supabase.from('gider_ana_kategoriler').select('id, ad').order('ad', { ascending: true }),
        supabase.from('gider_kalemleri').select('id, ad, ana_kategori_id').order('ad', { ascending: true }),
        (supabase as any).from('giderler').select('gider_kalemi_id'),
    ]);

    const kullanimMap = new Map<string, number>();
    for (const g of (kullanimRes.data ?? []) as any[]) {
        if (g.gider_kalemi_id) {
            kullanimMap.set(g.gider_kalemi_id, (kullanimMap.get(g.gider_kalemi_id) ?? 0) + 1);
        }
    }
    const kalemler = (kalemRes.data ?? []).map((k: any) => ({
        ...k,
        kullanim_sayisi: kullanimMap.get(k.id) ?? 0,
    }));

    return (
        <KategorilerClient
            anaKategoriler={anaKatRes.data ?? []}
            kalemler={kalemler}
            locale={locale}
        />
    );
}
