// src/app/admin/crm/firmalar/[firmaId]/siparisler/yeni/page.tsx

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import YeniSiparisFormu from "./YeniSiparisFormu";

export default async function YeniSiparisPage({ params }: { params: { firmaId: string }}) {
    const supabase = createSupabaseServerClient();

    // Formun ihtiyaç duyduğu verileri paralel olarak çekiyoruz
    const [firmaRes, urunlerRes] = await Promise.all([
        supabase.from('firmalar').select('unvan, adres').eq('id', params.firmaId).single(),
        supabase.from('urunler').select('id, ad, satis_fiyati_musteri').eq('aktif', true).order('ad->>tr')
    ]);

    const { data: firma, error: firmaError } = firmaRes;
    const { data: urunler, error: urunlerError } = urunlerRes;

    if (firmaError || urunlerError || !firma) {
        console.error("Yeni sipariş sayfası için veri çekme hatası:", firmaError || urunlerError);
        notFound();
    }

    return (
        <div className="space-y-6">
            <div>
                <Link 
                    href={`/admin/crm/firmalar/${params.firmaId}/siparisler`} 
                    className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors"
                >
                    <FiArrowLeft />
                    Sipariş Listesine Geri Dön
                </Link>
                <h1 className="font-serif text-4xl font-bold text-primary mt-2">Yeni Sipariş Oluştur</h1>
                <p className="text-text-main/80 mt-1"><span className="font-bold text-accent">{firma.unvan}</span> için yeni bir sipariş oluşturuluyor.</p>
            </div>
            
            {/* İnteraktif form bileşenini render ediyor ve verileri prop olarak geçiyoruz */}
            <YeniSiparisFormu
                firmaId={params.firmaId}
                varsayilanTeslimatAdresi={firma.adres || ''}
                urunler={urunler || []}
            />
        </div>
    );
}