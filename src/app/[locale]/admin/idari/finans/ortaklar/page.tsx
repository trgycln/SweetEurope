import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import OrtaklarClient from './OrtaklarClient';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import { SUPER_ADMIN_EMAILS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
}

export default async function OrtaklarPage({ params }: PageProps) {
    noStore();
    const { locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);
    const isSuperAdmin = !!user.email && SUPER_ADMIN_EMAILS.includes(user.email);

    const { data: profile } = await supabase.from('profiller').select('rol, tam_ad').eq('id', user.id).single();
    if (!['Yönetici', 'Personel', 'Ekip Üyesi'].includes(profile?.rol ?? '')) {
        return redirect(`/${locale}/admin/dashboard`);
    }

    // Ortakları çekelim
    const { data: profiller } = await supabase.from('profiller').select('id, tam_ad, rol');
    const ortakProfiller = (profiller || []).filter(p => p.rol === 'Yönetici' || p.rol === 'Kurucu' || p.rol === 'Ortak');

    // İşlemleri çekelim
    const { data: islemler } = await supabase
        .from('ortak_islemleri')
        .select(`
            id, ortak_id, tarih, islem_tipi, tutar, aciklama, created_at,
            profiller!ortak_islemleri_ortak_id_fkey(tam_ad)
        `)
        .order('tarih', { ascending: false })
        .order('created_at', { ascending: false });

    const safeIslemler = islemler || [];
    const safeProfiller = ortakProfiller;

    // Ortak bazlı bakiye hesaplama
    const bakiyeOzet = safeProfiller.reduce((acc: any, p) => {
        acc[p.id] = {
            tam_ad: p.tam_ad,
            sermaye: 0,
            avans_ve_odeme: 0,
            hakedis: 0,
            bakiye: 0
        };
        return acc;
    }, {});

    safeIslemler.forEach(islem => {
        const p = bakiyeOzet[islem.ortak_id];
        if (!p) return;
        
        const tutar = Number(islem.tutar);
        p.bakiye += tutar;

        if (islem.islem_tipi.includes('Sermaye Ekleme') || islem.islem_tipi.includes('Sermaye Çıkışı')) {
            p.sermaye += tutar;
        } else if (islem.islem_tipi.includes('Maaş Tahakkuku') || islem.islem_tipi.includes('Kar Payı') || islem.islem_tipi.includes('Cepten')) {
            p.hakedis += tutar;
        } else if (islem.islem_tipi.includes('Avans') || islem.islem_tipi.includes('Maaş / Nakit Çıkışı')) {
            p.avans_ve_odeme += tutar; // Bu zaten negatif geliyor
        }
    });

    // Sadece bakiyesi 0 olmayan veya işlem görmüş profilleri filtreleyelim
    const aktifOrtaklar = Object.values(bakiyeOzet).filter((p: any) => p.sermaye !== 0 || p.hakedis !== 0 || p.avans_ve_odeme !== 0);

    return (
        <OrtaklarClient
            islemler={safeIslemler}
            profiller={safeProfiller}
            aktifOrtaklar={aktifOrtaklar}
            locale={locale}
            isAdmin={profile?.rol === 'Yönetici'}
            currentUserId={user.id}
            isSuperAdmin={isSuperAdmin}
        />
    );
}
