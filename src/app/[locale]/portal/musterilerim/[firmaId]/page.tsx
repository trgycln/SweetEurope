// src/app/[locale]/portal/musterilerim/[firmaId]/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { Locale } from '@/i18n-config';
import Link from 'next/link';
import { MusteriDetayHub } from '@/components/admin/crm/MusteriDetayHub';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale; firmaId: string }>;
}

export default async function PortalMusteriDetayPage({ params }: PageProps) {
    noStore();
    const { locale, firmaId } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    // Kullanıcının profil ve firma bilgilerini al
    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    // Firma sahibi veya bağlı alt bayi mi kontrol et (security)
    const { data: firma } = await (supabase as any)
        .from('firmalar')
        .select('*, sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad)')
        .eq('id', firmaId)
        .single();

    const isAuthorized = Boolean(
        firma && (
            firma.sahip_id === user.id ||
            (profile?.firma_id && firma.ust_bayi_firma_id === profile.firma_id)
        )
    );

    if (!firma || !isAuthorized) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-700 font-semibold">Bu müşteri size ait değil veya bulunamadı.</p>
                <Link href={`/${locale}/portal/musterilerim`} className="text-blue-600 underline mt-2 inline-block">
                    Müşteri listesine dön
                </Link>
            </div>
        );
    }

    // Portal kullanıcılarını çek
    let portalUsers: any[] = [];
    try {
        const { data: portalProfiles } = await supabase
            .from('profiller')
            .select('id, tam_ad, rol')
            .eq('firma_id', firmaId);

        if (portalProfiles && portalProfiles.length > 0) {
            let supabaseAdmin: any = null;
            try {
                supabaseAdmin = createSupabaseServiceClient();
            } catch {
                supabaseAdmin = null;
            }

            if (supabaseAdmin) {
                const authUsersRes = await supabaseAdmin.auth.admin.listUsers();
                const authMap = new Map<string, any>((authUsersRes?.data?.users || []).map((u: any) => [u.id, u] as [string, any]));
                portalUsers = portalProfiles.map(p => {
                    const authUser = authMap.get(p.id);
                    return {
                        id: p.id,
                        tam_ad: p.tam_ad,
                        rol: p.rol,
                        email: authUser?.email || null,
                        last_sign_in_at: authUser?.last_sign_in_at || null,
                    };
                });
            } else {
                portalUsers = portalProfiles.map(p => ({
                    id: p.id,
                    tam_ad: p.tam_ad,
                    rol: p.rol,
                    email: null,
                    last_sign_in_at: null,
                }));
            }
        }
    } catch (err) {
        console.warn('Portal kullanıcıları alınamadı:', err);
    }

    // Üst bayi bilgisi
    let ustBayi: { id: string; unvan: string } | null = null;
    if (firma.ust_bayi_firma_id) {
        try {
            const { data: ubData } = await supabase
                .from('firmalar')
                .select('id, unvan')
                .eq('id', firma.ust_bayi_firma_id)
                .single();
            ustBayi = ubData || null;
        } catch {
            ustBayi = null;
        }
    }

    // Paralel veri çek
    const [
        siparislerRes,
        gorevlerRes,
        kisilerRes,
        etkinliklerRes,
    ] = await Promise.all([
        supabase
            .from('siparisler')
            .select('id, siparis_durumu, toplam_tutar_net, toplam_tutar_brut, siparis_tarihi, created_at')
            .eq('firma_id', firmaId)
            .order('siparis_tarihi', { ascending: false }),

        supabase
            .from('gorevler')
            .select('id, baslik, tamamlandi, son_tarih, oncelik')
            .eq('ilgili_firma_id', firmaId)
            .order('son_tarih', { ascending: true })
            .limit(10),

        (supabase as any).from('dis_kontaklar')
            .select('id, ad_soyad, unvan, telefon, email')
            .eq('firma_id', firmaId)
            .limit(5),

        (supabase as any).from('etkinlikler')
            .select('id, etkinlik_tipi, aciklama, created_at, olusturan_personel:profiller!etkinlikler_olusturan_personel_id_fkey(tam_ad)')
            .eq('firma_id', firmaId)
            .order('created_at', { ascending: false })
            .limit(8),
    ]);

    const siparisler = (siparislerRes.data ?? []) as any[];
    const gorevler = (gorevlerRes.data ?? []) as any[];
    const kisiler = (kisilerRes.data ?? []) as any[];
    const aktiviteler = (etkinliklerRes.data ?? []) as any[];

    return (
        <MusteriDetayHub
            firma={firma}
            siparisler={siparisler}
            gorevler={gorevler}
            kisiler={kisiler}
            aktiviteler={aktiviteler}
            portalUsers={portalUsers}
            ustBayi={ustBayi}
            locale={locale}
            isPortal={true}
        />
    );
}
