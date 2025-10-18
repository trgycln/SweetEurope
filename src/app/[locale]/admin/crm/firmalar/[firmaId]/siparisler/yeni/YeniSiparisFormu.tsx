// src/app/admin/crm/firmalar/[firmaId]/siparisler/yeni/YeniSiparisFormu.tsx
'use client';

import { useState, useTransition } from "react";
// DÜZELTME 1: Sayfayı yönlendirmek için useRouter'ı import ediyoruz.
import { useRouter } from "next/navigation";
import { siparisOlusturAction } from "@/app/actions/siparis-actions";
import { toast } from "sonner";
import { FiPlus, FiTrash2, FiSend, FiLoader } from "react-icons/fi";

// Prop tipleri
type Urun = {
    id: string;
    ad: any;
    satis_fiyati_musteri: number | null;
};

interface YeniSiparisFormuProps {
    firmaId: string;
    varsayilanTeslimatAdresi: string;
    urunler: Urun[];
}

// Sepetteki ürünün tipi
type SepetUrunu = {
    urun_id: string;
    adet: number;
    o_anki_satis_fiyati: number;
    urun_adi: string;
};

export default function YeniSiparisFormu({ firmaId, varsayilanTeslimatAdresi, urunler }: YeniSiparisFormuProps) {
    // DÜZELTME 2: useRouter hook'unu bileşen içinde çağırıyoruz.
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [sepet, setSepet] = useState<SepetUrunu[]>([]);
    const [seciliUrun, setSeciliUrun] = useState<string>('');
    const [teslimatAdresi, setTeslimatAdresi] = useState(varsayilanTeslimatAdresi);
    
    const handleUrunEkle = () => {
        if (!seciliUrun) return;
        const urun = urunler.find(u => u.id === seciliUrun);
        if (!urun || urun.satis_fiyati_musteri === null) {
            toast.error("Bu ürünün fiyatı tanımlanmamış, eklenemiyor.");
            return;
        }
        const mevcutUrunIndex = sepet.findIndex(item => item.urun_id === urun.id);
        if (mevcutUrunIndex !== -1) {
            const yeniSepet = [...sepet];
            yeniSepet[mevcutUrunIndex].adet += 1;
            setSepet(yeniSepet);
        } else {
            setSepet(prev => [
                ...prev, 
                {
                    urun_id: urun.id,
                    adet: 1,
                    o_anki_satis_fiyati: urun.satis_fiyati_musteri!,
                    urun_adi: urun.ad?.['tr'] || 'Bilinmeyen Ürün'
                }
            ]);
        }
        setSeciliUrun('');
    };

    const handleAdetDegistir = (urun_id: string, yeniAdet: number) => {
        if (yeniAdet < 1) return;
        setSepet(sepet.map(item => item.urun_id === urun_id ? { ...item, adet: yeniAdet } : item));
    };

    const handleUrunSil = (urun_id: string) => {
        setSepet(sepet.filter(item => item.urun_id !== urun_id));
    };

    const handleSubmit = () => {
        if (sepet.length === 0) {
            toast.error("Sipariş oluşturmak için önce sepete ürün eklemelisiniz.");
            return;
        }
        if (!teslimatAdresi) {
            toast.error("Teslimat adresi boş olamaz.");
            return;
        }
        
        const payloadItems = sepet.map(({ urun_id, adet, o_anki_satis_fiyati }) => ({
            urun_id,
            adet,
            o_anki_satis_fiyati
        }));

        startTransition(async () => {
            const result = await siparisOlusturAction({
                firmaId: firmaId,
                teslimatAdresi: teslimatAdresi,
                items: payloadItems,
                kaynak: 'Admin Paneli' 
            });

            // DÜZELTME 3: Başarı durumunu kontrol edip toast ve yönlendirme işlemlerini yapıyoruz.
            if (result?.success) {
                toast.success("Sipariş başarıyla oluşturuldu!");
                // Kullanıcıyı firmanın sipariş listesi sayfasına yönlendiriyoruz.
                router.push(`/admin/crm/firmalar/${firmaId}/siparisler`);
            } else if (result?.error) {
                toast.error(result.error);
            }
        });
    };
    
    const toplamTutar = sepet.reduce((acc, item) => acc + (item.adet * item.o_anki_satis_fiyati), 0);
    const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

    return (
        <div className="bg-white p-8 rounded-2xl shadow-lg space-y-8">
            <div className="flex flex-col sm:flex-row gap-2">
                <select 
                    value={seciliUrun}
                    onChange={(e) => setSeciliUrun(e.target.value)}
                    className="w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm"
                >
                    <option value="">-- Ürün Seçin --</option>
                    {urunler.map(urun => (
                        <option key={urun.id} value={urun.id}>
                            {urun.ad?.['tr'] || 'İsimsiz Ürün'} ({formatCurrency(urun.satis_fiyati_musteri || 0)})
                        </option>
                    ))}
                </select>
                <button 
                    onClick={handleUrunEkle} 
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent/90 transition-colors w-full sm:w-auto"
                >
                    <FiPlus/> Ekle
                </button>
            </div>
            
            <div className="space-y-2">
                {sepet.map(item => (
                    <div key={item.urun_id} className="flex items-center gap-4 p-2 border-b">
                        <p className="flex-grow font-semibold">{item.urun_adi}</p>
                        <input 
                            type="number" 
                            value={item.adet}
                            onChange={(e) => handleAdetDegistir(item.urun_id, parseInt(e.target.value))}
                            className="w-20 text-center border rounded-md p-1"
                            min="1"
                        />
                        <p className="w-28 text-right">{formatCurrency(item.adet * item.o_anki_satis_fiyati)}</p>
                        <button onClick={() => handleUrunSil(item.urun_id)} className="text-red-500 hover:text-red-700"><FiTrash2/></button>
                    </div>
                ))}
                {sepet.length > 0 && (
                    <div className="flex justify-end font-bold text-lg pt-4">
                        Ara Toplam: {formatCurrency(toplamTutar)}
                    </div>
                )}
            </div>

            <div>
                <label htmlFor="teslimatAdresi" className="block text-sm font-bold text-text-main/80 mb-2">Teslimat Adresi</label>
                <textarea 
                    id="teslimatAdresi"
                    value={teslimatAdresi}
                    onChange={(e) => setTeslimatAdresi(e.target.value)}
                    rows={3}
                    className="w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm"
                />
            </div>
            
            <div className="pt-6 border-t flex justify-end">
                <button onClick={handleSubmit} disabled={isPending} className="flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 font-bold disabled:bg-green-400">
                    {isPending ? <FiLoader className="animate-spin"/> : <FiSend />}
                    Siparişi Oluştur
                </button>
            </div>
        </div>
    );
}
