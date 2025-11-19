'use client';

import { useState, useEffect, useTransition } from 'react';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { FiEdit, FiSave, FiX, FiLoader, FiTrash2 } from 'react-icons/fi';
import { updateMyCustomerAction, deleteMyCustomerAction } from './actions';
import { toast } from 'sonner';
import { Locale } from '@/i18n-config';

type Firma = Tables<'firmalar'>;
type FirmaKategori = Enums<'firma_kategori'>;

const kategoriOptions: FirmaKategori[] = ["Kafe", "Restoran", "Otel", "Alt Bayi", "Zincir Market"];

export default function MusteriGenelPage() {
    const supabase = createDynamicSupabaseClient(true);
    const params = useParams();
    const router = useRouter();

    const locale = params.locale as Locale;
    const firmaId = params.firmaId as string;

    const [firma, setFirma] = useState<Firma | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        const fetchFirma = async () => {
            if (!firmaId) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('firmalar')
                .select('*')
                .eq('id', firmaId)
                .single();

            if (error || !data) {
                console.error("Müşteri yükleme hatası:", error);
                toast.error("Müşteri bulunamadı.");
                router.push(`/${locale}/portal/musterilerim`);
            } else {
                setFirma(data);
            }
            setLoading(false);
        };
        fetchFirma();
    }, [firmaId, supabase, router, locale]);

    const handleUpdate = async (formData: FormData) => {
        if (!firma) return;

        startTransition(async () => {
            const result = await updateMyCustomerAction(formData, locale, firma.id);

            if (result.error) {
                toast.error(`Güncelleme hatası: ${result.error}`);
            } else if (result.success && result.data) {
                setFirma(result.data as Firma);
                toast.success("Müşteri bilgileri kaydedildi.");
                setEditMode(false);
            } else {
                toast.error("Bilinmeyen hata.");
            }
        });
    };

    if (loading) return (
        <div className="flex justify-center items-center p-10 text-gray-500">
            <FiLoader className="animate-spin text-2xl mr-2"/> Yükleniyor...
        </div>
    );
    if (!firma) return <div className="p-6 text-red-500">Müşteri yüklenemedi.</div>;

    const inputBaseClasses = "w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-gray-400 disabled:bg-gray-200/50 disabled:cursor-not-allowed";

    return (
        <form action={handleUpdate} className="space-y-8">
            <div className="flex justify-between items-center pb-4 border-b">
                <h2 className="font-serif text-2xl font-bold text-primary">Genel Bilgiler</h2>
                {!editMode && (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setEditMode(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition"
                        >
                            <FiEdit size={16}/> Düzenle
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!firma) return;
                                const ok = window.confirm('Bu müşteriyi silmek istediğinize emin misiniz?');
                                if (!ok) return;
                                startTransition(async () => {
                                    const res = await deleteMyCustomerAction(firma.id, locale);
                                    if (!res.success) {
                                        toast.error(`Silme başarısız: ${res.error || 'Bilinmeyen hata'}`);
                                    } else {
                                        toast.success('Müşteri silindi.');
                                        router.push(`/${locale}/portal/musterilerim`);
                                    }
                                });
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition"
                        >
                            <FiTrash2 size={16}/> Sil
                        </button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="md:col-span-2">
                    <label htmlFor="unvan" className="block text-sm font-bold text-gray-700 mb-2">Firma Adı</label>
                    <input type="text" id="unvan" name="unvan" defaultValue={firma.unvan} disabled={!editMode} required className={inputBaseClasses} />
                </div>
                <div>
                    <label htmlFor="kategori" className="block text-sm font-bold text-gray-700 mb-2">Kategori</label>
                    <select id="kategori" name="kategori" defaultValue={firma.kategori || ''} disabled={!editMode} className={inputBaseClasses}>
                         <option value="" disabled>Seçiniz...</option>
                        {kategoriOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="telefon" className="block text-sm font-bold text-gray-700 mb-2">Telefon</label>
                    <input type="tel" id="telefon" name="telefon" defaultValue={firma.telefon || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">E-posta</label>
                    <input type="email" id="email" name="email" defaultValue={firma.email || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="adres" className="block text-sm font-bold text-gray-700 mb-2">Adres</label>
                    <textarea id="adres" name="adres" rows={3} defaultValue={firma.adres || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>
            </div>

            {editMode && (
                <div className="pt-6 border-t border-gray-200 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => setEditMode(false)}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-300 transition"
                    >
                        <FiX className="inline -mt-1 mr-1" size={16}/> İptal
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-wait hover:bg-green-700 transition"
                    >
                        {isPending ? <FiLoader className="animate-spin" size={16}/> : <FiSave size={16}/>}
                        {isPending ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            )}
        </form>
    );
}
