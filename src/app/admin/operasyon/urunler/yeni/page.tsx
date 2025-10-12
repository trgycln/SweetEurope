// src/app/admin/operasyon/urunler/yeni/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UrunFormu } from '../urun-formu'; // Ortak formu import ediyoruz

export default async function YeniUrunSayfasi() {
    // 1. Supabase istemcisini oluştur
    const supabase = createSupabaseServerClient();
    
    // 2. Güvenlik: Kullanıcı doğrulaması
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // 3. Form için gerekli listeleri çek (ürün yok)
    const [kategorilerRes, tedarikcilerRes] = await Promise.all([
        supabase.from('kategoriler').select('*').order('ad->>tr'),
        supabase.from('tedarikciler').select('id, unvan').order('unvan')
    ]);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Ortak forma 'mevcutUrun' prop'unu vermiyoruz, böylece boş açılacak */}
            <UrunFormu
                kategoriler={kategorilerRes.data || []}
                tedarikciler={tedarikcilerRes.data || []}
            />
        </div>
    );
}