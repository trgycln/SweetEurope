// src/app/admin/crm/firmalar/[firmaId]/page.tsx
'use client'; 

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation'; // useRouter für Redirect importieren
import { Tables } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { FiEdit, FiSave, FiX } from 'react-icons/fi';
import Image from 'next/image';

type Firma = Tables<'firmalar'>;

export default function FirmaDetayDuzenlePage() {
    const supabase = createSupabaseBrowserClient();
    const params = useParams();
    const router = useRouter(); // useRouter-Hook initialisieren
    const firmaId = params.firmaId as string;

    const [firma, setFirma] = useState<Firma | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null); // State für Fehlermeldungen
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        const fetchFirma = async () => {
            if (!firmaId) return;

            setLoading(true);
            setError(null);

            try {
                const { data, error: fetchError } = await supabase
                    .from('firmalar')
                    .select('*')
                    .eq('id', firmaId)
                    .single();

                if (fetchError) {
                    // Wenn ein Fehler auftritt (z.B. Firma nicht gefunden), diesen Fehler werfen
                    throw fetchError;
                }
                
                if (data) {
                    setFirma(data);
                } else {
                    // Sollte durch .single() und Fehlerbehandlung nicht eintreten, aber als Absicherung
                    router.push('/admin/crm/firmalar');
                }

            } catch (err: any) {
                console.error("Fehler beim Abrufen der Firma:", err.message);
                setError("Firma konnte nicht gefunden werden.");
                // Nach 2 Sekunden zur Übersicht weiterleiten
                setTimeout(() => {
                    router.push('/admin/crm/firmalar');
                }, 2000);
            } finally {
                setLoading(false);
            }
        };
        
        fetchFirma();
    }, [firmaId, supabase, router]);

    // handleUpdate-Funktion bleibt unverändert...
    const handleUpdate = async (formData: FormData) => {
        if (!firma) return;
        
        const referansGoster = formData.get('referans_olarak_goster') === 'on';
        const logoFile = formData.get('firma_logosu') as File;
        let logoUrl = firma.firma_logosu_url;

        if (logoFile && logoFile.size > 0) {
            const filePath = `public/${Date.now()}-${logoFile.name}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('firma-logolari')
                .upload(filePath, logoFile, { upsert: true });

            if (uploadError) {
                alert("Logo yüklenirken hata oluştu: " + uploadError.message);
                return;
            }
            
            logoUrl = supabase.storage.from('firma-logolari').getPublicUrl(uploadData.path).data.publicUrl;
        }

        const { data: updatedFirma, error: updateError } = await supabase
            .from('firmalar')
            .update({
                referans_olarak_goster: referansGoster,
                firma_logosu_url: logoUrl
            })
            .eq('id', firma.id)
            .select()
            .single();
        
        if (updateError) {
            alert("Güncelleme başarısız: " + updateError.message);
        } else if (updatedFirma) {
            setFirma(updatedFirma);
            setEditMode(false);
        }
    };
    
    // Verbesserte Lade- und Fehlerzustände
    if (loading) return <div className="text-center p-10">Yükleniyor...</div>;
    if (error) return <div className="text-center p-10 text-red-500">{error}</div>;
    if (!firma) return null; // Wird durch die Logik oben bereits behandelt

    // JSX bleibt unverändert...
    return (
        <div className="space-y-8">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{firma.unvan}</h1>
                    <p className="text-text-main/80 mt-1">CRM Detay ve Referans Yönetimi</p>
                </div>
                {!editMode && (
                    <button onClick={() => setEditMode(true)} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg">
                        <FiEdit /> Düzenle
                    </button>
                )}
            </header>
            
            <form action={handleUpdate}>
                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="font-serif text-2xl font-bold text-primary mb-6">Referans Ayarları</h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <label htmlFor="referans_olarak_goster" className="font-bold text-text-main">Ana Sayfada Referans Olarak Göster:</label>
                            {editMode ? (
                                <input
                                    id="referans_olarak_goster"
                                    name="referans_olarak_goster"
                                    type="checkbox"
                                    defaultChecked={firma.referans_olarak_goster}
                                    className="h-6 w-6 rounded text-accent focus:ring-accent"
                                />
                            ) : (
                                <div className={`font-bold ${firma.referans_olarak_goster ? 'text-green-600' : 'text-red-600'}`}>
                                    {firma.referans_olarak_goster ? 'Evet' : 'Hayır'}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="firma_logosu" className="block font-bold text-text-main mb-2">Firma Logosu:</label>
                            {firma.firma_logosu_url && (
                                <Image src={firma.firma_logosu_url} alt={`${firma.unvan} logosu`} width={128} height={128} className="rounded-md bg-gray-100 p-2 mb-4"/>
                            )}
                            {editMode && (
                                <input
                                    id="firma_logosu"
                                    name="firma_logosu"
                                    type="file"
                                    accept="image/png, image/jpeg, image/svg+xml"
                                    className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"
                                />
                            )}
                        </div>
                    </div>
                    {editMode && (
                        <div className="mt-8 pt-6 border-t flex justify-end gap-4">
                            <button type="button" onClick={() => setEditMode(false)} className="px-6 py-2 bg-gray-200 rounded-lg font-bold text-sm">
                                <FiX className="inline -mt-1 mr-1"/> İptal
                            </button>
                            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold text-sm">
                                <FiSave className="inline -mt-1 mr-1"/> Kaydet
                            </button>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}