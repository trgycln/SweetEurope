// src/components/portal/katalog/PortalUrunDetay.tsx (Mit Warenkorb-Funktion)
'use client';

import React, { useState } from 'react'; // useState importieren
import Image from 'next/image';
import { Tables } from '@/lib/supabase/database.types';
import { getLocalizedName, formatCurrency, computeTedarikDurumu } from '@/lib/utils';
import { Locale } from '@/i18n-config';
import { Dictionary } from '@/dictionaries';
import {
    FiBox, FiClipboard, FiMaximize, FiPackage, FiCheckCircle,
    FiAlertTriangle, FiXCircle, FiShoppingCart, FiPlus, FiMinus
} from 'react-icons/fi';
import { LuBarcode } from 'react-icons/lu';
import { usePortal, ProduktImWarenkorb } from '@/contexts/PortalContext'; // NEU: Context importieren
import { ProductDescriptionRenderer } from '@/components/common/ProductDescriptionRenderer';
import { ProductSpecsAccordion } from '@/components/common/ProductSpecsAccordion';
import { toast } from 'sonner'; // NEU: toast importieren

// Typen (unverändert)
type Urun = Tables<'urunler'> & {
    kategoriler: Pick<Tables<'kategoriler'>, 'ad'> | null;
    ean_gtin?: string | null;
    mindest_bestellmenge?: number | null;
    mindest_bestellmenge_einheit?: string | null;
    lieferzeit_werktage?: number | null;
    hersteller_name?: string | null;
};

interface PortalUrunDetayProps {
    urun: Urun;
    partnerPreis: number | null;
    stokMiktari: number | null;
    locale: Locale;
    dictionary: Dictionary;
}

// Map für technische Details
const getOzelliklerMap = (locale: Locale) => [
    { key: 'paket_icerigi', label: locale === 'de' ? 'Paketinhalt' : locale === 'en' ? 'Package Content' : locale === 'ar' ? 'محتوى العبوة' : 'Paket İçeriği', icon: <FiPackage/>, suffix: '' },
    { key: 'net_agirlik_kg', label: locale === 'de' ? 'Nettogewicht' : locale === 'en' ? 'Net Weight' : locale === 'ar' ? 'الوزن الصافي' : 'Net Ağırlık', icon: <FiMaximize/>, suffix: ' kg' },
    { key: 'brut_agirlik_kg', label: locale === 'de' ? 'Bruttogewicht' : locale === 'en' ? 'Gross Weight' : locale === 'ar' ? 'الوزن الإجمالي' : 'Brüt Ağırlık', icon: <FiBox/>, suffix: ' kg' },
    { key: 'raf_omru_ay', label: locale === 'de' ? 'Haltbarkeit' : locale === 'en' ? 'Shelf Life' : locale === 'ar' ? 'مدة الصلاحية' : 'Raf Ömrü', icon: <FiClipboard/>, suffix: locale === 'de' ? ' Monate' : locale === 'en' ? ' Months' : locale === 'ar' ? ' شهر' : ' Ay' },
];

// LagerStatusAnzeige
const LagerStatusAnzeige = ({ menge, schwelle, dictionary, locale, tukenmeTarihi }: { menge: number | null, schwelle: number | null, dictionary: Dictionary, locale: Locale, tukenmeTarihi: string | null }) => {
    const currentMenge = menge ?? 0;
    const warnSchwelle = (schwelle !== null && schwelle !== undefined && schwelle > 0) ? schwelle : 10;
    const content = (dictionary as any)?.portal?.productDetailPage || {};

    let status: { text: string; color: string; icon: React.ReactNode };

    const durum = computeTedarikDurumu(currentMenge, tukenmeTarihi);
    if (durum === 'talep_uzerine') {
        status = { text: locale === 'de' ? 'Nicht auf Lager' : 'Stokta yok', color: "text-violet-600", icon: <FiAlertTriangle /> };
    } else if (durum === 'tukendi') {
        status = { text: locale === 'de' ? 'Ausverkauft' : 'Tükendi', color: "text-red-600", icon: <FiXCircle /> };
    } else if (currentMenge <= warnSchwelle) {
        status = { text: content.availabilityLowStock || (locale === 'de' ? 'Wenig Bestand' : 'Az stok'), color: "text-amber-600", icon: <FiAlertTriangle /> };
    } else {
        status = { text: content.availabilityInStock || (locale === 'de' ? 'Auf Lager' : 'Stokta var'), color: "text-green-600", icon: <FiCheckCircle /> };
    }

    return (
        <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${status.color}`}>
            {status.icon}
            {status.text}
        </span>
    );
};


export function PortalUrunDetay({ urun, partnerPreis, stokMiktari, locale, dictionary }: PortalUrunDetayProps) {
    const content = (dictionary as any)?.portal?.productDetailPage || {};
    const cartContent = (dictionary as any)?.portal?.newOrderPage || {}; // Für Warenkorb-Texte

    // NEU: Warenkorb-Kontext und Menge-State
    const { addToWarenkorb } = usePortal(); // Holt die Funktion aus dem Context
    const [menge, setMenge] = useState(1); // Lokaler State für die Mengenauswahl

    // Lokalisierte Texte (unverändert)
    const urunAdi = getLocalizedName(urun.ad, locale);
    const aciklama = getLocalizedName(urun.aciklamalar, locale);
    const kategorieAdi = urun.kategoriler ? getLocalizedName(urun.kategoriler.ad, locale) : '';

    // Technische Details
    const gosterilecekOzellikler = urun.teknik_ozellikler ? getOzelliklerMap(locale).filter(item => (urun.teknik_ozellikler as any)[item.key] !== null && (urun.teknik_ozellikler as any)[item.key] !== undefined && (urun.teknik_ozellikler as any)[item.key] !== '').map(item => ({...item, value: (urun.teknik_ozellikler as any)[item.key]})) : [];
    // Hauptbild (unverändert)
    const hauptBildUrl = urun.ana_resim_url || (urun.galeri_resim_urls && urun.galeri_resim_urls.length > 0 ? urun.galeri_resim_urls[0] : '/placeholder.png');
    
    // Preisformatierung (unverändert)
    const formatPreis = (wert: number | null) => {
         if (wert === null) return '-';
         const localeFormat = locale === 'tr' ? 'tr-TR' : 'de-DE';
         try { return new Intl.NumberFormat(localeFormat, { style: 'currency', currency: 'EUR' }).format(wert); }
         catch (e) { return `${wert} EUR`; }
    };
    
    // NEU: Handler für Mengenänderung
    const handleMengeChange = (neueMenge: number) => {
        const maxStok = stokMiktari ?? 0;
        if (neueMenge < 1) {
            setMenge(1); // Minimum 1
        } else if (maxStok > 0 && neueMenge > maxStok) {
            setMenge(maxStok); // Maximum ist Lagerbestand bei lagernden Artikeln
            toast.warning(
                locale === 'de'
                    ? `Nicht genügend Lagerbestand! Maximal ${maxStok} Stück sofort verfügbar.`
                    : locale === 'en'
                    ? `Insufficient stock! Maximum ${maxStok} units immediately available.`
                    : locale === 'ar'
                    ? `المخزون غير كافٍ! الحد الأقصى المتاح حالياً ${maxStok} قطعة.`
                    : `Stok yetersiz! Maksimum ${maxStok} adet hemen teslim edilebilir.`
            );
        } else {
            setMenge(neueMenge);
        }
    };
    
    // NEU: Handler für "In den Warenkorb" (Inklusive Vorbestellung für HoReCa/B2B)
    const handleAddToWarenkorb = () => {
        if (partnerPreis === null) {
            toast.error(
                locale === 'de'
                    ? "Für dieses Produkt ist kein Preis verfügbar."
                    : locale === 'en'
                    ? "No price available for this product."
                    : locale === 'ar'
                    ? "لا يوجد سعر متاح لهذا المنتج."
                    : "Bu ürün için fiyat mevcut değil."
            );
            return;
        }

        const isVorbestellung = (stokMiktari ?? 0) <= 0;

        // Produktobjekt für den Context vorbereiten
        const produktFuerWarenkorb: ProduktImWarenkorb = {
            ...urun,
            partnerPreis: partnerPreis
        };

        addToWarenkorb(produktFuerWarenkorb, menge);
        
        // Erfolg-Toast
        if (isVorbestellung) {
            toast.success(
                locale === 'de'
                    ? `${menge} x ${urunAdi} als Vorbestellung zum Warenkorb hinzugefügt!`
                    : locale === 'en'
                    ? `${menge} x ${urunAdi} added to cart as pre-order!`
                    : locale === 'ar'
                    ? `تمت إضافة ${menge} x ${urunAdi} كطلب مسبق إلى السلة!`
                    : `${menge} x ${urunAdi} ön sipariş olarak sepete eklendi!`
            );
        } else {
            toast.success(`${menge} x ${urunAdi} ${cartContent.addedToCart || 'zum Warenkorb hinzugefügt!'}`);
        }
    };

    return (
        <div className="bg-secondary py-12 md:py-16">
            <div className="container mx-auto px-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">
                    {/* Bild Sektion (unverändert) */}
                    <div>
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-lg mb-4 bg-white">
                             <Image src={hauptBildUrl} alt={urunAdi} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" priority />
                        </div>
                         {urun.galeri_resim_urls && urun.galeri_resim_urls.length > 1 && (
                             <div className="flex space-x-2 mt-4 overflow-x-auto pb-2">
                                 {urun.galeri_resim_urls.map((url, index) => (
                                     <div key={index} className="relative w-20 h-20 rounded-md overflow-hidden border flex-shrink-0 bg-white">
                                          <Image src={url} alt={`Galerie ${index+1}`} fill sizes="80px" className="object-cover"/>
                                     </div>
                                 ))}
                             </div>
                         )}
                    </div>

                    {/* Detail Sektion (Aktualisiert) */}
                    <div className="flex flex-col space-y-6">
                         <div>
                            {kategorieAdi && <p className="font-sans text-sm text-gray-500 mb-1 uppercase tracking-wider">{kategorieAdi}</p>}
                            <h1 className="text-3xl lg:text-4xl font-serif text-primary">{urunAdi}</h1>
                            <div className="flex flex-wrap gap-3 mt-1">
                                {urun.stok_kodu && (
                                    <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                                        <FiClipboard size={11} />
                                        Art.-Nr.: {urun.stok_kodu}
                                    </span>
                                )}
                                {(urun as any).ean_gtin && (
                                    <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                                        <LuBarcode size={11} />
                                        EAN: {(urun as any).ean_gtin}
                                    </span>
                                )}
                            </div>
                         </div>

                         {/* Preis und Lager (Aktualisiert mit B2B Netto + MwSt) */}
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border">
                             <div>
                                 <div className="flex items-center gap-2">
                                     <p className="text-xs font-bold text-text-main/60 uppercase">{content.yourPrice || "Ihr Preis"}</p>
                                     <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Netto</span>
                                 </div>
                                 <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                                     <p className="font-serif text-2xl text-accent font-bold">{formatPreis(partnerPreis)}</p>
                                     {partnerPreis != null && (
                                         <span className="text-xs text-gray-500 font-mono">
                                             zzgl. 7% MwSt. ({formatPreis(partnerPreis * 1.07)} Brutto)
                                         </span>
                                     )}
                                 </div>
                             </div>
                             <div className='sm:text-right'>
                                 <p className="text-xs font-bold text-text-main/60 uppercase">{content.availability || "Verfügbarkeit"}</p>
                                 <LagerStatusAnzeige menge={stokMiktari} schwelle={urun.stok_esigi} dictionary={dictionary} locale={locale} tukenmeTarihi={(urun as any).stok_tukenme_tarihi} />
                             </div>
                         </div>

                        {/* --- NEU: Bestell-Aktionen (inklusive Vorbestellung) --- */}
                        <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                {/* Mengenauswahl */}
                                <div className="flex items-center border rounded-lg">
                                    <button 
                                        onClick={() => handleMengeChange(menge - 1)}
                                        className="px-4 py-3 text-text-main/70 hover:bg-bg-subtle rounded-l-lg"
                                    >
                                        <FiMinus size={16} />
                                    </button>
                                    <input 
                                        type="number" 
                                        value={menge}
                                        onChange={(e) => handleMengeChange(parseInt(e.target.value) || 1)}
                                        className="w-16 text-center font-bold text-primary border-y-0 border-x [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        min="1"
                                    />
                                    <button 
                                        onClick={() => handleMengeChange(menge + 1)}
                                        className="px-4 py-3 text-text-main/70 hover:bg-bg-subtle rounded-r-lg"
                                    >
                                        <FiPlus size={16} />
                                    </button>
                                </div>
                                {/* In den Warenkorb / Als Vorbestellung Button */}
                                {(stokMiktari ?? 0) <= 0 ? (
                                    <button 
                                        onClick={handleAddToWarenkorb}
                                        disabled={partnerPreis === null}
                                        className="flex-grow w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg shadow-md transition-all font-bold text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        <FiShoppingCart size={18} />
                                        <span>{locale === 'de' ? 'Als Vorbestellung in den Warenkorb' : 'Ön Sipariş Olarak Sepete Ekle'}</span>
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleAddToWarenkorb}
                                        disabled={partnerPreis === null}
                                        className="flex-grow w-full flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all font-bold text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        <FiShoppingCart size={18} />
                                        <span>{cartContent.addToCart || 'In den Warenkorb'}</span>
                                    </button>
                                )}
                            </div>
                            {(stokMiktari ?? 0) <= 0 && (
                                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                                    {locale === 'de'
                                        ? 'ℹ️ Dieser Artikel ist derzeit vergriffen und wird als Vorbestellung aufgenommen. Die Lieferung erfolgt nach Wareneingang.'
                                        : 'ℹ️ Bu ürün şu an tükenmiştir ve ön sipariş olarak kaydedilecektir. Sevkiyat stok temini akabinde gerçekleştirilecektir.'}
                                </p>
                            )}
                        </div>
                        {/* --- Ende Bestell-Aktionen --- */}


                         {/* Beschreibung / Akıllı Estetik Açıklama */}
                         {aciklama && typeof aciklama === 'string' && aciklama !== 'Unbenannt' && aciklama.trim() !== '' && (
                            <ProductDescriptionRenderer
                                text={aciklama}
                                productTitle={urunAdi}
                                locale={locale}
                            />
                         )}

                         {/* Technische Details (falls vorhanden) */}
                         {gosterilecekOzellikler.length > 0 && (
                             <div className="border-t pt-4">
                                 <h3 className="font-bold font-sans tracking-wider uppercase mb-2 text-primary text-xs">Details</h3>
                                 <div className="space-y-1">
                                     {gosterilecekOzellikler.map(item => (
                                         <div key={item.key} className="flex justify-between items-center py-1 text-xs">
                                             <span className="font-medium text-text-main/70">{item.label}</span>
                                             <span className="font-semibold text-primary">{item.value}{item.suffix || ''}</span>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         )}

                         {/* ── Akıllı Katlanabilir Bölümler: Zutaten, Nährwerte, Logistik & Original Etikett ── */}
                         <ProductSpecsAccordion
                             inhaltsstoffe={(urun as any).inhaltsstoffe}
                             naehrwerte={(urun as any).naehrwerte}
                             allergene={(urun as any).allergene}
                             etiketPdfUrl={(urun as any).etiket_pdf_url || (urun as any).produktdatenblatt_url}
                             logistik={{
                                 koliIciAdet: (urun as any).koli_ici_adet,
                                 paletIciAdet: (urun as any).palet_ici_adet,
                                 paletIciKoliAdet: (urun as any).palet_ici_koli_adet,
                                 birimAgirlikKg: (urun as any).birim_agirlik_kg,
                                 mindestBestellmenge: (urun as any).mindest_bestellmenge,
                                 mindestBestellmengeEinheit: (urun as any).mindest_bestellmenge_einheit,
                                 lieferzeitWerktage: (urun as any).lieferzeit_werktage,
                                 herstellerName: (urun as any).hersteller_name,
                                 herkunftsland: (urun as any).herkunftsland,
                             }}
                             productName={urunAdi}
                             stokKodu={urun.stok_kodu}
                             locale={locale}
                         />
                    </div>
                </div>
            </div>
        </div>
    );
}