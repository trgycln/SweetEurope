'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiPlus, FiEdit2, FiTrash2, FiArrowLeft, FiX, FiSave, FiFolder, FiTag } from 'react-icons/fi';
import { toast } from 'sonner';
import {
    createAnaKategori, updateAnaKategori, deleteAnaKategori,
    createGiderKalemi, updateGiderKalemi, deleteGiderKalemi,
} from '@/app/actions/gider-kategori-actions';

type AnaKategori = { id: string; ad: string };
type Kalem = { id: string; ad: string; ana_kategori_id: string; kullanim_sayisi: number };

interface Props {
    anaKategoriler: AnaKategori[];
    kalemler: Kalem[];
    locale: string;
}

export default function KategorilerClient({ anaKategoriler, kalemler, locale }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [selectedKatId, setSelectedKatId] = useState<string | null>(anaKategoriler[0]?.id ?? null);

    // Modal state
    const [editAnaKat, setEditAnaKat] = useState<AnaKategori | null>(null);
    const [editKalem, setEditKalem] = useState<Kalem | null>(null);
    const [newAnaKatOpen, setNewAnaKatOpen] = useState(false);
    const [newKalemOpen, setNewKalemOpen] = useState(false);

    const filteredKalemler = useMemo(
        () => kalemler.filter(k => k.ana_kategori_id === selectedKatId),
        [kalemler, selectedKatId]
    );

    const selectedKategori = anaKategoriler.find(k => k.id === selectedKatId);

    // Helpers
    const runAction = (action: () => Promise<any>, successMsg?: string) => {
        startTransition(async () => {
            const result = await action();
            if (result?.success) {
                toast.success(successMsg || result.message || 'İşlem başarılı');
                router.refresh();
            } else {
                toast.error(result?.error || result?.message || 'Hata oluştu');
            }
        });
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Link href={`/${locale}/admin/idari/finans/giderler`}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                        <FiArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Gider Kategorileri</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Ana kategoriler ve alt kalemleri yönet · {anaKategoriler.length} ana · {kalemler.length} kalem
                        </p>
                    </div>
                </div>
            </div>

            {/* İki sütun: Ana kategori | Kalemler */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Sol - Ana kategoriler */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiFolder size={14} /> Ana Kategoriler
                        </h3>
                        <button onClick={() => setNewAnaKatOpen(true)}
                            className="text-[11px] flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors font-semibold">
                            <FiPlus size={11} /> Yeni
                        </button>
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                        {anaKategoriler.length === 0 ? (
                            <div className="p-8 text-center text-sm text-slate-400">Henüz kategori yok</div>
                        ) : (
                            anaKategoriler.map(kat => {
                                const altSayi = kalemler.filter(k => k.ana_kategori_id === kat.id).length;
                                const isActive = selectedKatId === kat.id;
                                return (
                                    <div key={kat.id}
                                        onClick={() => setSelectedKatId(kat.id)}
                                        className={`group px-4 py-3 cursor-pointer transition-colors ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold truncate ${isActive ? 'text-blue-800' : 'text-slate-700'}`}>{kat.ad}</p>
                                                <p className="text-[11px] text-slate-400">{altSayi} kalem</p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); setEditAnaKat(kat); }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Düzenle">
                                                    <FiEdit2 size={12} />
                                                </button>
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`"${kat.ad}" kategorisini silmek istediğinize emin misiniz?`)) {
                                                        runAction(() => deleteAnaKategori(kat.id), 'Ana kategori silindi');
                                                    }
                                                }}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Sil">
                                                    <FiTrash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Sağ - Kalemler */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiTag size={14} />
                            {selectedKategori ? `${selectedKategori.ad} → Alt Kalemler` : 'Kalemler'}
                        </h3>
                        <button onClick={() => setNewKalemOpen(true)} disabled={!selectedKatId}
                            className="text-[11px] flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold">
                            <FiPlus size={11} /> Yeni Kalem
                        </button>
                    </div>
                    {!selectedKatId ? (
                        <div className="p-12 text-center text-sm text-slate-400">Soldan bir kategori seçin</div>
                    ) : filteredKalemler.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="text-3xl mb-2">📂</div>
                            <p className="text-sm text-slate-500">Bu kategoride henüz kalem yok</p>
                            <button onClick={() => setNewKalemOpen(true)}
                                className="mt-3 text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                                + İlk kalemi ekle
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                            {filteredKalemler.map(kalem => (
                                <div key={kalem.id} className="group px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 truncate">{kalem.ad}</p>
                                        {kalem.kullanim_sayisi > 0 && (
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {kalem.kullanim_sayisi} gider kaydında kullanılıyor
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditKalem(kalem)}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Düzenle">
                                            <FiEdit2 size={12} />
                                        </button>
                                        <button onClick={() => {
                                            if (kalem.kullanim_sayisi > 0) {
                                                toast.error(`Bu kalem ${kalem.kullanim_sayisi} kayıtta kullanılıyor, silinemez`);
                                                return;
                                            }
                                            if (confirm(`"${kalem.ad}" kalemini silmek istediğinize emin misiniz?`)) {
                                                runAction(() => deleteGiderKalemi(kalem.id), 'Kalem silindi');
                                            }
                                        }}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Sil">
                                            <FiTrash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {newAnaKatOpen && (
                <FormModal
                    title="Yeni Ana Kategori"
                    fields={[{ name: 'ad', label: 'Kategori Adı', placeholder: 'Örn: Pazarlama' }]}
                    onSubmit={(values) => runAction(() => createAnaKategori(values.ad), 'Ana kategori eklendi')}
                    onClose={() => setNewAnaKatOpen(false)}
                    isPending={isPending}
                />
            )}

            {editAnaKat && (
                <FormModal
                    title="Ana Kategoriyi Düzenle"
                    fields={[{ name: 'ad', label: 'Kategori Adı', defaultValue: editAnaKat.ad }]}
                    onSubmit={(values) => {
                        runAction(() => updateAnaKategori(editAnaKat.id, values.ad), 'Güncellendi');
                        setEditAnaKat(null);
                    }}
                    onClose={() => setEditAnaKat(null)}
                    isPending={isPending}
                />
            )}

            {newKalemOpen && selectedKatId && (
                <FormModal
                    title={`Yeni Kalem · ${selectedKategori?.ad ?? ''}`}
                    fields={[{ name: 'ad', label: 'Kalem Adı', placeholder: 'Örn: Online Reklam' }]}
                    onSubmit={(values) => runAction(() => createGiderKalemi(values.ad, selectedKatId), 'Kalem eklendi')}
                    onClose={() => setNewKalemOpen(false)}
                    isPending={isPending}
                />
            )}

            {editKalem && (
                <FormModal
                    title="Kalemi Düzenle"
                    fields={[
                        { name: 'ad', label: 'Kalem Adı', defaultValue: editKalem.ad },
                        {
                            name: 'ana_kategori_id', label: 'Ana Kategori', type: 'select',
                            defaultValue: editKalem.ana_kategori_id,
                            options: anaKategoriler.map(k => ({ value: k.id, label: k.ad }))
                        }
                    ]}
                    onSubmit={(values) => {
                        runAction(() => updateGiderKalemi(editKalem.id, values.ad, values.ana_kategori_id), 'Güncellendi');
                        setEditKalem(null);
                    }}
                    onClose={() => setEditKalem(null)}
                    isPending={isPending}
                />
            )}
        </div>
    );
}

/* ── Reusable Form Modal ───────────────────────────────────── */
type FormField = {
    name: string;
    label: string;
    placeholder?: string;
    defaultValue?: string;
    type?: 'text' | 'select';
    options?: { value: string; label: string }[];
};

function FormModal({
    title, fields, onSubmit, onClose, isPending,
}: {
    title: string;
    fields: FormField[];
    onSubmit: (values: Record<string, string>) => void;
    onClose: () => void;
    isPending: boolean;
}) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const values: Record<string, string> = {};
        fields.forEach(f => { values[f.name] = (fd.get(f.name) as string) ?? ''; });
        onSubmit(values);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <FiX size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-3">
                    {fields.map(f => (
                        <div key={f.name}>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{f.label}</label>
                            {f.type === 'select' && f.options ? (
                                <select name={f.name} defaultValue={f.defaultValue} required
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            ) : (
                                <input type="text" name={f.name} defaultValue={f.defaultValue}
                                    placeholder={f.placeholder} required minLength={2} autoFocus
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            )}
                        </div>
                    ))}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                            İptal
                        </button>
                        <button type="submit" disabled={isPending}
                            className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                            <FiSave size={14} />
                            {isPending ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
