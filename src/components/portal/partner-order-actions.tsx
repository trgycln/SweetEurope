// src/components/portal/partner-order-actions.tsx
'use client';

import { Tables } from "@/lib/supabase/database.types";
import { FiDownload, FiRepeat } from "react-icons/fi";
import { getInvoiceDownloadUrlAction } from "@/app/actions/siparis-actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Gelen sipariş tipini daha doğru tanımlayalım
type SiparisWithDetay = Tables<'siparisler'> & {
    siparis_detaylari: Pick<Tables<'siparis_detaylari'>, 'urun_id' | 'adet'>[]
};

export function PartnerOrderActions({ siparis }: { siparis: SiparisWithDetay }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        if (!siparis.fatura_url) return;
        setIsLoading(true);
        const { url, error } = await getInvoiceDownloadUrlAction(siparis.id, siparis.fatura_url);
        setIsLoading(false);
        
        if (url) {
            window.open(url, '_blank');
        } else {
            alert(error || "Fatura indirilirken bilinmeyen bir hata oluştu.");
        }
    };

    const handleRepeatOrder = () => {
        const itemsToReorder = siparis.siparis_detaylari.map(item => ({ 
            urun_id: item.urun_id, 
            adet: item.adet 
        }));
        sessionStorage.setItem('reorderCart', JSON.stringify(itemsToReorder));
        router.push(`/portal/siparisler/yeni`);
    };

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            {siparis.fatura_url && (
                <button 
                    onClick={handleDownload} 
                    disabled={isLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                    <FiDownload size={16}/> 
                    {isLoading ? 'Hazırlanıyor...' : 'Faturayı İndir'}
                </button>
            )}
            <button 
                onClick={handleRepeatOrder} 
                className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold hover:bg-opacity-90 transition-colors"
            >
                <FiRepeat size={16}/> 
                Bu Siparişi Tekrarla
            </button>
        </div>
    );
}