// src/app/[locale]/admin/urun-yonetimi/urunler/[urunId]/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { notFound, redirect } from 'next/navigation';
import { UrunFormu } from '../urun-formu';
import { Tables } from '@/lib/supabase/database.types';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { unstable_noStore as noStore } from 'next/cache';
import { getDictionary } from '@/dictionaries';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

type Urun = Tables<'urunler'>;
type Kategori = Tables<'kategoriler'>;
type Tedarikci = Pick<Tables<'tedarikciler'>, 'id' | 'unvan'>;
type Birim = Tables<'birimler'>;

interface UrunBearbeitenSeiteProps {
    params: Promise<{
        urunId: string;
        locale: Locale;
    }>;
    searchParams?: Promise<{
        from?: string;
        to?: string;
        tip?: string;
        kaynak?: string;
    }>;
}

export default async function UrunBearbeitenSeite({ params, searchParams }: UrunBearbeitenSeiteProps) {
    noStore();
    const { urunId, locale } = await params;
    const sp = searchParams ? await searchParams : {};

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const serviceSupabase = createSupabaseServiceClient();

    // Güvenlik & Yetki Kontrolü
    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    const isAdmin = profile?.rol === 'Yönetici';

    // Verileri Paralel Çek
    const [urunRes, kategorilerRes, tedarikcilerRes, birimlerRes] = await Promise.all([
        supabase.from('urunler').select('*').eq('id', urunId).maybeSingle(),
        supabase.from('kategoriler').select('*').order(`ad->>${locale}`, { ascending: true }).order(`ad->>de`),
        supabase.from('tedarikciler').select('id, unvan').order('unvan'),
        supabase.from('birimler').select('*').order(`ad->>${locale}`, { ascending: true }).order(`ad->>de`)
    ]);

    const mevcutUrun = urunRes.data as Urun | null;
    if (urunRes.error || !mevcutUrun) {
        console.error("Fehler beim Laden des Produkts:", urunRes.error);
        return notFound();
    }

    const kategorien = kategorilerRes.data || [];
    const tedarikciler = tedarikcilerRes.data || [];
    const birimler = birimlerRes.data || [];

    const dict = await getDictionary(locale);
    const labels = dict.productsForm;

    // Stok Hareket Logları
    let stockLogsQuery = (serviceSupabase as any)
        .from('urun_stok_hareket_loglari')
        .select('id, created_at, hareket_tipi, kaynak, miktar, birim, birim_miktar, onceki_stok, sonraki_stok, yapan_user_adi, yapan_user_email, aciklama')
        .eq('urun_id', urunId);

    const fromDate = (sp?.from || '').trim();
    const toDate = (sp?.to || '').trim();
    const tip = (sp?.tip || '').trim();
    const kaynak = (sp?.kaynak || '').trim();

    if (fromDate) stockLogsQuery = stockLogsQuery.gte('created_at', `${fromDate}T00:00:00`);
    if (toDate) stockLogsQuery = stockLogsQuery.lte('created_at', `${toDate}T23:59:59`);
    if (tip) stockLogsQuery = stockLogsQuery.eq('hareket_tipi', tip);
    if (kaynak) stockLogsQuery = stockLogsQuery.eq('kaynak', kaynak);

    const { data: stockLogsRaw } = await stockLogsQuery
        .order('created_at', { ascending: false })
        .limit(100);

    const stockLogs = Array.isArray(stockLogsRaw) ? stockLogsRaw : [];

    return (
        <div className="w-full max-w-full mx-auto px-1 py-1">
            <UrunFormu
                locale={locale}
                mevcutUrun={mevcutUrun}
                kategoriler={kategorien}
                tedarikciler={tedarikciler}
                birimler={birimler}
                labels={labels}
                isAdmin={isAdmin}
                stockLogs={stockLogs}
                stockFilterParams={{ from: fromDate, to: toDate, tip, kaynak }}
            />
        </div>
    );
}