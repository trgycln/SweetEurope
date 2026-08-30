import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { FirmaSiparislerTab } from '@/components/admin/crm/tabs/FirmaSiparislerTab';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import { redirect } from 'next/navigation';

interface PortalFirmaSiparisleriPageProps {
    params: Promise<{
        locale: Locale;
        firmaId: string;
    }>;
}

export default async function PortalFirmaSiparisleriPage({ params }: PortalFirmaSiparisleriPageProps) {
    const { firmaId, locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: siparisler } = await supabase
        .from('siparisler')
        .select('*')
        .eq('firma_id', firmaId)
        .order('siparis_tarihi', { ascending: false });

    return (
        <FirmaSiparislerTab
            siparisler={siparisler || []}
            firmaId={firmaId}
            locale={locale}
            isPortal={true}
        />
    );
}
