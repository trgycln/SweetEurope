// src/app/admin/operasyon/urunler/yeni/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UrunFormu } from '../urun-formu'; // Ortak formu import ediyoruz

export default async function YeniUrunSayfasi() {
    const supabase = createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // YENİ: Form için gerekli listeleri (birimler dahil) çek
    const [kategorilerRes, tedarikcilerRes, birimlerRes] = await Promise.all([
        supabase.from('kategoriler').select('*').order('ad->>tr'),
        supabase.from('tedarikciler').select('id, unvan').order('unvan'),
        supabase.from('birimler').select('*').order('ad->>tr') // YENİ: Birim listesini çek
    ]);

    return (
        <div className="max-w-5xl mx-auto">
            <UrunFormu
                kategoriler={kategorilerRes.data || []}
                tedarikciler={tedarikcilerRes.data || []}
                birimler={birimlerRes.data || []} // YENİ: Birimleri forma prop olarak gönder
            />
        </div>
    );
}