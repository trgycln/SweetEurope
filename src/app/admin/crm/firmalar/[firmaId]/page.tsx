// src/app/admin/crm/firmalar/[firmaId]/page.tsx
'use client'; 

import { useState, useEffect, useTransition } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { FiEdit, FiSave, FiX, FiLoader } from 'react-icons/fi';
import Image from 'next/image';
// import { updateFirmaAction } from './actions'; // Server Action'ı daha sonra ekleyeceğiz
import { toast } from 'sonner';

type Firma = Tables<'firmalar'>;
type FirmaKategori = Enums<'firma_kategori'>;

// Mevcut "yeni firma" formundaki kategorileri kullanalım
const kategoriOptions: FirmaKategori[] = ["Kafe", "Restoran", "Otel", "Alt Bayi", "Zincir Market"];

export default function FirmaGenelBilgilerPage() {
    const supabase = createSupabaseBrowserClient();
    const params = useParams();
    const router = useRouter();
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
                toast.error("Firma bulunamadı veya bir hata oluştu.");
                router.push('/admin/crm/firmalar');
            } else {
                setFirma(data);
            }
            setLoading(false);
        };
        fetchFirma();
    }, [firmaId, supabase, router]);

    const handleUpdate = async (formData: FormData) => {
        if (!firma) return;
        
        // Şimdilik Client-Side güncelleme yapalım.
        // Daha sonra bunu Server Action'a taşıyabiliriz.
        const updatedData = {
            unvan: formData.get('unvan') as string,
            kategori: formData.get('kategori') as FirmaKategori,
            adres: formData.get('adres') as string,
            telefon: formData.get('telefon') as string,
            email: formData.get('email') as string,
            referans_olarak_goster: formData.get('referans_olarak_goster') === 'on',
        };

        startTransition(async () => {
            const { data: updatedFirma, error } = await supabase
                .from('firmalar')
                .update(updatedData)
                .eq('id', firma.id)
                .select()
                .single();

            if (error) {
                toast.error("Güncelleme başarısız: " + error.message);
            } else {
                setFirma(updatedFirma);
                toast.success("Firma bilgileri başarıyla güncellendi.");
                setEditMode(false);
            }
        });
    };
    
    if (loading) return <div className="flex justify-center items-center p-10"><FiLoader className="animate-spin text-2xl"/> Yükleniyor...</div>;
    if (!firma) return null;

    const inputBaseClasses = "w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm text-text-main focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-text-main/50 disabled:bg-bg-subtle/50";

    return (
        <form action={handleUpdate} className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="font-serif text-2xl font-bold text-primary">Genel Bilgiler & Ayarlar</h2>
                {!editMode && (
                    <button type="button" onClick={() => setEditMode(true)} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg font-bold text-sm">
                        <FiEdit /> Düzenle
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="md:col-span-2">
                    <label htmlFor="unvan" className="block text-sm font-bold text-text-main/80 mb-2">Firma Unvanı</label>
                    <input type="text" id="unvan" name="unvan" defaultValue={firma.unvan} disabled={!editMode} className={inputBaseClasses} />
                </div>
                <div>
                    <label htmlFor="kategori" className="block text-sm font-bold text-text-main/80 mb-2">Kategori</label>
                    <select id="kategori" name="kategori" defaultValue={firma.kategori} disabled={!editMode} className={inputBaseClasses}>
                        {kategoriOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="status" className="block text-sm font-bold text-text-main/80 mb-2">Statü</label>
                    <input type="text" id="status" name="status" defaultValue={firma.status} disabled className={`${inputBaseClasses} font-bold`} />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-bold text-text-main/80 mb-2">E-posta</label>
                    <input type="email" id="email" name="email" defaultValue={firma.email || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>
                <div>
                    <label htmlFor="telefon" className="block text-sm font-bold text-text-main/80 mb-2">Telefon</label>
                    <input type="tel" id="telefon" name="telefon" defaultValue={firma.telefon || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="adres" className="block text-sm font-bold text-text-main/80 mb-2">Adres</label>
                    <textarea id="adres" name="adres" rows={3} defaultValue={firma.adres || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>
                <div className="md:col-span-2 pt-4 border-t">
                    <div className="flex items-center gap-4">
                        <label htmlFor="referans_olarak_goster" className="font-bold text-text-main">Ana Sayfada Referans Olarak Göster:</label>
                        <input
                            id="referans_olarak_goster"
                            name="referans_olarak_goster"
                            type="checkbox"
                            defaultChecked={firma.referans_olarak_goster}
                            disabled={!editMode}
                            className="h-6 w-6 rounded text-accent focus:ring-accent disabled:opacity-50"
                        />
                    </div>
                </div>
            </div>

            {editMode && (
                <div className="pt-6 border-t flex justify-end gap-4">
                    <button type="button" onClick={() => setEditMode(false)} className="px-6 py-2 bg-gray-200 rounded-lg font-bold text-sm">
                        <FiX className="inline -mt-1 mr-1"/> İptal
                    </button>
                    <button type="submit" disabled={isPending} className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-bold text-sm disabled:bg-green-400">
                        {isPending ? <FiLoader className="animate-spin" /> : <FiSave />}
                        Kaydet
                    </button>
                </div>
            )}
        </form>
    );
}