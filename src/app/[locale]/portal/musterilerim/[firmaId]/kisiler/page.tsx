import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import { redirect } from 'next/navigation';
import { yeniKisiEkleAction, silKisiAction } from '../actions';
import { FirmaKisilerTab } from '@/components/admin/crm/tabs/FirmaKisilerTab';
import { revalidatePath } from 'next/cache';

interface PortalKisilerPageProps {
    params: Promise<{
        locale: Locale;
        firmaId: string;
    }>;
}

export default async function PortalKisilerPage({ params }: PortalKisilerPageProps) {
    const { firmaId, locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: kisiler } = await supabase
        .from('dis_kontaklar')
        .select('*')
        .eq('firma_id', firmaId)
        .order('ad_soyad');

    async function handleAddKisi(formData: FormData) {
        'use server';
        await yeniKisiEkleAction(firmaId, formData);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}/kisiler`);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}`);
    }

    async function handleDeleteKisi(kisiId: string) {
        'use server';
        await silKisiAction(kisiId, firmaId);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}/kisiler`);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}`);
    }

    return (
        <FirmaKisilerTab
            kisiler={kisiler || []}
            firmaId={firmaId}
            locale={locale}
            isPortal={true}
            onAddKisi={handleAddKisi}
            onDeleteKisi={handleDeleteKisi}
        />
    );
}
