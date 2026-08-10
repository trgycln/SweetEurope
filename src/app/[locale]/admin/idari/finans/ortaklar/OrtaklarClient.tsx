'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiX, FiBriefcase, FiTrendingDown, FiTrendingUp, FiCreditCard } from 'react-icons/fi';
import { toast } from 'sonner';
import { createOrtakIslemi, deleteOrtakIslemi } from '@/app/actions/ortak-actions';

interface OrtakIslemi {
    id: string;
    ortak_id: string;
    tarih: string;
    islem_tipi: string;
    tutar: number;
    aciklama: string | null;
    profiller?: { tam_ad: string | null } | null;
}

interface Profil {
    id: string;
    tam_ad: string | null;
    rol: string | null;
}

interface OrtakOzet {
    tam_ad: string;
    sermaye: number;
    avans_ve_odeme: number;
    hakedis: number;
    bakiye: number;
}

interface Props {
    islemler: OrtakIslemi[];
    profiller: Profil[];
    aktifOrtaklar: OrtakOzet[];
    locale: string;
    isAdmin: boolean;
    currentUserId: string;
    isSuperAdmin: boolean;
}

const ISLEM_TIPLERI = [
    'Sermaye Ekleme',
    'Maaş Tahakkuku',
    'Şirket İçin Cepten Harcama',
    'Şahsi Harcama / Avans',
    'Maaş / Nakit Çıkışı',
    'Kar Payı / Temettü',
    'Sermaye Çıkışı'
];

const fmt = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);

function IslemModal({
    onClose,
    profiller
}: {
    onClose: () => void;
    profiller: Profil[];
}) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const [islemTipi, setIslemTipi] = useState('Sermaye Ekleme');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            const result = await createOrtakIslemi(fd);
            if (result.success) {
                toast.success('İşlem eklendi');
                onClose();
                router.refresh();
            } else {
                toast.error(result.error || 'İşlem eklenemedi');
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">💼 Yeni Ortak İşlemi</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <FiX size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ortak <span className="text-red-500">*</span></label>
                        <select name="ortak_id" required
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                            <option value="">Seçiniz...</option>
                            {profiller.map(p => (
                                <option key={p.id} value={p.id}>{p.tam_ad}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">İşlem Tipi <span className="text-red-500">*</span></label>
                            <select name="islem_tipi" required value={islemTipi} onChange={e => setIslemTipi(e.target.value)}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                                {ISLEM_TIPLERI.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tarih <span className="text-red-500">*</span></label>
                            <input type="date" name="tarih" required
                                defaultValue={new Date().toISOString().split('T')[0]}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </div>
                    </div>

                    {(islemTipi === 'Sermaye Ekleme' || islemTipi === 'Sermaye Çıkışı' || islemTipi === 'Maaş / Nakit Çıkışı' || islemTipi === 'Şahsi Harcama / Avans') && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kasa Senkronizasyonu (İsteğe Bağlı)</label>
                            <p className="text-[10px] text-slate-500 mb-2">Eğer bu işlem gerçekten şirketin kasasından nakit olarak çıktıysa/girdiyse, Kasa İşlemleri sayfasına da otomatik eklenmesini sağlayabilirsiniz.</p>
                            <select name="kasa_tipi" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                                <option value="">Kasaya Yansıtma (Sadece Cari Hesap)</option>
                                <option value="Banka">Banka Hesabı</option>
                                <option value="Nakit">Nakit Kasa</option>
                            </select>
                        </div>
                    )}

                    {islemTipi === 'Maaş Tahakkuku' && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                            <strong>Otomasyon:</strong> Bu işlem onaylandığında, ana Giderler tablosuna da otomatik olarak Personel Maaş Gideri yansıtılacaktır.
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tutar (€) <span className="text-red-500">*</span></label>
                        <input type="number" name="tutar" required min="0.01" step="0.01" placeholder="0.00"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        <p className="text-[10px] text-slate-400 mt-1">İşlem tipine göre tutar otomatik (+) veya (-) olarak kaydedilir.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                        <input type="text" name="aciklama" placeholder="İşlem detayı..."
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                            İptal
                        </button>
                        <button type="submit" disabled={isPending}
                            className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors">
                            {isPending ? 'Kaydediliyor...' : '💾 Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function OrtaklarClient({
    islemler, profiller, aktifOrtaklar, locale, isAdmin, isSuperAdmin
}: Props) {
    const router = useRouter();
    const [modalOpen, setModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleDelete = (id: string) => {
        if (!confirm('Bu işlemi silmek istediğinize emin misiniz? (Otomatik oluşturulmuş gider kayıtları varsa manuel silmeniz gerekir)')) return;
        startTransition(async () => {
            const result = await deleteOrtakIslemi(id);
            if (result.success) {
                toast.success('İşlem silindi');
                router.refresh();
            } else {
                toast.error(result.error || 'Silme başarısız');
            }
        });
    };

    const toplamSermaye = aktifOrtaklar.reduce((sum, o) => sum + o.sermaye, 0);

    return (
        <div className="space-y-5">
            {modalOpen && <IslemModal onClose={() => setModalOpen(false)} profiller={profiller} />}

            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Ortak Cari Hesapları</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Sermaye girişleri, maaş hakedişleri ve şahsi avansların takibi
                    </p>
                </div>
                {isSuperAdmin && (
                    <div className="flex items-center gap-2">
                        <button onClick={() => setModalOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
                            <FiPlus size={13} /> Yeni İşlem Ekle
                        </button>
                    </div>
                )}
            </div>

            {/* Ozet Kartlari */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aktifOrtaklar.map(ortak => (
                    <div key={ortak.tam_ad} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                    <FiBriefcase size={14} />
                                </span>
                                {ortak.tam_ad}
                            </h3>
                            <div className="text-right">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Güncel Bakiye</span>
                                <span className={`text-xl font-bold ${ortak.bakiye >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {fmt(ortak.bakiye)}
                                </span>
                            </div>
                        </div>
                        
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Ana Sermaye</span>
                                <span className="font-semibold text-slate-700">{fmt(ortak.sermaye)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 flex items-center gap-1">
                                    <FiTrendingUp size={12} className="text-blue-500"/>
                                    Tahakkuk (Maaş/Kar)
                                </span>
                                <span className="font-semibold text-slate-700">{fmt(ortak.hakedis)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500 flex items-center gap-1">
                                    <FiTrendingDown size={12} className="text-red-500"/>
                                    Çekilen (Avans/Nakit)
                                </span>
                                <span className="font-semibold text-slate-700">{fmt(ortak.avans_ve_odeme)}</span>
                            </div>
                        </div>

                        {toplamSermaye > 0 && ortak.sermaye > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-100">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                                    <span>Şirket Sermaye Payı</span>
                                    <span className="font-bold text-slate-700">
                                        %{(ortak.sermaye / toplamSermaye * 100).toFixed(1)}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(ortak.sermaye / toplamSermaye * 100)}%` }} />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                
                {aktifOrtaklar.length === 0 && (
                    <div className="col-span-full py-8 text-center bg-slate-50 border border-slate-100 rounded-xl">
                        <p className="text-slate-500 text-sm">Henüz sistemde aktif ortak bakiyesi bulunmuyor.</p>
                    </div>
                )}
            </div>

            {/* İslem Listesi */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700">Tüm İşlem Geçmişi</h3>
                    <span className="text-xs text-slate-400">{islemler.length} işlem</span>
                </div>
                
                {islemler.length === 0 ? (
                    <div className="py-10 text-center">
                        <FiCreditCard className="mx-auto text-slate-300 mb-2" size={24} />
                        <p className="text-sm text-slate-500">İşlem bulunamadı</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase">Tarih</th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase">Ortak</th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase">İşlem Tipi</th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase">Açıklama</th>
                                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase">Tutar</th>
                                    <th className="px-3 py-2.5 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {islemler.map((islem) => {
                                    const isPositive = islem.tutar >= 0;
                                    return (
                                        <tr key={islem.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                                                {new Date(islem.tarih).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-800">
                                                {islem.profiller?.tam_ad || 'Bilinmiyor'}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                    islem.islem_tipi.includes('Sermaye Ekleme') ? 'bg-blue-100 text-blue-700' :
                                                    islem.islem_tipi.includes('Maaş Tahakkuku') ? 'bg-green-100 text-green-700' :
                                                    islem.islem_tipi.includes('Avans') || islem.islem_tipi.includes('Çıkışı') ? 'bg-amber-100 text-amber-800' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {islem.islem_tipi}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-xs text-slate-600 max-w-[200px] truncate">
                                                {islem.aciklama || '—'}
                                            </td>
                                            <td className={`px-3 py-3 whitespace-nowrap text-right text-sm font-bold ${
                                                isPositive ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {isPositive ? '+' : ''}{fmt(islem.tutar)}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap text-right">
                                                {isSuperAdmin && (
                                                    <button onClick={() => handleDelete(islem.id)} disabled={isPending}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                        title="Sil">
                                                        <FiX size={14} />
                                                    </button>
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
        </div>
    );
}
