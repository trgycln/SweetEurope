// src/app/admin/operasyon/urunler/[urunId]/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { UrunFormu } from '../urun-formu';

export default async function UrunDuzenlemeSayfasi({ params }: { params: { urunId: string } }) {
    const supabase = createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    const [urunRes, kategorilerRes, tedarikcilerRes, birimlerRes] = await Promise.all([
        supabase.from('urunler').select('*, kategoriler (id)').eq('id', params.urunId).single(),
        supabase.from('kategoriler').select('*').order('ad->>tr'),
        supabase.from('tedarikciler').select('id, unvan').order('unvan'),
        supabase.from('birimler').select('*').order('ad->>tr')
    ]);

    if (urunRes.error || !urunRes.data) {
        return notFound();
    }
    const urun = urunRes.data;

    // @ts-ignore
    const kategoriId = urun.kategoriler?.id;
    if (!kategoriId) {
        return <div className="p-6 text-red-500">Kritik Hata: Ürünün kategorisi bulunamadı.</div>;
    }

    const { data: sablon, error: sablonError } = await supabase
        .from('kategori_ozellik_sablonlari')
        .select('*')
        .eq('kategori_id', kategoriId)
        .order('sira', { ascending: true });

    if (sablonError) {
        return <div className="p-6 text-red-500">Bu ürün kategorisine ait özellik şablonları yüklenemedi.</div>;
    }
    
    return (
        <div className="max-w-5xl mx-auto">
            <UrunFormu 
                mevcutUrun={urun} 
                kategoriler={kategorilerRes.data || []}
                tedarikciler={tedarikcilerRes.data || []}
                birimler={birimlerRes.data || []}
                serverSablon={sablon || []}
            />
        </div>
    );
}