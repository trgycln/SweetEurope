import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLocalizedName } from '@/lib/utils';
import { KategoriYonetimClient } from '@/components/kategori-yonetim-client'; // Yeni oluşturacağımız bileşen

export default async function KategoriYonetimiPage() {
    // ## KORREKTUR: 'await' wurde hier hinzugefügt ##
    const supabase = await createSupabaseServerClient();

    // Güvenlik
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'Yönetici') return redirect('/admin/dashboard');

    // Mevcut kategorileri çek
    const { data: kategoriler } = await supabase.from('kategoriler').select('*').order('created_at');

    return (
        <div className="space-y-8">
            <h1 className="font-serif text-4xl font-bold text-primary">Kategori Yönetimi</h1>
            <p className="text-text-main/80 -mt-6">Ürün kategorilerinizi buradan yönetin. Burada oluşturulan kategoriler, ürün ekleme formunda otomatik olarak görünecektir.</p>
            <KategoriYonetimClient serverKategoriler={kategoriler || []} />
        </div>
    );
}