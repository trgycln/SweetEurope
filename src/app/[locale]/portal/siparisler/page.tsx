// src/app/[locale]/portal/siparisler/page.tsx (YENİ MİMARİ)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { SiparislerClient } from '@/components/portal/siparisler/SiparislerClient';
import { Enums } from '@/lib/supabase/database.types';

const ORDERS_PER_PAGE = 20;

export default async function PartnerSiparisListPage({ 
    params: { locale },
    searchParams 
}: { 
    params: { locale: Locale };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const dictionary = await getDictionary(locale);
    const supabase = createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    const { data: profile } = await supabase.from('profiller').select('firma_id').eq('id', user.id).single();
    if (!profile || !profile.firma_id) return notFound();

    // 1. URL'den sayfa ve filtre parametrelerini al
    const page = typeof searchParams.page === 'string' ? Number(searchParams.page) : 1;
    const status = typeof searchParams.status === 'string' ? searchParams.status as Enums<'siparis_durumu'> : undefined;
    const searchQuery = typeof searchParams.q === 'string' ? searchParams.q : undefined;

    // 2. Supabase sorgusunu dinamik olarak oluştur
    let query = supabase
        .from('siparisler')
        .select('id, siparis_tarihi, toplam_tutar_net, siparis_durumu', { count: 'exact' })
        .eq('firma_id', profile.firma_id);

    // Filtreleri uygula
    if (status) query = query.eq('siparis_durumu', status);
    if (searchQuery) query = query.ilike('id', `%${searchQuery}%`); // Sipariş ID'sine göre arama

    // Sıralama ve Sayfalama
    const from = (page - 1) * ORDERS_PER_PAGE;
    const to = from + ORDERS_PER_PAGE - 1;
    query = query.order('siparis_tarihi', { ascending: false }).range(from, to);

    const { data: siparisler, error, count } = await query;

    if (error) {
        console.error("Partner siparişleri çekilirken hata:", error);
    }
    
    const pageCount = count ? Math.ceil(count / ORDERS_PER_PAGE) : 0;

    // 3. Veriyi ve gerekli bilgileri Client Component'e aktar
    return (
        <SiparislerClient
            initialSiparisler={siparisler || []}
            totalCount={count || 0}
            pageCount={pageCount}
            currentPage={page}
            dictionary={dictionary}
            locale={locale}
        />
    );
}