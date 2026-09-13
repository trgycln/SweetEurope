// src/app/[locale]/admin/urun-yonetimi/urunler/yeni/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UrunFormu } from '../urun-formu';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { unstable_noStore as noStore } from 'next/cache';
import { getDictionary } from '@/dictionaries';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

interface YeniUrunSayfasiProps {
    params: { locale: Locale };
}

export default async function YeniUrunSayfasi({ params }: YeniUrunSayfasiProps) {
    noStore();
    const locale = params.locale;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    const isAdmin = profile?.rol === 'Yönetici';
    if (!isAdmin) {
        return redirect(`/${locale}/admin/urun-yonetimi/urunler`);
    }

    const [kategorilerRes, tedarikcilerRes, birimlerRes] = await Promise.all([
        supabase.from('kategoriler').select('*').order(`ad->>${locale}`, { ascending: true }).order(`ad->>de`),
        supabase.from('tedarikciler').select('id, unvan').order('unvan'),
        supabase.from('birimler').select('*').order(`ad->>${locale}`, { ascending: true }).order(`ad->>de`)
    ]);

    if (kategorilerRes.error || tedarikcilerRes.error || birimlerRes.error) {
        console.error("Fehler beim Laden der Daten für das neue Produktformular:", kategorilerRes.error || tedarikcilerRes.error || birimlerRes.error);
        return <div>Fehler beim Laden der Daten. Details in den Server-Logs.</div>;
    }

    const kategorien = kategorilerRes.data || [];
    const tedarikciler = tedarikcilerRes.data || [];
    const birimler = birimlerRes.data || [];

    const dict = await getDictionary(locale);
    const labels = dict.productsForm;

    return (
        <div className="w-full max-w-full mx-auto px-1 py-1">
            <UrunFormu
                locale={locale}
                kategoriler={kategorien}
                tedarikciler={tedarikciler}
                birimler={birimler}
                labels={labels}
                isAdmin={isAdmin}
            />
        </div>
    );
}