export const dynamic = 'force-dynamic';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Locale } from '@/lib/utils';
import ReferanslarClient from './ReferanslarClient';

export default async function ReferanslarPage({
    params,
}: {
    params: { locale: Locale };
}) {
    const { locale } = params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller').select('rol').eq('id', user.id).single();

    if (!['Yönetici', 'Ekip Üyesi', 'Personel'].includes(profile?.rol ?? '')) {
        return redirect(`/${locale}/admin/dashboard`);
    }

    return <ReferanslarClient locale={locale} />;
}
