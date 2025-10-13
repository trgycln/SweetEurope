// src/app/admin/crm/firmalar/[firmaId]/siparisler/[siparisId]/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';

// Para ve Tarih formatlama yardımcı fonksiyonları
const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};
const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default async function SiparisDetayPage({ 
    params 
}: { 
    params: { firmaId: string; siparisId: string } 
}) {
    const supabase = createSupabaseServerClient();

    // Bu, bu sayfanın en önemli sorgusudur.
    // Tek bir sorgu ile siparişin kendisini, bağlı olduğu firma adını,
    // içindeki tüm ürün satırlarını (siparis_detay) ve bu satırlardaki
    // ürünlerin isimlerini (urunler) çekiyoruz.
    const { data: siparis, error } = await supabase
        .from('siparisler')
        .select(`
            *,
            firmalar ( unvan ),
            siparis_detay (
                *,
                urunler ( ad )
            )
        `)
        .eq('id', params.siparisId)
        .single();

    if (error || !siparis) {
        console.error("Sipariş detayı çekilirken hata:", error);
        notFound(); // Sipariş bulunamazsa 404 sayfasına yönlendir.
    }

    // @ts-ignore - Supabase tipleri bazen iç içe ilişkileri tam yakalayamayabilir.
    const firmaUnvan = siparis.firmalar?.unvan || 'Firma Bilgisi Yok';
    // @ts-ignore
    const urunSatirlari = siparis.siparis_detay || [];

    return (
        <div className="space-y-6">
            <Link 
                href={`/admin/crm/firmalar/${params.firmaId}/siparisler`} 
                className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors"
            >
                <FiArrowLeft />
                Sipariş Listesine Geri Dön
            </Link>

            <div className="bg-white p-8 rounded-2xl shadow-lg">
                <header className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b">
                    <div>
                        <h3 className="text-xs font-bold text-text-main/60 uppercase">Sipariş No</h3>
                        <p className="font-bold text-accent text-lg">#{siparis.id.substring(0, 8).toUpperCase()}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-text-main/60 uppercase">Müşteri</h3>
                        <p className="font-semibold text-primary">{firmaUnvan}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-text-main/60 uppercase">Sipariş Tarihi</h3>
                        <p className="font-semibold text-primary">{formatDate(siparis.siparis_tarihi)}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-text-main/60 uppercase">Durum</h3>
                        <p className="font-semibold text-primary">{siparis.siparis_durumu}</p>
                    </div>
                </header>

                <div className="mt-6">
                    <h3 className="font-serif text-xl font-bold text-primary mb-4">Sipariş İçeriği</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="border-b">
                                <tr>
                                    <th className="py-2 text-left text-sm font-semibold text-text-main">Ürün Adı</th>
                                    <th className="py-2 text-right text-sm font-semibold text-text-main">Miktar</th>
                                    <th className="py-2 text-right text-sm font-semibold text-text-main">Birim Fiyat</th>
                                    <th className="py-2 text-right text-sm font-semibold text-text-main">Satır Toplamı</th>
                                </tr>
                            </thead>
                            <tbody>
                                {urunSatirlari.map((item: any) => (
                                    <tr key={item.id} className="border-b last:border-none">
                                        <td className="py-3 font-semibold text-text-main">
                                            {/* @ts-ignore */}
                                            {item.urunler?.ad?.['tr'] || 'Ürün Adı Bulunamadı'}
                                        </td>
                                        <td className="py-3 text-right">{item.miktar}</td>
                                        <td className="py-3 text-right">{formatCurrency(item.birim_fiyat)}</td>
                                        <td className="py-3 text-right font-bold">{formatCurrency(item.toplam_fiyat)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <footer className="mt-8 pt-6 border-t flex justify-end">
                    <div className="w-full sm:w-1/2 md:w-1/3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-text-main/80">Ara Toplam (Net)</span>
                            <span className="font-semibold">{formatCurrency(siparis.toplam_tutar_net)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-text-main/80">KDV (%{siparis.kdv_orani})</span>
                            <span className="font-semibold">{formatCurrency((siparis.toplam_tutar_brut || 0) - (siparis.toplam_tutar_net || 0))}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-primary pt-2 border-t">
                            <span>Genel Toplam (Brüt)</span>
                            <span>{formatCurrency(siparis.toplam_tutar_brut)}</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}