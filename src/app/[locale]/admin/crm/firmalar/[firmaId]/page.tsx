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
import { FaInstagram, FaFacebook, FaGlobe, FaMapMarkedAlt } from 'react-icons/fa';
// Server Actions
import { updateFirmaAction, deleteFirmaAction } from './actions';
import { toast } from 'sonner';
import { Locale } from '@/i18n-config'; // Locale importieren
import AddressAutofill from '@/components/AddressAutofill'; // Import AddressAutofill
import { 
    KATEGORI_LISTESI, 
    KATEGORI_ISIMLERI, 
    PUANLAMA_ARALIK, 
    puanOnerisi,
    tavsiyeEtKategori,
    ALT_KATEGORILER,
    ANA_KATEGORILER
} from '@/lib/crm/kategoriYonetimi'; // YENİ: Import kategori yönetimi

type Firma = Tables<'firmalar'>;
type FirmaKategori = Enums<'firma_kategori'>;
type FirmaStatus = Enums<'firma_status'>;

// Diese Konstanten sollten idealerweise aus database.types kommen oder zentral definiert sein
const kategoriOptions: FirmaKategori[] = [
    // YENİ KÖLN DİSTRİBÜTÖR SİSTEMİ - SADECE ANA KATEGORİLER (A, B, C, D)
    "A",
    "B",
    "C",
    "D"
] as const;

const kategoriLabels: Record<string, string> = {
    // YENİ KÖLN DİSTRİBÜTÖR SİSTEMİ
    "A": "🔥 A - HACİM KRALLARI (80-100 puan) | Düğün/Otel/Catering/Kantin",
    "B": "💰 B - GÜNLÜK NAKİT AKIŞI (60-79 puan) | Kafeler/Pastaneler",
    "C": "⭐ C - NİŞ PAZARLAR (40-59 puan) | Shisha/Restoran/Oyun Park",
    "D": "📦 D - PERAKENDE & RAF ÜRÜNLERİ (1-39 puan) | Market/Kiosk"
};

const statusOptions: FirmaStatus[] = [
    "ADAY",
    "TEMAS EDİLDİ",
    "NUMUNE VERİLDİ",
    "MÜŞTERİ",
    "REDDEDİLDİ"
];
const priorityOptions = ["A", "B", "C"];
const tagOptions = ["#Türk_Sahibi", "#Vitrin_Boş", "#Zincir_Marka", "#Lüks_Mekan", "#Teraslı"];

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
    const [createdByProfile, setCreatedByProfile] = useState<{ id: string; tam_ad: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [altBayiProfiles, setAltBayiProfiles] = useState<Array<{ id: string; tam_ad: string | null }>>([]);
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
                if (data.created_by) {
                    const { data: creator } = await supabase
                        .from('profiller')
                        .select('id, tam_ad')
                        .eq('id', data.created_by)
                        .maybeSingle();
                    setCreatedByProfile(creator || null);
                } else {
                    setCreatedByProfile(null);
                }
            }
            setLoading(false);
        };
        fetchFirma();
        // Abhängigkeiten: firmaId, supabase (falls Client neu erstellt wird), router, locale
    }, [firmaId, supabase, router, locale]);

    useEffect(() => {
        const fetchAltBayiProfiles = async () => {
            const { data } = await supabase
                .from('profiller')
                .select('id, tam_ad')
                .eq('rol', 'Alt Bayi')
                .order('tam_ad');
            setAltBayiProfiles(data || []);
        };
        fetchAltBayiProfiles();
    }, [supabase]);

    const tagOptions = [
        "#Vitrin_Boş", "#Mutfak_Yok", "#Yeni_Açılış", "#Türk_Sahibi", 
        "#Düğün_Mekanı", "#Kahve_Odaklı", "#Yüksek_Sirkülasyon", 
        "#Lüks_Mekan", "#Teraslı", "#Self_Service",
        "#Zincir_Marka", "#Kendi_Üretimi", "#Rakip_Sözleşmeli"
    ];

    const kaynakOptions = [
        "Google Maps", "Instagram", "Saha Ziyareti", "Referans", "Web", "Diğer"
    ];

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
                // Redirect to list page after successful update
                router.push(`/${locale}/admin/crm/firmalar`);
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
                <div>
                    <h2 className="font-serif text-2xl font-bold text-primary flex items-center gap-2">
                        {firma.unvan}
                        {(firma as any).oncelik_puani !== undefined && (
                            <span className={`text-xs px-2 py-1 rounded-full text-white ${
                                (firma as any).oncelik_puani >= 80 ? 'bg-red-500' : 
                                (firma as any).oncelik_puani >= 50 ? 'bg-yellow-500' : 'bg-gray-400'
                            }`}>
                                Score: {(firma as any).oncelik_puani}
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500">Allgemeine Informationen & Einstellungen</p>
                    {createdByProfile && (
                        <p className="text-xs text-gray-500 mt-1">
                            Kaydı oluşturan: {createdByProfile.tam_ad || createdByProfile.id}
                        </p>
                    )}
                </div>
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

            {/* Quick Access Card */}
            {((firma as any).instagram_url || (firma as any).facebook_url || (firma as any).web_url || (firma as any).google_maps_url) && (
                <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <span className="text-accent">🔗</span> Schnellzugriff
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
                                <FaGlobe size={18} /> Webseite
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
                        {kategoriOptions.map(cat => (
                            <option key={cat} value={cat}>
                                {kategoriLabels[cat] || cat}
                            </option>
                        ))}
                    </select>
                    
                    {/* Ana Kategori Detayları - YENİ */}
                    {firma.kategori && ["A", "B", "C", "D"].includes(firma.kategori) && (
                        <div className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500 rounded-lg">
                            <p className="font-bold text-purple-900 text-sm">{ANA_KATEGORILER[firma.kategori as any]}</p>
                            <p className="text-xs text-purple-700 mt-1 font-semibold">Hedef Müşteri Kitleri:</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {ALT_KATEGORILER[firma.kategori as any]?.map((altKat, idx) => (
                                    <span key={idx} className="inline-block px-3 py-1 bg-white border border-purple-200 text-purple-800 rounded-full text-xs font-medium hover:bg-purple-50 transition">
                                        • {altKat}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-3 p-3 bg-white rounded border border-purple-200">
                                <p className="text-xs font-semibold text-gray-700">📊 Puanlama Aralığı:</p>
                                <p className="text-sm text-gray-900 font-bold mt-1">{PUANLAMA_ARALIK[firma.kategori as any]?.min} - {PUANLAMA_ARALIK[firma.kategori as any]?.max} puan (Önerilen: {PUANLAMA_ARALIK[firma.kategori as any]?.ort})</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Alt Bayi Kullanıcı Profili */}
                {(firma.kategori === 'Alt Bayi' || (firma as any).ticari_tip === 'alt_bayi') && (
                    <div>
                        <label htmlFor="sahip_id" className="block text-sm font-bold text-gray-700 mb-2">Alt Bayi Kullanıcısı</label>
                        {editMode ? (
                            <select
                                id="sahip_id"
                                name="sahip_id"
                                defaultValue={(firma as any).sahip_id || ''}
                                className={inputBaseClasses}
                            >
                                <option value="">-- Kullanıcı Seçin --</option>
                                {altBayiProfiles.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.tam_ad || p.id}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm text-gray-700">
                                {altBayiProfiles.find(p => p.id === (firma as any).sahip_id)?.tam_ad || 'Bağlı kullanıcı yok'}
                            </div>
                        )}
                    </div>
                )}

                {/* Quelle (Source) */}
                <div>
                    <label htmlFor="kaynak" className="block text-sm font-bold text-gray-700 mb-2">Quelle (Source)</label>
                    <select id="kaynak" name="kaynak" defaultValue={(firma as any).kaynak || ''} disabled={!editMode} className={inputBaseClasses}>
                         <option value="">-- Wie gefunden? --</option>
                        {kaynakOptions.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>

                {/* Entscheider */}
                <div>
                    <label htmlFor="yetkili_kisi" className="block text-sm font-bold text-gray-700 mb-2">Entscheider (Decision Maker)</label>
                    <input type="text" id="yetkili_kisi" name="yetkili_kisi" defaultValue={(firma as any).yetkili_kisi || ''} disabled={!editMode} className={inputBaseClasses} placeholder="z.B. Max Mustermann"/>
                </div>

                {/* Tags */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tags</label>
                    <div className="flex flex-wrap gap-3">
                        {tagOptions.map(tag => (
                            <label key={tag} className={`inline-flex items-center gap-2 px-3 py-2 rounded-full transition ${editMode ? 'cursor-pointer hover:bg-gray-200 bg-gray-100' : 'bg-gray-50'}`}>
                                <input 
                                    type="checkbox" 
                                    name="etiketler" 
                                    value={tag} 
                                    defaultChecked={(firma as any).etiketler?.includes(tag)}
                                    disabled={!editMode}
                                    className="rounded text-accent focus:ring-accent disabled:opacity-50" 
                                />
                                <span className="text-sm font-medium text-gray-700">{tag}</span>
                            </label>
                        ))}
                    </div>
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

                {/* --- YENİ ALANLAR: Adres Detayları (Auto-fill) --- */}
                <AddressAutofill 
                    defaultCity={(firma as any).sehir || ''}
                    defaultDistrict={(firma as any).ilce || ''}
                    defaultNeighborhood={(firma as any).mahalle || ''}
                    defaultZipCode={(firma as any).posta_kodu || ''}
                    disabled={!editMode}
                />
                {/* --- BİTTİ --- */}

                {/* Adresse */}
                <div className="md:col-span-2">
                    <label htmlFor="adres" className="block text-sm font-bold text-gray-700 mb-2">Adresse (Straße & Nr.)</label>
                    <textarea id="adres" name="adres" rows={3} defaultValue={firma.adres || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>

                {/* Son Etkileşim Tarihi (Read-only) */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Letzte Interaktion</label>
                    <input 
                        type="text" 
                        value={(firma as any).son_etkilesim_tarihi ? new Date((firma as any).son_etkilesim_tarihi).toLocaleDateString('de-DE') : 'Noch keine'} 
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
                    <label htmlFor="web_url" className="block text-sm font-bold text-gray-700 mb-2">Webseite</label>
                    <input type="url" id="web_url" name="web_url" placeholder="https://..." defaultValue={(firma as any).web_url || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>

                {/* Google Maps URL */}
                <div>
                    <label htmlFor="google_maps_url" className="block text-sm font-bold text-gray-700 mb-2">Google Maps</label>
                    <input type="url" id="google_maps_url" name="google_maps_url" placeholder="https://maps.google.com/..." defaultValue={(firma as any).google_maps_url || ''} disabled={!editMode} className={inputBaseClasses} />
                </div>

                {/* Öncelik Puanı - YENİ */}
                <div>
                    <label htmlFor="oncelik_puani" className="block text-sm font-bold text-gray-700 mb-2">Öncelik Puanı (1-100)</label>
                    <input 
                        type="number" 
                        id="oncelik_puani" 
                        name="oncelik_puani" 
                        min="1" 
                        max="100"
                        defaultValue={firma.oncelik_puani || ''} 
                        disabled={!editMode} 
                        className={inputBaseClasses}
                        placeholder="1-100 arasında puan girin"
                    />
                    {editMode && firma.kategori && (
                        <p className="text-xs text-gray-500 mt-2">
                            💡 İpucu: {firma.kategori} kategorisi için önerilen puan: {PUANLAMA_ARALIK[firma.kategori as any]?.ort || 50}
                        </p>
                    )}
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