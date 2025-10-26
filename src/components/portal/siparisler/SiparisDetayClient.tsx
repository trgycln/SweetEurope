'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FiArrowLeft, FiUser, FiTruck, FiRefreshCw, FiXCircle, FiLoader, FiPackage, FiImage } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { getLocalizedName, formatCurrency, formatDate } from '@/lib/utils';
import { iptalSiparisAction } from '@/app/actions/siparis-actions';

// Typ-Definition bleibt unverändert
export type SiparisDetay = {
    id: string;
    siparis_tarihi: string;
    toplam_tutar_net: number;
    toplam_tutar_brut: number;
    kdv_orani: number;
    siparis_durumu: string;
    teslimat_adresi: string | null;
    firmalar: {
        unvan: string;
        adres: string | null;
    } | null;
    siparis_detay: {
        id: string;
        urun_id: string;
        miktar: number;
        birim_fiyat: number;
        toplam_fiyat: number;
        urunler: {
            ad: any;
            stok_kodu: string | null;
            ana_resim_url: string | null;
        } | null;
    }[];
};

interface SiparisDetayClientProps {
    siparis: SiparisDetay;
    dictionary: Dictionary;
    locale: Locale;
}

const getStatusChipClass = (status: string) => {
    // Diese Funktion bleibt unverändert
    const statusMap: Record<string, string> = {
        "Beklemede": "bg-gray-100 text-gray-800",
        "Hazırlanıyor": "bg-blue-100 text-blue-800",
        "Yola Çıktı": "bg-yellow-100 text-yellow-800",
        "Teslim Edildi": "bg-green-100 text-green-800",
        "İptal Edildi": "bg-red-100 text-red-800",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
};

export function SiparisDetayClient({ siparis, dictionary, locale }: SiparisDetayClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // === Lokalisierung ===
    // Texte aus dem Wörterbuch holen
    const content = dictionary.portal.orderDetailsPage;
    // Status-Übersetzungen aus dem ordersPage-Bereich holen (hier sind sie definiert)
    const statusTranslations = (dictionary.portal.ordersPage as any)?.statusOptions || {};
    // Fallback-Texte für Buttons definieren, falls im Dictionary nicht vorhanden
    const buttonTexts = {
        reorder: (dictionary.adminDashboard?.ordersPage as any)?.reorderButton || 'Erneut bestellen', // Beispiel, ggf. anpassen
        cancel: (dictionary.adminDashboard?.ordersPage as any)?.cancelButton || 'Bestellung stornieren', // Beispiel, ggf. anpassen
        cancelling: (dictionary.adminDashboard?.ordersPage as any)?.cancellingButton || 'Wird storniert...' // Beispiel, ggf. anpassen
    };

    // === Logik für Buttons ===
    const handleReorder = () => {
        const queryParams = new URLSearchParams();
        siparis.siparis_detay.forEach(item => {
            queryParams.append(`urun_${item.urun_id}`, item.miktar.toString());
        });
        router.push(`/${locale}/portal/siparisler/yeni?${queryParams.toString()}`);
    };

    const handleCancelOrder = async () => {
        // Bestätigungsdialog mit deutschem Text
        if (window.confirm("Möchten Sie diese Bestellung wirklich stornieren? Dieser Vorgang kann nicht rückgängig gemacht werden.")) {
            startTransition(async () => {
                const formData = new FormData();
                formData.append('siparisId', siparis.id);
                const result = await iptalSiparisAction(formData);

                if (result.error) {
                    toast.error(result.error); // Fehlermeldung ist i.d.R. schon lokalisiert aus der Action
                } else {
                    toast.success(result.success); // Erfolgsmeldung dito
                    router.refresh();
                }
            });
        }
    };

    // Sicherstellen, dass der Vergleich mit dem exakten String aus der DB erfolgt
    const isCancellable = siparis.siparis_durumu === 'Beklemede';

    // Debugging: Status in der Konsole ausgeben, um sicherzugehen
    console.log("Aktueller Bestellstatus:", siparis.siparis_durumu, "| Stornierbar:", isCancellable);


    // === Render-Teil ===
    return (
        <div className="space-y-8">
            <header>
                <Link href={`/${locale}/portal/siparisler`} className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent mb-4">
                    <FiArrowLeft /> {content.backToList}
                </Link>
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                    <div>
                        <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary flex items-center gap-3">
                            {content.title}
                            <span className={`mt-1 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusChipClass(siparis.siparis_durumu)}`}>
                                {/* Status-Namen aus dem Wörterbuch holen */}
                                {statusTranslations[siparis.siparis_durumu] || siparis.siparis_durumu}
                            </span>
                        </h1>
                        <p className="text-text-main/60 font-mono text-sm">#{siparis.id.toUpperCase()}</p>
                        <p className="text-text-main/60 mt-1">{content.creationDate}: {formatDate(siparis.siparis_tarihi, locale)}</p>
                    </div>
                    {/* Buttons mit deutschen Texten */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={handleReorder} className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-primary rounded-lg shadow-sm hover:bg-bg-subtle transition-all font-bold text-sm">
                            <FiRefreshCw /> {buttonTexts.reorder}
                        </button>
                        <button
                            onClick={handleCancelOrder}
                            disabled={!isCancellable || isPending}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 transition-all font-bold text-sm disabled:bg-red-300 disabled:cursor-not-allowed"
                            title={!isCancellable ? 'Stornierung nur bei Status "Ausstehend" möglich' : ''} // Tooltip hinzufügen
                        >
                            {isPending ? <FiLoader className="animate-spin" /> : <FiXCircle />}
                            {isPending ? buttonTexts.cancelling : buttonTexts.cancel}
                        </button>
                    </div>
                </div>
            </header>
            {/* Der Rest des Codes (Grid, Tabelle etc.) bleibt unverändert */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-6">
                    <h2 className="font-serif text-2xl font-bold text-primary border-b pb-4 flex items-center gap-2"><FiPackage /> {content.orderItems}</h2>
                    <div className="divide-y divide-gray-200">
                        {siparis.siparis_detay.map(item => (
                            <div key={item.id} className="flex items-center gap-4 py-4">
                                <div className="relative w-16 h-16 bg-secondary rounded-md overflow-hidden flex-shrink-0">
                                    {item.urunler?.ana_resim_url ? (
                                        <Image src={item.urunler.ana_resim_url} alt={getLocalizedName(item.urunler.ad, locale)} fill sizes="64px" className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                            <FiImage size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <p className="font-bold text-primary">{getLocalizedName(item.urunler?.ad, locale)}</p>
                                    <p className="font-mono text-xs text-text-main/50">{item.urunler?.stok_kodu}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-text-main/80">{item.miktar} x {formatCurrency(item.birim_fiyat, locale)}</p>
                                    <p className="font-semibold text-primary">{formatCurrency(item.toplam_fiyat, locale)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Fiyat Toplamları */}
                    <div className="pt-6 border-t space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-text-main/80">{content.subtotal}</span>
                            <span className="font-semibold text-primary">{formatCurrency(siparis.toplam_tutar_net, locale)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-text-main/80">{content.vat} ({siparis.kdv_orani}%)</span>
                            <span className="font-semibold text-primary">{formatCurrency(siparis.toplam_tutar_brut - siparis.toplam_tutar_net, locale)}</span>
                        </div>
                        <div className="flex justify-between items-center font-bold text-lg border-t pt-2 mt-2">
                            <span className="text-primary">{content.grandTotal}</span>
                            <span className="text-accent">{formatCurrency(siparis.toplam_tutar_brut, locale)}</span>
                        </div>
                    </div>
                </div>
                {/* Kunden- und Lieferinformationen bleiben unverändert */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="font-serif text-xl font-bold text-primary mb-4 flex items-center gap-2"><FiUser />{content.customerInfo}</h3>
                        <p className="font-bold text-accent">{siparis.firmalar?.unvan}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-lg">
                        <h3 className="font-serif text-xl font-bold text-primary mb-4 flex items-center gap-2"><FiTruck />{content.deliveryInfo}</h3>
                        <p className="text-sm text-text-main/80 whitespace-pre-wrap">{siparis.teslimat_adresi || siparis.firmalar?.adres}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}