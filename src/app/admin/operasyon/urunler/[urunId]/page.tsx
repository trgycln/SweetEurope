// src/app/admin/operasyon/urunler/[urunId]/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { UrunFormu } from '../urun-formu'; // Ortak formu import ediyoruz

export default async function UrunDuzenlemeSayfasi({ params }: { params: { urunId: string } }) {
    // 1. Supabase istemcisini oluştur (HATANIN ÇÖZÜMÜ)
    const supabase = createSupabaseServerClient();
    
    // 2. Güvenlik: Kullanıcı doğrulaması
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // 3. Gerekli tüm verileri Promise.all ile paralel olarak çek
    const [urunRes, kategorilerRes, tedarikcilerRes] = await Promise.all([
        supabase.from('urunler').select('*').eq('id', params.urunId).single(),
        supabase.from('kategoriler').select('*').order('ad->>tr'),
        supabase.from('tedarikciler').select('id, unvan').order('unvan')
    ]);

    // 4. Hata Kontrolü: Ürün bulunamazsa 404 sayfasına yönlendir
    if (urunRes.error || !urunRes.data) {
        console.error("Ürün çekilirken hata:", urunRes.error);
        return notFound();
    }
    
    return (
        <div className="max-w-5xl mx-auto">
            {/* Ortak forma mevcut ürünü, kategorileri ve tedarikçileri gönderiyoruz */}
            <UrunFormu 
                mevcutUrun={urunRes.data} 
                kategoriler={kategorilerRes.data || []}
                tedarikciler={tedarikcilerRes.data || []}
            />
        </div>
    );
}