'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiEdit, FiSave, FiX, FiSearch, FiTrash2 } from 'react-icons/fi';
import { updateUrunOperasyonel, deleteUrun, guncelleUrunGorunurluk } from '@/app/actions/urun-actions';
import { getLocalizedName, formatCurrency } from '@/lib/utils';
import { Tables } from '@/lib/supabase/database.types';

// Tip tanımları, veritabanındaki en güncel ve tam haliyle
type Urun = Tables<'urunler'> & { kategoriler: Pick<Tables<'kategoriler'>, 'id' | 'ad'> | null };
type Kategori = Pick<Tables<'kategoriler'>, 'id' | 'ad'>;

// Görünürlük için yeniden kullanılabilir yardımcı bileşen
const GorunurlukToggle = ({ urun, onUpdate }: { urun: Urun, onUpdate: (id: string, yeniDurum: Urun['gorunurluk']) => void }) => {
    const [isPending, startTransition] = useTransition();

    const handleChange = (yeniDurum: Urun['gorunurluk']) => {
        startTransition(async () => {
            const result = await guncelleUrunGorunurluk(urun.id, yeniDurum);
            if(result.success) {
                toast.success('Görünürlük güncellendi!');
                onUpdate(urun.id, yeniDurum);
            } else {
                toast.error(`Hata: ${result.message}`);
            }
        });
    };

    const getBgColor = () => {
        switch(urun.gorunurluk) {
            case 'Herkese Açık': return 'bg-green-100 border-green-300 text-green-800';
            case 'Portal': return 'bg-blue-100 border-blue-300 text-blue-800';
            default: return 'bg-gray-100 border-gray-300 text-gray-800';
        }
    }

    return (
        <select value={urun.gorunurluk} onChange={(e) => handleChange(e.target.value as Urun['gorunurluk'])} className={`text-xs p-1 rounded border font-semibold ${getBgColor()}`} disabled={isPending}>
            <option value="Dahili">Dahili</option>
            <option value="Portal">Portal</option>
            <option value="Herkese Açık">Herkese Açık</option>
        </select>
    );
};

export function AnaFiyatListesiClient({ serverUrunler, serverKategoriler }: { serverUrunler: Urun[], serverKategoriler: Kategori[] }) {
    const [urunler, setUrunler] = useState(serverUrunler);
    const [searchTerm, setSearchTerm] = useState('');
    const [kategoriFilter, setKategoriFilter] = useState('');
    const [editingRowId, setEditingRowId] = useState<string | null>(null);
    const [editedData, setEditedData] = useState<Partial<Urun>>({});
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const filteredUrunler = useMemo(() => {
        return urunler
            .filter(urun => getLocalizedName(urun.urun_adi, 'de').toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(urun => kategoriFilter ? urun.kategoriler?.id === kategoriFilter : true);
    }, [urunler, searchTerm, kategoriFilter]);

    const handleEdit = (urun: Urun) => { setEditingRowId(urun.id); setEditedData(urun); };
    const handleCancel = () => { setEditingRowId(null); setEditedData({}); };
    const handleInputChange = (field: keyof Urun, value: string) => { setEditedData(prev => ({ ...prev, [field]: value })); };

    const handleUpdateGorunurluk = (id: string, yeniDurum: Urun['gorunurluk']) => {
        setUrunler(prev => prev.map(u => u.id === id ? { ...u, gorunurluk: yeniDurum } : u));
    };

    const handleSave = (urunId: string) => {
        startTransition(async () => {
            const result = await updateUrunOperasyonel(urunId, {
                liste_fiyati_kutu: editedData.liste_fiyati_kutu ? parseFloat(String(editedData.liste_fiyati_kutu)) : null,
                liste_fiyati_dilim_birim: editedData.liste_fiyati_dilim_birim ? parseFloat(String(editedData.liste_fiyati_dilim_birim)) : null,
                distributor_fiyati_kutu: editedData.distributor_fiyati_kutu ? parseFloat(String(editedData.distributor_fiyati_kutu)) : null,
                distributor_fiyati_dilim_birim: editedData.distributor_fiyati_dilim_birim ? parseFloat(String(editedData.distributor_fiyati_dilim_birim)) : null,
                iskonto_orani: editedData.iskonto_orani ? parseFloat(String(editedData.iskonto_orani)) : null,
            });

            if (result.success) {
                toast.success('Fiyatlar güncellendi.');
                setUrunler(prev => prev.map(u => u.id === urunId ? { ...u, ...editedData } : u));
                handleCancel();
            } else {
                toast.error(`Hata: ${result.message}`);
            }
        });
    };

    const handleSil = (urunId: string, urunAdi: string) => {
        if (window.confirm(`'${urunAdi}' adlı ürünü silmek istediğinizden emin misiniz?`)) {
            startTransition(async () => {
                const result = await deleteUrun(urunId);
                if (result.success) {
                    toast.success('Ürün silindi.');
                    setUrunler(prev => prev.filter(u => u.id !== urunId));
                } else {
                    toast.error(`Hata: ${result.message}`);
                }
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
                <input type="text" placeholder="Ürün adı veya kodu ile ara..." className="flex-grow p-2 border rounded-lg" onChange={(e) => setSearchTerm(e.target.value)} />
                <select className="w-full md:w-64 p-2 border rounded-lg" onChange={(e) => setKategoriFilter(e.target.value)}>
                    <option value="">Tüm Kategoriler</option>
                    {serverKategoriler.map(kat => (<option key={kat.id} value={kat.id}>{getLocalizedName(kat.ad, 'de')}</option>))}
                </select>
            </div>
            
            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                 <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="sticky left-0 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-600 z-10">Ürün Adı</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Görünürlük</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Kutu Gr.</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Dilim Gr.</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Liste F. (Kutu)</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Liste F. (Dilim)</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Dist. F. (Kutu)</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Dist. F. (Dilim)</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600">İskonto %</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Kutu İçi Adet</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Koli İçi Kutu</th>
                            <th className="px-3 py-2 text-right font-semibold text-gray-600">Eylemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredUrunler.map(urun => {
                            const isEditing = editingRowId === urun.id;
                            const urunAdi = getLocalizedName(urun.urun_adi, 'de');
                            return (
                                <tr key={urun.id} className={isEditing ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                <td className="sticky left-0 bg-inherit px-3 py-2 font-bold z-10">
                    <Link href={`/admin/operasyon/urunler/${urun.id}`} className="text-primary hover:underline">{urunAdi}</Link>
                </td>
                                    <td className="px-3 py-2"><GorunurlukToggle urun={urun} onUpdate={handleUpdateGorunurluk} /></td>
                                    <td className="px-3 py-2 text-right">{urun.kutu_gramaj ? `${urun.kutu_gramaj} gr` : '-'}</td>
                                    <td className="px-3 py-2 text-right">{urun.dilim_gramaj ? `${urun.dilim_gramaj} gr` : '-'}</td>
                                    <td className="px-3 py-2 text-right">{isEditing ? <input type="number" step="0.01" value={editedData.liste_fiyati_kutu ?? ''} onChange={(e) => handleInputChange('liste_fiyati_kutu', e.target.value)} className="w-20 p-1 border rounded text-right" /> : <span className="font-semibold text-green-700">{formatCurrency(urun.liste_fiyati_kutu)}</span>}</td>
                                    <td className="px-3 py-2 text-right">{isEditing ? <input type="number" step="0.01" value={editedData.liste_fiyati_dilim_birim ?? ''} onChange={(e) => handleInputChange('liste_fiyati_dilim_birim', e.target.value)} className="w-20 p-1 border rounded text-right" /> : <span className="font-semibold text-green-600">{formatCurrency(urun.liste_fiyati_dilim_birim)}</span>}</td>
                                    <td className="px-3 py-2 text-right">{isEditing ? <input type="number" step="0.01" value={editedData.distributor_fiyati_kutu ?? ''} onChange={(e) => handleInputChange('distributor_fiyati_kutu', e.target.value)} className="w-20 p-1 border rounded text-right" /> : <span className="font-semibold text-blue-700">{formatCurrency(urun.distributor_fiyati_kutu)}</span>}</td>
                                    <td className="px-3 py-2 text-right">{isEditing ? <input type="number" step="0.01" value={editedData.distributor_fiyati_dilim_birim ?? ''} onChange={(e) => handleInputChange('distributor_fiyati_dilim_birim', e.target.value)} className="w-20 p-1 border rounded text-right" /> : <span className="font-semibold text-blue-600">{formatCurrency(urun.distributor_fiyati_dilim_birim)}</span>}</td>
                                    <td className="px-3 py-2 text-right">{isEditing ? <input type="number" step="0.01" value={editedData.iskonto_orani ?? ''} onChange={(e) => handleInputChange('iskonto_orani', e.target.value)} className="w-16 p-1 border rounded text-right" /> : <span>{urun.iskonto_orani ? `${urun.iskonto_orani}%` : '-'}</span>}</td>
                                    <td className="px-3 py-2 text-right">{urun.kutu_ici_adet || '-'}</td>
                                    <td className="px-3 py-2 text-right">{urun.koli_ici_kutu_adet || '-'}</td>
                                    <td className="px-3 py-2 text-right">
                                        <div className="flex justify-end gap-3 items-center">
                                            {isEditing ? (
                                                <>
                                                    <button onClick={() => handleSave(urun.id)} disabled={isPending} className="text-green-600 disabled:opacity-50"><FiSave size={16}/></button>
                                                    <button onClick={handleCancel} disabled={isPending} className="text-gray-500"><FiX size={16}/></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleEdit(urun)} className="text-blue-600"><FiEdit size={14}/></button>
                                                    <button onClick={() => handleSil(urun.id, urunAdi)} className="text-red-600"><FiTrash2 size={14}/></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}