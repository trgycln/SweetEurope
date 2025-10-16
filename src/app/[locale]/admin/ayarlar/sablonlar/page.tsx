// src/app/admin/ayarlar/sablonlar/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SablonYonetimIstemcisi } from './sablon-yonetim-istemcisi'; // Yeni bileşeni import et

export default async function SablonYonetimPage() {
    const supabase = createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // Sunucuda sadece tüm kategorileri çekiyoruz. Geri kalanını istemci halledecek.
    const { data: kategoriler, error: kategoriError } = await supabase
        .from('kategoriler')
        .select('id, ad')
        .order('ad->>tr', { ascending: true }); // Türkçe isme göre sıralayalım

    if (kategoriError) {
        console.error("Kategoriler çekilirken hata:", kategoriError);
        return <div className="p-6 text-red-500">Kategoriler yüklenemedi.</div>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Özellik Şablonları</h1>
                <p className="text-text-main/80 mt-1">
                    Ürün kategorileri için teknik özellik alanlarını buradan yönetebilirsiniz.
                </p>
            </header>

            <SablonYonetimIstemcisi
                serverKategoriler={kategoriler || []}
                locale="tr" // Şimdilik Türkçe, ileride dinamik hale getirilecek
            />
        </div>
    );
}