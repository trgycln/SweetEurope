'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiEdit, FiTrash2, FiToggleLeft, FiToggleRight, FiArrowLeft, FiX, FiCheck } from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { Tables } from '@/lib/supabase/database.types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';

type GiderSablonKalemi = Tables<'gider_sablon_kalemleri'> & {
    gider_kalemleri: {
        id: string;
        ad: string | null;
        ana_kategori_id: string;
        gider_ana_kategoriler: {
            ad: string | null;
        } | null;
    } | null;
};

type GiderSablonWithDetails = Tables<'gider_sablonlari'> & {
    gider_sablon_kalemleri: GiderSablonKalemi[];
};

type HauptKategorie = Tables<'gider_ana_kategoriler'>;
type GiderKalemi = Tables<'gider_kalemleri'>;

interface TemplateItem {
    gider_kalemi_id: string;
    varsayilan_tutar: number;
    aciklama: string;
}

interface GiderSablonlariClientProps {
    initialSablonlar: GiderSablonWithDetails[];
    hauptKategorien: HauptKategorie[];
    giderKalemleri: GiderKalemi[];
    dictionary: Dictionary;
    locale: Locale;
}

export function GiderSablonlariClientNew({
    initialSablonlar,
    hauptKategorien,
    giderKalemleri,
    dictionary,
    locale
}: GiderSablonlariClientProps) {
    const router = useRouter();
    const supabase = createDynamicSupabaseClient(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSablon, setEditingSablon] = useState<GiderSablonWithDetails | null>(null);
    const [expandedSablonId, setExpandedSablonId] = useState<string | null>(null);
    
    // Form state
    const [sablonAdi, setSablonAdi] = useState('');
    const [aciklama, setAciklama] = useState('');
    const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNewSablon = () => {
        setEditingSablon(null);
        setSablonAdi('');
        setAciklama('');
        setTemplateItems([]);
        setIsModalOpen(true);
    };

    const handleEdit = (sablon: GiderSablonWithDetails) => {
        setEditingSablon(sablon);
        setSablonAdi(sablon.sablon_adi);
        setAciklama(sablon.aciklama || '');
        setTemplateItems(
            sablon.gider_sablon_kalemleri.map(k => ({
                gider_kalemi_id: k.gider_kalemi_id,
                varsayilan_tutar: k.varsayilan_tutar,
                aciklama: k.aciklama || ''
            }))
        );
        setIsModalOpen(true);
    };

    const handleAddItem = () => {
        setTemplateItems([...templateItems, { gider_kalemi_id: '', varsayilan_tutar: 0, aciklama: '' }]);
    };

    const handleRemoveItem = (index: number) => {
        setTemplateItems(templateItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof TemplateItem, value: string | number) => {
        const newItems = [...templateItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setTemplateItems(newItems);
    };

    const handleToggleAktif = async (sablon: GiderSablonWithDetails) => {
        const { error } = await supabase
            .from('gider_sablonlari')
            .update({ aktif: !sablon.aktif })
            .eq('id', sablon.id);

        if (error) {
            toast.error(`Hata: ${error.message}`);
        } else {
            toast.success(sablon.aktif ? 'Şablon devre dışı bırakıldı' : 'Şablon aktif edildi');
            router.refresh();
        }
    };

    const handleDelete = async (sablon: GiderSablonWithDetails) => {
        if (!window.confirm(`"${sablon.sablon_adi}" şablonunu silmek istediğinizden emin misiniz?`)) {
            return;
        }

        const { error } = await supabase
            .from('gider_sablonlari')
            .delete()
            .eq('id', sablon.id);

        if (error) {
            toast.error(`Hata: ${error.message}`);
        } else {
            toast.success('Şablon başarıyla silindi');
            router.refresh();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!sablonAdi.trim()) {
            toast.error('Şablon adı gerekli');
            return;
        }

        if (templateItems.length === 0) {
            toast.error('En az bir gider kalemi eklemelisiniz');
            return;
        }

        // Validate items
        for (const item of templateItems) {
            if (!item.gider_kalemi_id) {
                toast.error('Tüm gider kalemleri seçilmelidir');
                return;
            }
            if (item.varsayilan_tutar <= 0) {
                toast.error('Tüm tutarlar 0\'dan büyük olmalıdır');
                return;
            }
        }

        setIsSubmitting(true);

        try {
            if (editingSablon) {
                // Update existing template
                const { error: updateError } = await supabase
                    .from('gider_sablonlari')
                    .update({
                        sablon_adi: sablonAdi,
                        aciklama: aciklama || null
                    })
                    .eq('id', editingSablon.id);

                if (updateError) throw updateError;

                // Delete old items
                const { error: deleteError } = await supabase
                    .from('gider_sablon_kalemleri')
                    .delete()
                    .eq('sablon_id', editingSablon.id);

                if (deleteError) throw deleteError;

                // Insert new items
                const { error: insertError } = await supabase
                    .from('gider_sablon_kalemleri')
                    .insert(
                        templateItems.map(item => ({
                            sablon_id: editingSablon.id,
                            gider_kalemi_id: item.gider_kalemi_id,
                            varsayilan_tutar: item.varsayilan_tutar,
                            aciklama: item.aciklama || null
                        }))
                    );

                if (insertError) throw insertError;

                toast.success('Şablon başarıyla güncellendi');
            } else {
                // Create new template
                const { data: newSablon, error: sablonError } = await supabase
                    .from('gider_sablonlari')
                    .insert({
                        sablon_adi: sablonAdi,
                        aciklama: aciklama || null,
                        aktif: true
                    })
                    .select()
                    .single();

                if (sablonError) throw sablonError;

                // Insert items
                const { error: itemsError } = await supabase
                    .from('gider_sablon_kalemleri')
                    .insert(
                        templateItems.map(item => ({
                            sablon_id: newSablon.id,
                            gider_kalemi_id: item.gider_kalemi_id,
                            varsayilan_tutar: item.varsayilan_tutar,
                            aciklama: item.aciklama || null
                        }))
                    );

                if (itemsError) throw itemsError;

                toast.success('Şablon başarıyla oluşturuldu');
            }

            setIsModalOpen(false);
            router.refresh();
        } catch (error: any) {
            toast.error(`Hata: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUseTemplate = async (sablon: GiderSablonWithDetails) => {
        const confirmed = window.confirm(
            `"${sablon.sablon_adi}" şablonundaki ${sablon.gider_sablon_kalemleri.length} adet gideri bu ay için taslak olarak oluşturmak istiyor musunuz?`
        );

        if (!confirmed) return;

        try {
            const { data, error } = await supabase.rpc('create_expenses_from_template', {
                p_sablon_id: sablon.id,
                p_hedef_ay: null // Current month
            });

            if (error) throw error;

            if (data.success) {
                toast.success(data.message);
                router.refresh();
            } else {
                toast.error(data.error || 'Bir hata oluştu');
            }
        } catch (error: any) {
            toast.error(`Hata: ${error.message}`);
        }
    };

    const getTotalAmount = (items: GiderSablonKalemi[]) => {
        return items.reduce((sum, item) => sum + item.varsayilan_tutar, 0);
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
                        Tekrarlayan giderleriniz için şablon oluşturun. Her şablonda istediğiniz kadar gider kalemi ekleyebilirsiniz.
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
                    <div className="text-sm text-blue-600">Toplam Kalem Sayısı</div>
                    <div className="text-2xl font-bold text-blue-700">
                        {initialSablonlar.reduce((sum, s) => sum + s.gider_sablon_kalemleri.length, 0)}
                    </div>
                </div>
            </div>

            {/* Şablon Listesi */}
            <div className="space-y-4">
                {initialSablonlar.length > 0 ? (
                    initialSablonlar.map((sablon) => (
                        <div
                            key={sablon.id}
                            className={`bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ${
                                !sablon.aktif ? 'opacity-60' : ''
                            }`}
                        >
                            {/* Şablon Header */}
                            <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-primary">{sablon.sablon_adi}</h3>
                                        <button
                                            onClick={() => handleToggleAktif(sablon)}
                                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-colors ${
                                                sablon.aktif
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {sablon.aktif ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />}
                                            {sablon.aktif ? 'Aktif' : 'Pasif'}
                                        </button>
                                    </div>
                                    {sablon.aciklama && (
                                        <p className="text-sm text-gray-600">{sablon.aciklama}</p>
                                    )}
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                        <span>{sablon.gider_sablon_kalemleri.length} kalem</span>
                                        <span>•</span>
                                        <span className="font-semibold text-primary">
                                            {formatCurrency(getTotalAmount(sablon.gider_sablon_kalemleri), locale)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {sablon.aktif && (
                                        <button
                                            onClick={() => handleUseTemplate(sablon)}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm flex items-center gap-2"
                                        >
                                            <FiCheck size={16} />
                                            Şablonu Getir
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setExpandedSablonId(expandedSablonId === sablon.id ? null : sablon.id)}
                                        className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                                    >
                                        {expandedSablonId === sablon.id ? 'Gizle' : 'Detaylar'}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(sablon)}
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                        title="Düzenle"
                                    >
                                        <FiEdit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(sablon)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Sil"
                                    >
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Şablon Items (Expanded) */}
                            {expandedSablonId === sablon.id && (
                                <div className="border-t border-gray-200 bg-gray-50 p-4">
                                    <h4 className="font-semibold text-gray-700 mb-3">Gider Kalemleri:</h4>
                                    <div className="space-y-2">
                                        {sablon.gider_sablon_kalemleri.map((item, idx) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900">
                                                        {item.gider_kalemleri?.ad || 'Bilinmeyen kalem'}
                                                    </div>
                                                    {item.aciklama && (
                                                        <div className="text-sm text-gray-600 mt-1">{item.aciklama}</div>
                                                    )}
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {item.gider_kalemleri?.gider_ana_kategoriler?.ad || '-'}
                                                    </div>
                                                </div>
                                                <div className="font-semibold text-gray-900">
                                                    {formatCurrency(item.varsayilan_tutar, locale)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-10 text-center text-gray-500">
                        Henüz şablon oluşturulmamış. Yukarıdaki butona tıklayarak yeni şablon ekleyebilirsiniz.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-6 text-primary">
                            {editingSablon ? 'Şablonu Düzenle' : 'Yeni Şablon Oluştur'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Şablon Adı */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Şablon Adı *
                                </label>
                                <input
                                    type="text"
                                    value={sablonAdi}
                                    onChange={(e) => setSablonAdi(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:ring-accent focus:border-accent"
                                    placeholder="Örn: Ofis Sabit Giderleri"
                                    required
                                />
                            </div>

                            {/* Açıklama */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Açıklama
                                </label>
                                <textarea
                                    value={aciklama}
                                    onChange={(e) => setAciklama(e.target.value)}
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:ring-accent focus:border-accent"
                                    placeholder="Şablon hakkında kısa açıklama..."
                                />
                            </div>

                            {/* Gider Kalemleri */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Gider Kalemleri *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
                                    >
                                        <FiPlus size={14} />
                                        Kalem Ekle
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {templateItems.map((item, index) => (
                                        <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Gider Kalemi
                                                    </label>
                                                    <select
                                                        value={item.gider_kalemi_id}
                                                        onChange={(e) => handleItemChange(index, 'gider_kalemi_id', e.target.value)}
                                                        className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm"
                                                        required
                                                    >
                                                        <option value="">Seçiniz...</option>
                                                        {giderKalemleri.map(k => (
                                                            <option key={k.id} value={k.id}>{k.ad}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Tutar (€)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.varsayilan_tutar}
                                                        onChange={(e) => handleItemChange(index, 'varsayilan_tutar', parseFloat(e.target.value) || 0)}
                                                        className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm"
                                                        required
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Açıklama
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={item.aciklama}
                                                            onChange={(e) => handleItemChange(index, 'aciklama', e.target.value)}
                                                            className="flex-1 border border-gray-300 rounded-md py-2 px-3 text-sm"
                                                            placeholder="Bu gider için özel açıklama..."
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(index)}
                                                            className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                                                            title="Kaldır"
                                                        >
                                                            <FiX size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {templateItems.length === 0 && (
                                        <div className="text-center py-6 text-gray-500 text-sm">
                                            Henüz kalem eklenmedi. "Kalem Ekle" butonuna tıklayarak başlayın.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Butonlar */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingSablon(null);
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg font-bold transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Kaydediliyor...' : (editingSablon ? 'Güncelle' : 'Oluştur')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
