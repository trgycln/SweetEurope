'use client';

import { useState, useTransition } from 'react';
import { FiPlus, FiTrash2, FiDollarSign, FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { createKasaIslemiAction, deleteKasaIslemiAction } from '@/app/actions/kasa-actions';
import { toast } from 'sonner';

type KasaIslemi = {
    id: string;
    tarih: string;
    islem_tipi: string;
    kasa_tipi: string;
    tutar: number;
    aciklama: string | null;
    profiller: { tam_ad: string | null } | null;
};

export default function KasaClient({ islemler, profiller, isSuperAdmin }: { 
    islemler: KasaIslemi[];
    profiller: { id: string; tam_ad: string | null; rol: string | null }[];
    isSuperAdmin: boolean;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [secilenIslemTipi, setSecilenIslemTipi] = useState('sermaye_girisi');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        startTransition(async () => {
            const result = await createKasaIslemiAction(formData);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(result.success);
                setIsModalOpen(false);
            }
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
            startTransition(async () => {
                const result = await deleteKasaIslemiAction(id);
                if (result.error) {
                    toast.error(result.error);
                } else {
                    toast.success(result.success);
                }
            });
        }
    };

    const getIslemIcon = (tip: string) => {
        if (tip.includes('giris') || tip === 'borc_alma' || tip === 'diger_giris') return <FiArrowDownRight className="text-emerald-500" />;
        return <FiArrowUpRight className="text-rose-500" />;
    };

    const getTipLabel = (tip: string) => {
        const map: Record<string, string> = {
            'sermaye_girisi': 'Sermaye Girişi',
            'sermaye_cikisi': 'Sermaye Çıkışı',
            'borc_alma': 'Borç Alınan',
            'borc_odeme': 'Borç Ödenen',
            'transfer': 'Kasa Transferi',
            'diger_giris': 'Diğer Giriş',
            'diger_cikis': 'Diğer Çıkış'
        };
        return map[tip] || tip;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Kasa İşlemleri</h1>
                    <p className="text-slate-500 text-sm">Sermaye, borç ve diğer kasa giriş/çıkışlarını yönetin.</p>
                </div>
                {isSuperAdmin && (
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                        <FiPlus />
                        Yeni İşlem Ekle
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tarih</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">İşlem Tipi</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Kasa</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Açıklama</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Tutar</th>
                            <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-center">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {islemler.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Henüz işlem bulunmuyor.</td>
                            </tr>
                        ) : (
                            islemler.map((islem) => (
                                <tr key={islem.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {new Date(islem.tarih).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <div className="flex items-center gap-2 font-medium text-slate-700">
                                            {getIslemIcon(islem.islem_tipi)}
                                            {getTipLabel(islem.islem_tipi)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${islem.kasa_tipi === 'Nakit' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                            {islem.kasa_tipi}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {islem.aciklama}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-700 text-right">
                                        €{islem.tutar.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center">
                                        {isSuperAdmin && (
                                            <button 
                                                onClick={() => handleDelete(islem.id)}
                                                disabled={isPending}
                                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">Yeni Kasa İşlemi</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <FiPlus className="rotate-45 text-xl" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tarih</label>
                                    <input type="date" name="tarih" required defaultValue={new Date().toISOString().split('T')[0]} 
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tutar (€)</label>
                                    <input type="number" step="0.01" name="tutar" required min="0.01" placeholder="0.00"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">İşlem Tipi</label>
                                    <select name="islem_tipi" required 
                                        value={secilenIslemTipi}
                                        onChange={(e) => setSecilenIslemTipi(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                                        <option value="sermaye_girisi">Sermaye Girişi</option>
                                        <option value="borc_alma">Borç Alınan</option>
                                        <option value="sermaye_cikisi">Sermaye Çıkışı</option>
                                        <option value="borc_odeme">Borç Ödenen</option>
                                        <option value="transfer">Kasa Transferi</option>
                                        <option value="diger_giris">Diğer Giriş</option>
                                        <option value="diger_cikis">Diğer Çıkış</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Kasa</label>
                                    <select name="kasa_tipi" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                                        <option value="Banka">Banka Hesabı</option>
                                        <option value="Nakit">Nakit Kasa</option>
                                    </select>
                                </div>
                            </div>

                            {(secilenIslemTipi === 'sermaye_girisi' || secilenIslemTipi === 'sermaye_cikisi') && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">İlgili Ortak (Opsiyonel)</label>
                                    <select name="ortak_id" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                                        <option value="">Seçiniz...</option>
                                        {profiller.map(p => (
                                            <option key={p.id} value={p.id}>{p.tam_ad}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-1">Seçilirse, bu tutar otomatik olarak Ortaklar Cari Hesabına da yansıtılır.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Açıklama</label>
                                <textarea name="aciklama" required rows={2} placeholder="İşlem detayı..."
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} 
                                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                    İptal
                                </button>
                                <button type="submit" disabled={isPending}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
                                    {isPending ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
