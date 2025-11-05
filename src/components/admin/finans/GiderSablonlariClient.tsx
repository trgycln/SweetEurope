'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiEdit, FiTrash2, FiToggleLeft, FiToggleRight, FiArrowLeft } from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { Tables } from '@/lib/supabase/database.types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { 
    createSablonAction, 
    updateSablonAction, 
    toggleSablonAktifAction, 
    deleteSablonAction 
} from '@/app/actions/gider-actions';

type GiderSablonWithDetails = Tables<'gider_sablonlari'> & {
    gider_kalemleri: {
        id: string;
        ad: string | null;
        ana_kategori_id: string;
        gider_ana_kategoriler: {
            ad: string | null;
        } | null;
    } | null;
};

type HauptKategorie = Tables<'gider_ana_kategoriler'>;
type GiderKalemi = Tables<'gider_kalemleri'>;

interface GiderSablonlariClientProps {
    initialSablonlar: GiderSablonWithDetails[];
    hauptKategorien: HauptKategorie[];
    giderKalemleri: GiderKalemi[];
    dictionary: Dictionary;
    locale: Locale;
}

export function GiderSablonlariClient({
    initialSablonlar,
    hauptKategorien,
    giderKalemleri,
    dictionary,
    locale
}: GiderSablonlariClientProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSablon, setEditingSablon] = useState<GiderSablonWithDetails | null>(null);

    const handleNewSablon = () => {
        setEditingSablon(null);
        setIsModalOpen(true);
    };

    const handleEdit = (sablon: GiderSablonWithDetails) => {
        setEditingSablon(sablon);
        setIsModalOpen(true);
    };

    const handleToggleAktif = async (sablon: GiderSablonWithDetails) => {
        const result = await toggleSablonAktifAction(sablon.id);
        if (result.success) {
            toast.success(result.message);
            router.refresh();
        } else {
            toast.error(result.error || 'Bir hata oluştu.');
        }
    };

    const handleDelete = async (sablon: GiderSablonWithDetails) => {
        if (!window.confirm(`"${sablon.gider_kalemleri?.ad}" şablonunu silmek istediğinizden emin misiniz?`)) {
            return;
        }
        const result = await deleteSablonAction(sablon.id);
        if (result.success) {
            toast.success(result.message);
            router.refresh();
        } else {
            toast.error(result.error || 'Bir hata oluştu.');
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const result = editingSablon
            ? await updateSablonAction(editingSablon.id, formData)
            : await createSablonAction(formData);

        if (result.success) {
            toast.success(result.message);
            setIsModalOpen(false);
            setEditingSablon(null);
            router.refresh();
        } else {
            toast.error(result.error || 'Bir hata oluştu.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link
                            href={`/${locale}/admin/idari/finans/giderler`}
                            className="text-gray-500 hover:text-primary transition-colors"
                        >
                            <FiArrowLeft size={24} />
                        </Link>
                        <h1 className="font-serif text-4xl font-bold text-primary">Gider Şablonları</h1>
                    </div>
                    <p className="text-text-main/80 mt-1 ml-9">
                        Aylık sabit giderler için şablon tanımlayın. Şablonlar otomatik gider oluşturmak için kullanılır.
                    </p>
                </div>
                <button
                    onClick={handleNewSablon}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm"
                >
                    <FiPlus size={18} />
                    Yeni Şablon
                </button>
            </header>

            {/* İstatistikler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <div className="text-sm text-gray-600">Toplam Şablon</div>
                    <div className="text-2xl font-bold text-primary">{initialSablonlar.length}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200">
                    <div className="text-sm text-green-600">Aktif Şablonlar</div>
                    <div className="text-2xl font-bold text-green-700">
                        {initialSablonlar.filter(s => s.aktif).length}
                    </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200">
                    <div className="text-sm text-blue-600">Aylık Toplam (Tahmini)</div>
                    <div className="text-2xl font-bold text-blue-700">
                        {formatCurrency(
                            initialSablonlar
                                .filter(s => s.aktif && s.odeme_sikligi === 'Monatlich')
                                .reduce((sum, s) => sum + s.varsayilan_tutar, 0),
                            locale
                        )}
                    </div>
                </div>
            </div>

            {/* Tablo */}
            <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ana Kategori</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Gider Kalemi</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Açıklama</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Varsayılan Tutar</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sıklık</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {initialSablonlar.length > 0 ? (
                            initialSablonlar.map((sablon) => (
                                <tr key={sablon.id} className={`hover:bg-gray-50/50 transition-colors duration-150 ${!sablon.aktif ? 'opacity-50' : ''}`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleToggleAktif(sablon)}
                                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                                sablon.aktif
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                            title={sablon.aktif ? 'Devre dışı bırak' : 'Aktif et'}
                                        >
                                            {sablon.aktif ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />}
                                            {sablon.aktif ? 'Aktif' : 'Pasif'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                        {sablon.gider_kalemleri?.gider_ana_kategoriler?.ad || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {sablon.gider_kalemleri?.ad || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={sablon.aciklama_sablonu || ''}>
                                        {sablon.aciklama_sablonu || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">
                                        {formatCurrency(sablon.varsayilan_tutar, locale)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {sablon.odeme_sikligi}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handleEdit(sablon)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                            title="Düzenle"
                                        >
                                            <FiEdit />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(sablon)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Sil"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                    Henüz şablon oluşturulmamış. Yukarıdaki butona tıklayarak yeni şablon ekleyebilirsiniz.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-6 text-primary">
                            {editingSablon ? 'Şablonu Düzenle' : 'Yeni Şablon Oluştur'}
                        </h2>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Gider Kalemi */}
                            <div>
                                <label htmlFor="gider_kalemi_id" className="block text-sm font-medium text-gray-700 mb-1">
                                    Gider Kalemi *
                                </label>
                                <select
                                    id="gider_kalemi_id"
                                    name="gider_kalemi_id"
                                    required
                                    defaultValue={editingSablon?.gider_kalemi_id || ''}
                                    className="w-full border border-gray-300 rounded-md py-2 px-3 bg-white shadow-sm focus:ring-accent focus:border-accent"
                                >
                                    <option value="">Seçiniz...</option>
                                    {giderKalemleri.map(k => (
                                        <option key={k.id} value={k.id}>{k.ad}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Varsayılan Tutar */}
                            <div>
                                <label htmlFor="varsayilan_tutar" className="block text-sm font-medium text-gray-700 mb-1">
                                    Varsayılan Tutar (€) *
                                </label>
                                <input
                                    type="number"
                                    id="varsayilan_tutar"
                                    name="varsayilan_tutar"
                                    step="0.01"
                                    min="0"
                                    required
                                    defaultValue={editingSablon?.varsayilan_tutar || ''}
                                    className="w-full border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:ring-accent focus:border-accent"
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Ödeme Sıklığı */}
                            <div>
                                <label htmlFor="odeme_sikligi" className="block text-sm font-medium text-gray-700 mb-1">
                                    Ödeme Sıklığı *
                                </label>
                                <select
                                    id="odeme_sikligi"
                                    name="odeme_sikligi"
                                    required
                                    defaultValue={editingSablon?.odeme_sikligi || 'Monatlich'}
                                    className="w-full border border-gray-300 rounded-md py-2 px-3 bg-white shadow-sm focus:ring-accent focus:border-accent"
                                >
                                    <option value="Monatlich">Monatlich (Aylık)</option>
                                    <option value="Jährlich">Jährlich (Yıllık)</option>
                                    <option value="Einmalig">Einmalig (Tek Seferlik)</option>
                                    <option value="Bedarf">Bedarf (İhtiyaç)</option>
                                </select>
                            </div>

                            {/* Açıklama */}
                            <div>
                                <label htmlFor="aciklama_sablonu" className="block text-sm font-medium text-gray-700 mb-1">
                                    Açıklama Şablonu
                                </label>
                                <textarea
                                    id="aciklama_sablonu"
                                    name="aciklama_sablonu"
                                    rows={3}
                                    defaultValue={editingSablon?.aciklama_sablonu || ''}
                                    className="w-full border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:ring-accent focus:border-accent"
                                    placeholder="Gider oluşturulduğunda kullanılacak açıklama..."
                                />
                            </div>

                            {/* Butonlar */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingSablon(null);
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-bold transition-colors"
                                >
                                    {editingSablon ? 'Güncelle' : 'Oluştur'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
