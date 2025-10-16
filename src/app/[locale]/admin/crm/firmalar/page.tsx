import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database, Tables } from '@/lib/supabase/database.types';
import { FiPlus, FiUsers, FiPhone } from 'react-icons/fi';
import FirmaFiltreleri from './FirmaFiltreleri';

export const dynamic = 'force-dynamic';

type FirmaRow = Tables<'firmalar'> & {
    sorumlu_personel: {
        tam_ad: string | null;
    } | null;
};
type FirmaStatus = Database['public']['Enums']['firma_status'];

const STATUS_RENKLERI: Record<FirmaStatus, string> = {
    "Potansiyel": "bg-blue-100 text-blue-800",
    "İlk Temas": "bg-gray-100 text-gray-800",
    "Numune Sunuldu": "bg-yellow-100 text-yellow-800",
    "Teklif Verildi": "bg-purple-100 text-purple-800",
    "Anlaşma Sağlandı": "bg-green-100 text-green-800",
    "Pasif": "bg-red-100 text-red-800"
};

export default async function FirmalarListPage({
    searchParams,
}: {
    searchParams?: {
        q?: string;
        status?: string;
    };
}) {
    const supabase = createSupabaseServerClient();

    const searchQuery = searchParams?.q || '';
    const statusFilter = searchParams?.status || '';

    let query = supabase
        .from('firmalar')
        .select(`
            id, unvan, kategori, status, telefon,
            sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad)
        `);

    if (searchQuery) {
        query = query.ilike('unvan', `%${searchQuery}%`);
    }

    if (statusFilter) {
        query = query.eq('status', statusFilter);
    }
    
    const { data: firmalar, error } = await query.order('unvan', { ascending: true });

    if (error) {
        console.error("Server: Firma verileri çekilirken hata oluştu:", error);
        return <div className="p-6 text-red-500">Firma listesi yüklenirken bir hata oluştu.</div>;
    }

    const firmaListesi: FirmaRow[] = firmalar as any;
    const firmaSayisi = firmaListesi.length;
    const statusOptions = Object.keys(STATUS_RENKLERI);

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">Müşteri Yönetimi (CRM)</h1>
                    <p className="text-text-main/80 mt-1">{firmaSayisi} adet firma listeleniyor.</p>
                </div>
                <Link href="/admin/crm/firmalar/yeni" passHref>
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                        <FiPlus size={18} />
                        Yeni Firma Ekle
                    </button>
                </Link>
            </header>

            <FirmaFiltreleri statusOptions={statusOptions} />

            {firmaSayisi === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-bg-subtle rounded-lg bg-white shadow-sm">
                    <FiUsers className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {searchQuery || statusFilter ? 'Filtreye Uygun Firma Bulunamadı' : 'Henüz Firma Kaydı Yok'}
                    </h2>
                    <p className="mt-2 text-text-main/70">
                        {searchQuery || statusFilter ? 'Arama kriterlerinizi değiştirmeyi deneyin.' : 'Başlamak için yeni bir firma ekleyin.'}
                    </p>
                </div>
            ) : (
                <div>
                    {/* Mobil Görünüm */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-6">
                        {firmaListesi.map((firma) => (
                            <Link key={firma.id} href={`/admin/crm/firmalar/${firma.id}`} className="block bg-white rounded-lg shadow-lg p-5 border-l-4 border-accent hover:shadow-xl hover:-translate-y-1 transition-all">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-serif text-xl font-bold text-primary">{firma.unvan}</h3>
                                        <p className="text-sm text-gray-500">{firma.kategori}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_RENKLERI[firma.status] || 'bg-gray-100'}`}>
                                        {firma.status}
                                    </span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-bg-subtle space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-text-main">
                                        <FiPhone size={14} className="text-gray-400"/>
                                        <span>{firma.telefon || 'Telefon belirtilmemiş'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-text-main">
                                        <FiUsers size={14} className="text-gray-400"/>
                                        <span>Sorumlu: {firma.sorumlu_personel?.tam_ad || 'Atanmamış'}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                    {/* Masaüstü Görünüm */}
                    <div className="hidden lg:block overflow-x-auto bg-white rounded-lg shadow-md">
                        <table className="min-w-full divide-y divide-bg-subtle">
                            <thead className="bg-bg-subtle">
                                <tr>
                                    {['Firma Unvanı', 'Kategori', 'Telefon', 'Sorumlu Personel', 'Statü'].map(header => (
                                        <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-bg-subtle">
                                {firmaListesi.map((firma) => (
                                    <tr key={firma.id} className="hover:bg-bg-subtle/50 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">
                                            <Link href={`/admin/crm/firmalar/${firma.id}`} className="hover:underline text-accent">
                                                {firma.unvan}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{firma.kategori}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{firma.telefon || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{firma.sorumlu_personel?.tam_ad || 'Atanmamış'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${STATUS_RENKLERI[firma.status] || 'bg-gray-100'}`}>{firma.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}