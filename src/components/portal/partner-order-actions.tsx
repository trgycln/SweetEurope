// src/components/portal/partner-order-actions.tsx (NİHAİ VE DOĞRU HALİ)

'use client';

import { useState } from "react";
import { useRouter, useParams } from "next/navigation"; // useParams eklendi
import { toast } from "sonner";
import { Tables } from "@/lib/supabase/database.types";
import { FiDownload, FiRepeat } from "react-icons/fi";
import { getInvoiceDownloadUrlAction } from "@/app/actions/siparis-actions";
import { Locale } from "@/i18n-config"; // Locale tipi eklendi

type SiparisForActions = Tables<'siparisler'> & {
    siparis_detay: Pick<Tables<'siparis_detay'>, 'urun_id' | 'miktar'>[]; // 'adet' -> 'miktar' olarak düzeltildi
    faturalar: { id: string, dosya_url: string | null }[] | null;
};

export function PartnerOrderActions({ siparis }: { siparis: SiparisForActions }) {
    const router = useRouter();
    const params = useParams(); // URL'den 'locale' bilgisini almak için
    const [isLoading, setIsLoading] = useState(false);

    const fatura = siparis.faturalar?.[0];

    const handleDownload = async () => {
        if (!fatura || !fatura.dosya_url) return;

        setIsLoading(true);
        const result = await getInvoiceDownloadUrlAction(siparis.id);
        setIsLoading(false);
        
        if (result.url) {
            window.open(result.url, '_blank');
            toast.success("Fatura indirme işlemi başlatıldı.");
        } else {
            toast.error(result.error || "Fatura indirilirken bilinmeyen bir hata oluştu.");
        }
    };

    // DEĞİŞİKLİK: Bu fonksiyon tamamen yeniden yazıldı.
    const handleRepeatOrder = () => {
        if (!siparis.siparis_detay || siparis.siparis_detay.length === 0) {
            toast.info("Bu siparişte tekrarlanacak ürün bulunmuyor.");
            return;
        }

        // Tıpkı "Hızlı Sipariş" gibi bir URL parametre listesi oluşturuyoruz.
        const urlParams = new URLSearchParams();
        siparis.siparis_detay.forEach(item => {
            // Veritabanındaki doğru sütun adı 'miktar' olduğu için onu kullanıyoruz.
            urlParams.append(`urun_${item.urun_id}`, item.miktar.toString());
        });
        
        const locale = params.locale as Locale;
        // Kullanıcıyı, sepeti dolduracak olan URL ile yeni sipariş sayfasına yönlendiriyoruz.
        router.push(`/${locale}/portal/siparisler/yeni?${urlParams.toString()}`);
    };

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            {fatura && fatura.dosya_url && (
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