// src/app/[locale]/admin/pazarlama/blog/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FiEdit, FiPlus, FiSlash } from 'react-icons/fi';
import Link from 'next/link';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

const DURUM_RENKLERI: Record<string, string> = {
    'Taslak': "bg-yellow-100 text-yellow-800",
    'Yayınlandı': "bg-green-100 text-green-800",
};

export default async function BlogYonetimPage() {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Güvenlik: Sayfaya sadece 'Yönetici' erişebilir.
    const { data: { user } } = await getGlobalCachedUser();
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-primary">Blog Yönetimi</h1>
                    <p className="text-text-main/80 mt-1">Blog yazılarını oluşturun, düzenleyin ve yayınlayın.</p>
                </div>
                <Link
                    href="/admin/pazarlama/blog/yeni"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm"
                >
                    <FiPlus /> Yeni Yazı Ekle
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Başlık</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Yayın Tarihi</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {yazilar?.map((yazi) => (
                                <tr key={yazi.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {(yazi.baslik as any)?.tr || (yazi.baslik as any)?.de || 'İsimsiz Başlık'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${DURUM_RENKLERI[yazi.durum] || 'bg-gray-100'}`}>
                                            {yazi.durum}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {yazi.yayinlanma_tarihi ? new Date(yazi.yayinlanma_tarihi).toLocaleDateString('tr-TR') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link
                                            href={`/admin/pazarlama/blog/${yazi.id}/duzenle`}
                                            className="text-accent hover:text-accent/80 inline-flex items-center gap-1"
                                        >
                                            <FiEdit /> Düzenle
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}