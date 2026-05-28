import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import SablonlarV2Client from './SablonlarV2Client';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
}

export default async function SablonlarPage({ params }: PageProps) {
    noStore();
    const { locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (!['Yönetici', 'Personel', 'Ekip Üyesi'].includes(profile?.rol ?? '')) {
        return redirect(`/${locale}/admin/dashboard`);
    }

    const [sablonRes, kalemRes, kullanimRes] = await Promise.all([
        (supabase as any)
            .from('gider_sablonlari')
            .select('*, gider_kalemleri(id, ad, gider_ana_kategoriler(ad))')
            .order('aktif', { ascending: false })
            .order('created_at', { ascending: false }),
        supabase
            .from('gider_kalemleri')
            .select('id, ad, ana_kategori_id, gider_ana_kategoriler(ad)')
            .order('ad', { ascending: true }),
        (supabase as any).from('giderler').select('sablon_id').not('sablon_id', 'is', null),
    ]);

    // Şablonun kaç gider oluşturduğunu say
    const usageMap = new Map<string, number>();
    for (const g of (kullanimRes.data ?? []) as any[]) {
        if (g.sablon_id) usageMap.set(g.sablon_id, (usageMap.get(g.sablon_id) ?? 0) + 1);
    }
    const sablonlar = (sablonRes.data ?? []).map((s: any) => ({
        ...s,
        olusturulan_gider_sayisi: usageMap.get(s.id) ?? 0,
    }));

    return (
        <SablonlarV2Client
            sablonlar={sablonlar}
            giderKalemleri={kalemRes.data ?? []}
            locale={locale}
            isAdmin={profile?.rol === 'Yönetici'}
        />
    );
}
