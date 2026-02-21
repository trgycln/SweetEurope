// src/app/[locale]/portal/taleplerim/page.tsx

import React from 'react';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Tables } from "@/lib/supabase/database.types";
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { createYeniUrunTalepAction } from '@/app/actions/yeni-urun-actions';
import { FiCheckCircle, FiClock, FiEdit, FiLoader, FiPackage, FiSend, FiXCircle } from 'react-icons/fi';

export const dynamic = 'force-dynamic';

interface PartnerTaleplerimPageProps {
    params: { locale: Locale };
    searchParams?: { [key: string]: string | string[] | undefined };
}

// Type definition
type YeniUrunTalepWithProfil = Tables<'yeni_urun_talepleri'> & {
    profiller: { tam_ad: string | null; } | null;
};

type UrunStatusKey = 'Yeni' | 'Değerlendiriliyor' | 'Onaylandı' | 'Reddedildi';

const UrunStatusBadge = ({ status, text }: { status: UrunStatusKey, text: string }) => { 
    const iconMap: Record<string, React.ElementType> = { 
        'Yeni': FiClock, 
        'Değerlendiriliyor': FiPackage, 
        'Onaylandı': FiCheckCircle, 
        'Reddedildi': FiXCircle 
    }; 
    const colorMap: Record<string, string> = { 
        'Yeni': 'text-yellow-600 bg-yellow-100', 
        'Değerlendiriliyor': 'text-blue-600 bg-blue-100', 
        'Onaylandı': 'text-green-600 bg-green-100', 
        'Reddedildi': 'text-red-600 bg-red-100' 
    }; 
    const Icon = iconMap[status] || FiClock; 
    const color = colorMap[status] || 'text-gray-600 bg-gray-100'; 
    return <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${color}`}><Icon size={12} /> {text}</span>; 
};

export default async function PartnerTaleplerimPage({ params }: PartnerTaleplerimPageProps) {
    noStore();
    const locale = params.locale;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const dictionary = await getDictionary(locale);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${locale}/login?next=/portal/taleplerim`);
    }

    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id, rol')
        .eq('id', user.id)
        .single();
        
    if (!profile || !profile.firma_id) {
         console.error(`Profile or company ID not found for user ${user.id}`);
        return redirect(`/${locale}/login?error=unauthorized`);
    }

    if (profile.rol !== 'Müşteri' && profile.rol !== 'Alt Bayi') {
         console.warn(`Unauthorized access to Taleplerim by role: ${profile.rol}`);
         return redirect(`/${locale}/admin/dashboard`);
    }

    // Only fetch yeni_urun_talepleri
    const { data: urunTalepData, error: urunTalepError } = await supabase
        .from('yeni_urun_talepleri')
        .select('*, profiller!olusturan_kullanici_id(tam_ad)')
        .eq('firma_id', profile.firma_id)
        .order('created_at', { ascending: false });

    if (urunTalepError) {
         console.error("Error loading product requests:", urunTalepError);
    }
    
    const urunTalepleri = (urunTalepData || []) as YeniUrunTalepWithProfil[];
    const content = (dictionary as any).portal?.requestsPage || {};
    const productRequestContent = content.newProduct || {};
    const productRequestStatuses = content.productStatuses || {};

    const formatDate = (dateStr: string | null) => new Date(dateStr || 0).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title || "Meine Anfragen"}</h1>
                <p className="text-text-main/80 mt-1">{content.productDescription || "Reichen Sie neue Produktideen ein."}</p>
            </header>

            <div className="space-y-8">
                <form action={createYeniUrunTalepAction} className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-6 max-w-3xl mx-auto">
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
                        <button type="submit" className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
                            <FiSend />
                            {productRequestContent.submitButton || "Anfrage senden"}
                        </button>
                    </div>
                </form>

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
                                            <UrunStatusBadge status={talep.status as UrunStatusKey} text={(productRequestStatuses as any)?.[talep.status] || talep.status} />
                                        </div>
                                    </div>
                                    {talep.admin_notu && (
                                        <div className="p-3 bg-blue-50 border-l-4 border-blue-300 rounded-r-md">
                                            <p className="text-sm font-semibold text-blue-800">{productRequestContent.adminNote || "Antwort:"}</p>
                                            <p className="text-sm text-blue-700 italic mt-1">{talep.admin_notu}</p>
                                        </div>
                                    )}
                                    {talep.status === 'Yeni' && (
                                        <div className="flex items-center justify-end gap-4 pt-2">
                                            <Link href={`/${locale}/portal/taleplerim/edit/${talep.id}`} className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
                                                <FiEdit size={14} /> {content.editButton || "Bearbeiten"}
                                            </Link>
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