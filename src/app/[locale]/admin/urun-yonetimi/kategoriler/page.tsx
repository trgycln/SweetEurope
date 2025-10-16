// src/app/admin/urun-yonetimi/kategoriler/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { KategoriYonetimIstemcisi } from './kategori-yonetim-istemcisi';

export default async function KategoriYonetimPage() {
    const supabase = createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // Tüm kategorileri çekiyoruz. Hiyerarşiyi istemci tarafında kuracağız.
    const { data: kategoriler, error } = await supabase
        .from('kategoriler')
        .select('*')
        .order('ad->>tr', { ascending: true });

    if (error) {
        console.error("Kategoriler çekilirken hata:", error);
        return <div className="p-6 text-red-500">Kategoriler yüklenemedi.</div>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Kategori Yönetimi</h1>
                <p className="text-text-main/80 mt-1">
                    Ürün kategorilerinizi oluşturun, düzenleyin ve hiyerarşisini yönetin.
                </p>
            </header>

            <KategoriYonetimIstemcisi serverKategoriler={kategoriler || []} />
        </div>
    );
}