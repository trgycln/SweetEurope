import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { yeniKisiEkleAction, silKisiAction } from './actions';
import { FirmaKisilerTab } from '@/components/admin/crm/tabs/FirmaKisilerTab';
import { revalidatePath } from 'next/cache';

interface IlgiliKisilerPageProps {
    params: Promise<{
        locale: Locale;
        firmaId: string;
    }>;
}

export default async function IlgiliKisilerPage({ params }: IlgiliKisilerPageProps) {
    const { firmaId, locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: kisilerData } = await supabase
        .from('dis_kontaklar')
        .select('*')
        .eq('firma_id', firmaId)
        .order('ad_soyad');

    async function handleCreate(formData: FormData) {
        'use server';
        await yeniKisiEkleAction(firmaId, formData);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}/kisiler`);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}`);
    }

    async function handleDelete(kisiId: string) {
        'use server';
        await silKisiAction(kisiId, firmaId);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}/kisiler`);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}`);
    }

    return (
        <FirmaKisilerTab
            kisiler={kisilerData || []}
            firmaId={firmaId}
            locale={locale}
            isPortal={false}
            onAddKisi={handleCreate}
            onDeleteKisi={handleDelete}
        />
    );
}