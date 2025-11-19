// src/app/[locale]/admin/crm/firmalar/[firmaId]/page.tsx
// Dies ist eine Client-Komponente und verwendet den Client-seitigen Supabase Client.
// Sie war NICHT die Ursache der vorherigen Server-Fehler.

'use client';

import { useState, useEffect, useTransition } from 'react';
// Annahme: createDynamicSupabaseClient ist Ihr Wrapper für den Client-seitigen createClient
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { FiEdit, FiSave, FiX, FiLoader, FiTrash2 } from 'react-icons/fi';
// Server Actions
import { updateFirmaAction, deleteFirmaAction } from './actions';
import { toast } from 'sonner';
import { Locale } from '@/i18n-config'; // Locale importieren

type Firma = Tables<'firmalar'>;
type FirmaKategori = Enums<'firma_kategori'>;
type FirmaStatus = Enums<'firma_status'>;

// Diese Konstanten sollten idealerweise aus database.types kommen oder zentral definiert sein
const kategoriOptions: FirmaKategori[] = ["Kafe", "Restoran", "Otel", "Alt Bayi", "Zincir Market"];
const statusOptions: FirmaStatus[] = ["Potansiyel", "İlk Temas", "Numune Sunuldu", "Teklif Verildi", "Anlaşma Sağlandı", "Pasif"];

export default function FirmaGenelBilgilerPage() {
    // Client-seitigen Supabase Client initialisieren
    // Das 'true' Argument muss spezifisch für Ihre Funktion sein
    const supabase = createDynamicSupabaseClient(true);
    const params = useParams();
    const router = useRouter();

    // Locale aus Params extrahieren (wichtig für Actions oder Links)
    const locale = params.locale as Locale; // Typ-Zuweisung
    const firmaId = params.firmaId as string;

    const [firma, setFirma] = useState<Firma | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Daten laden beim Mounten
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
                console.error("Fehler beim Laden der Firma (Client):", error);
                toast.error("Firma nicht gefunden oder Fehler beim Laden.");
                // Redirect zur Liste, sprachspezifisch
                router.push(`/${locale}/admin/crm/firmalar`);
            } else {
                setFirma(data);
            }
            setLoading(false);
        };
        fetchFirma();
        // Abhängigkeiten: firmaId, supabase (falls Client neu erstellt wird), router, locale
    }, [firmaId, supabase, router, locale]);

    // Handler für das Absenden des Formulars (ruft Server Action auf)
    const handleUpdate = async (formData: FormData) => {
        if (!firma) return;

        startTransition(async () => {
            // Server Action aufrufen
            // Annahme: updateFirmaAction benötigt locale nicht explizit,
            // aber es ist gut, konsistent zu sein, falls Actions sprachabhängig werden.
            const result = await updateFirmaAction(firma.id, firma.status as FirmaStatus, formData); // Typ für status hinzugefügt

            if (result.error) {
                toast.error(`Fehler beim Update: ${result.error}`);
            } else if (result.success && result.data) {
                // Lokalen State mit den Daten von der Action aktualisieren
                setFirma(result.data as Firma);
                toast.success("Firmendetails erfolgreich gespeichert.");
                setEditMode(false);
            } else {
                // Unerwarteter Zustand
                toast.error("Unbekannter Fehler beim Speichern.");
            }
        });
    };

    // Ladezustand
    if (loading) return (
        <div className="flex justify-center items-center p-10 text-gray-500">
            <FiLoader className="animate-spin text-2xl mr-2"/> Laden...
        </div>
    );
    // Firma nicht gefunden (sollte durch useEffect-Redirect behandelt werden, aber als Fallback)
    if (!firma) return <div className="p-6 text-red-500">Firma konnte nicht geladen werden.</div>;

    // Styling für Inputs
    const inputBaseClasses = "w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-gray-400 disabled:bg-gray-200/50 disabled:cursor-not-allowed"; // Angepasst für besseren Kontrast

    return (
        // Formular ruft die Server Action auf
        <form action={handleUpdate} className="space-y-8">
            <div className="flex justify-between items-center pb-4 border-b"> {/* Leichte Anpassung */}
                <h2 className="font-serif text-2xl font-bold text-primary">Allgemeine Informationen & Einstellungen</h2>
                {!editMode && (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setEditMode(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition"
                        >
                            <FiEdit size={16}/> Bearbeiten
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (!firma) return;
                                const ok = window.confirm('Bu firmayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.');
                                if (!ok) return;
                                startTransition(async () => {
                                    const res = await deleteFirmaAction(firma.id, locale);
                                    if (!res.success) {
                                        toast.error(`Silme başarısız: ${res.error || 'Bilinmeyen hata'}`);
                                    } else {
                                        toast.success('Firma başarıyla silindi.');
                                        router.push(`/${locale}/admin/crm/firmalar`);
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
                {/* Firmenname */}
                <div className="md:col-span-2">
                    <label htmlFor="unvan" className="block text-sm font-bold text-gray-700 mb-2">Firma</label>
                    <input type="text" id="unvan" name="unvan" defaultValue={firma.unvan} disabled={!editMode} required className={inputBaseClasses} />
                </div>
                {/* Kategorie */}
                <div>
                    <label htmlFor="kategori" className="block text-sm font-bold text-gray-700 mb-2">Kategorie</label>
                    <select id="kategori" name="kategori" defaultValue={firma.kategori || ''} disabled={!editMode} className={inputBaseClasses}>
                         <option value="" disabled>Bitte wählen...</option>
                        {kategoriOptions.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>

                {/* Status */}
                <div>
                    <label htmlFor="status" className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                    <select id="status" name="status" defaultValue={firma.status || ''} disabled={!editMode} className={`${inputBaseClasses} font-semibold`}>
                         <option value="" disabled>Bitte wählen...</option>
                        {statusOptions.map(stat => <option key={stat} value={stat}>{stat}</option>)}
                    </select>
                </div>

                {/* E-Mail */}
                <div>
                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">E-Mail</label>
                    <input type="email" id="email" name="email" defaultValue={firma.email || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>
                {/* Telefon */}
                <div>
                    <label htmlFor="telefon" className="block text-sm font-bold text-gray-700 mb-2">Telefon</label>
                    <input type="tel" id="telefon" name="telefon" defaultValue={firma.telefon || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>
                {/* Adresse */}
                <div className="md:col-span-2">
                    <label htmlFor="adres" className="block text-sm font-bold text-gray-700 mb-2">Adresse</label>
                    <textarea id="adres" name="adres" rows={3} defaultValue={firma.adres || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>

                {/* Als Referenz anzeigen */}
                <div className="md:col-span-2 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-3"> {/* Gap angepasst */}
                         <input
                            id="referans_olarak_goster"
                            name="referans_olarak_goster"
                            type="checkbox"
                            defaultChecked={firma.referans_olarak_goster}
                            disabled={!editMode}
                            className="h-5 w-5 rounded text-accent focus:ring-accent border-gray-300 disabled:opacity-50" // Styling angepasst
                         />
                        <label htmlFor="referans_olarak_goster" className="font-medium text-sm text-gray-700">Auf Homepage als Referenz anzeigen</label>
                    </div>
                </div>
            </div>

            {/* Buttons im Bearbeitungsmodus */}
            {editMode && (
                <div className="pt-6 border-t border-gray-200 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => setEditMode(false)}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-300 transition"
                    >
                        <FiX className="inline -mt-1 mr-1" size={16}/> Abbrechen
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex items-center justify-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-wait hover:bg-green-700 transition"
                    >
                        {isPending ? <FiLoader className="animate-spin" size={16}/> : <FiSave size={16}/>}
                        {isPending ? 'Speichern...' : 'Speichern'}
                    </button>
                </div>
            )}
        </form>
    );
}