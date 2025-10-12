// src/app/admin/operasyon/urunler/[urunId]/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { UrunFormu } from '../urun-formu'; // Ortak formu import ediyoruz

export default async function UrunDuzenlemeSayfasi({ params }: { params: { urunId: string } }) {
    const supabase = createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // YENİ: Gerekli tüm verileri (birimler dahil) Promise.all ile paralel olarak çek
    const [urunRes, kategorilerRes, tedarikcilerRes, birimlerRes] = await Promise.all([
        supabase.from('urunler').select('*').eq('id', params.urunId).single(),
        supabase.from('kategoriler').select('*').order('ad->>tr'),
        supabase.from('tedarikciler').select('id, unvan').order('unvan'),
        supabase.from('birimler').select('*').order('ad->>tr') // YENİ: Birim listesini çek
    ]);

    if (urunRes.error || !urunRes.data) {
        console.error("Ürün çekilirken hata:", urunRes.error);
        return notFound();
    }
    
    return (
        <div className="max-w-5xl mx-auto">
            <UrunFormu 
                mevcutUrun={urunRes.data} 
                kategoriler={kategorilerRes.data || []}
                tedarikciler={tedarikcilerRes.data || []}
                birimler={birimlerRes.data || []} // YENİ: Birimleri forma prop olarak gönder
            />
        </div>
    );
}