import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import { redirect } from 'next/navigation';
import { addFirmTaskAction } from '../actions';
import { FirmaGorevlerTab } from '@/components/admin/crm/tabs/FirmaGorevlerTab';
import { revalidatePath } from 'next/cache';

interface PortalGorevlerPageProps {
    params: Promise<{
        locale: Locale;
        firmaId: string;
    }>;
}

export default async function PortalGorevlerPage({ params }: PortalGorevlerPageProps) {
    const { firmaId, locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: gorevler } = await supabase
        .from('gorevler')
        .select('*')
        .eq('ilgili_firma_id', firmaId)
        .order('tamamlandi', { ascending: true })
        .order('son_tarih', { ascending: true, nullsFirst: false });

    async function handleAddGorev(formData: FormData) {
        'use server';
        await addFirmTaskAction(firmaId, formData);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}/gorevler`);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}`);
    }

    async function handleToggleGorev(gorevId: string, currentStatus: boolean) {
        'use server';
        const cookieStoreAction = await cookies();
        const supabaseAction = await createSupabaseServerClient(cookieStoreAction);
        await supabaseAction
            .from('gorevler')
            .update({ tamamlandi: !currentStatus })
            .eq('id', gorevId);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}/gorevler`);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}`);
    }

    async function handleDeleteGorev(gorevId: string) {
        'use server';
        const cookieStoreAction = await cookies();
        const supabaseAction = await createSupabaseServerClient(cookieStoreAction);
        await supabaseAction
            .from('gorevler')
            .delete()
            .eq('id', gorevId);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}/gorevler`);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}`);
    }

    return (
        <FirmaGorevlerTab
            gorevler={gorevler || []}
            firmaId={firmaId}
            locale={locale}
            isPortal={true}
            onAddGorev={handleAddGorev}
            onToggleGorev={handleToggleGorev}
            onDeleteGorev={handleDeleteGorev}
        />
    );
}
