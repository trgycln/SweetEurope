import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import { redirect } from 'next/navigation';
import { yeniEtkinlikEkleAction } from '../actions';
import { FirmaEtkinliklerTab } from '@/components/admin/crm/tabs/FirmaEtkinliklerTab';
import { revalidatePath } from 'next/cache';

interface PortalEtkinliklerPageProps {
    params: Promise<{
        locale: Locale;
        firmaId: string;
    }>;
}

export default async function PortalEtkinliklerPage({ params }: PortalEtkinliklerPageProps) {
    const { firmaId, locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const [etkinliklerRes, kisilerRes] = await Promise.all([
        supabase
            .from('etkinlikler')
            .select(`*, olusturan_personel: profiller!etkinlikler_olusturan_personel_id_fkey( tam_ad )`)
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

        await yeniEtkinlikEkleAction(firmaId, formData);

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

        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}/etkinlikler`);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}/gorevler`);
        revalidatePath(`/${locale}/portal/musterilerim/${firmaId}`);
    }

    return (
        <FirmaEtkinliklerTab
            etkinlikler={etkinliklerRes.data || []}
            kisiler={kisilerRes.data || []}
            firmaId={firmaId}
            locale={locale}
            isPortal={true}
            onAddEtkinlik={handleAddEtkinlik}
        />
    );
}
