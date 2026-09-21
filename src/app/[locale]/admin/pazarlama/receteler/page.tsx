import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FiEdit, FiPlus, FiSlash, FiCoffee } from 'react-icons/fi';
import Link from 'next/link';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import DeleteRecipeButton from './components/DeleteRecipeButton';

const getCategoryLabel = (cat: string) => {
    switch (cat?.toLowerCase()) {
        case 'coffee': return 'Kahve';
        case 'cocktail': return 'Kokteyl';
        case 'mocktail': return 'Mocktail';
        case 'smoothie': return 'Smoothie';
        default: return cat || 'Diğer';
    }
};

export default async function ReceteYonetimiPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Güvenlik: Sayfaya sadece 'Yönetici' erişebilir.
    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return <div>Lütfen giriş yapın.</div>;
    
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (profile?.rol !== 'Yönetici') {
        return (
            <div className="p-8 text-center">
                <FiSlash className="mx-auto text-5xl text-red-500 mb-4" />
                <h1 className="font-serif text-2xl text-red-600">Erişim Reddedildi</h1>
            </div>
        );
    }

    const { data: receteler, error } = await supabase
        .from('recipes')
        .select('id, title, category, locale, prep_time_minutes, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Reçeteler çekilirken hata:", error);
        return <div>Reçeteler yüklenirken bir hata oluştu.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-primary flex items-center gap-2">
                        <FiCoffee className="text-amber-600" />
                        Reçete Yönetimi
                    </h1>
                    <p className="text-text-main/80 mt-1">Sistemdeki tüm özel kahve ve kokteyl reçetelerini yönetin.</p>
                </div>
                <Link
                    href={`/${locale}/barista-ai`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-lg shadow-md hover:bg-amber-700 font-bold text-sm transition-colors"
                >
                    <FiPlus /> Yeni Reçete Üret (Barista AI)
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Başlık</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Dil</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {receteler?.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        Henüz hiç reçete oluşturulmamış. "Yeni Reçete Üret" butonuna tıklayarak Barista AI ile oluşturabilirsiniz.
                                    </td>
                                </tr>
                            )}
                            {receteler?.map((recete) => (
                                <tr key={recete.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {recete.title}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                            {getCategoryLabel(recete.category)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 uppercase">
                                        {recete.locale}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {recete.created_at ? new Date(recete.created_at).toLocaleDateString('tr-TR') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link
                                            href={`/${locale}/admin/pazarlama/receteler/${recete.id}/duzenle`}
                                            className="text-amber-600 hover:text-amber-800 inline-flex items-center gap-1 mr-4"
                                        >
                                            <FiEdit /> Düzenle
                                        </Link>
                                        <DeleteRecipeButton id={recete.id} />
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
