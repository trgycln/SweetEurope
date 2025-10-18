import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database, Tables, Enums } from '@/lib/supabase/database.types';
import { FiPlus, FiRss, FiCalendar } from 'react-icons/fi';
import DuyuruFiltreleri from './DuyuruFiltreleri';

export const dynamic = 'force-dynamic';

type DuyuruRow = Tables<'duyurular'> & {
    olusturan: {
        tam_ad: string | null;
    } | null;
};

const HEDEF_RENKLERI: Record<Enums<'hedef_rol'>, string> = {
    "Tüm Partnerler": "bg-blue-100 text-blue-800",
    "Sadece Alt Bayiler": "bg-purple-100 text-purple-800",
};

export default async function DuyurularListPage({
    searchParams,
}: {
    searchParams?: {
        q?: string;
        aktif?: string;
        hedef?: string;
    };
}) {
    const supabase = createSupabaseServerClient();

    const searchQuery = searchParams?.q || '';
    const aktifFilter = searchParams?.aktif || '';
    const hedefFilter = searchParams?.hedef || '';

    let query = supabase
        .from('duyurular')
        .select(`
            *, 
            olusturan:profiller(tam_ad)
        `);

    if (searchQuery) {
        query = query.ilike('baslik', `%${searchQuery}%`);
    }
    if (aktifFilter) {
        query = query.eq('aktif', aktifFilter === 'true');
    }
    if (hedefFilter) {
        query = query.eq('hedef_kitle', hedefFilter);
    }
    
    const { data: duyurular, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error("Server: Duyuru verileri çekilirken hata oluştu:", JSON.stringify(error, null, 2));
        return <div className="p-6 text-red-500">Duyuru listesi yüklenirken bir hata oluştu.</div>;
    }

    const duyuruListesi: DuyuruRow[] = duyurular as any;
    const duyuruSayisi = duyuruListesi.length;
    
    // Filtre bileşenine göndermek için ENUM değerlerini alıyoruz
    const hedefKitleOptions: Enums<'hedef_rol'>[] = ["Tüm Partnerler", "Sadece Alt Bayiler"];

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">Duyuru Yönetimi</h1>
                    <p className="text-text-main/80 mt-1">{duyuruSayisi} adet duyuru listeleniyor.</p>
                </div>
                {/* Gelecek adımda bu link için yeni bir sayfa oluşturacağız */}
                <Link href="/admin/pazarlama/duyurular/yeni" passHref>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                        <FiPlus size={18} />
                        Yeni Duyuru Oluştur
                    </button>
                </Link>
            </header>

            <DuyuruFiltreleri hedefKitleOptions={hedefKitleOptions} />

            {duyuruSayisi === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-bg-subtle rounded-lg bg-white shadow-sm">
                    <FiRss className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {searchQuery || aktifFilter || hedefFilter ? 'Filtreye Uygun Duyuru Bulunamadı' : 'Henüz Duyuru Oluşturulmamış'}
                    </h2>
                    <p className="mt-2 text-text-main/70">
                        {searchQuery || aktifFilter || hedefFilter ? 'Arama kriterlerinizi değiştirmeyi deneyin.' : 'Başlamak için yeni bir duyuru oluşturun.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-bg-subtle">
                        <thead className="bg-bg-subtle">
                            <tr>
                                {['Başlık', 'Hedef Kitle', 'Oluşturan', 'Yayın Tarihi', 'Durum'].map(header => (
                                    <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">
                                        {header}
                                    </th>
                                ))}
                                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Düzenle</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-bg-subtle">
                            {duyuruListesi.map((duyuru) => (
                                <tr key={duyuru.id} className="hover:bg-bg-subtle/50 transition-colors duration-150">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                        {/* Gelecekte bu link düzenleme sayfasına gidecek */}
                                        <Link href={`/admin/pazarlama/duyurular/${duyuru.id}`} className="hover:underline text-accent">
                                            {duyuru.baslik}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold leading-5 rounded-full ${HEDEF_RENKLERI[duyuru.hedef_kitle] || 'bg-gray-100'}`}>
                                            {duyuru.hedef_kitle}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{duyuru.olusturan?.tam_ad || 'Bilinmiyor'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{formatDate(duyuru.yayin_tarihi)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${duyuru.aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {duyuru.aktif ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/admin/pazarlama/duyurular/${duyuru.id}`} className="text-accent hover:text-accent-dark">
                                            Düzenle
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}