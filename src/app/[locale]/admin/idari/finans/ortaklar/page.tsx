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
    const ortakProfiller = (profiller || []).filter((p: any) => (p.rol as string) === 'Yönetici' || (p.rol as string) === 'Kurucu' || (p.rol as string) === 'Ortak');

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
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const bakiyeOzet = safeProfiller.reduce((acc: any, p) => {
        acc[p.id] = {
            id: p.id,
            tam_ad: p.tam_ad,
            sermaye: 0,
            cekilen_para: 0,
            aylik_cekilen_para: 0,
            kar_payi: 0
        };
        return acc;
    }, {});

    safeIslemler.forEach(islem => {
        const p = bakiyeOzet[islem.ortak_id];
        if (!p) return;
        
        const islemDate = new Date(islem.tarih);
        const isThisMonth = islemDate.getMonth() === currentMonth && islemDate.getFullYear() === currentYear;
        
        const tutar = Number(islem.tutar);

        if (islem.islem_tipi.includes('Sermaye Ekleme') || islem.islem_tipi.includes('Sermaye Çıkışı')) {
            p.sermaye += tutar;
        } else if (islem.islem_tipi.includes('Kar Payı / Temettü')) {
            p.kar_payi += tutar; // tutar is negative, it represents cash out
        } else if (islem.islem_tipi.includes('Ortak Para Çekimi') || islem.islem_tipi.includes('Şahsi Harcama') || islem.islem_tipi.includes('Nakit Çıkışı')) {
            p.cekilen_para += tutar; // tutar is negative
            if (isThisMonth) p.aylik_cekilen_para += tutar;
        } else {
            // Eski kayit destegi icin: eger negatif bir islem varsa (avans vs) cekilen_para say.
            if (tutar < 0) {
                p.cekilen_para += tutar;
                if (isThisMonth) p.aylik_cekilen_para += tutar;
            }
        }
    });

    // Sadece sermayesi, çekilen parası veya kâr payı olanları filtreleyelim
    const aktifOrtaklar = Object.values(bakiyeOzet).filter((p: any) => p.sermaye !== 0 || p.cekilen_para !== 0 || p.kar_payi !== 0);

    return (
        <OrtaklarClient
            islemler={safeIslemler}
            profiller={safeProfiller}
            aktifOrtaklar={aktifOrtaklar as any}
            locale={locale}
            isAdmin={profile?.rol === 'Yönetici'}
            currentUserId={user.id}
            isSuperAdmin={isSuperAdmin}
        />
    );
}
