import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { FirmaSiparislerTab } from '@/components/admin/crm/tabs/FirmaSiparislerTab';

interface FirmaSiparisleriPageProps {
    params: Promise<{
        locale: Locale;
        firmaId: string;
    }>;
}

export default async function FirmaSiparisleriPage({ params }: FirmaSiparisleriPageProps) {
    const { firmaId, locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

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
            isPortal={false}
        />
    );
}