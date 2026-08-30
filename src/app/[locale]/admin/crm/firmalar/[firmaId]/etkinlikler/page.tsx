import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import { yeniEtkinlikEkleAction } from './actions';
import { FirmaEtkinliklerTab } from '@/components/admin/crm/tabs/FirmaEtkinliklerTab';
import { revalidatePath } from 'next/cache';

interface EtkinliklerPageProps {
    params: Promise<{
        locale: Locale;
        firmaId: string;
    }>;
}

export default async function EtkinliklerPage({ params }: EtkinliklerPageProps) {
    const { firmaId, locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return redirect(`/${locale}/login?next=/admin/crm/firmalar/${firmaId}/etkinlikler`);
    }

    const [etkinliklerRes, kisilerRes] = await Promise.all([
        supabase
            .from('etkinlikler')
            .select(`
                *,
                olusturan_personel: profiller!olusturan_personel_id (tam_ad)
            `)
            .eq('firma_id', firmaId)
            .order('created_at', { ascending: false }),
        supabase
            .from('dis_kontaklar')
            .select('id, ad_soyad, unvan, telefon, email')
            .eq('firma_id', firmaId)
            .order('ad_soyad', { ascending: true })
    ]);

    async function handleAddEtkinlik(formData: FormData) {
        'use server';
        const takipTarihi = formData.get('takip_tarihi') as string | null;
        const aciklama = formData.get('aciklama') as string | null;
        const etkinlikTipi = formData.get('etkinlik_tipi') as string | null;

        await yeniEtkinlikEkleAction(firmaId, locale, null, formData);

        // Eğer takip tarihi girilmişse otomatik olarak görevlere de ekle (Smart Linking)
        if (takipTarihi) {
            const cookieStoreAction = await cookies();
            const supabaseAction = await createSupabaseServerClient(cookieStoreAction);
            const { data: { user: actionUser } } = await getGlobalCachedUser();

            if (actionUser) {
                await supabaseAction.from('gorevler').insert({
                    ilgili_firma_id: firmaId,
                    atanan_kisi_id: actionUser.id,
                    olusturan_kisi_id: actionUser.id,
                    baslik: `[Takip] ${etkinlikTipi || 'Görüşme'} Sonrası Takip`,
                    aciklama: aciklama || 'Etkinlik akışından otomatik oluşturulan takip görevi.',
                    son_tarih: takipTarihi,
                    oncelik: 'Yüksek',
                    tamamlandi: false
                } as any);
            }
        }

        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}/etkinlikler`);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}/gorevler`);
        revalidatePath(`/${locale}/admin/crm/firmalar/${firmaId}`);
    }

    return (
        <FirmaEtkinliklerTab
            etkinlikler={etkinliklerRes.data || []}
            kisiler={kisilerRes.data || []}
            firmaId={firmaId}
            locale={locale}
            isPortal={false}
            onAddEtkinlik={handleAddEtkinlik}
        />
    );
}