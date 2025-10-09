// src/app/admin/pazarlama/blog/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiEdit, FiPlus, FiSlash } from 'react-icons/fi';
import Link from 'next/link';

// Yazı durumuna göre renk döndüren obje
const DURUM_RENKLERI: Record<string, string> = {
    'Taslak': "bg-yellow-100 text-yellow-800",
    'Yayınlandı': "bg-green-100 text-green-800",
};

export default async function BlogYonetimPage() {
    const supabase = createSupabaseServerClient();

    // Güvenlik: Sayfaya sadece 'Yönetici' erişebilir.
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user!.id).single();
    if (profile?.rol !== 'Yönetici') {
        return (
            <div className="p-8 text-center">
                <FiSlash className="mx-auto text-5xl text-red-500 mb-4" />
                <h1 className="font-serif text-2xl text-red-600">Erişim Reddedildi</h1>
            </div>
        );
    }

    const { data: yazilar, error } = await supabase
        .from('blog_yazilari')
        .select('id, baslik, durum, yayinlanma_tarihi')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Blog yazıları çekilirken hata:", error);
        return <div>Yazılar yüklenirken bir hata oluştu.</div>;
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">İçerik Yönetimi (Blog)</h1>
                    <p className="text-text-main/80 mt-1">{yazilar.length} adet yazı bulundu.</p>
                </div>
                <Link href="/admin/pazarlama/blog/yeni" className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm w-full sm:w-auto">
                    <FiPlus size={18} />
                    Yeni Yazı Oluştur
                </Link>
            </header>

            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-bg-subtle">
                    <thead className="bg-bg-subtle">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase">Başlık</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase">Durum</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase">Yayınlanma Tarihi</th>
                            <th className="relative px-6 py-3"><span className="sr-only">Düzenle</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-bg-subtle">
                        {yazilar.map(yazi => (
                            <tr key={yazi.id} className="hover:bg-bg-subtle/50">
                                <td className="px-6 py-4 font-bold text-primary">{yazi.baslik}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${DURUM_RENKLERI[yazi.durum]}`}>
                                        {yazi.durum}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-text-main">
                                    {yazi.yayinlanma_tarihi ? new Date(yazi.yayinlanma_tarihi).toLocaleDateString('tr-TR') : '-'}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    <Link href={`/admin/pazarlama/blog/${yazi.id}`} className="text-accent hover:underline">Düzenle</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}