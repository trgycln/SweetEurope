// src/app/[locale]/portal/taleplerim/TaleplerimClient.tsx (Vollständig mit Aktionen)
'use client';

import React, { useState, useEffect, useTransition, useRef } from 'react';
// KORREKTUR: React.useActionState importieren
import { useFormState, useFormStatus } from 'react-dom';
import { Tables, Enums } from '@/lib/supabase/database.types'; // Enums importieren
import Link from 'next/link';
import { Dictionary } from '@/dictionaries';
import { Locale, getLocalizedName } from '@/lib/utils';
import { FiArchive, FiCheckCircle, FiClock, FiEdit, FiHardDrive, FiLoader, FiPackage, FiPlusSquare, FiSend, FiTruck, FiXCircle, FiTrash2 } from 'react-icons/fi';
// KORREKTUR: Importiere die neuen Aktionen
import { createYeniUrunTalepAction, YeniUrunFormState, partnerDeleteUrunTalepAction } from '@/app/actions/yeni-urun-actions';
import { partnerCancelNumuneTalepAction } from '@/app/actions/numune-actions';
import { toast } from 'sonner';
// KORREKTUR: useRouter hier importieren
import { useRouter } from 'next/navigation';

// --- Typen ---
export type NumuneTalepWithUrun = Tables<'numune_talepleri'> & {
    urunler: { ad: { [key: string]: string } | null; stok_kodu: string | null; } | null;
};
export type YeniUrunTalepWithProfil = Tables<'yeni_urun_talepleri'> & {
    profiller: { tam_ad: string | null; } | null;
};
interface TaleplerimClientProps {
    initialNumuneTalepleri: NumuneTalepWithUrun[];
    initialUrunTalepleri: YeniUrunTalepWithProfil[];
    locale: Locale;
    dictionary: Dictionary;
}
type NumuneStatusKey = Enums<'numune_talep_durumu'>;
type UrunStatusKey = Enums<'urun_talep_durumu'>;

// --- Hilfskomponenten (Status-Badges) ---
const NumuneStatusBadge = ({ status, text }: { status: NumuneStatusKey, text: string }) => { const iconMap: Record<string, React.ElementType> = { 'Yeni Talep': FiClock, 'Onaylandı': FiCheckCircle, 'Hazırlanıyor': FiPackage, 'Gönderildi': FiTruck, 'İptal Edildi': FiXCircle }; const colorMap: Record<string, string> = { 'Yeni Talep': 'text-yellow-600 bg-yellow-100', 'Onaylandı': 'text-blue-600 bg-blue-100', 'Hazırlanıyor': 'text-purple-600 bg-purple-100', 'Gönderildi': 'text-green-600 bg-green-100', 'İptal Edildi': 'text-red-600 bg-red-100' }; const Icon = iconMap[status] || FiClock; const color = colorMap[status] || 'text-gray-600 bg-gray-100'; return <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${color}`}><Icon size={12} /> {text}</span>; };
const UrunStatusBadge = ({ status, text }: { status: UrunStatusKey, text: string }) => { const iconMap: Record<string, React.ElementType> = { 'Yeni': FiClock, 'Değerlendiriliyor': FiPackage, 'Onaylandı': FiCheckCircle, 'Reddedildi': FiXCircle }; const colorMap: Record<string, string> = { 'Yeni': 'text-yellow-600 bg-yellow-100', 'Değerlendiriliyor': 'text-blue-600 bg-blue-100', 'Onaylandı': 'text-green-600 bg-green-100', 'Reddedildi': 'text-red-600 bg-red-100' }; const Icon = iconMap[status] || FiClock; const color = colorMap[status] || 'text-gray-600 bg-gray-100'; return <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${color}`}><Icon size={12} /> {text}</span>; };

// Submit-Button für das neue Produktformular
function SubmitButton({ dictionary }: { dictionary: Dictionary }) {
    const { pending } = useFormStatus();
    const content = (dictionary as any).portal?.requestsPage?.newProduct || {};
    return (
        <button type="submit" disabled={pending} className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto disabled:bg-accent/50 disabled:cursor-wait">
            {pending ? <FiLoader className="animate-spin" /> : <FiSend />}
            {pending ? (content.submitting || "Wird gesendet...") : (content.submitButton || "Anfrage senden")}
        </button>
    );
}

// --- Hauptkomponente ---
export function TaleplerimClient({ initialNumuneTalepleri, initialUrunTalepleri, locale, dictionary }: TaleplerimClientProps) {
    // KORREKTUR: router hier auf oberster Ebene initialisieren
    const router = useRouter(); 
    
    const [activeTab, setActiveTab] = useState<'muster' | 'produkt'>('muster');
    const content = (dictionary as any).portal?.requestsPage || {};
    const productRequestContent = content.newProduct || {};
    const productRequestStatuses = content.productStatuses || {};
    
    // KORREKTUR: States für die Listen, damit wir sie client-seitig aktualisieren können
    const [numuneTalepleri, setNumuneTalepleri] = useState(initialNumuneTalepleri);
    const [urunTalepleri, setUrunTalepleri] = useState(initialUrunTalepleri);
    const [isCancelling, startCancelTransition] = useTransition();

    const formatDate = (dateStr: string | null) => new Date(dateStr || 0).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

    // Formular-Zustand für neue Produktanfrage
    const [formState, formAction] = React.useActionState(createYeniUrunTalepAction, null);
    const formRef = React.useRef<HTMLFormElement>(null);

    // Effekt für Toast-Nachrichten (Neue Produktanfrage)
    useEffect(() => {
        if (formState?.success === true) {
            toast.success(formState.message);
            formRef.current?.reset();
            // KORREKTUR: router ist jetzt hier im Scope verfügbar
            router.refresh(); 
        } else if (formState?.success === false) {
            toast.error(formState.message);
        }
    // KORREKTUR: router zur Abhängigkeitsliste hinzugefügt
    }, [formState, router]);
    
    // --- NEUE AKTIONEN-HANDLER ---
    // Handler zum Stornieren von Musteranfragen
    const handleNumuneCancel = (talepId: string) => {
        if (!confirm(content.cancelConfirm || "Möchten Sie diese Anfrage wirklich stornieren?")) return;

        startCancelTransition(async () => {
            const result = await partnerCancelNumuneTalepAction(talepId);
            if (result.success) {
                toast.success(content.requestCancelled || "Anfrage storniert");
                // Liste im Client aktualisieren
                setNumuneTalepleri(prev => prev.filter(t => t.id !== talepId));
            } else {
                toast.error(result.error || content.errorOccurred || "Ein Fehler ist aufgetreten");
            }
        });
    };

    // Handler zum Löschen von Produktanfragen
    const handleUrunTalepDelete = (talepId: string) => {
        if (!confirm(content.deleteConfirm || "Möchten Sie diese Produktanfrage wirklich löschen?")) return;

        startCancelTransition(async () => {
            const result = await partnerDeleteUrunTalepAction(talepId);
            if (result.success) {
                toast.success(content.requestDeleted || "Anfrage gelöscht");
                // Liste im Client aktualisieren
                setUrunTalepleri(prev => prev.filter(t => t.id !== talepId));
            } else {
                toast.error(result.error || content.errorOccurred || "Ein Fehler ist aufgetreten");
            }
        });
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title || "Meine Anfragen"}</h1>
                <p className="text-text-main/80 mt-1">{content.description || "Verfolgen Sie Ihre Musteranfragen und reichen Sie neue Produktideen ein."}</p>
            </header>

            {/* Tab-Navigation */}
            <div className="border-b border-gray-300">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('muster')}
                        className={`${activeTab === 'muster' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <FiArchive /> {content.tabSampleRequests || "Musteranfragen"}
                    </button>
                    <button
                        onClick={() => setActiveTab('produkt')}
                        className={`${activeTab === 'produkt' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <FiPlusSquare /> {content.tabNewProduct || "Neue Produktanfrage"}
                    </button>
                </nav>
            </div>

            {/* Tab 1: Musteranfragen (AKTUALISIERT mit Button) */}
            <div className={`${activeTab === 'muster' ? 'block' : 'hidden'}`}>
                {numuneTalepleri.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed rounded-lg">
                        <p className="text-text-main/70">{content.noSampleRequests || "Sie haben noch keine Muster angefragt."}</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md divide-y divide-gray-200">
                        {numuneTalepleri.map(talep => (
                            <div key={talep.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                <div>
                                    <p className="font-bold text-primary">{getLocalizedName(talep.urunler?.ad, locale) || 'Unbekanntes Produkt'}</p>
                                    <p className="text-sm text-gray-500">{content.requestDate || "Anfragedatum"}: {formatDate(talep.created_at)}</p>
                                    {talep.durum === 'İptal Edildi' && talep.iptal_aciklamasi && (
                                        <p className="text-sm text-red-500 mt-1 italic">{content.rejectionReason || "Grund"}: {talep.iptal_aciklamasi}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <NumuneStatusBadge status={talep.durum} text={(content.sampleStatuses as any)?.[talep.durum] || talep.durum} />
                                    {/* NEU: Stornieren-Button (nur wenn Status 'Yeni Talep') */}
                                    {talep.durum === 'Yeni Talep' && (
                                        <button 
                                            onClick={() => handleNumuneCancel(talep.id)}
                                            disabled={isCancelling}
                                            className="text-xs text-red-500 hover:underline disabled:opacity-50"
                                        >
                                            {isCancelling ? <FiLoader className="animate-spin" /> : (content.cancelButton || "Stornieren")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tab 2: Neue Produktanfrage (VOLLSTÄNDIG) */}
            <div className={`${activeTab === 'produkt' ? 'block' : 'hidden'} space-y-8`}>
                
                {/* Formular zum Erstellen */}
                <form ref={formRef} action={formAction} className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-6 max-w-3xl mx-auto">
                    <h2 className="font-serif text-2xl font-bold text-primary">{productRequestContent.formTitle || "Neue Produktanfrage einreichen"}</h2>
                    <p className="text-sm text-text-main/80">{productRequestContent.newProductIntro || "Haben Sie eine Produktidee...?"}</p>
                    <div>
                        <label htmlFor="produkt_name" className="block text-sm font-bold text-text-main/80 mb-2">{productRequestContent.newProductName || "Produktname"} <span className="text-red-500">*</span></label>
                        <input type="text" name="produkt_name" id="produkt_name" required className="w-full p-3 border rounded-lg bg-secondary" />
                    </div>
                    <div>
                        <label htmlFor="kategorie_vorschlag" className="block text-sm font-bold text-text-main/80 mb-2">{productRequestContent.newProductCategory || "Kategorievorschlag"}</label>
                        <input type="text" name="kategorie_vorschlag" id="kategorie_vorschlag" placeholder="z.B. Vegane Torten, Kaffeezubehör" className="w-full p-3 border rounded-lg bg-secondary" />
                    </div>
                    <div>
                        <label htmlFor="beschreibung" className="block text-sm font-bold text-text-main/80 mb-2">{productRequestContent.newProductDescription || "Beschreibung"} <span className="text-red-500">*</span></label>
                        <textarea name="beschreibung" id="beschreibung" rows={5} required placeholder="Bitte beschreiben Sie das Produkt..." className="w-full p-3 border rounded-lg bg-secondary" />
                    </div>
                     <div>
                        <label htmlFor="geschaetzte_menge_pro_woche" className="block text-sm font-bold text-text-main/80 mb-2">{productRequestContent.newProductEstimate || "Geschätzte Abnahme (pro Woche)"}</label>
                        <input type="number" name="geschaetzte_menge_pro_woche" id="geschaetzte_menge_pro_woche" placeholder="0" min="0" className="w-full p-3 border rounded-lg bg-secondary" />
                    </div>
                     <div>
                        <label htmlFor="referenz_link_gorsel" className="block text-sm font-bold text-text-main/80 mb-2">{productRequestContent.newProductLink || "Referenzlink (Bild oder Webseite)"}</label>
                        <input type="url" name="referenz_link_gorsel" id="referenz_link_gorsel" placeholder="https://..." className="w-full p-3 border rounded-lg bg-secondary" />
                    </div>
                    <div className="pt-6 border-t flex justify-end">
                        <SubmitButton dictionary={dictionary} />
                    </div>
                </form>

                {/* Liste der eingereichten Anfragen */}
                <div className="max-w-3xl mx-auto">
                    <h2 className="font-serif text-2xl font-bold text-primary mb-4">{productRequestContent.submittedRequests || "Ihre eingereichten Anfragen"}</h2>
                    {urunTalepleri.length === 0 ? (
                        <div className="text-center p-8 border-2 border-dashed rounded-lg">
                            <p className="text-text-main/70">{productRequestContent.noSubmittedRequests || "Sie haben noch keine Produktanfragen eingereicht."}</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow-md divide-y divide-gray-200">
                            {urunTalepleri.map(talep => (
                                <div key={talep.id} className="p-4 space-y-2">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                                        <div>
                                            <p className="font-bold text-primary">{talep.produkt_name}</p>
                                            <p className="text-sm text-gray-500">{content.requestDate || "Anfragedatum"}: {formatDate(talep.created_at)}</p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <UrunStatusBadge status={talep.status} text={(productRequestStatuses as any)?.[talep.status] || talep.status} />
                                        </div>
                                    </div>
                                    {/* Admin-Notiz */}
                                    {talep.admin_notu && (
                                        <div className="p-3 bg-blue-50 border-l-4 border-blue-300 rounded-r-md">
                                            <p className="text-sm font-semibold text-blue-800">{productRequestContent.adminNote || "Antwort:"}</p>
                                            <p className="text-sm text-blue-700 italic mt-1">{talep.admin_notu}</p>
                                        </div>
                                    )}
                                    {/* Aktionen (Bearbeiten/Löschen), nur wenn Status 'Yeni' */}
                                    {talep.status === 'Yeni' && (
                                        <div className="flex items-center justify-end gap-4 pt-2">
                                            {/* KORREKTUR: Link zur Bearbeiten-Seite */}
                                            <Link href={`/${locale}/portal/taleplerim/edit/${talep.id}`} className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                                                <FiEdit size={14} /> {content.editButton || "Bearbeiten"}
                                            </Link>
                                            <button 
                                                onClick={() => handleUrunTalepDelete(talep.id)}
                                                disabled={isCancelling}
                                                className="flex items-center gap-1 text-sm font-medium text-red-500 hover:underline disabled:opacity-50"
                                            >
                                                {isCancelling ? <FiLoader className="animate-spin" /> : <FiTrash2 size={14} />}
                                                {content.deleteButton || "Löschen"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
        </div>
    );
}