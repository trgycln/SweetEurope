'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { FiPlus, FiTrash2, FiEdit, FiSearch, FiPackage } from 'react-icons/fi';
import { deleteUrun } from '@/app/actions/urun-actions';
import { getLocalizedName, formatCurrency } from '@/lib/utils'; // MERKEZİ FONKSİYONLARI İMPORT EDİYORUZ
import { useRouter } from 'next/navigation';

// Tipler
type Urun = {
    id: string; urun_kodu: string; urun_adi: any;
    temel_satis_fiyati: number; stok_adeti: number;
    stok_azaldi_esigi: number; stok_bitti_esigi: number;
    kategoriler: { id: string, ad: any } | null;
};
type Kategori = { id: string; ad: any; };
type UserRole = 'Yönetici' | 'Ekip Üyesi' | 'Personel' | 'Müşteri' | 'Alt Bayi';

interface UrunListesiClientProps {
    serverUrunler: Urun[];
    serverKategoriler: Kategori[];
    userRole: UserRole;
}

export function UrunListesiClient({ serverUrunler, serverKategoriler, userRole }: UrunListesiClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [kategoriFilter, setKategoriFilter] = useState('');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const filteredUrunler = useMemo(() => {
        return serverUrunler
            .filter(urun => 
                getLocalizedName(urun.urun_adi, 'de').toLowerCase().includes(searchTerm.toLowerCase())
            )
            .filter(urun => 
                kategoriFilter ? urun.kategoriler?.id === kategoriFilter : true
            );
    }, [serverUrunler, searchTerm, kategoriFilter]);

    const getStockStatus = (urun: Urun) => {
        if (urun.stok_adeti <= urun.stok_bitti_esigi) return { text: 'Tükendi', color: 'text-red-800 bg-red-100' };
        if (urun.stok_adeti <= urun.stok_azaldi_esigi) return { text: 'Stok Azaldı', color: 'text-yellow-800 bg-yellow-100' };
        return { text: 'Yeterli Stok', color: 'text-green-800 bg-green-100' };
    };
    
    const handleSil = (urunId: string, urunAdi: string) => {
        if (window.confirm(`'${urunAdi}' adlı ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            startTransition(async () => {
                const result = await deleteUrun(urunId);
                if (!result.success) {
                    alert(`Hata: ${result.message}`);
                }
                router.refresh(); // Sayfayı yeniden yükleyerek güncel veriyi göster
            });
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">Ürün Kataloğu</h1>
                    <p className="text-text-main/80 mt-1">{filteredUrunler.length} adet ürün listeleniyor.</p>
                </div>
                {userRole === 'Yönetici' && (
                     <Link href="/admin/operasyon/urunler/yeni" passHref>
                        <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                            <FiPlus size={18} />
                            Yeni Ürün Ekle
                        </button>
                    </Link>
                )}
            </header>
            
            <div className="flex flex-col md:flex-row gap-4">
                {/* ... Arama ve Filtreleme UI ... */}
                 <div className="relative flex-grow">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Ürün adıyla ara..." className="w-full pl-10 pr-4 py-2 border rounded-lg" onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="w-full md:w-64 p-2 border rounded-lg" onChange={(e) => setKategoriFilter(e.target.value)}>
                    <option value="">Tüm Kategoriler</option>
                    {serverKategoriler.map(kat => (
                        <option key={kat.id} value={kat.id}>{getLocalizedName(kat.ad, 'de')}</option>
                    ))}
                </select>
            </div>

            {filteredUrunler.length === 0 ? (
                <div className="text-center py-16"><FiPackage className="mx-auto text-5xl text-gray-300 mb-4" /><p>Gösterilecek ürün bulunamadı.</p></div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ürün Adı</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Kategori</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Satış Fiyatı</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Stok</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Eylemler</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUrunler.map((urun) => {
                                const status = getStockStatus(urun);
                                const urunAdi = getLocalizedName(urun.urun_adi, 'de');
                                return (
                                    <tr key={urun.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-gray-900">{urunAdi}</td>
                                        <td className="px-6 py-4 text-gray-500">{urun.kategoriler ? getLocalizedName(urun.kategoriler.ad, 'de') : 'Kategorisiz'}</td>
                                        <td className="px-6 py-4 font-semibold">{formatCurrency(urun.temel_satis_fiyati)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{urun.stok_adeti}</span>
                                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${status.color}`}>{status.text}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right flex gap-4 justify-end">
                                            <Link href={`/admin/operasyon/urunler/${urun.id}`} className="text-blue-600 hover:text-blue-800"><FiEdit/></Link>
                                            {userRole === 'Yönetici' && (
                                                <button onClick={() => handleSil(urun.id, urunAdi)} disabled={isPending} className="text-red-600 hover:text-red-800 disabled:opacity-50"><FiTrash2/></button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}