import { createSupabaseServerClient } from '@/lib/supabase/server';
import { firmaIcinGorevEkleAction } from './actions';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import { FirmaGorevlerTab } from '@/components/admin/crm/tabs/FirmaGorevlerTab';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

interface FirmaGorevleriPageProps {
    params: Promise<{
        locale: Locale;
        firmaId: string;
    }>;
}

export default async function FirmaGorevleriPage({ params }: FirmaGorevleriPageProps) {
    const { firmaId, locale } = await params;
    noStore();

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return redirect(`/${locale}/login?next=/admin/crm/firmalar/${firmaId}/gorevler`);
    }

    const { data: gorevler } = await supabase
        .from('gorevler')
        .select('*')
        .eq('ilgili_firma_id', firmaId)
        .order('tamamlandi', { ascending: true })
        .order('son_tarih', { ascending: true, nullsFirst: false });

    async function handleAddGorev(formData: FormData) {
        'use server';
        formData.append('atanan_kisi_id', user?.id || '');
        await firmaIcinGorevEkleAction(firmaId, formData);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}/gorevler`);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}`);
    }

    async function handleToggleGorev(gorevId: string, currentStatus: boolean) {
        'use server';
        const cookieStoreAction = await cookies();
        const supabaseAction = await createSupabaseServerClient(cookieStoreAction);
        await supabaseAction
            .from('gorevler')
            .update({ tamamlandi: !currentStatus })
            .eq('id', gorevId);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}/gorevler`);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}`);
    }

    async function handleDeleteGorev(gorevId: string) {
        'use server';
        const cookieStoreAction = await cookies();
        const supabaseAction = await createSupabaseServerClient(cookieStoreAction);
        await supabaseAction
            .from('gorevler')
            .delete()
            .eq('id', gorevId);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}/gorevler`);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}`);
    }

    return (
        <FirmaGorevlerTab
            gorevler={gorevler || []}
            firmaId={firmaId}
            locale={locale}
            isPortal={false}
            onAddGorev={handleAddGorev}
            onToggleGorev={handleToggleGorev}
            onDeleteGorev={handleDeleteGorev}
        />
    );
}