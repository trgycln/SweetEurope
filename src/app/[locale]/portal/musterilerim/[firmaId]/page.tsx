'use client';

import { useState, useEffect, useTransition } from 'react';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { FiEdit, FiSave, FiX, FiLoader, FiTrash2 } from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaGlobe, FaMapMarkedAlt } from 'react-icons/fa';
import { updateMyCustomerAction, deleteMyCustomerAction } from './actions';
import { toast } from 'sonner';
import { Locale } from '@/i18n-config';

type Firma = Tables<'firmalar'>;
type FirmaKategori = Enums<'firma_kategori'>;

const kategoriOptions: FirmaKategori[] = ["Kafe", "Restoran", "Otel", "Alt Bayi", "Zincir Market"];
const priorityOptions = ["A", "B", "C"];

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

            {/* Quick Access Card */}
            {((firma as any).instagram_url || (firma as any).facebook_url || (firma as any).web_url || (firma as any).google_maps_url) && (
                <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="text-accent">🔗</span> Hızlı Erişim
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {(firma as any).instagram_url && (
                            <a 
                                href={(firma as any).instagram_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm"
                            >
                                <FaInstagram size={18} /> Instagram
                            </a>
                        )}
                        {(firma as any).facebook_url && (
                            <a 
                                href={(firma as any).facebook_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm"
                            >
                                <FaFacebook size={18} /> Facebook
                            </a>
                        )}
                        {(firma as any).web_url && (
                            <a 
                                href={(firma as any).web_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm"
                            >
                                <FaGlobe size={18} /> Web Sitesi
                            </a>
                        )}
                        {(firma as any).google_maps_url && (
                            <a 
                                href={(firma as any).google_maps_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:shadow-lg transition-all font-medium text-sm"
                            >
                                <FaMapMarkedAlt size={18} /> Google Maps
                            </a>
                        )}
                    </div>
                </div>
            )}

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

                {/* Öncelik (Priority) */}
                <div>
                    <label htmlFor="oncelik" className="block text-sm font-bold text-gray-700 mb-2">Prioritet</label>
                    <select id="oncelik" name="oncelik" defaultValue={(firma as any).oncelik || 'B'} disabled={!editMode} className={`${inputBaseClasses} font-bold`}>
                        {priorityOptions.map(p => <option key={p} value={p}>{p === 'A' ? 'A (Yüksek)' : p === 'B' ? 'B (Orta)' : 'C (Düşük)'}</option>)}
                    </select>
                </div>

                {/* Son Etkileşim Tarihi (Read-only) */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Son Etkileşim</label>
                    <input 
                        type="text" 
                        value={(firma as any).son_etkilesim_tarihi ? new Date((firma as any).son_etkilesim_tarihi).toLocaleDateString('tr-TR') : 'Henüz yok'} 
                        disabled 
                        className={`${inputBaseClasses} bg-gray-100`} 
                    />
                </div>

                {/* Instagram URL */}
                <div>
                    <label htmlFor="instagram_url" className="block text-sm font-bold text-gray-700 mb-2">Instagram</label>
                    <input type="url" id="instagram_url" name="instagram_url" placeholder="https://instagram.com/..." defaultValue={(firma as any).instagram_url || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>

                {/* Facebook URL */}
                <div>
                    <label htmlFor="facebook_url" className="block text-sm font-bold text-gray-700 mb-2">Facebook</label>
                    <input type="url" id="facebook_url" name="facebook_url" placeholder="https://facebook.com/..." defaultValue={(firma as any).facebook_url || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>

                {/* Web URL */}
                <div>
                    <label htmlFor="web_url" className="block text-sm font-bold text-gray-700 mb-2">Web Sitesi</label>
                    <input type="url" id="web_url" name="web_url" placeholder="https://..." defaultValue={(firma as any).web_url || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>

                {/* Google Maps URL */}
                <div>
                    <label htmlFor="google_maps_url" className="block text-sm font-bold text-gray-700 mb-2">Google Maps</label>
                    <input type="url" id="google_maps_url" name="google_maps_url" placeholder="https://maps.google.com/..." defaultValue={(firma as any).google_maps_url || ''} disabled={!editMode} className={inputBaseClasses} />
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
