import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { FirmaDetaylarCard } from '@/components/admin/crm/FirmaDetaylarCard';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export default async function PortalMusteriDetaylarPage({
    params
}: {
    params: Promise<{ firmaId: string; locale: Locale }>
}) {
    const { firmaId, locale } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    const { data: firma, error } = await (supabase as any)
        .from('firmalar')
        .select(`
            *,
            sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad)
        `)
        .eq('id', firmaId)
        .single();

    const isAuthorized = Boolean(
        firma && (
            firma.sahip_id === user.id ||
            (profile?.firma_id && firma.ust_bayi_firma_id === profile.firma_id)
        )
    );

    if (error || !firma || !isAuthorized) {
        notFound();
    }

    return (
        <FirmaDetaylarCard
            firma={firma}
            locale={locale}
            isPortal={true}
        />
    );
}
